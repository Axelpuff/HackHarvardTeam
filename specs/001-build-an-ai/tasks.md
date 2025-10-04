---
feature: AI Schedule Counseling Assistant
spec_path: /Users/axelsoderquist/development/HackHarvardTeam/specs/001-build-an-ai/spec.md
created: 2025-10-04
---

# Tasks: AI Schedule Counseling Assistant

This tasks file is generated from the design artifacts in:

- `/Users/axelsoderquist/development/HackHarvardTeam/specs/001-build-an-ai/plan.md`
- `/Users/axelsoderquist/development/HackHarvardTeam/specs/001-build-an-ai/data-model.md` (entities)
- `/Users/axelsoderquist/development/HackHarvardTeam/specs/001-build-an-ai/contracts/` (OpenAPI)
- `/Users/axelsoderquist/development/HackHarvardTeam/specs/001-build-an-ai/research.md`
- `/Users/axelsoderquist/development/HackHarvardTeam/specs/001-build-an-ai/quickstart.md`

Task generation rules applied:

- Tests-first (write failing tests from `contracts/` before implementing routes)
- Each entity in `data-model.md` → create a model task marked [P]
- Each contract file / endpoint → create contract test tasks marked [P]
- Different-target-file tasks marked [P] (parallelizable); same-file tasks are sequential
- Tasks ordered by dependencies: Setup → Tests → Models → Services → Endpoints → Integration → Polish

All paths below are absolute and relative to the repository root.

Numbering: T001, T002, ...

## Setup (must complete first)

T001 [X] Initialize project & install core deps

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/`
- Action: Ensure Node 18+, install dependencies described in `plan.md` (Next.js, Tailwind, NextAuth, Zod, Vitest, Playwright). Create `.env.local.example` with keys described in `quickstart.md`.
- Notes: This is a global setup task. No other tasks should start until dev dependencies are available.

T002 [X] Configure linting, formatting, and dev scripts [P]

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/package.json`, `/Users/axelsoderquist/development/HackHarvardTeam/.eslintrc.*`, `/Users/axelsoderquist/development/HackHarvardTeam/.prettierrc`
- Action: Add ESLint + Prettier + TypeScript configs consistent with Next.js app router, add npm scripts: `dev`, `build`, `start`, `test`, `test:unit`, `test:integration`, `lint`.
- Notes: Parallelizable with other file-creation tasks that don't depend on running the app.

## Tests (TDD) — write failing tests before implementation

Contract tests: one per OpenAPI path (files in `contracts/openapi.yaml`) — these should assert request/response shapes and initially fail.

T010 [X][P] Contract test: `POST /conversation/clarify`

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/tests/contract/test_conversation_clarify.test.ts`
- Action: Write a failing Vitest test that POSTs a sample body matching the `GenerateProposalRequest`/clarify contract and asserts `200` with `{ ok: true, question: string }` schema.

T011 [X][P] Contract test: `POST /proposal/generate`

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/tests/contract/test_proposal_generate.test.ts`
- Action: Write a failing test that POSTs a `GenerateProposalRequest` example (use small `events` array from `openapi.yaml`) and asserts the response matches `GenerateProposalResponse` schema.

T012 [X][P] Contract test: `POST /proposal/apply`

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/tests/contract/test_proposal_apply.test.ts`
- Action: Write a failing test that posts `ApplyProposalRequest` and asserts `ApplyProposalResponse` shape.

T013 [X][P] Contract test: `POST /proposal/undo`

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/tests/contract/test_proposal_undo.test.ts`
- Action: Failing test asserting `UndoResponse` shape.

T014 [X][P] Contract test: `POST /tts/speak` (binary/audio response)

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/tests/contract/test_tts_speak.test.ts`
- Action: Write a failing test asserting route returns `200` and `Content-Type: audio/mpeg` (or accepts JSON wrapper for tests).

T015 [X][P] Contract test: `GET /calendar/events`

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/tests/contract/test_calendar_events.test.ts`
- Action: Failing test that GETs with `scope=day` and asserts events array schema.

Integration tests (quickstart scenarios)

T020 [X][P] Integration test: Conversation clarifying flow → proposal generation

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/tests/integration/test_conversation_flow.test.ts`
- Action: Simulate: POST `conversation/clarify` → answer question(s) → POST `proposal/generate` and assert proposal schema and at least one change item.

T021 [X][P] Integration test: Apply proposal to calendar (mock Google API)

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/tests/integration/test_apply_flow.test.ts`
- Action: Mock Google Calendar responses; assert `proposal/apply` returns appliedChangeIds for all changes or returns failed list with structured errors when simulating network failures.

