# Gemini Calendar Chat Integration

This document explains how to run the integrated Gemini Calendar Chat feature that connects the Next.js frontend with the Python backend.

## Overview

The integration consists of:
1. **Python Flask Server** (`gemini_flask_server.py`) - Provides REST API for Gemini chat
2. **Next.js API Route** (`app/api/conversation/chat/route.ts`) - Bridges frontend and Python backend
3. **Updated Frontend** (`app/page.tsx`) - Interactive conversation interface

## Setup Instructions

### 1. Install Python Dependencies

```bash
# Create virtual environment (if not exists)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start the Python Flask Server

#### Option A: Use the provided script
```bash
./start_gemini_server.sh
```

#### Option B: Manual start
```bash
# Activate virtual environment
source venv/bin/activate

# Start Flask server
python3 gemini_flask_server.py
```

The server will start on `http://localhost:5000`

### 4. Start the Next.js Frontend

In a separate terminal:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

1. **Sign in** to the application with Google OAuth
2. **Click "Start Conversation"** in the conversation panel
3. **Chat with the AI assistant** about your scheduling needs
4. **Send messages** using the input field and Send button

## API Endpoints

### Python Flask Server (Port 5000)

- `GET /health` - Health check
- `POST /api/chat/start` - Start new conversation
- `POST /api/chat/message` - Send message
- `GET /api/chat/context` - Get conversation context
- `POST /api/chat/clear` - Clear conversation
- `GET /api/chat/status` - Get server status

### Next.js API Routes (Port 3000)

- `POST /api/conversation/chat?action=start` - Start conversation
- `POST /api/conversation/chat` - Send message

## Features

### Gemini Calendar Chat Capabilities

- **Natural Language Processing**: Understands scheduling problems and questions
- **Function Calling**: Can analyze calendar events, create proposals, detect conflicts
- **Context Awareness**: Maintains conversation history and user preferences
- **Sleep Assessment**: Evaluates schedule impact on sleep patterns
- **Conflict Detection**: Identifies scheduling conflicts and overlaps

### Frontend Features

- **Real-time Chat Interface**: Interactive conversation with typing indicators
- **Session Management**: Maintains conversation state across messages
- **Error Handling**: Graceful handling of server unavailability
- **Loading States**: Visual feedback during AI processing

## Troubleshooting

### Common Issues

1. **"Chat service is unavailable"**
   - Ensure the Python Flask server is running on port 5000
   - Check that `GEMINI_API_KEY` is set in `.env`

2. **"Failed to start conversation"**
   - Verify Python dependencies are installed
   - Check Flask server logs for errors

3. **CORS errors**
   - Flask server has CORS enabled for localhost:3000
   - Ensure both servers are running on expected ports

### Debug Steps

1. **Check Flask server health**:
   ```bash
   curl http://localhost:5000/health
   ```

2. **Check server status**:
   ```bash
   curl http://localhost:5000/api/chat/status
   ```

3. **View Flask server logs** for detailed error messages

## Development

### File Structure

```
├── gemini_flask_server.py          # Python Flask API server
├── gemini_calendar_chat.py         # Gemini chat logic
├── app/api/conversation/chat/      # Next.js API bridge
├── app/page.tsx                    # Updated frontend
├── start_gemini_server.sh          # Startup script
└── requirements.txt                # Python dependencies
```

### Adding New Features

1. **Extend Python backend**: Add new endpoints in `gemini_flask_server.py`
2. **Update Next.js API**: Add corresponding routes in `app/api/conversation/chat/route.ts`
3. **Enhance frontend**: Update `app/page.tsx` for new UI features

## Security Notes

- The Flask server runs on `0.0.0.0:5000` for development
- CORS is enabled for localhost origins
- API keys should be stored securely in environment variables
- Consider adding authentication for production deployment

## Next Steps

- [ ] Add voice input integration
- [ ] Implement calendar event synchronization
- [ ] Add proposal acceptance/rejection workflow
- [ ] Enhance error handling and user feedback
- [ ] Add conversation export functionality
