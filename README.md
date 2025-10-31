# JIRA Analytics Dashboard

A comprehensive dashboard for visualizing JIRA project data with interactive reports and filtering capabilities.

## Quick Start with Backend Integration

### 1. Backend Setup (Python Flask API)
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Update your JIRA credentials in jira_api.py
# - JIRA_DOMAIN
# - EMAIL  
# - API_TOKEN
# - PROJECT_KEY

# Start the Flask API server
python jira_api.py
```

The backend will start on `http://localhost:5000` and provide these endpoints:
- `GET /api/jira/data` - All JIRA issues data
- `GET /api/jira/summary` - Board summary statistics  
- `GET /api/jira/users` - User performance data
- `GET /api/jira/versions` - Release/version data
- `GET /api/jira/health` - API health check

### 2. Frontend Setup (React Dashboard)
```bash
# Install frontend dependencies
npm install

# Create environment file
cp .env.example .env

# Update .env with your API URL (default: http://localhost:5000/api)
REACT_APP_API_URL=http://localhost:5000/api

# Start the React development server
npm run dev
```

### 3. Auto Data Population

Once both servers are running:
1. The React dashboard will automatically connect to your Python backend
2. Data will be fetched directly from JIRA APIs (no CSV needed!)
3. Dashboard will auto-refresh and show real-time data
4. Use the "Refresh Data" button to get latest updates

## Features

### Dashboard Capabilities
- **Interactive Filtering**: Filter by board, status, assignee, priority, issue type, and date ranges
- **Real-time Metrics**: Total issues, active users, boards, story points, completion rates
- **Auto Data Loading**: Connects directly to JIRA backend APIs
- **Manual CSV Upload**: Fallback option when API is unavailable
- **Visual Analytics**: 
  - Board distribution charts
  - Status distribution pie charts
  - User performance comparisons
  - Priority distribution analysis
- **Data Export**: Export filtered data as CSV
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### Backend Integration Benefits
- **Real-time Data**: Always up-to-date information from JIRA
- **No Manual Exports**: Eliminates need to generate and upload CSV files
- **Automatic Refresh**: Data updates automatically in the background
- **API Health Monitoring**: Shows connection status to backend
- **Fallback Support**: Can still upload CSV files if API is unavailable

### Key Visualizations

1. **Board Overview**
   - Issue distribution across boards
   - Board performance metrics
   - Workload distribution

2. **User Performance**
   - Completed vs in-progress work
   - Story points earned
   - Top performers ranking

3. **Status Tracking**
   - Current status distribution
   - Completion rates
   - Bottleneck identification

4. **Priority Analysis**
   - Priority level distribution
   - High-priority issue tracking
   - Resource allocation insights

## Setup Instructions

### 1. Full Stack Setup (Recommended)
```bash
# Backend setup
cd backend
pip install -r requirements.txt
python jira_api.py  # Starts on port 5000

# Frontend setup (in new terminal)
npm install
cp .env.example .env
npm run dev  # Starts on port 5173
```

### 2. Frontend Only Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Data Integration Options

#### Option A: Direct API Integration (Recommended)
1. Start the Python Flask backend server
2. Dashboard automatically connects and loads data
3. Real-time updates and refresh capabilities

#### Option B: Manual CSV Upload (Fallback)
1. Run your Python script to generate CSV files
2. Use the built-in file uploader in the dashboard
3. Data will be processed and visualized

### 4. n8n Workflow Setup (Optional)

#### Prerequisites
- n8n instance (local or cloud)
- JIRA API credentials
- Webhook endpoint for dashboard integration

#### Installation Steps
1. Import the `n8n-workflow.json` into your n8n instance
2. Configure JIRA credentials in the workflow nodes
3. Set up webhook URLs for dashboard integration
4. Schedule the workflow to run automatically

#### Workflow Components
- **Get JIRA Boards**: Fetches all boards from your JIRA project
- **Get Issues for Board**: Retrieves issues for each board
- **Get Project Versions**: Fetches version information with dates
- **Transform Data**: Processes and enriches the data
- **Generate CSV**: Creates exportable CSV format
- **Generate Analytics**: Creates summary statistics
- **Send to Dashboard**: Updates the dashboard with new data

