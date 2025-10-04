# Phase 0 Research: AI Schedule Counseling Conversational Assistant

Date: 2025-10-04  
Feature Branch: 001-build-an-ai  
Related Spec: /Users/axelsoderquist/development/HackHarvardTeam/specs/001-build-an-ai/spec.md

## Goals of Research Phase

Establish lightweight, feasible technical approach for a hackathon MVP using the mandated stack:

- Next.js (App Router) + TypeScript
- Tailwind CSS for rapid UI styling and accessible contrast
- Google Gemini API (LLM reasoning + dialog + proposal generation heuristics assistance)
- ElevenLabs API for low-latency TTS (AI speaking clarifying questions and proposals)
- Browser SpeechRecognition (Web Speech API) as primary STT (fallback manual text input); optional future: Whisper API if needed (OUT OF SCOPE now)
- Google Calendar API (read/write) via OAuth (PKCE) with minimal scopes (`https://www.googleapis.com/auth/calendar.events` + read-only if needed)

All spec ambiguities already resolved per user instruction. No remaining NEEDS CLARIFICATION markers.

## Key Decisions & Rationale

### 1. Project Structure

Decision: Monorepo single Next.js application (no separate backend service).  
Rationale: Next.js API routes suffice for Calendar + Gemini + ElevenLabs proxy calls; reduces deployment & coordination complexity; honors Constitution scope discipline.  
Alternatives: Separate Express/FastAPI backend (rejected: extra infra/overhead), serverless functions outside Next (rejected: fragmentation).

### 2. Data Handling & State

Decision: Client state managed with React server components + client components; transient conversational state (transcript, problem statement, proposals) in a lightweight state store (React Context initially). Google Calendar itself is the authoritative persistent store for schedule data—no separate application database; preferences persist locally (localStorage).  
Rationale: Simplicity + minimal new dependencies; leverages existing reliable persistence (Calendar) while avoiding DB setup overhead; aligns with hackathon timebox.  
Alternatives: Redux Toolkit (overhead), XState for dialog (powerful but time cost), adding a server DB (adds infra, migration, security surface with little MVP value).

### 2b. Persistence Strategy (Explicit)

Decision: Persist only applied event changes directly to Google Calendar via per-event API mutations (create/update/delete). Do not persist proposals or transcripts server-side; they reset on refresh. Single-level undo relies on in-memory reversal, not historical storage.  
Rationale: Meets demonstration goal of real bidirectional sync while constraining scope; reduces privacy risk and complexity.  
Alternatives: Server-side session store (would enable multi-device resume but out-of-scope), full event shadow copy DB (duplicate source of truth, adds consistency challenges).

### 3. Proposal Generation Strategy

Decision: Prompt-engineered Gemini calls producing a structured change list (JSON schema) given: Current Events, User Goal(s), Clarifications, Preferences. Heuristic validations applied client/server (sleep window, long event confirmations).  
Rationale: Avoid building full constraint solver; leverages LLM for reasoning + summarization.  
Alternatives: Deterministic scheduling algorithm (time prohibitive), local rule engine (still needs design time).

### 4. Change Application & Undo

Decision: Maintain last applied proposal snapshot in client memory; on Apply, send granular diff operations (create/update/delete) sequentially to Google Calendar; record operations to enable single-step undo by reversing diff while session active.  
Rationale: Simple, maps to FR-009 atomic per-event operations.  
Alternatives: Batch patch with full rollback (complex error handling overhead).

### 5. Authentication

Decision: NextAuth.js with Google provider (PKCE) limited to Calendar scopes; session token persisted via secure HTTP-only cookie.  
Rationale: Established library reduces auth pitfalls & accelerates integration.  
Alternatives: Manual OAuth flow (slower, higher error risk).

### 6. TTS Integration

Decision: Server-side API route proxies text → ElevenLabs TTS (streamed audio) to client audio element.  
Rationale: Hide API key, enable streaming, simple playback.  
Alternatives: Direct client call (exposes key), pre-generation full clips (latency).

### 7. Speech Input

Decision: Browser Web Speech API for immediate MVP; Provide fallback textarea if unsupported; record transcript entries with timestamps.  
Rationale: Zero external dependency; adequate for demo.  
Risk: Browser inconsistency (e.g., Safari). Provide fallback.

### 8. Accessibility & Contrast

