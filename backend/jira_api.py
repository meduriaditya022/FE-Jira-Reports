import asyncio
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx
import pandas as pd
import threading
from fastapi.responses import FileResponse
import logging

# ---------------------------------------
# Setup & Configuration
# ---------------------------------------
load_dotenv()

JIRA_DOMAIN = os.getenv("JIRA_DOMAIN")
EMAIL = os.getenv("JIRA_EMAIL")
API_TOKEN = os.getenv("JIRA_API_TOKEN")
PROJECT_KEY = os.getenv("PROJECT_KEY", "FEP")
EXCLUDED_BOARDS = os.getenv("EXCLUDED_BOARDS", "").split(",")
CACHE_EXPIRY_HOURS = int(os.getenv("CACHE_EXPIRY_HOURS", "12"))

STORY_POINTS_FIELD = "customfield_10024"
EPIC_LINK_FIELD = "customfield_10014"
SPRINT_FIELD = "customfield_10020"

CACHE_EXPIRY = timedelta(hours=CACHE_EXPIRY_HOURS)
cache = {"data": None, "last_updated": None}
cache_lock = threading.Lock()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# ---------------------------------------
# Helper Functions
# ---------------------------------------
async def get_boards(client):
    url = f"https://{JIRA_DOMAIN}/rest/agile/1.0/board?projectKeyOrId={PROJECT_KEY}&maxResults=100"
    resp = await client.get(url, auth=(EMAIL, API_TOKEN))
    resp.raise_for_status()
    boards = resp.json().get("values", [])
    return [b for b in boards if b["name"] not in EXCLUDED_BOARDS]


async def get_issues(client, board_id):
    issues = []
    start_at = 0
    max_results = 50
    while True:
        url = f"https://{JIRA_DOMAIN}/rest/agile/1.0/board/{board_id}/issue"
        params = {"startAt": start_at, "maxResults": max_results}
        resp = await client.get(url, auth=(EMAIL, API_TOKEN), params=params)
        resp.raise_for_status()
        data = resp.json()
        new_issues = data.get("issues", [])
        if not new_issues:
            break
        issues.extend(new_issues)
        start_at += max_results
        if start_at >= data.get("total", 0):
            break
    return issues


async def get_versions(client):
    url = f"https://{JIRA_DOMAIN}/rest/api/3/project/{PROJECT_KEY}/versions"
    resp = await client.get(url, auth=(EMAIL, API_TOKEN))
    resp.raise_for_status()
    return resp.json()


def split_sprints(sprint_data):
    current = None
    spillovers = []
    if not sprint_data:
        return current, None
    for s in sprint_data:
        sprint_info = {}
        if isinstance(s, dict):
            sprint_info = s
        elif isinstance(s, str):
            parts = s.split(",")
            for p in parts:
                if "=" in p:
                    key, val = p.split("=", 1)
                    sprint_info[key.strip()] = val.strip()
        state = sprint_info.get("state")
        name = sprint_info.get("name")
        if state == "active":
            current = name
        elif state == "closed":
            spillovers.append(name)
    return current, "; ".join(spillovers) if spillovers else None


async def get_epic_name(client, epic_key, epic_cache):
    if not epic_key:
        return None
    if epic_key in epic_cache:
        return epic_cache[epic_key]
    url = f"https://{JIRA_DOMAIN}/rest/api/3/issue/{epic_key}"
    try:
        resp = await client.get(url, auth=(EMAIL, API_TOKEN))
        resp.raise_for_status()
        data = resp.json()
        fields = data.get("fields", {})
        epic_name = fields.get("summary") or fields.get("customfield_10011")
        epic_cache[epic_key] = epic_name
        return epic_name
    except Exception as e:
        logging.warning(f"⚠️ Could not fetch epic name for {epic_key}: {e}")
        epic_cache[epic_key] = None
        return None


