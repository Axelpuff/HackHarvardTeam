#!/usr/bin/env python3
"""
Test script for Supabase integration - Windows compatible
"""

import asyncio
import os
import sys
from supabase_client import SupabaseClient
from embedding_service import EmbeddingService
from config import Config

async def test_supabase_connection():
    """Test basic Supabase connection"""
    print("=== Testing Supabase Connection ===")
    try:
        client = SupabaseClient()
        print("V Supabase client initialized successfully")
        return True
    except Exception as e:
        print(f"X Error initializing Supabase client: {e}")
        return False

async def test_embedding_service():
    """Test embedding generation"""
    print("\n=== Testing Embedding Service ===")
    try:
        service = EmbeddingService()
        test_text = "propose 90-min focus blocks today"
        embedding = service.get_embedding(test_text)
        print(f"V Generated embedding for '{test_text}'")
        print(f"  Dimension: {len(embedding)}")
        print(f"  First 5 values: {embedding[:5]}")
        return True
    except Exception as e:
        print(f"X Error generating embedding: {e}")
        return False

async def test_database_operations():
    """Test basic database operations"""
    print("\n=== Testing Database Operations ===")
    try:
        client = SupabaseClient()
        service = EmbeddingService()
        
        # Test storing a snippet
        test_content = "Test snippet for integration"
        test_tags = ["test", "integration"]
        embedding = service.get_embedding(test_content)
        
        success = await client.store_snippet(
            content=test_content,
            tags=test_tags,
            embedding=embedding
        )
        
        if success:
            print("V Successfully stored test snippet")
        else:
            print("X Failed to store test snippet")
            return False
        
        # Test retrieving snippets
        snippets = await client.match_snippets(
            query_embedding=embedding,
            k=1,
            filter_tags=["test"]
        )
        
        if snippets:
            print(f"V Successfully retrieved {len(snippets)} snippets")
        else:
            print("X No snippets retrieved")
            return False
        
        return True
        
    except Exception as e:
        print(f"X Error in database operations: {e}")
        return False

async def test_configuration():
    """Test configuration validation"""
    print("\n=== Testing Configuration ===")
    try:
        # Test Supabase config
        Config.validate_supabase_config()
        print("V Supabase configuration valid")
        
        # Test Gemini config
        Config.validate_gemini_config()
        print("V Gemini configuration valid")
        
        return True
    except Exception as e:
        print(f"X Configuration error: {e}")
        return False

async def main():
    """Run all tests"""
    print("AI Planning System - Integration Tests")
    print("=" * 50)
    
    tests = [
        ("Configuration", test_configuration),
        ("Supabase Connection", test_supabase_connection),
        ("Embedding Service", test_embedding_service),
        ("Database Operations", test_database_operations),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"X {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("Test Results Summary:")
    print("=" * 50)
    
    all_passed = True
    for test_name, passed in results:
        status = "V PASS" if passed else "X FAIL"
        print(f"{test_name}: {status}")
        if not passed:
            all_passed = False
    
    print("=" * 50)
    if all_passed:
        print("SUCCESS: All tests passed! Integration is working correctly.")
    else:
        print("ERROR: Some tests failed. Please check the configuration and setup.")
        print("\nRequired environment variables:")
        print("- SUPABASE_URL")
        print("- SUPABASE_ANON_KEY")
        print("- GEMINI_API_KEY")

if __name__ == "__main__":
    asyncio.run(main())
