#!/usr/bin/env python3
"""
Simple test script for Gemini AI functionality
"""

from gemini_client import GeminiClient


def main():
    """Test Gemini AI functionality"""
    print("=== Gemini AI Test ===\n")
    
    try:
        # Initialize Gemini client
        print("Initializing Gemini client...")
        client = GeminiClient()
        print("✓ Gemini client initialized successfully\n")
        
        # Test simple prompt
        test_prompt = "Hello! Can you tell me a fun fact about space?"
        print(f"Test prompt: {test_prompt}")
        
        response = client.simple_prompt(test_prompt)
        print(f"\nGemini Response:\n{response}\n")
        
        # Interactive mode
        print("=== Interactive Mode ===")
        print("Type your prompts below (type 'quit' to exit):")
        
        while True:
            user_input = input("\nYou: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("Goodbye!")
                break
                
            if user_input:
                try:
                    response = client.simple_prompt(user_input)
                    print(f"Gemini: {response}")
                except Exception as e:
                    print(f"Error: {e}")
            else:
                print("Please enter a valid prompt.")
        
    except Exception as e:
        print(f"Error: {e}")
        print("\nMake sure you have:")
        print("1. Set GEMINI_API_KEY in your .env file")
        print("2. Installed google-generativeai: pip install google-generativeai")


if __name__ == "__main__":
    main()

