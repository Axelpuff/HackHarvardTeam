#!/usr/bin/env python3
"""
AI Planning System - Main integration script
Combines Supabase, Gemini embeddings, and planning logic
"""

import asyncio
import os
import warnings
import sys
from typing import List, Dict, Any, Optional
from supabase_client import SupabaseClient
from embedding_service import EmbeddingService
from config import Config

# Suppress warnings
warnings.filterwarnings('ignore')


class AIPlanningSystem:
    """Main AI planning system that integrates all components"""
    
    def __init__(self):
        """Initialize the AI planning system"""
        # Initialize all services
        self.supabase = SupabaseClient()
        self.embedding_service = EmbeddingService()
        
        print("AI Planning System initialized successfully!")
    
    async def run_planning_workflow(self, user_query: str = "propose 90-min focus blocks today") -> Dict[str, Any]:
        """
        Run the complete planning workflow
        
        Args:
            user_query (str): User's planning request
            
        Returns:
            Dict[str, Any]: Planning results and recommendations
        """
        try:
            print(f"\n=== AI Planning Workflow ===")
            print(f"User Query: {user_query}")
            
            # 1) Light-load check
            print("\n1. Checking schedule load...")
            is_light = await self.supabase.is_light_next_24h()
            print(f"   Light next 24h? {is_light}")
            
            # 2) Generate embedding for the query
            print("\n2. Generating embedding...")
            query_embedding = self.embedding_service.get_embedding(user_query)
            print(f"   Embedding dimension: {len(query_embedding)}")
            
            # 3) Retrieve matching snippets
            print("\n3. Finding relevant plan snippets...")
            snippets = await self.supabase.match_snippets(
                query_embedding=query_embedding,
                k=3,
                filter_tags=['focus', 'student']
            )
            print(f"   Found {len(snippets)} snippets")
            for i, snippet in enumerate(snippets):
                print(f"   Snippet {i+1}: {snippet.get('content', 'N/A')[:50]}...")
            
            # 4) Retrieve user routines
            print("\n4. Finding relevant routines...")
            routines = await self.supabase.match_routines(
                query_embedding=query_embedding,
                k=3
            )
            print(f"   Found {len(routines)} routines")
            for i, routine in enumerate(routines):
                print(f"   Routine {i+1}: {routine.get('pattern', 'N/A')[:50]}...")
            
            # 5) Retrieve similar past utterances
            print("\n5. Finding similar past requests...")
            utterances = await self.supabase.match_utterances(
                query_embedding=query_embedding,
                k=3
            )
            print(f"   Found {len(utterances)} similar utterances")
            for i, utterance in enumerate(utterances):
                print(f"   Utterance {i+1}: {utterance.get('transcript', 'N/A')[:50]}...")
            
            # 6) Generate AI response using all context
            print("\n6. Generating AI response...")
            context = self._build_context(snippets, routines, utterances, is_light)
            ai_response = self._generate_ai_plan(user_query, context)
            print(f"   AI Response: {ai_response[:100]}...")
            
            # 7) Store the interaction
            print("\n7. Storing interaction...")
            await self._store_interaction(user_query, ai_response, query_embedding)
            
            return {
                'user_query': user_query,
                'is_light_schedule': is_light,
                'snippets': snippets,
                'routines': routines,
                'utterances': utterances,
                'ai_response': ai_response,
                'query_embedding': query_embedding
            }
            
        except Exception as e:
            print(f"Error in planning workflow: {e}")
            return {'error': str(e)}
    
    def _build_context(self, snippets: List[Dict], routines: List[Dict], utterances: List[Dict], is_light: bool) -> str:
        """Build context string from retrieved data"""
        context_parts = []
        
        # Schedule context
        schedule_context = "Light schedule" if is_light else "Busy schedule"
        context_parts.append(f"Schedule: {schedule_context}")
        
        # Snippets context
        if snippets:
            context_parts.append("Relevant plan snippets:")
            for snippet in snippets:
                context_parts.append(f"- {snippet.get('content', 'N/A')}")
        
        # Routines context
        if routines:
            context_parts.append("User routines to consider:")
            for routine in routines:
                context_parts.append(f"- {routine.get('pattern', 'N/A')}")
        
        # Past utterances context
        if utterances:
            context_parts.append("Similar past requests:")
            for utterance in utterances:
                context_parts.append(f"- {utterance.get('transcript', 'N/A')}")
        
        return "\n".join(context_parts)
    
    def _generate_ai_plan(self, user_query: str, context: str) -> str:
        """Generate AI response using Gemini"""
        prompt = f"""
        You are an AI planning assistant. Based on the user's request and context, provide a helpful plan.
        
        User Request: {user_query}
        
        Context:
        {context}
        
        Please provide a structured plan that considers:
        1. The user's specific request
        2. Their schedule constraints
        3. Relevant routines and patterns
        4. Best practices from similar past requests
        
        Format your response as a clear, actionable plan.
        """
        
        # For now, return a simple response since we don't have Gemini client in this version
        return f"Based on your request '{user_query}' and the context provided, here's a personalized plan that considers your schedule and preferences."
    
    async def _store_interaction(self, user_query: str, ai_response: str, embedding: List[float]) -> bool:
        """Store the user interaction"""
        try:
            # Store utterance
            await self.supabase.store_utterance(
                transcript=user_query,
                intent="planning_request",
                embedding=embedding,
                accepted=False  # User hasn't accepted yet
            )
            return True
        except Exception as e:
            print(f"Error storing interaction: {e}")
            return False
    
    async def add_sample_data(self):
        """Add sample data to the database for testing"""
        print("\n=== Adding Sample Data ===")
        
        # Sample snippets
        sample_snippets = [
            {
                'content': '90-minute focused work session with 10-minute breaks',
                'tags': ['focus', 'productivity', 'work']
            },
            {
                'content': 'Morning routine: exercise, breakfast, review daily goals',
                'tags': ['routine', 'morning', 'wellness']
            },
            {
                'content': 'Study session with Pomodoro technique (25min work, 5min break)',
                'tags': ['study', 'focus', 'student']
            }
        ]
        
        for snippet_data in sample_snippets:
            embedding = self.embedding_service.get_embedding(snippet_data['content'])
            await self.supabase.store_snippet(
                content=snippet_data['content'],
                tags=snippet_data['tags'],
                embedding=embedding
            )
            print(f"Added snippet: {snippet_data['content'][:50]}...")
        
        # Sample routines
        sample_routines = [
            {
                'pattern': 'Lunch break at 12:00 PM',
                'time_window': {'start': '12:00', 'end': '13:00', 'fuzz_min': 15}
            },
            {
                'pattern': 'Evening wind-down routine at 9:00 PM',
                'time_window': {'start': '21:00', 'end': '22:00', 'fuzz_min': 30}
            }
        ]
        
        for routine_data in sample_routines:
            embedding = self.embedding_service.get_embedding(routine_data['pattern'])
            await self.supabase.store_routine(
                pattern=routine_data['pattern'],
                time_window=routine_data['time_window'],
                embedding=embedding,
                user_id='9ce7537b-2380-405e-a087-37be90e67b04'  # Your UUID
            )
            print(f"Added routine: {routine_data['pattern']}")
        
        print("Sample data added successfully!")


async def main():
    """Main function to run the AI planning system"""
    try:
        # Initialize the system
        system = AIPlanningSystem()
        
        # Add sample data first
        print("Adding sample data...")
        await system.add_sample_data()
        
        # Run the planning workflow
        user_input = "propose 90-min focus blocks today"
        print(f"\nRunning planning workflow with: '{user_input}'")
        
        result = await system.run_planning_workflow(user_input)
        
        if 'error' in result:
            print(f"\nError: {result['error']}")
        else:
            print(f"\n=== Final AI Response ===")
            print(result['ai_response'])
            
            print(f"\n=== Summary ===")
            print(f"Schedule: {'Light' if result['is_light_schedule'] else 'Busy'}")
            print(f"Found {len(result['snippets'])} relevant snippets")
            print(f"Found {len(result['routines'])} relevant routines")
            print(f"Found {len(result['utterances'])} similar past requests")
        
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())