# ---------------------------------------
# Core Jira Fetching Logic
# ---------------------------------------
async def fetch_jira_data():
    all_rows = []
    epic_cache = {}

    async with httpx.AsyncClient() as client:
        versions_dict = {}
        try:
            versions = await get_versions(client)
            for v in versions:
                versions_dict[v.get("name")] = {
                    "start_date": v.get("startDate"),
                    "release_date": v.get("releaseDate"),
                    "released": v.get("released"),
                    "archived": v.get("archived"),
                }
        except Exception as e:
            logging.warning(f"⚠️ Could not fetch versions: {e}")

        boards = await get_boards(client)
        logging.info(f"📋 Found {len(boards)} boards in {PROJECT_KEY}")

        for board in boards:
            board_id = board["id"]
            board_name = board["name"]
            logging.info(f"🔍 Fetching issues for {board_name} (ID: {board_id})")

            try:
                issues = await get_issues(client, board_id)
                for issue in issues:
                    fields = issue.get("fields", {})
                    issue_key = issue.get("key")
                    assignee = fields.get("assignee", {}).get("displayName") if fields.get("assignee") else "Unassigned"
                    status = fields.get("status", {}).get("name") if fields.get("status") else "Unknown"
                    sp = fields.get(STORY_POINTS_FIELD) or 0
                    fix_versions = [v.get("name") for v in fields.get("fixVersions", [])]
                    current_sprint, sprint_spillover = split_sprints(fields.get(SPRINT_FIELD))
                    is_completed = status.lower() in ["done", "closed", "completed"]

                    version_info = versions_dict.get(fix_versions[0]) if fix_versions else {}
                    epic_link = fields.get(EPIC_LINK_FIELD)
                    epic_name = await get_epic_name(client, epic_link, epic_cache)

                    all_rows.append({
                        "board_name": board_name,
                        "issue_key": issue_key,
                        "summary": fields.get("summary"),
                        "status": status,
                        "is_completed": is_completed,
                        "assignee": assignee,
                        "reporter": fields.get("reporter", {}).get("displayName") if fields.get("reporter") else None,
                        "issue_type": fields.get("issuetype", {}).get("name") if fields.get("issuetype") else None,
                        "priority": fields.get("priority", {}).get("name") if fields.get("priority") else None,
                        "created": fields.get("created"),
                        "updated": fields.get("updated"),
                        "due_date": fields.get("duedate"),
                        "story_points": sp,
                        "fix_versions": ", ".join(fix_versions),
                        "version_start_date": version_info.get("start_date"),
                        "version_release_date": version_info.get("release_date"),
                        "version_released": version_info.get("released"),
                        "epic_link": epic_link,
                        "epic_name": epic_name,
                        "current_sprint": current_sprint,
                        "sprint_spillover": sprint_spillover,
                        "is_spillover": 1 if sprint_spillover else 0,
                    })
            except Exception as e:
                logging.warning(f"⚠️ Error fetching issues for {board_name}: {e}")
                continue

    return {"rows": all_rows, "last_updated": datetime.now()}


# ---------------------------------------
# Cache Management
# ---------------------------------------
async def refresh_cache():
    with cache_lock:
        logging.info("♻️ Refreshing Jira data...")
        cache["data"] = await fetch_jira_data()
        cache["last_updated"] = datetime.now()
        logging.info("✅ Cache updated successfully.")


async def auto_refresh_loop():
    while True:
        await asyncio.sleep(CACHE_EXPIRY.total_seconds())
        logging.info("🕒 Auto-refreshing Jira cache...")
        await refresh_cache()


def get_cached_data():
    with cache_lock:
        return cache


# ---------------------------------------
# Lifespan Manager (modern startup/shutdown)
# ---------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("🚀 FastAPI Jira API starting up — fetching initial cache...")
    await refresh_cache()
    asyncio.create_task(auto_refresh_loop())
    yield
    logging.info("🛑 FastAPI Jira API shutting down...")


# ---------------------------------------
# FastAPI App Setup
# ---------------------------------------
app = FastAPI(title="Jira Cache API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------
# API Endpoints
# ---------------------------------------
@app.get("/api/jira/data")
async def get_jira_data():
    data = get_cached_data()
    return {
        "success": True,
        "data": data["data"]["rows"] if data["data"] else [],
        "last_updated": data["last_updated"].isoformat() if data["last_updated"] else None,
    }


@app.post("/api/jira/refresh")
async def force_refresh(background_tasks: BackgroundTasks):
    background_tasks.add_task(refresh_cache)
    return {"success": True, "message": "Manual cache refresh started."}


@app.get("/api/jira/export")
async def export_jira_data():
    data = get_cached_data()
    df = pd.DataFrame(data["data"]["rows"])
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"jira_export_{timestamp}.csv"
    filepath = os.path.join(os.getcwd(), filename)
    df.to_csv(filepath, index=False)
    logging.info(f"✅ Exported {len(df)} rows to {filename}")
    return FileResponse(filepath, filename=filename, media_type="text/csv")


@app.get("/api/jira/health")
async def health():
    data = get_cached_data()
    return {
        "success": True,
        "last_updated": data["last_updated"].isoformat() if data["last_updated"] else None,
        "timestamp": datetime.now().isoformat(),
        "message": "Jira service running fine",
    }


# ---------------------------------------
# Run Locally
# ---------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("jira_api:app", host="0.0.0.0", port=5050, reload=True)
