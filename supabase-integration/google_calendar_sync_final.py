#!/usr/bin/env python3
"""
Google Calendar Sync with fixed port 8080
"""

import os
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
import google.auth
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from supabase_client import SupabaseClient
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Google Calendar API scopes
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

class GoogleCalendarSync:
    """Google Calendar synchronization service"""
    
    def __init__(self, credentials_file='credentials.json', token_file='token.json'):
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.service = None
        self.supabase = SupabaseClient()
    
    def _create_credentials_from_env(self):
        """Create credentials.json from environment variables with fixed redirect URI"""
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        
        if not client_id or not client_secret:
            return False
        
        credentials = {
            "installed": {
                "client_id": client_id,
                "project_id": "env-project",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_secret": client_secret,
                "redirect_uris": ["http://localhost:8080"]
            }
        }
        
        try:
            with open(self.credentials_file, 'w') as f:
                json.dump(credentials, f, indent=2)
            print("SUCCESS: Created credentials.json with fixed redirect URI")
            return True
        except Exception as e:
            print(f"ERROR: Error creating credentials.json: {e}")
            return False

    def authenticate(self):
        """Authenticate with Google Calendar API using fixed port 8080"""
        creds = None
        
        # Load existing token if available
        if os.path.exists(self.token_file):
            creds = Credentials.from_authorized_user_file(self.token_file, SCOPES)
        
        # If no valid credentials, get new ones
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(self.credentials_file):
                    print("Credentials file not found, creating from .env...")
                    if not self._create_credentials_from_env():
                        print("ERROR: Could not create credentials from .env file")
                        return False
                
                try:
                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.credentials_file, SCOPES)
                    
                    print("Opening browser for authentication...")
                    print("Make sure you have added http://localhost:8080 to your Google Cloud Console redirect URIs")
                    creds = flow.run_local_server(port=8080)  # Fixed port 8080
                    
                except Exception as e:
                    print(f"ERROR: OAuth flow failed: {e}")
                    print("\nTROUBLESHOOTING:")
                    print("1. Go to Google Cloud Console")
                    print("2. Navigate to APIs & Services > Credentials")
                    print("3. Edit your OAuth 2.0 Client ID")
                    print("4. Add this redirect URI: http://localhost:8080")
                    print("5. Save and try again")
                    return False
            
            # Save credentials for next run
            with open(self.token_file, 'w') as token:
                token.write(creds.to_json())
        
        # Build the service
        self.service = build('calendar', 'v3', credentials=creds)
        print("SUCCESS: Google Calendar authentication successful")
        return True
    
    def fetch_calendar_events(self, days_ahead: int = 30, days_back: int = 7) -> List[Dict[str, Any]]:
        """Fetch events from Google Calendar"""
        if not self.service:
            print("ERROR: Not authenticated with Google Calendar")
            return []
        
        try:
            # Calculate time range
            now = datetime.utcnow()
            time_min = (now - timedelta(days=days_back)).isoformat() + 'Z'
            time_max = (now + timedelta(days=days_ahead)).isoformat() + 'Z'
            
            print(f"Fetching events from {time_min} to {time_max}")
            
            # Fetch events
            events_result = self.service.events().list(
                calendarId='primary',
                timeMin=time_min,
                timeMax=time_max,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            print(f"SUCCESS: Found {len(events)} events")
            
            # Transform events to our format
            transformed_events = []
            for event in events:
                transformed_event = self._transform_event(event)
                if transformed_event:
                    transformed_events.append(transformed_event)
            
            return transformed_events
            
        except Exception as e:
            print(f"ERROR: Error fetching calendar events: {e}")
            return []
    
    def _transform_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Transform Google Calendar event to our database format"""
        try:
            start = event.get('start', {})
            end = event.get('end', {})
            
            start_time = start.get('dateTime') or start.get('date')
            end_time = end.get('dateTime') or end.get('date')
            
            if not start_time or not end_time:
                return None
            
            # Convert to ISO format if needed
            if 'T' not in start_time:
                start_time += 'T00:00:00Z'
            if 'T' not in end_time:
                end_time += 'T23:59:59Z'
            
            return {
                'title': event.get('summary', 'No Title'),
                'start_time': start_time,
                'end_time': end_time,
                'description': event.get('description', ''),
                'created_at': datetime.utcnow().isoformat() + 'Z',
                'updated_at': datetime.utcnow().isoformat() + 'Z'
            }
            
        except Exception as e:
            print(f"WARNING: Error transforming event: {e}")
            return None
    
    async def sync_to_database(self, events: List[Dict[str, Any]], clear_existing: bool = False):
        """Sync events to Supabase database"""
        try:
            if clear_existing:
                print("Clearing existing calendar events...")
                self.supabase.supabase.table('gc_events').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
            
            if not events:
                print("No events to sync")
                return
            
            print(f"Syncing {len(events)} events to database...")
            
            # Insert events in batches
            batch_size = 50
            for i in range(0, len(events), batch_size):
                batch = events[i:i + batch_size]
                result = self.supabase.supabase.table('gc_events').insert(batch).execute()
                
                if result.data:
                    print(f"SUCCESS: Synced batch {i//batch_size + 1} ({len(batch)} events)")
                else:
                    print(f"ERROR: Failed to sync batch {i//batch_size + 1}")
            
            print(f"SUCCESS: Successfully synced {len(events)} events to database")
            
        except Exception as e:
            print(f"ERROR: Error syncing to database: {e}")
    
    async def full_sync(self, days_ahead: int = 30, days_back: int = 7, clear_existing: bool = True):
        """Perform full synchronization"""
        print("Starting Google Calendar sync...")
        
        # Authenticate
        if not self.authenticate():
            return False
        
        # Fetch events
        events = self.fetch_calendar_events(days_ahead, days_back)
        
        if not events:
            print("No events found")
            return False
        
        # Sync to database
        await self.sync_to_database(events, clear_existing)
        
        print("SUCCESS: Google Calendar sync completed!")
        return True


async def main():
    """Main function to run the sync"""
    sync = GoogleCalendarSync()
    
    # Perform full sync
    success = await sync.full_sync(
        days_ahead=30,    # Next 30 days
        days_back=7,      # Last 7 days
        clear_existing=True  # Clear existing events
    )
    
    if success:
        print("\nSUCCESS: Sync completed successfully!")
        print("Run 'python check_database.py' to see the synced events")
    else:
        print("\nERROR: Sync failed. Check your credentials and try again.")


if __name__ == "__main__":
    asyncio.run(main())
