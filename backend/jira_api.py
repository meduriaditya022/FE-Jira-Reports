import requests
from requests.auth import HTTPBasicAuth
from flask import Flask, jsonify, send_file
from flask_cors import CORS
from datetime import datetime, timedelta
import threading
import pandas as pd
import os
from dotenv import load_dotenv


# -----------------------
# Flask Setup
# -----------------------
app = Flask(__name__)
CORS(app)

# -----------------------
# Jira Configuration
# -----------------------
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

auth = HTTPBasicAuth(EMAIL, API_TOKEN)
headers = {"Accept": "application/json"}

# -----------------------
# Cache Setup
# -----------------------
cache = {
    "data": None,
    "last_updated": None
}
CACHE_EXPIRY = timedelta(hours=CACHE_EXPIRY_HOURS)
cache_lock = threading.Lock()

# -----------------------
# Jira Helper Functions
# -----------------------
def get_boards():
    url = f"https://{JIRA_DOMAIN}/rest/agile/1.0/board?projectKeyOrId={PROJECT_KEY}&maxResults=100"
    resp = requests.get(url, headers=headers, auth=auth)
    resp.raise_for_status()
    boards = resp.json().get("values", [])
    return [b for b in boards if b["name"] not in EXCLUDED_BOARDS]

def get_issues(board_id):
    issues = []
    start_at = 0
    max_results = 50
    while True:
        url = f"https://{JIRA_DOMAIN}/rest/agile/1.0/board/{board_id}/issue"
        params = {"startAt": start_at, "maxResults": max_results}
        resp = requests.get(url, headers=headers, auth=auth, params=params)
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

def get_versions():
    url = f"https://{JIRA_DOMAIN}/rest/api/3/project/{PROJECT_KEY}/versions"
    resp = requests.get(url, headers=headers, auth=auth)
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

def get_epic_name(epic_key, epic_cache):
    """Fetch and cache Epic names to avoid repeated API calls."""
    if not epic_key:
        return None
    if epic_key in epic_cache:
        return epic_cache[epic_key]
    url = f"https://{JIRA_DOMAIN}/rest/api/3/issue/{epic_key}"
    try:
        resp = requests.get(url, headers=headers, auth=auth)
        resp.raise_for_status()
        data = resp.json()
        fields = data.get("fields", {})
        epic_name = fields.get("summary") or fields.get("customfield_10011")
        epic_cache[epic_key] = epic_name
        return epic_name
    except Exception as e:
        print(f"⚠️ Could not fetch epic name for {epic_key}: {e}")
        epic_cache[epic_key] = None
        return None

# -----------------------
# Core Jira Data Fetching
# -----------------------
def fetch_jira_data():
    """Fetch and enrich all Jira data"""
    all_rows = []
    epic_cache = {}

    # Fetch versions
    versions_dict = {}
    try:
        versions = get_versions()
        for v in versions:
            versions_dict[v.get("name")] = {
                "start_date": v.get("startDate"),
                "release_date": v.get("releaseDate"),
                "released": v.get("released"),
                "archived": v.get("archived"),
            }
    except Exception as e:
        print(f"⚠️ Could not fetch versions: {e}")

    boards = get_boards()
    print(f"📋 Found {len(boards)} boards in {PROJECT_KEY}")

    for board in boards:
        board_id = board["id"]
        board_name = board["name"]
        print(f"🔍 Fetching issues for {board_name} (ID: {board_id})")

        try:
            issues = get_issues(board_id)
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
                epic_name = get_epic_name(epic_link, epic_cache)

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
            print(f"⚠️ Error fetching issues for {board_name}: {e}")
            continue

    return {"rows": all_rows, "last_updated": datetime.now()}

# -----------------------
# Cache Access
# -----------------------
def get_cached_jira_data(force_refresh=False):
    with cache_lock:
        if (
            force_refresh
            or not cache["data"]
            or not cache["last_updated"]
            or datetime.now() - cache["last_updated"] > CACHE_EXPIRY
        ):
            print("♻️ Refreshing Jira data...")
            cache["data"] = fetch_jira_data()
            cache["last_updated"] = datetime.now()
        else:
            print("✅ Using cached Jira data.")
        return cache["data"]

# -----------------------
# API Endpoints
# -----------------------
@app.route("/api/jira/data", methods=["GET"])
def get_jira_data():
    data = get_cached_jira_data()
    return jsonify({
        "success": True,
        "data": data["rows"],
        "last_updated": cache["last_updated"].isoformat()
    })

@app.route("/api/jira/export", methods=["GET"])
def export_jira_data():
    """Export cached Jira data to CSV file."""
    data = get_cached_jira_data()
    df = pd.DataFrame(data["rows"])

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"jira_export_{timestamp}.csv"
    filepath = os.path.join(os.getcwd(), filename)
    df.to_csv(filepath, index=False)

    print(f"✅ Exported {len(df)} rows to {filename}")
    return send_file(filepath, as_attachment=True)

@app.route("/api/jira/refresh", methods=["POST"])
def refresh_cache():
    get_cached_jira_data(force_refresh=True)
    return jsonify({"success": True, "message": "Cache refreshed successfully"})

@app.route("/api/jira/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "last_updated": cache["last_updated"].isoformat() if cache["last_updated"] else None,
        "timestamp": datetime.now().isoformat(),
        "message": "Jira service running fine"
    })

# -----------------------
# Run Flask App
# -----------------------
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5050)
