# Implementation Plan: AI Schedule Counseling Conversational Assistant

**Branch**: `001-build-an-ai` | **Date**: 2025-10-04 | **Spec**: [/Users/axelsoderquist/development/HackHarvardTeam/specs/001-build-an-ai/spec.md]
**Input**: Feature specification from `/specs/001-build-an-ai/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Conversational assistant that ingests a user's Google Calendar (day/week), gathers clarifications about a scheduling concern, and proposes non-destructive schedule changes side-by-side. MVP emphasizes rapid, voice-driven dialogue, clear diff visualization, selective acceptance, and safe application of changes back to Google Calendar (Google Calendar remains the authoritative persistent store; no separate database). Technical approach: Single Next.js (TypeScript) app with Tailwind; Gemini prompts generate structured proposal JSON; ElevenLabs provides TTS for system utterances; OAuth Google Calendar integration for read/write with per-event atomic sync + retry/backoff.

## Technical Context

**Language/Version**: TypeScript / Node 18 (Next.js latest)  
**Primary Dependencies**: Next.js (App Router), Tailwind CSS, NextAuth.js (Google), Gemini API client (fetch), ElevenLabs TTS (REST), Zod (validation), (optional) Zustand or React Context only  
**Storage**: No custom server DB; Google Calendar is authoritative persistent data store for events; localStorage for PreferenceSet; proposals/transcript transient in-memory state  
**Testing**: Vitest (unit), Playwright (smoke/integration), inline assertions  
**Target Platform**: Web (desktop Chrome for demo; fallback text input for unsupported speech browsers)  
**Project Type**: Single web application (frontend + lightweight API routes)  
**Performance Goals**: First clarifying question < 2s subjective; first proposal < 60s from session start; TTS playback start < 1.5s after text ready  
**Constraints**: Minimal scope, no DB, atomic per-event sync, WCAG AA contrast, single undo level, retry backoff 2s/4s/8s  
**Scale/Scope**: Hackathon demo (single user session; small calendars < 200 events considered)

## Constitution Check

Initial Review (Pre-Phase 0): PASS  
Post-Design Review (After Phase 1): PASS

Alignment:

- Rapid Iteration: Single Next.js app, no microservices.
- Scope Discipline: Only MVP FR list + selective acceptance (lightweight) + undo (single level).
- Minimal Reliable Quality: Targeted tests (proposal schema, diff, sleep check) + smoke.
- Transparent Communication: Decisions captured in `research.md`.
- Ethical/Responsible: Keys server-side only; no PII stored.

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

ios/ or android/

### Source Code (repository root)

```
app/                         # Next.js app router
   (site)/
      layout.tsx
      page.tsx                 # Entry with dual calendar panels
   api/
      conversation/clarify/route.ts
      proposal/generate/route.ts
      proposal/apply/route.ts
      proposal/undo/route.ts
      calendar/events/route.ts
      tts/speak/route.ts
lib/
   gemini.ts                  # Prompt + call helper
   proposal-schema.ts         # Zod schemas
   diff.ts                    # Change diff helpers
   sleep.ts                   # Sleep assessment logic
   retry.ts                   # Backoff wrapper
components/
   CalendarPanel.tsx
   ProposalPanel.tsx
   ConversationPanel.tsx
   Waveform.tsx
   PreferencesDialog.tsx
state/
   conversation.ts            # Context or Zustand store
   preferences.ts             # LocalStorage wrapper
styles/
   globals.css
tests/
   unit/
      proposal-schema.test.ts
      diff.test.ts
      sleep.test.ts
   integration/
      conversation-flow.test.ts
   contract/
      openapi-validate.test.ts
```

**Structure Decision**: Adopt consolidated single Next.js application with feature-oriented directories; API routes map directly to OpenAPI paths; minimal lib/\* modules for logic separation consistent with hackathon timebox.

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/\*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach (Preview Only)

Will transform: FR list + OpenAPI + data model into tasks. Emphasis on:

1. Contract validation tests before route stubs.
2. Schema & diff utilities before proposal generation integration.
3. Conversation loop (clarify → generate) prior to selective acceptance UI.
4. Sync + undo after base proposal display stable.
   Parallelization: Independent utility modules & unit tests flagged [P]; UI components after schemas to enable prop typing reuse.
   Expected Count: ~26 tasks (8 tests, 6 API route stubs, 5 UI components, 4 utilities, 2 integration flows, 1 polish/accessibility).

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |

## Progress Tracking

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach documented (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---

_Based on Constitution v1.0.0 - See `/memory/constitution.md`_
