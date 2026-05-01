# Task Plan: Structure Convergence Refactor

## Goal
Converge the refactor structure of Manji Fridge while preserving existing product behavior, filtering rules, persistence, and GitHub Pages compatibility.

## Phase Status

| Phase | Status | Notes |
|---|---|---|
| Stage 0 - Baseline Freeze | complete | Guardrail files created, baseline checks executed, branch created. |
| Stage 1 - Module Boundary Audit | complete | Entry + state/business/render/actions/events boundaries confirmed. |
| Stage 2 - Export Safety | complete | Repository-wide usage search performed before API surface pruning. |
| Stage 3 - Tests and Regression | complete | `filters` + `business` tests passing, syntax checks passing. |
| Stage 4 - GitHub Pages and README Sync | complete | Static entry/path constraints preserved, README fully synchronized. |

## Constraints
- Preserve vegetable strict rule, meat include rule, merged union by recipe id, and empty selection behavior.
- Keep localStorage keys unchanged.
- Keep Vanilla JS + ESM.
- Keep `index.html -> ./src/app.js`.
- Do not add required build steps.

## Acceptance
- `npm test` passes.
- `node --check src/app.js` passes.
- `node --check src/app/*.js` passes.
- README matches real structure, tests, and run commands.
