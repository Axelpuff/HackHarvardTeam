# Gemini Calendar Assistant Implementation

## Overview

This implementation provides a comprehensive AI-powered calendar assistant using Google's Gemini AI with function calling capabilities. The assistant integrates natural language processing with Google Calendar API for intelligent schedule optimization.

## Features Implemented

### ✅ Core Functionality
- **Natural Language Processing**: Accepts user input in natural language (e.g., "My Tuesdays are too hectic")
- **Conversational Flow**: Maintains context and asks clarifying questions
- **Function Calling**: Gemini can call calendar functions directly
- **Schedule Optimization**: Generates intelligent proposals for schedule improvements
- **Conflict Detection**: Analyzes and resolves scheduling conflicts
- **Sleep Impact Assessment**: Evaluates schedule changes on sleep patterns

### ✅ Calendar Operations
- **Event Retrieval**: Fetch calendar events for date ranges
- **Event Creation**: Create new calendar events
- **Event Updates**: Modify existing events
- **Event Deletion**: Remove events from calendar
- **Batch Operations**: Apply multiple changes atomically

### ✅ Proposal System
- **Change Items**: Individual modifications (add, move, remove, adjust)
- **Rationale Generation**: AI-generated explanations for each change
- **Sleep Assessment**: Automatic evaluation of sleep impact
- **Approval Workflow**: User confirmation before applying changes

## File Structure

```
├── gemini_calendar_assistant.py     # Comprehensive Python implementation
├── gemini_calendar_chat.py          # Enhanced chat interface
├── lib/gemini-calendar-assistant.ts # TypeScript implementation
├── test_calendar_assistant.py       # Demo and testing script
└── GEMINI_CALENDAR_ASSISTANT.md     # This documentation
```

## Quick Start

### 1. Python Implementation

```python
from gemini_calendar_chat import GeminiCalendarChat

# Initialize the assistant
assistant = GeminiCalendarChat()

# Process user input
response = assistant.chat_with_calendar_context("My Tuesdays are too hectic")
print(response)
```

### 2. TypeScript Implementation

```typescript
import { GeminiCalendarAssistant } from './lib/gemini-calendar-assistant';

const assistant = new GeminiCalendarAssistant({
  geminiApiKey: 'your-gemini-key',
  googleCalendarAccessToken: 'your-calendar-token'
});

const result = await assistant.processUserInput("My Tuesdays are too hectic");
console.log(result.message);
```

### 3. Demo Mode

```bash
# Run the demo (no API keys required)
python test_calendar_assistant.py

# Run interactive chat (requires API keys)
python gemini_calendar_chat.py
```

## Function Calling Capabilities

The assistant can execute these functions based on user requests:

1. **`get_calendar_events`** - Retrieve events for date ranges
2. **`create_calendar_event`** - Add new events to calendar
3. **`update_calendar_event`** - Modify existing events
4. **`delete_calendar_event`** - Remove events from calendar
5. **`generate_schedule_proposal`** - Create optimization proposals
6. **`analyze_schedule_conflicts`** - Detect scheduling conflicts
7. **`assess_sleep_impact`** - Evaluate sleep schedule impact

## Example Conversation Flow

```
User: "My Tuesdays are too hectic"

Assistant: "I understand you're feeling overwhelmed with your schedule. 
What specific aspects of your Tuesday schedule feel most problematic? 
Are there particular meetings or activities that are causing the most stress?"

User: "I have too many meetings back-to-back and no time for focused work"

Assistant: "Thank you for that clarification. Let me generate a schedule 
proposal that addresses your meeting conflicts and adds dedicated focus time."

[Function Call: generate_schedule_proposal]

Assistant: "I've created a proposal with 3 changes:
1. Added 2-hour focus block Tuesday morning (9-11 AM)
2. Moved team meeting from 2 PM to 10 AM  
3. Extended lunch break to 90 minutes (12-1:30 PM)

This should give you dedicated focus time and reduce meeting fatigue. 
Would you like me to apply these changes to your calendar?"
```

## Integration with Existing Architecture

The implementation follows the specifications from `spec.md` and integrates with:

- **Next.js API Routes**: TypeScript version works with existing API endpoints
- **Google Calendar API**: Full integration with calendar operations
- **NextAuth.js**: Compatible with existing authentication
- **Zod Schemas**: Uses existing data validation schemas
- **Conversation State**: Maintains context per the specifications

## Configuration

### Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### User Preferences

```python
preferences = {
    'sleep_target_hours': 7,
    'priorities': ['sleep', 'focus', 'exercise'],
    'protected_windows': [],
    'iteration_count': 0
}
```

## Testing

The implementation includes comprehensive testing:

- **Mock Mode**: Demo without API keys
- **Unit Tests**: Individual function testing
- **Integration Tests**: End-to-end conversation flow
- **Error Handling**: Graceful failure modes

## Performance Considerations

- **Response Time**: < 2 seconds for clarifying questions
- **Proposal Generation**: < 60 seconds for complete proposals
- **Function Calls**: Atomic operations with retry logic
- **Context Management**: Efficient conversation state handling

## Security & Privacy

- **API Key Management**: Secure credential handling
- **Data Validation**: Zod schema validation
- **Error Handling**: No sensitive data in error messages
- **User Consent**: Confirmation before calendar changes

## Future Enhancements

- **Recurring Events**: Enhanced support for recurring patterns
- **Multi-Calendar**: Support for multiple calendar sources
- **ML Personalization**: Learning from user preferences
- **Voice Integration**: Speech-to-text and text-to-speech
- **Mobile Optimization**: Responsive design improvements

## Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure GEMINI_API_KEY is set correctly
2. **Calendar Access**: Verify Google Calendar permissions
3. **Function Calls**: Check Gemini model supports function calling
4. **Rate Limits**: Implement exponential backoff for API calls

### Debug Mode

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Check conversation context
context = assistant.get_calendar_context()
print(json.dumps(context, indent=2))
```

## Contributing

The implementation follows the project's architecture patterns and can be extended with:

- Additional calendar functions
- Enhanced AI prompts
- New proposal types
- Integration with other services

## License

This implementation is part of the AI Schedule Counseling Assistant project and follows the same licensing terms.
