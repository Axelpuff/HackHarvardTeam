#!/usr/bin/env python3
"""
Ultra-clean Gemini interface - completely suppresses warnings
"""

import subprocess
import sys
import os

def clean_gemini_call(prompt: str) -> str:
    """Call Gemini with completely clean output"""
    
    # Create a temporary script
    script_content = f'''
import os
import warnings
import sys

# Suppress everything
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
warnings.filterwarnings("ignore")

# Redirect stderr to null
sys.stderr = open(os.devnull, "w")

from gemini_client import GeminiClient

try:
    client = GeminiClient()
    response = client.simple_prompt("{prompt}")
    print(response)
except Exception as e:
    print(f"Error: {{e}}")
'''
    
    # Write to temporary file
    with open('/tmp/gemini_temp.py', 'w') as f:
        f.write(script_content)
    
    try:
        # Run the script and capture output
        result = subprocess.run(
            [sys.executable, '/tmp/gemini_temp.py'],
            capture_output=True,
            text=True,
            stderr=subprocess.DEVNULL  # Suppress stderr completely
        )
        
        return result.stdout.strip()
    finally:
        # Clean up temp file
        if os.path.exists('/tmp/gemini_temp.py'):
            os.remove('/tmp/gemini_temp.py')

def main():
    """Interactive clean Gemini chat"""
    print("🤖 Ultra-Clean Gemini AI Chat")
    print("Type your message and press Enter. Type 'quit' to exit.\n")
    
    while True:
        user_input = input("You: ").strip()
        
        if user_input.lower() in ['quit', 'exit', 'q']:
            print("👋 Goodbye!")
            break
        
        if user_input:
            print("🤖 Gemini is thinking...")
            response = clean_gemini_call(user_input)
            print(f"Gemini: {response}\n")
        else:
            print("Please enter a message.")

if __name__ == "__main__":
    main()
