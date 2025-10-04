# Quickstart: AI Schedule Counseling Assistant

This quickstart shows the end-to-end demo path for the hackathon MVP.

## Prerequisites
- Node.js 18+
- Google Cloud project with OAuth client (web) configured
- ElevenLabs API key
- Gemini API key (Google AI Studio)

## Environment Variables (example .env.local)
```
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=... (if required for server exchange; PKCE preferred)
NEXTAUTH_SECRET=dev-secret-change
ELEVENLABS_API_KEY=sk_...
GEMINI_API_KEY=...
GOOGLE_CALENDAR_SCOPES=https://www.googleapis.com/auth/calendar.events
```

## Flow Steps
1. Sign in with Google (NextAuth) → consent screen for Calendar events scope.
2. Landing shows two calendar panels: Current (left) empty placeholder until load, Proposed (right) with onboarding message.
3. Press "Start Conversation"; allow microphone (if supported) OR type into input.
4. Say: "My Tuesdays are too hectic." → system generates clarifying question (TTS plays) and displays in transcript.
5. Provide answer (e.g., "I want more focus time and earlier dinner") until system generates a proposal.
6. Proposal appears: events diff highlighted (Add/Move/Remove/Adjust), each with rationale tooltip.
7. (Optional) Reject one change (checkbox) and request a modification verbally.
8. Click "Apply Changes" → consent modal (first time) summarizing number of creates/updates/deletes → confirm.
9. Sync executes; if all succeed → success toast + Proposed panel badge "Applied".
10. (Optional) Click Undo to revert last application.
11. Export transcript (.txt) via Export button.

## Smoke Test Script (Manual)
- Start dev server: `npm run dev` (placeholder) and open app.
- Complete steps 1–10 above in under 3 minutes.
- Verify:
  - Clarifying question < 2s (subjective)
  - Proposal shows >= 3 change types
  - Rationale visible on hover/click
  - WCAG AA contrast (use browser extension quick check)
  - Undo restores original calendar diff state
  - After Apply, confirm events actually appear/are updated in the connected Google Calendar (open calendar.google.com in another tab and refresh). Added events have correct title/start/end; moved/adjusted events reflect new times.
  - Optional: Perform Undo then refresh Google Calendar and confirm the reverted events reflect prior state.

## Error Simulation
- Revoke Calendar permissions in Google account → attempt Apply → expect error notice and no changes.
- Disable network (DevTools) during Apply after first event to test retry/backoff display.

## Cleanup
- Sign out via profile menu.
- Clear preferences: click "Reset Preferences" in settings panel.

## Notes
This is an MVP. No separate database is used; authoritative schedule data persists in Google Calendar via the Apply action (write operations: create/update/delete). Ephemeral conversational artifacts (proposals, transcript) are held in memory and cleared on refresh; user preferences persist locally (localStorage). This enables demonstrating real sync back to Google Calendar without maintaining additional server-side storage.
