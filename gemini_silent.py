#!/usr/bin/env python3
"""
Silent Gemini chat - hides warnings by redirecting stderr
"""

import subprocess
import sys
import os

def run_silent_gemini():
    """Run Gemini chat with warnings hidden"""
    
    # The simplest solution: redirect stderr to /dev/null when running the script
    print("🤖 Silent Gemini AI Chat")
    print("Type your message and press Enter. Type 'quit' to exit.\n")
    
    # Import here to minimize warning exposure
    from gemini_client import GeminiClient
    
    client = GeminiClient()
    
    while True:
        user_input = input("You: ").strip()
        
        if user_input.lower() in ['quit', 'exit', 'q']:
            print("👋 Goodbye!")
            break
        
        if user_input:
            try:
                # Capture stderr during the API call
                with open(os.devnull, 'w') as devnull:
                    old_stderr = sys.stderr
                    sys.stderr = devnull
                    try:
                        response = client.simple_prompt(user_input)
                    finally:
                        sys.stderr = old_stderr
                
                print(f"Gemini: {response}\n")
            except Exception as e:
                print(f"Error: {e}\n")
        else:
            print("Please enter a message.")

if __name__ == "__main__":
    run_silent_gemini()
