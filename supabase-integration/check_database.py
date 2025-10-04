#!/usr/bin/env python3
"""
Check what's stored in the Supabase database
"""

import asyncio
from supabase_client import SupabaseClient

async def check_database_contents():
    """Check what data is stored in the database"""
    print("=== Database Contents Check ===")
    
    try:
        client = SupabaseClient()
        
        # Check snippets
        print("\n1. SNIPPETS:")
        snippets_result = client.supabase.table('snippets').select('*').execute()
        snippets = snippets_result.data
        print(f"   Found {len(snippets)} snippets:")
        for i, snippet in enumerate(snippets, 1):
            print(f"   {i}. {snippet.get('content', 'N/A')[:60]}...")
            print(f"      Tags: {snippet.get('tags', [])}")
            print(f"      Created: {snippet.get('created_at', 'N/A')}")
        
        # Check routines
        print("\n2. ROUTINES:")
        routines_result = client.supabase.table('routines').select('*').execute()
        routines = routines_result.data
        print(f"   Found {len(routines)} routines:")
        for i, routine in enumerate(routines, 1):
            print(f"   {i}. {routine.get('pattern', 'N/A')}")
            print(f"      Time window: {routine.get('time_window', 'N/A')}")
            print(f"      User ID: {routine.get('user_id', 'N/A')}")
        
        # Check utterances
        print("\n3. UTTERANCES:")
        utterances_result = client.supabase.table('utterances').select('*').execute()
        utterances = utterances_result.data
        print(f"   Found {len(utterances)} utterances:")
        for i, utterance in enumerate(utterances, 1):
            print(f"   {i}. {utterance.get('transcript', 'N/A')[:60]}...")
            print(f"      Intent: {utterance.get('intent', 'N/A')}")
            print(f"      Accepted: {utterance.get('accepted', 'N/A')}")
        
        # Check calendar events
        print("\n4. CALENDAR EVENTS:")
        events_result = client.supabase.table('gc_events').select('*').execute()
        events = events_result.data
        print(f"   Found {len(events)} calendar events:")
        for i, event in enumerate(events, 1):
            print(f"   {i}. {event.get('title', 'N/A')}")
            print(f"      Start: {event.get('start_time', 'N/A')}")
            print(f"      End: {event.get('end_time', 'N/A')}")
        
        # Check reflections
        print("\n5. REFLECTIONS:")
        reflections_result = client.supabase.table('reflections').select('*').execute()
        reflections = reflections_result.data
        print(f"   Found {len(reflections)} reflections:")
        for i, reflection in enumerate(reflections, 1):
            print(f"   {i}. {reflection.get('content', 'N/A')[:60]}...")
        
        print(f"\n=== SUMMARY ===")
        print(f"Snippets: {len(snippets)}")
        print(f"Routines: {len(routines)}")
        print(f"Utterances: {len(utterances)}")
        print(f"Calendar Events: {len(events)}")
        print(f"Reflections: {len(reflections)}")
        
    except Exception as e:
        print(f"Error checking database: {e}")

if __name__ == "__main__":
    asyncio.run(check_database_contents())