## Core Implementation (write code after tests fail)

Models & validation (from `data-model.md`) — each entity gets a TypeScript type + Zod schema

T030 [X][P] Create model + Zod schema: `User` (SessionContext)

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/lib/models/user.ts`
- Action: Implement TypeScript interface and Zod schema following `data-model.md`.

T031 [X][P] Create model + Zod schema: `CalendarEvent`

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/lib/models/calendarEvent.ts`
- Action: Implement type + schema (start < end validation).

T032 [X][P] Create model + Zod schema: `ProblemStatement`, `ClarifyingQuestion`, `Proposal`, `ChangeItem`, `TranscriptEntry`, `PreferenceSet`, `SyncOperation`

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/lib/models/proposal.ts`
- Action: Implement types + schemas for the remaining entities in `data-model.md`.

Services and utilities

T040 [X][P] Implement `lib/gemini.ts` helper (prompt + response parsing)

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/lib/gemini.ts`
- Action: Small wrapper that sends request to Gemini API (or a local mock during tests) and returns parsed JSON. Include retry/validation hook.

T041 [X][P] Implement `lib/elevenlabs-tts.ts` proxy helper

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/lib/elevenlabs-tts.ts`
- Action: Helper to call ElevenLabs API; server route will use this. Provide an interface usable by `tests` that can be mocked.

T042 [X][P] Implement `lib/proposal-schema.ts` Zod validators used in API routes

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/lib/proposal-schema.ts`
- Action: Zod schemas to validate LLM output; tests should import and run them.

API route stubs (implementations may be minimal to satisfy tests)

T050 [X] Implement API route: `app/api/conversation/clarify/route.ts` (POST)

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/app/api/conversation/clarify/route.ts`
- Action: Read request, call `lib/gemini.ts` to generate question text (for now return mock question), validate input, and respond with `{ ok: true, question }`.
- Dependency: Requires T032 (schemas) and T040 (gemini) for validation.

T051 [X] Implement API route: `app/api/proposal/generate/route.ts` (POST)

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/app/api/proposal/generate/route.ts`
- Action: Accept `GenerateProposalRequest`, run schema validation, call `lib/gemini.ts` (or mocked generator) to produce a `Proposal` object, validate with `lib/proposal-schema.ts` and return `GenerateProposalResponse`.
- Dependency: T032, T040, T042

T052 [X] Implement API route: `app/api/proposal/apply/route.ts` (POST)

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/app/api/proposal/apply/route.ts`
- Action: Accept `ApplyProposalRequest`, map `ChangeItem`s to Google Calendar API calls (use `lib/google-calendar.ts` stub/mock for tests), perform per-event atomic ops with retry/backoff, return `ApplyProposalResponse`.
- Dependency: T032, T041 (for audio consent flow UI), T040 (if rationale summaries are required)

T053 [X] Implement API route: `app/api/proposal/undo/route.ts` (POST)

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/app/api/proposal/undo/route.ts`
- Action: Use in-memory last-applied snapshot to revert changes; return `UndoResponse`.
- Dependency: T052

T054 [X] Implement API route: `app/api/tts/speak/route.ts` (POST)

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/app/api/tts/speak/route.ts`
- Action: Accept text, call `lib/elevenlabs-tts.ts`, stream or return audio response. For testability, support a JSON response mode when `TEST_MODE=1`.
- Dependency: T041

T055 [X] Implement API route: `app/api/calendar/events/route.ts` (GET)

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/app/api/calendar/events/route.ts`
- Action: Read query `scope` (day|week), call `lib/google-calendar.ts` mock/stub to return events in schema.
- Dependency: T032

Integration & infrastructure

T060 [X] Implement `lib/google-calendar.ts` calendar client (mockable)

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/lib/google-calendar.ts`
- Action: Wrapper for Google Calendar REST calls; supports create/update/delete/list; include retry/backoff logic and structured error objects for Apply route to return `failed` list.
- Notes: In tests this should be mocked to avoid network.

T061 [X] Add NextAuth.js setup for Google OAuth (server-side)

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/app/api/auth/[...nextauth]/route.ts`, and NextAuth config in `/Users/axelsoderquist/development/HackHarvardTeam/lib/auth.ts`
- Action: Implement basic Google provider session handling; ensure calendar scopes requested match `quickstart.md`.

