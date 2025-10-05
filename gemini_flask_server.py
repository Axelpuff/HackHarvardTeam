#!/usr/bin/env python3
"""
Flask server to expose Gemini Calendar Chat as a REST API
"""

import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import threading
import queue
import time

# Suppress warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

from gemini_calendar_chat import GeminiCalendarChat

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

# Global chat instance
chat_instance = None
chat_lock = threading.Lock()

class ChatManager:
    """Manages chat instances and sessions"""
    
    def __init__(self):
        self.sessions = {}
        self.session_lock = threading.Lock()
    
    def get_or_create_session(self, session_id=None):
        """Get existing session or create new one"""
        if not session_id:
            session_id = f"session_{int(time.time())}"
        
        with self.session_lock:
            if session_id not in self.sessions:
                self.sessions[session_id] = GeminiCalendarChat()
                print(f"Created new chat session: {session_id}")
            
            return session_id, self.sessions[session_id]
    
    def clear_session(self, session_id):
        """Clear a specific session"""
        with self.session_lock:
            if session_id in self.sessions:
                del self.sessions[session_id]
                print(f"Cleared chat session: {session_id}")

# Global chat manager
chat_manager = ChatManager()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'active_sessions': len(chat_manager.sessions)
    })

@app.route('/api/chat/start', methods=['POST'])
def start_conversation():
    """Start a new conversation session"""
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id')
        
        # Get or create session
        session_id, chat_instance = chat_manager.get_or_create_session(session_id)
        
        # Get initial greeting
        initial_response = chat_instance.chat_with_calendar_context(
            "Hello! I'm ready to help you optimize your schedule. What scheduling challenge are you facing?"
        )
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'message': initial_response,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chat/message', methods=['POST'])
def send_message():
    """Send a message to the chat assistant"""
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({
                'success': False,
                'error': 'Message is required'
            }), 400
        
        message = data['message']
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({
                'success': False,
                'error': 'Session ID is required'
            }), 400
        
        # Get chat instance
        _, chat_instance = chat_manager.get_or_create_session(session_id)
        
        # Send message and get response
        response = chat_instance.chat_with_calendar_context(message)
        
        return jsonify({
            'success': True,
            'response': response,
            'session_id': session_id,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chat/context', methods=['GET'])
def get_context():
    """Get current conversation context"""
    try:
        session_id = request.args.get('session_id')
        if not session_id:
            return jsonify({
                'success': False,
                'error': 'Session ID is required'
            }), 400
        
        # Get chat instance
        _, chat_instance = chat_manager.get_or_create_session(session_id)
        
        # Get context
        context = chat_instance.get_calendar_context()
        
        return jsonify({
            'success': True,
            'context': context,
            'session_id': session_id
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chat/clear', methods=['POST'])
def clear_conversation():
    """Clear the conversation history"""
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id')
        
        if session_id:
            # Clear specific session
            chat_manager.clear_session(session_id)
        else:
            # Clear all sessions
            with chat_manager.session_lock:
                chat_manager.sessions.clear()
        
        return jsonify({
            'success': True,
            'message': 'Conversation cleared'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chat/status', methods=['GET'])
def get_status():
    """Get server status and active sessions"""
    try:
        sessions_info = []
        with chat_manager.session_lock:
            for session_id, chat_instance in chat_manager.sessions.items():
                context = chat_instance.get_calendar_context()
                sessions_info.append({
                    'session_id': session_id,
                    'problem_statement': context.get('problem_statement', ''),
                    'questions_asked': len(context.get('questions_asked', [])),
                    'proposals_generated': context.get('proposals_generated', 0)
                })
        
        return jsonify({
            'success': True,
            'active_sessions': len(chat_manager.sessions),
            'sessions': sessions_info,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    # Check for required environment variables
    if not os.getenv('GEMINI_API_KEY'):
        print("⚠️ Warning: GEMINI_API_KEY not found in environment variables")
        print("The server will start but chat functionality may not work properly.")
    
    print("🚀 Starting Gemini Calendar Chat Flask Server...")
    print("📡 Server will be available at: http://localhost:5000")
    print("🔗 Health check: http://localhost:5000/health")
    print("💬 Chat API: http://localhost:5000/api/chat/*")
    print("=" * 60)
    
    # Start the Flask server
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    )