## Configuration

### Backend API Configuration
```javascript
// In backend/jira_api.py
JIRA_DOMAIN = "your-domain.atlassian.net"
EMAIL = "your-email@company.com"
API_TOKEN = "your-api-token"
PROJECT_KEY = "FEP"
```

### Frontend Configuration
```bash
# In .env file
REACT_APP_API_URL=http://localhost:5000/api
```

### Dashboard Customization
- Modify color schemes in `STATUS_COLORS` and `PRIORITY_COLORS`
- Adjust chart configurations in the component props
- Add custom metrics in the metrics calculation section

## n8n Workflow Benefits

### Automation Advantages
1. **Scheduled Updates**: Run reports automatically at specified intervals
2. **Real-time Processing**: Process data as soon as it's available
3. **Error Handling**: Built-in retry and error notification capabilities
4. **Scalability**: Handle multiple projects and boards simultaneously

### Integration Possibilities
1. **Slack Notifications**: Send daily/weekly summaries to team channels
2. **Email Reports**: Automated report delivery to stakeholders
3. **Database Storage**: Store historical data for trend analysis
4. **Webhook Triggers**: React to JIRA events in real-time

## Usage Examples

### API Integration
```javascript
// The dashboard automatically connects to your backend
// No manual code needed - just start both servers!

// Manual API calls (if needed)
import { apiService } from './services/apiService';

const data = await apiService.getJiraData();
const summary = await apiService.getSummaryData();
```

### Filtering Data
```javascript
// Filter by specific board and status
setFilters({
  board: 'FE Bugs',
  status: 'In Progress',
  assignee: '',
  priority: 'High',
  issue_type: 'Bug',
  date_range: 'last_30_days'
});
```

### Custom Metrics
```javascript
// Add custom completion rate calculation
const customCompletionRate = useMemo(() => {
  const completed = filteredData.filter(item => 
    ['Done', 'Closed'].includes(item.status)
  ).length;
  return (completed / filteredData.length * 100).toFixed(1);
}, [filteredData]);
```

## Performance Optimization

### Backend Performance
- API response caching for frequently accessed data
- Efficient JIRA API pagination handling
- Error handling and retry mechanisms

### Data Loading
- Implement pagination for large datasets
- Use virtual scrolling for long tables
- Cache frequently accessed data

### Chart Rendering
- Use responsive containers for better mobile performance
- Implement lazy loading for charts not in viewport
- Optimize data structures for chart libraries

## Troubleshooting

### Common Issues
1. **Backend Connection Failed**: Verify Flask server is running on port 5000
2. **CORS Errors**: Ensure Flask-CORS is installed and configured
3. **JIRA API Authentication**: Check your API token and permissions
1. **CSV Format Errors**: Ensure CSV headers match expected format
2. **Large Datasets**: Use filtering and pagination for better performance

### Backend Issues
1. **Import Errors**: Run `pip install -r requirements.txt`
2. **JIRA API Limits**: The backend handles rate limiting automatically
3. **Authentication Failures**: Verify API tokens and permissions in jira_api.py
### n8n Workflow Issues
1. **Authentication Failures**: Verify API tokens and permissions
2. **Rate Limiting**: Add delays between API calls
3. **Data Mapping**: Check custom field IDs match your JIRA instance

## Future Enhancements

### Dashboard Features
- Real-time WebSocket updates
- Advanced caching strategies
- Multi-project support
- Historical trend analysis
- Predictive analytics
- Custom dashboard layouts
- Advanced filtering options
- Team velocity tracking

### n8n Integrations
- Microsoft Teams notifications
- Jira Service Management integration
- Confluence page updates
- Custom reporting templates
- Multi-project support

## Support

For issues or questions:
1. Check that both backend (port 5000) and frontend (port 5173) are running
2. Verify API connectivity using the health check endpoint
3. Check browser console for any JavaScript errors
1. Check the troubleshooting section
2. Review n8n workflow logs
3. Verify JIRA API permissions
4. Test with sample data first