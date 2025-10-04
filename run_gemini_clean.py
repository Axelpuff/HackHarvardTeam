#!/usr/bin/env python3
"""
Clean Gemini runner - suppresses all warnings
"""

import os
import sys
import warnings

# Suppress all warnings and redirect stderr
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
warnings.filterwarnings('ignore')

# Redirect stderr to suppress Google's internal warnings
class SuppressStderr:
    def __enter__(self):
        self._original_stderr = sys.stderr
        sys.stderr = open(os.devnull, 'w')
        return self

    def __exit__(self, *args):
        sys.stderr.close()
        sys.stderr = self._original_stderr

# Now import and use Gemini
with SuppressStderr():
    from gemini_client import GeminiClient

def clean_gemini_prompt(prompt: str) -> str:
    """Run Gemini with no warnings"""
    with SuppressStderr():
        client = GeminiClient()
        return client.simple_prompt(prompt)

if __name__ == "__main__":
    # Interactive mode
    print("🤖 Clean Gemini AI Chat")
    print("Type your message and press Enter. Type 'quit' to exit.\n")
    
    while True:
        try:
            user_input = input("You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            if user_input:
                try:
                    response = clean_gemini_prompt(user_input)
                    print(f"Gemini: {response}\n")
                except Exception as e:
                    print(f"Error: {e}\n")
            else:
                print("Please enter a message.")
        except EOFError:
            # Handle end of input gracefully
            print("\n👋 Input ended. Goodbye!")
            break
        except KeyboardInterrupt:
            # Handle Ctrl+C gracefully
            print("\n\n👋 Goodbye!")
            break
