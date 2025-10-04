#!/usr/bin/env python3
"""
Simple Gemini Chat - Input text and get Gemini's response
"""

import os
import warnings

# Suppress warnings and logging
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
warnings.filterwarnings('ignore')

from gemini_client import GeminiClient


def chat_with_gemini():
    """Context-aware chat interface with Gemini"""
    print("🤖 Gemini AI Chat with Context Memory")
    print("Type your message and press Enter.")
    print("Commands: 'quit' to exit, 'clear' to clear history, 'history' to show conversation\n")
    
    try:
        # Initialize Gemini
        client = GeminiClient()
        print("✅ Connected to Gemini AI with conversation memory!\n")
        
        while True:
            # Get user input
            user_message = input("You: ").strip()
            
            # Handle special commands
            if user_message.lower() in ['quit', 'exit', 'q', 'bye']:
                print("👋 Goodbye!")
                break
            elif user_message.lower() in ['clear', 'reset']:
                client.clear_history()
                print("🧹 Conversation history cleared!\n")
                continue
            elif user_message.lower() in ['history', 'show history']:
                history = client.get_history()
                if history:
                    print("\n📜 Conversation History:")
                    for i, msg in enumerate(history, 1):
                        role = "👤 You" if msg["role"] == "user" else "🤖 Gemini"
                        content = msg["content"][:100] + "..." if len(msg["content"]) > 100 else msg["content"]
                        print(f"{i}. {role}: {content}")
                    print()
                else:
                    print("📜 No conversation history yet.\n")
                continue
            
            # Skip empty messages
            if not user_message:
                print("Please enter a message.")
                continue
            
            try:
                # Send to Gemini and get response with context
                print("🤖 Gemini is thinking...")
                response = client.simple_prompt(user_message)
                print(f"Gemini: {response}\n")
                
            except Exception as e:
                print(f"❌ Error: {e}\n")
    
    except Exception as e:
        print(f"❌ Failed to initialize Gemini: {e}")
        print("Make sure your GEMINI_API_KEY is set in the .env file")


if __name__ == "__main__":
    chat_with_gemini()
