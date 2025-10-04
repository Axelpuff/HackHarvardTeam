#!/bin/bash
# Silent Gemini Chat Runner
# This script runs the Gemini chat while hiding all warnings

echo "🤖 Silent Gemini AI Chat"
echo "Type your message and press Enter. Type 'quit' to exit."
echo ""

# Run the chat with stderr redirected to /dev/null
python gemini_chat.py 2>/dev/null