T062 [X] Implement local storage helper for `PreferenceSet`

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/lib/preferences.ts`
- Action: Simple wrapper to persist and validate preferences via Zod.

Frontend minimal UI (to enable quick smoke tests)

T070 [X] Add `app/page.tsx` landing with two panels + Start Conversation button

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/app/page.tsx`
- Action: Minimal UI that can call the routes above; stubbed components acceptable for MVP smoke tests.

T071 [X] Add `components/ConversationPanel.tsx`, `components/CalendarPanel.tsx`, `components/ProposalPanel.tsx`

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/components/`
- Action: Minimal renderers to show transcript, events, and proposal diff. These can be implemented in separate files and are parallelizable [P].

## Integration & Polish

T080 [X] Add unit tests for proposal schema and diff utilities

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/tests/unit/test_proposal_schema.test.ts`, `/Users/axelsoderquist/development/HackHarvardTeam/tests/unit/test_diff.test.ts`
- Action: Ensure `lib/proposal-schema.ts` and `lib/diff.ts` validated; aim for quick test coverage on schema correctness and sleep estimation.

T081 Add Playwright smoke test for quickstart flow (manual / automation)

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/tests/e2e/quickstart.spec.ts`
- Action: Launch dev server, sign-in flow can be mocked, simulate conversation and apply; this is a smoke test and can be run after core routes implemented.

T090 [P] Documentation: Update `README.md` and add `specs/001-build-an-ai/tasks.md` usage notes

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/README.md`, `/Users/axelsoderquist/development/HackHarvardTeam/specs/001-build-an-ai/tasks.md`
- Action: Add run instructions, env var examples (from quickstart.md), how to run tests.

T091 [P] Polish: Accessibility checks, color contrast, and UX tweaks

- Path: `/Users/axelsoderquist/development/HackHarvardTeam/app/`, `/Users/axelsoderquist/development/HackHarvardTeam/components/`
- Action: Ensure WCAG AA contrast and keyboard navigation on major UI components.

## Parallel execution groups (examples)

- Group A (can run in parallel): T010, T011, T012, T013, T014, T015 (contract tests) — path: `/Users/axelsoderquist/development/HackHarvardTeam/tests/contract/`
- Group B (models + validators) [P]: T030, T031, T032, T042 — path: `/Users/axelsoderquist/development/HackHarvardTeam/lib/`
- Group C (frontend components) [P]: T071, T070 — path: `/Users/axelsoderquist/development/HackHarvardTeam/components/` and `/Users/axelsoderquist/development/HackHarvardTeam/app/`

Example Task agent commands (copyable):

- Run contract tests in parallel (agent):
  - Task: "Run contract tests"
  - Files:
    - `/Users/axelsoderquist/development/HackHarvardTeam/tests/contract/test_conversation_clarify.test.ts`
    - `/Users/axelsoderquist/development/HackHarvardTeam/tests/contract/test_proposal_generate.test.ts`
    - `/Users/axelsoderquist/development/HackHarvardTeam/tests/contract/test_proposal_apply.test.ts`

- Create model `Proposal` (agent):
  - Task: "Create `lib/models/proposal.ts` with Zod schemas matching `data-model.md` and wire tests to import it"

## Dependency notes / ordering summary

- Setup (T001, T002) must finish before running tests or starting dev server.
- Contract tests (T010-T015) must exist and fail before implementing API routes (T050-T055).
- Models (T030-T032) and validators (T042) should exist before route implementations which import them.
- `lib/google-calendar.ts` (T060) should be implemented as a mock first to allow tests to run offline.
- UI tasks (T070-T071) are parallelizable but rely on routes to be present for smoke tests.

## Coverage mapping back to requirements

- Contracts → Tests: All OpenAPI paths in `specs/001-build-an-ai/contracts/openapi.yaml` mapped to contract test tasks (T010-T015). (Done)
- Data model → Models: Each entity in `data-model.md` mapped to a model/schema task (T030-T032). (Done)
- User flows/quickstart → Integration tests: Quickstart scenarios mapped to integration tests (T020, T021). (Done)

## Next steps I will take

- Mark this tasks.md file created and complete this todo (will update todo list now).