Decision: Tailwind theme tokens ensuring WCAG AA for event color backgrounds + text; diff legend with icons + color + textual badges (Add / Move / Remove).  
Rationale: Meets FR-020 & inclusion principle.

### 9. Preferences Persistence

Decision: LocalStorage wrapper (e.g., simple module) with schema validation (Zod) for preference set and priorities.  
Rationale: Lightweight, no backend DB.  
Alternatives: IndexedDB (overkill), remote persistence (scope creep).

### 10. Error & Logging Strategy

Decision: Central utility for API route error responses using structured JSON: { ok:false, code, message }. Client logs to console; user-facing toast + transcript entry for errors affecting conversation.  
Rationale: Aligns Constitution Principle 3 (no silent failures).

### 11. Rate & Cost Management

Decision: Debounce user conversational turns; limit Gemini calls to: (a) Clarification question generation, (b) Proposal generation/update, (c) Rationale summarization.  
Rationale: Prevent runaway token cost / latency.

### 12. Testing Approach

Decision: Minimal vitest + Playwright smoke:

- Unit: proposal schema validator, diff generator, sleep constraint checker.
- Integration (mock network): conversation turn produces clarifying question.
- Smoke script: Launch dev server, simulate flow (manual doc).  
  Rationale: Constitution: minimal reliable quality with focus on core path.

### 13. Transcript Export

Decision: Client-side generate .txt blob from transcript state; force download; exclude PII.  
Rationale: Simplicity & ephemeral requirement.

### 14. Network Retry (FR-023)

Decision: Wrapper for calendar mutation fetch with exponential backoff (2s, 4s, 8s) & aggregated error list; manual retry button triggers re-run of failed operations list.  
Rationale: Meets requirement with minimal complexity.

### 15. AI Visual Representation

Decision: Neutral animated waveform SVG component reacting to TTS playback state.  
Rationale: Non-anthropomorphized, simple visual feedback.  
Alternatives: Avatar image (risk anthropomorphism).

## Risks & Mitigations

| Risk                                    | Impact                  | Likelihood | Mitigation                                                                                        |
| --------------------------------------- | ----------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| Gemini latency >2s                      | Weak demo flow          | Medium     | Preload system prompt; compress event list (summaries)                                            |
| Speech API unsupported                  | Voice input unavailable | Medium     | Fallback manual text input prominently available                                                  |
| Calendar sync partial failures          | Data inconsistency      | Medium     | Per-event atomic ops + explicit error list + no local state commit on failure                     |
| Over-token prompts (large calendars)    | Cost & latency          | High       | Pre-summarize events: keep only (title,start,end,duration,category) & limit to context (day/week) |
| Time zone banner logic bugs             | User confusion          | Low        | Use GCal primary TZ exclusively; strict comparison; unit test                                     |
| Undo complexity with multiple proposals | Inconsistent state      | Low        | Single-level undo only; clear after new apply                                                     |
| TTS streaming fails                     | No audio feedback       | Medium     | Fallback to text only; show toast; keep transcript consistent                                     |

## Open Questions (None Blocking)

None (User explicitly stated spec clarified; proceed without /clarify gate.)

## Summary of Alternatives Rejected

- Dedicated backend microservice → complexity > benefit
- Complex scheduling algorithm → timebox risk; replaced by LLM + heuristics
- Redux/XState upfront → overkill for current state shape
- Client-direct ElevenLabs calls → secret exposure risk

## Prompt / Schema Strategy (Gemini)

Use a fixed system prompt describing constraints + JSON schema for proposal:

```
Proposal Schema: {
  revision: number,
  changes: [
    { id: string, type: 'add'|'move'|'remove'|'adjust', event: { title, start, end, durationMinutes }, rationale: string }
  ],
  summary: string,
  sleepAssessment: { estimatedSleepHours: number, belowTarget: boolean }
}
```

Validate with Zod; reject & request model retry if invalid.

## Constitution Alignment Check (Phase 0)

- Rapid Iteration: Single Next.js app, minimal libs ✔
- Scope Discipline: Only features enumerated in MVP list ✔
- Minimal Reliable Quality: Targeted vitest + Playwright smoke + inline assertions ✔
- Transparent Communication: Decisions captured here ✔
- Ethical/Responsible: Token keys server-side; no PII retention ✔

No violations requiring Complexity Tracking.

## Phase 0 Completion

All research decisions recorded; no unresolved clarifications. Ready for Phase 1 design.
