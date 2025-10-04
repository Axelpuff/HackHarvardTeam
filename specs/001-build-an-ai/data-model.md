# Data Model: AI Schedule Counseling Assistant

Generated: 2025-10-04  
Related Spec: /Users/axelsoderquist/development/HackHarvardTeam/specs/001-build-an-ai/spec.md

## Overview
Data entities required for in-memory session operation plus lightweight persistence (localStorage for preferences). No server database for MVP.

## Entity Definitions

### User (SessionContext)
| Field | Type | Notes |
|-------|------|------|
| id | string | Google sub claim from OAuth | 
| email | string | Used only for session display; not stored beyond session | 
| consentGranted | boolean | Set true after first sync approval (FR-022) | 
| activeView | 'day' | 'week' | Controls event subset feeding proposals (FR-011) |
| tz | string | Google primary calendar TZ |

### CalendarEvent
| Field | Type | Notes |
| id | string | Google event id (existing) or temp id (proposed add) |
| title | string | Event summary |
| start | ISO datetime | Aligned to primary TZ |
| end | ISO datetime | Derived or adjusted |
| durationMinutes | number | Cached for heuristics |
| source | 'current' | 'proposed' | Distinguish panels |
| changeType | 'none' | 'add' | 'move' | 'remove' | 'adjust' | For diff rendering |
| originalEventId | string? | Link for moved/adjusted items |
| accepted | boolean? | Per-change acceptance (FR-007) |

### ProblemStatement
| Field | Type | Notes |
| id | string | UUID |
| rawText | string | User utterance |
| createdAt | ISO datetime | Timestamp |
| status | 'active' | 'resolved' | Mark when proposal approved or discarded |

### ClarifyingQuestion
| Field | Type | Notes |
| id | string | UUID |
| text | string | Gemini generated |
| rationaleTag | string | e.g., 'vague-goal', 'missing-constraint' |
| answered | boolean | Marks readiness for proposal generation |
| problemId | string | FK -> ProblemStatement |

### Proposal
| Field | Type | Notes |
| id | string | UUID |
| revision | number | Incremental (starts at 1) |
| changes | ChangeItem[] | Core diff set |
| summary | string | High-level summary |
| sleepAssessment | { estimatedSleepHours:number, belowTarget:boolean } | From model output |
| status | 'draft' | 'pending' | 'approved' | 'applied' | 'discarded' | Controls UI transitions |
| createdAt | ISO datetime | |
| previousProposalId | string? | Link to prior revision |

### ChangeItem
| Field | Type | Notes |
| id | string | UUID |
| type | 'add' | 'move' | 'remove' | 'adjust' | FR taxonomy |
| event | { title:string, start:ISO, end:ISO, durationMinutes:number } | Proposed canonical form |
| targetEventId | string? | For move/adjust referencing existing event |
| rationale | string | FR-010 requirement |
| accepted | 'pending' | 'accepted' | 'rejected' | For selective application |

### TranscriptEntry
| Field | Type | Notes |
| id | string | UUID |
| role | 'user' | 'system' | Dialog speaker |
| text | string | Raw transcript line |
| timestamp | ISO datetime | Ordering & export |
| relatedProposalId | string? | Back-reference |
| relatedQuestionId | string? | Back-reference |
| relatedProblemId | string? | Back-reference |
| errorCode | string? | If representing an error event |

### PreferenceSet (Persisted localStorage)
| Field | Type | Notes |
| sleepTargetHours | number | Default 7 (assumption) |
| priorities | string[] | Ordered subset of ['sleep','exercise','focus','social','recovery'] |
| protectedWindows | Array<{ start:ISO, end:ISO, label:string }> | Optional user-specified blocks |
| iterationCount | number | Proposal attempts in current problem context |

### SyncOperation (Transient)
| Field | Type | Notes |
| id | string | UUID |
| proposalId | string | Source proposal |
| changeItemId | string | Link to change item |
| action | 'create' | 'update' | 'delete' | Calendar API mapping |
| status | 'pending' | 'success' | 'failed' | For FR-009 & FR-023 |
| attempts | number | Retry counter |
| lastError | string? | Last failure reason |

## Relationships
- User has many ProblemStatements; one active at a time.
- ProblemStatement has many ClarifyingQuestions; all must be answered (or enough heuristically) before generating a Proposal.
- Proposal has many ChangeItems; ChangeItems map to CalendarEvents (existing or new) when applied.
- TranscriptEntry may reference Proposal, Question, ProblemStatement for traceability.

## Validation Rules
| Entity | Rule | Motivation |
|--------|------|------------|
| CalendarEvent | start < end | Consistency |
| CalendarEvent | durationMinutes == (end-start)/60000 | Integrity |
| ChangeItem | adjust/move requires targetEventId | Correct diff semantics |
| PreferenceSet | 0 < sleepTargetHours <= 12 | Sanity |
| Proposal | revision >= 1 | Ordering |
| Proposal | changes length >=1 | Must propose at least one change |
| SyncOperation | attempts <=4 (initial + 3 retries) | FR-023 |

## State Transitions
Proposal.status: draft -> pending (ready for approval) -> approved -> applied OR discarded.  
Undo Path: applied -> (undo) -> discarded (store reversal diff transiently).  

## Derived Computations
- Sleep estimation: compute gaps between last evening event end and first morning event start; cross-check with PreferenceSet.sleepTargetHours.
- Conflict detection: overlapping proposed events -> highlight & request model reissue or manual adjustment.

## Storage Summary
- Browser memory / React state: All conversational + proposal data.
- LocalStorage: PreferenceSet only.
- No server DB.

## Open Considerations
None blocking; large future features (multi-user, analytics) omitted.
