#!/usr/bin/env python3
"""
Supabase client for AI-powered planning system
"""

import os
import warnings
import sys
import contextlib
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from config import Config

# Suppress warnings
warnings.filterwarnings('ignore')

class SupabaseClient:
    """Client for interacting with Supabase database for AI planning system"""
    
    def __init__(self):
        """Initialize the Supabase client"""
        Config.validate_supabase_config()
        
        self.supabase: Client = create_client(
            Config.SUPABASE_URL,
            Config.SUPABASE_ANON_KEY
        )
    
    async def is_light_next_24h(self) -> bool:
        """
        Check if the next 24 hours have light schedule (<2h busy)
        
        Returns:
            bool: True if light schedule, False otherwise
        """
        try:
            result = self.supabase.rpc('is_light_next_24h').execute()
            return result.data
        except Exception as e:
            print(f"Error checking light schedule: {e}")
            return False
    
    async def match_snippets(self, query_embedding: List[float], k: int = 3, filter_tags: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Retrieve matching plan snippets based on embedding similarity
        
        Args:
            query_embedding: Vector embedding for the query
            k: Number of results to return
            filter_tags: Optional tags to filter by
            
        Returns:
            List of matching snippets
        """
        try:
            params = {
                'query_embedding': query_embedding,
                'k': k
            }
            if filter_tags:
                params['filter_tags'] = filter_tags
                
            result = self.supabase.rpc('match_snippets', params).execute()
            return result.data or []
        except Exception as e:
            print(f"Error matching snippets: {e}")
            return []
    
    async def match_routines(self, query_embedding: List[float], k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieve matching user routines based on embedding similarity
        
        Args:
            query_embedding: Vector embedding for the query
            k: Number of results to return
            
        Returns:
            List of matching routines
        """
        try:
            result = self.supabase.rpc('match_routines', {
                'query_embedding': query_embedding,
                'k': k
            }).execute()
            return result.data or []
        except Exception as e:
            print(f"Error matching routines: {e}")
            return []
    
    async def match_utterances(self, query_embedding: List[float], k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieve matching past utterances for few-shot recall
        
        Args:
            query_embedding: Vector embedding for the query
            k: Number of results to return
            
        Returns:
            List of matching utterances
        """
        try:
            result = self.supabase.rpc('match_utterances', {
                'query_embedding': query_embedding,
                'k': k
            }).execute()
            return result.data or []
        except Exception as e:
            print(f"Error matching utterances: {e}")
            return []
    
    async def store_utterance(self, transcript: str, intent: str, embedding: List[float], accepted: bool = False, user_id: str = '9ce7537b-2380-405e-a087-37be90e67b04') -> bool:
        """
        Store a new utterance with its embedding
        
        Args:
            transcript: The transcript text
            intent: Inferred intent
            embedding: Vector embedding
            accepted: Whether the user accepted the plan
            
        Returns:
            bool: Success status
        """
        try:
            result = self.supabase.table('utterances').insert({
                'transcript': transcript,
                'intent': intent,
                'embedding': embedding,
                'accepted': accepted,
                'user_id': user_id
            }).execute()
            return True
        except Exception as e:
            print(f"Error storing utterance: {e}")
            return False
    
    async def store_snippet(self, content: str, tags: List[str], embedding: List[float], user_id: Optional[str] = None) -> bool:
        """
        Store a new plan snippet
        
        Args:
            content: The snippet content
            tags: List of tags for filtering
            embedding: Vector embedding
            user_id: Optional user ID (null for global snippets)
            
        Returns:
            bool: Success status
        """
        try:
            data = {
                'content': content,
                'tags': tags,
                'embedding': embedding
            }
            if user_id:
                data['user_id'] = user_id
                
            result = self.supabase.table('snippets').insert(data).execute()
            return True
        except Exception as e:
            print(f"Error storing snippet: {e}")
            return False
    
    async def store_routine(self, pattern: str, time_window: Dict[str, Any], embedding: List[float], user_id: str) -> bool:
        """
        Store a new user routine
        
        Args:
            pattern: The routine pattern description
            time_window: Time window with start/end/fuzz_min
            embedding: Vector embedding
            user_id: User ID
            
        Returns:
            bool: Success status
        """
        try:
            result = self.supabase.table('routines').insert({
                'pattern': pattern,
                'time_window': time_window,
                'embedding': embedding,
                'user_id': user_id
            }).execute()
            return True
        except Exception as e:
            print(f"Error storing routine: {e}")
            return False
    
    async def store_reflection(self, content: str, embedding: List[float], user_id: str) -> bool:
        """
        Store a new reflection
        
        Args:
            content: The reflection content
            embedding: Vector embedding
            user_id: User ID
            
        Returns:
            bool: Success status
        """
        try:
            result = self.supabase.table('reflections').insert({
                'content': content,
                'embedding': embedding,
                'user_id': user_id
            }).execute()
            return True
        except Exception as e:
            print(f"Error storing reflection: {e}")
            return False


def main():
    """Example usage of the Supabase client"""
    try:
        # Initialize client
        client = SupabaseClient()
        print("Supabase client initialized successfully!")
        
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
