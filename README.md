![Alt text](./public/clarity-logo-2.png)

A conversational AI assistant that helps optimize your calendar schedule through natural dialogue. The system ingests your Google Calendar events, gathers clarifications about scheduling concerns, and proposes non-destructive schedule changes that you can selectively accept.

## Features

- **Voice-driven conversation**: Natural language interaction with TTS support
- **Smart schedule analysis**: AI-powered calendar optimization using Gemini API
- **Selective acceptance**: Choose which proposed changes to apply
- **Safe calendar sync**: Atomic per-event synchronization with Google Calendar
- **Undo functionality**: Single-level undo for applied changes
- **Sleep assessment**: Evaluates schedule impact on sleep patterns
- **Real-time diff visualization**: Side-by-side calendar view showing current vs proposed changes

## Quick Start

### Prerequisites

- Node.js 18+
- Google Cloud project with OAuth client (web) configured
- ElevenLabs API key
- Gemini API key (Google AI Studio)

### Environment Setup

Create a `.env.local` file in the project root:

```env
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=... 
NEXTAUTH_SECRET=dev-secret-change-in-production
ELEVENLABS_API_KEY=sk_...
GEMINI_API_KEY=...
GOOGLE_CALENDAR_SCOPES=https://www.googleapis.com/auth/calendar.events
```

### Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Demo Flow

1. **Sign in** with Google → consent to Calendar events access
2. **Start conversation** → "My Tuesdays are too hectic"
3. **Answer clarifying questions** → "I want more focus time and earlier dinner"
4. **Review proposal** → see highlighted changes with rationale
5. **Apply selectively** → choose which changes to sync to Google Calendar
6. **Verify in Google Calendar** → changes appear in your actual calendar
7. **Undo if needed** → revert last applied changes

## Testing

Run the complete test suite:

```bash
# All tests
npm test

# Individual test suites
npm run test:unit        # Model validation, utilities
npm run test:contract    # API endpoint contracts
npm run test:integration # End-to-end workflows
npm run test:e2e         # Playwright browser tests
```

### Test Coverage

- **Contract tests**: Validate all API endpoints match OpenAPI specifications
- **Integration tests**: Conversation flow and calendar sync workflows
- **Unit tests**: Schema validation, diff utilities, sleep assessment
- **E2E tests**: Full browser automation of quickstart scenarios

## Architecture

### Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js (Google OAuth)
- **AI**: Gemini API for conversation and proposal generation
- **TTS**: ElevenLabs for voice responses
- **Calendar**: Google Calendar API with atomic sync operations
- **Validation**: Zod schemas for type safety
- **Testing**: Vitest (unit/integration), Playwright (E2E)

### Project Structure

```
app/
  api/                    # API routes matching OpenAPI contracts
    conversation/clarify/ # Generate clarifying questions
    proposal/generate/    # Create schedule proposals
    proposal/apply/       # Sync changes to Google Calendar
    proposal/undo/        # Revert last application
    calendar/events/      # Fetch calendar events
    tts/speak/           # Text-to-speech conversion
  page.tsx               # Main application UI

lib/
  models/               # TypeScript interfaces + Zod schemas
  gemini.ts            # AI prompt and response handling
  google-calendar.ts   # Calendar API client with retry logic
  elevenlabs-tts.ts    # Text-to-speech service
  proposal-schema.ts   # Validation for AI-generated proposals
  diff.ts              # Calendar change utilities

components/
  CalendarPanel.tsx    # Current vs proposed event displays
  ConversationPanel.tsx # Chat interface with transcript
  ProposalPanel.tsx    # Change review and selection UI

tests/
  contract/            # API endpoint validation
  integration/         # Workflow testing
  unit/               # Model and utility testing
  e2e/                # Browser automation
```

## Performance Goals

- **First clarifying question**: < 2 seconds
- **Complete proposal generation**: < 60 seconds from session start
- **TTS playback start**: < 1.5 seconds after text ready
- **Calendar sync**: Atomic operations with exponential backoff (2s/4s/8s)

## Data Storage

- **Authoritative data**: Google Calendar (no separate database)
- **Session state**: In-memory (proposals, transcript)
- **User preferences**: localStorage (sleep targets, priorities)
- **Authentication**: NextAuth.js sessions

## API Documentation

The system exposes REST endpoints documented in OpenAPI format:

- `POST /api/conversation/clarify` - Generate clarifying questions
- `POST /api/proposal/generate` - Create schedule proposals
- `POST /api/proposal/apply` - Apply changes to calendar
- `POST /api/proposal/undo` - Revert last application
- `GET /api/calendar/events` - Fetch calendar events
- `POST /api/tts/speak` - Convert text to speech

See `specs/001-build-an-ai/contracts/openapi.yaml` for complete specifications.

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint checking
npm run test:watch   # Watch mode for unit tests
```

## Accessibility

- WCAG AA color contrast compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

## Limitations (MVP Scope)

- Single user sessions (no multi-user support)
- Single undo level (no full history)
- Small calendar scope (< 200 events optimized)
- Desktop Chrome optimized (mobile responsive but not primary target)

## Contributing

This is a hackathon MVP project. The implementation follows test-driven development with comprehensive coverage of the core scheduling workflow.

## License

Open source project. Please check Google Calendar API and ElevenLabs terms of service for usage restrictions.
