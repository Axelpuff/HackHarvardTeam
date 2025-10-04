<!--
Sync Impact Report
Version change: (none prior) → 1.0.0
Modified principles: Template placeholders replaced with concrete principles
Added sections: Hackathon Operating Constraints, Development Workflow & Quality Gates
Removed sections: None (all template placeholders instantiated)
Templates requiring updates:
	- .specify/templates/plan-template.md ✅ updated (version reference + alignment)
	- .specify/templates/spec-template.md ✅ no conflicting references
	- .specify/templates/tasks-template.md ✅ no changes needed (implicit alignment)
Follow-up TODOs: None
-->

# HackHarvardTeam Constitution

## Core Principles

### 1. Rapid Iteration & Timeboxing
We timebox every activity to maintain forward momentum. Every feature, fix, or experiment
MUST target a tangible demo within 60 minutes. If a task exceeds its timebox, we either
split it or de-scope immediately. A pull request (PR) MUST be opened within 90 minutes of
starting any substantive code change. Gold-plating is prohibited. We bias toward shipping
the smallest testable slice that advances the demo. All blockers MUST be surfaced in team
chat within 5 minutes of identification. Rationale: Hackathon success depends on learning
velocity over architectural perfection.

### 2. Scope Discipline & Feasibility
We ruthlessly constrain scope. Any new idea MUST answer: (a) direct user/demo value, (b)
why existing scope cannot deliver that value, (c) estimated time < 2 hours. Features lacking
clear demo impact are deferred. A scope change after the first 6 hours of the hackathon
requires unanimous consent. We NEVER rewrite working code unless it's blocking progress or
causing confirmed failure. Rationale: Scope creep is the primary cause of unfinished demos.

### 3. Minimal Reliable Quality (Tests & Observability)
We implement the thinnest layer of quality safeguards that materially reduce demo risk:
1) A smoke script or REPL snippet that proves core flow works MUST exist by midpoint.
2) Critical failure paths (e.g., API call, model inference, file I/O) MUST log concise
context (module, action, failure reason). 3) Any function containing branching logic that
impacts user-visible output MUST have at least one executable test or inline assertion.
4) No silent failures: errors MUST raise, log, or surface visibly. 5) We prefer fast inline
assertions over broad test suites. Rationale: Prevent midnight surprises without slowing
iteration.

### 4. Transparent Communication & Inclusive Collaboration
All decisions of consequence (API shape, model choice, library adoption, data handling) are
documented as a 1–3 line decision note in the shared log (README section or a `DECISIONS.md`
if created). No private silos: If it is not written or voiced in group sync, it is treated as
unknown. Pairing is encouraged for risky tasks. Psychological safety is enforced: Questions
are ALWAYS welcome. All team members have equal authority to raise feasibility concerns.
Rationale: Latency in knowledge transfer destroys hackathon speed.

### 5. Ethical & Responsible AI + Lightweight Documentation
We only use data and APIs we are authorized to access. Any AI-generated code MUST be
reviewed for licensing and security red flags before merging. Sensitive tokens/credentials
MUST NOT be hardcoded or committed. We retain only minimal documentation: README quickstart,
decision log, and smoke test notes. Additional docs require justification. Rationale: Ethical
compliance protects eligibility; minimal docs preserve speed while avoiding knowledge loss.

## Hackathon Operating Constraints
1. Time Horizon: Optimize for a compelling end-of-event demo, not production readiness.
2. Tech Stack: Prefer tools already known by at least two teammates. Introducing a new
technology requires a <10 minute justification and risk note.
3. Architecture: Single repository, flat structure unless a separation is essential for
clarity. Avoid premature service boundaries.
4. Branching: Short-lived branches; merge after smoke passing. Main must stay demoable.
5. Decision Logging: Any change >15 minutes effort MUST add or update a decision note.
6. Performance: Optimize only for observable lag in core demo path. Ignore micro-optimizations.
7. Data Privacy: Use anonymized or sample data; remove any accidental PII immediately.
8. AI Usage: Disclose AI-assisted generation in decision notes when non-trivial.
9. Dependency Policy: Avoid large frameworks unless they eliminate >60 minutes of projected work.
10. Failure Mode: If blocked >15 minutes, escalate synchronously.

## Development Workflow & Quality Gates
Workflow Steps:
1) Idea intake → quick feasibility triage (≤5 min).
2) Create/Update decision log entry (what, why, timebox, owner).
3) Implement smallest viable slice → open PR quickly (draft allowed).
4) Run smoke test script locally (script or documented manual steps) before requesting merge.
5) Peer review within 15 minutes; reviewer checks: scope alignment, principle compliance,
ethical/data safeguards, no unnecessary complexity.
6) Merge when: smoke passes, no unresolved comments, demo impact clear, logs/prints meaningful.
7) After merge: Update README or decision log ONLY if user-facing behavior changed.

Quality Gates (must pass before merge):
- Core flow unaffected (smoke test).  
- No secrets committed.  
- Logging present for new external calls.  
- Scope still aligned to demo narrative.  
- No TODOs without owner + deadline.

Definition of Done (feature slice): Provides demonstrable value, integrated into main flow,
and can be showcased in <60 seconds.

## Governance
Authority: This constitution supersedes ad-hoc preferences. All participants are bound by it
upon first contribution.

Amendments: During first 6 hackathon hours → 2/3 majority; after that → unanimous. Proposal
format: PR modifying this file + rationale section. Version MUST bump per semantic rules
below. Emergency fix (typos/clarifications) may use PATCH without vote if content meaning is
unchanged.

Versioning Policy:  
MAJOR: Remove or redefine a principle or governance rule.  
MINOR: Add a new principle, expand a rule materially, or introduce a new mandatory gate.  
PATCH: Clarify wording, reorder content, fix typos, add examples without changing obligations.

Compliance: Standups include a 60-second principle compliance check (any violations + plan to
resolve). Any unaddressed violation after one cycle can block merges.

Sunset: Constitution expires automatically at hackathon end unless explicitly extended.

**Version**: 1.0.0 | **Ratified**: 2025-10-04 | **Last Amended**: 2025-10-04