# Supabase Integration Setup

## Quick Start

1. **Install dependencies:**
   ```bash
   cd supabase-integration
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   - Copy `env_example.txt` to `.env`
   - Fill in your API keys

3. **Run the Google Calendar sync:**
   ```bash
   python google_calendar_sync_final.py
   ```

## Dependencies

This folder has its own `requirements.txt` with Supabase-specific packages:
- `supabase` - Database client
- `google-auth` - Google Calendar authentication
- `google-generativeai` - Gemini AI integration
- And more...

## Files

- `google_calendar_sync_final.py` - Main sync script
- `check_database.py` - View database contents
- `ai_planning_system.py` - AI planning system
- `supabase_client.py` - Database client
