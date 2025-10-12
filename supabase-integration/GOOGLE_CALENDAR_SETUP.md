# 📅 Google Calendar Sync Setup Guide

## 🚀 **Complete Pipeline: Google Calendar → Supabase**

This pipeline automatically fetches events from your Google Calendar and stores them in your Supabase database for AI planning.

## 📋 **Setup Steps:**

### **1. Install Additional Dependencies**

```bash
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### **2. Set Up Google Cloud Project**

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project** or select existing one
3. **Enable Google Calendar API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### **3. Create OAuth2 Credentials**

1. **Go to "APIs & Services" → "Credentials"**
2. **Click "Create Credentials" → "OAuth client ID"**
3. **Choose "Desktop application"**
4. **Download the JSON file** and rename it to `credentials.json`
5. **Place it in your `supabase-integration` folder**

### **4. Run the Sync**

```bash
python google_calendar_sync.py
```

**First run will:**

- Open browser for Google authentication
- Ask for calendar permissions
- Save authentication token for future runs

## 🔧 **Features:**

### **✅ Automatic Sync:**

- **Fetches events** from your primary calendar
- **Transforms data** to match database schema
- **Batches inserts** for performance
- **Handles time zones** and date formats

### **✅ Smart Filtering:**

- **Configurable date range** (default: 7 days back, 30 days ahead)
- **Clears old events** to avoid duplicates
- **Handles all-day events** and timed events

### **✅ Error Handling:**

- **Authentication retry** with token refresh
- **Batch processing** for large calendars
- **Detailed logging** for debugging

## 📊 **What Gets Synced:**

### **Event Data:**

- ✅ **Title** - Event name
- ✅ **Start/End times** - Precise timing
- ✅ **Description** - Event details
- ✅ **Timestamps** - When synced

### **Date Range:**

- **Past 7 days** - Recent events
- **Next 30 days** - Upcoming events
- **Configurable** - Adjust as needed

## 🎯 **Usage Examples:**

### **Basic Sync:**

```python
from google_calendar_sync import GoogleCalendarSync

sync = GoogleCalendarSync()
await sync.full_sync()
```

### **Custom Date Range:**

```python
await sync.full_sync(
    days_ahead=60,    # Next 60 days
    days_back=14,     # Last 14 days
    clear_existing=True
)
```

### **Manual Event Fetch:**

```python
events = sync.fetch_calendar_events(days_ahead=7)
await sync.sync_to_database(events)
```

## 🔄 **Automated Sync Options:**

### **1. Cron Job (Linux/Mac):**

```bash
# Add to crontab for daily sync at 6 AM
0 6 * * * cd /path/to/supabase-integration && python google_calendar_sync.py
```

### **2. Windows Task Scheduler:**

- Create task to run `google_calendar_sync.py` daily
- Set working directory to `supabase-integration`

### **3. GitHub Actions (Cloud):**

```yaml
name: Calendar Sync
on:
  schedule:
    - cron: '0 6 * * *' # Daily at 6 AM
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Sync Calendar
        run: python google_calendar_sync.py
```

## 🛡️ **Security & Privacy:**

### **✅ Secure Authentication:**

- **OAuth2 flow** - No password storage
- **Token refresh** - Automatic re-authentication
- **Read-only access** - Cannot modify your calendar
- **Local storage** - Tokens stored locally

### **✅ Data Control:**

- **Your data stays yours** - Stored in your Supabase
- **Configurable sync** - Choose what to sync
- **Easy deletion** - Clear events anytime

## 🚀 **After Setup:**

1. **Run the sync:** `python google_calendar_sync.py`
2. **Check database:** `python check_database.py`
3. **Test planning:** `python ai_planning_system.py`

Your AI planning system will now have access to your real calendar events! 🎉

## 🔧 **Troubleshooting:**

### **Authentication Issues:**

- Delete `token.json` and re-run
- Check `credentials.json` is in correct location
- Verify Google Calendar API is enabled

### **Permission Issues:**

- Grant calendar read permissions
- Check OAuth2 scopes in credentials

### **Sync Issues:**

- Check internet connection
- Verify Supabase credentials
- Check database schema is set up
