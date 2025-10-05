#!/bin/bash

# Start Gemini Calendar Chat Flask Server
# This script starts the Python Flask server that provides the chat API

echo "🚀 Starting Gemini Calendar Chat Flask Server..."
echo "=============================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed or not in PATH"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update requirements
echo "📥 Installing/updating requirements..."
pip install -r requirements.txt

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Please create a .env file with your GEMINI_API_KEY"
    echo "Example:"
    echo "GEMINI_API_KEY=your_api_key_here"
    echo ""
fi

# Start the Flask server
echo "🌟 Starting Flask server on http://localhost:5000"
echo "💬 Chat API will be available at http://localhost:5000/api/chat/"
echo "🏥 Health check: http://localhost:5000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=============================================="

python3 gemini_flask_server.py
