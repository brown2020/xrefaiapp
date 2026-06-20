# Orchestration Plan

## Mode Selection

- Repo: /Users/stephenbrown/Code/OPENSOURCE/xrefaiapp
- Branch: dev
- Work mode: full
- Run folder: /Users/stephenbrown/Code/OPENSOURCE/xrefaiapp/agent-runs/2026-06-20-codebase-pass
- Verifiable gates: git remote read, git push --dry-run origin dev, npm run lint, ./node_modules/.bin/tsc --noEmit --pretty false, npm run build, npm run test:browser, git diff --check
- Human-decision blockers: product roadmap prioritization, broad architecture rewrites, weakening auth/payment/credit/idempotency/SSRF/IAP protections, unresolved merge conflicts or unrelated user changes
- Resume policy: resume from run-state.md plus git state; push any validated local phase commit before new edits; stop on dirty files outside the active task ownership

## Loop Plan

| Phase | Loop | Verify Gate | Stop Condition |
| --- | --- | --- | --- |
| Preflight and Repo Docs | Orchestration Planning Loop, Docs Sweep Loop | Docs match current repo and checks pass | Plan, state, queue, docs, and report pushed |
| Baseline Validation | Baseline Validation Loop | lint, typecheck, build, and browser smoke results are recorded | Baseline is clean or failures are classified with reproduction notes |
| Findings Backlog | Findings Queue Loop, Architecture Fitness Loop, Lean Code Loop | Evidence-backed backlog and scorecard | Backlog, scorecard, and queue are pushed |
| Execute Fixes and Improvements | Task Queue Loop, Fix Validation Loop, Architecture Fitness Loop, Lean Code Loop | Targeted checks and quality gate pass for each task | Highest-priority local/verifiable tasks are done, deferred, or blocked with evidence |
| Package and Dead-Code Cleanup | Package Cleanup Loop, Dead Code Loop | Dependency/dead-code changes are proven and quality gates pass | Safe cleanup is pushed or risky cleanup is deferred |
| Review | Judge Loop | PASS or bounded follow-up tasks | Review report is pushed and no P0/P1 in-scope findings remain |
| Stabilization Loop | Stabilization Loop, Judge Loop | Completion criteria pass or real blocker is documented | Stabilization report is pushed |
| Integrator | Final Completion Gate | branch sync, clean tree, final checks, final report | final report is pushed and local dev matches origin/dev |

## File Ownership

| Task | Owned Files | Notes |
| --- | --- | --- |
| T-001 | 00-orchestration-plan.md, run-state.md, task-queue.md | Startup planning and resume state |
| T-002 | AGENTS.md, spec.md, 01-preflight-and-repo-docs.md, run-state.md, task-queue.md | Evidence-backed docs sweep |
| T-003 | 02-baseline-validation.md, run-state.md, task-queue.md | Baseline validation report |
| T-004 | 03-findings-backlog.md, task-queue.md | Findings, scorecard, and execution queue |
| T-005+ | Source files named by findings | Execute one bounded fix or cleanup batch at a time |
