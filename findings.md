# Findings

## 2026-05-01

### Baseline Snapshot
- Working tree already contains in-progress modularization:
  - `src/app.js` reduced to entry composition.
  - New `src/app/` modules exist: `state.js`, `business.js`, `render.js`, `actions.js`, `events.js`, plus `business.test.mjs`.
- `styles.css` has outstanding UI/layout edits unrelated to structure convergence and will be kept as-is for this refactor.

### Guardrails Captured
- Root `AGENTS.md` now exists and includes project rules and refactor guardrails.
- Export safety policy: no export removal without repository-wide usage search evidence.

### Export Safety Evidence
- Repository-wide search executed for:
  - module factory exports (`createBusinessContext`, `createRenderer`, `createActions`, `registerAppEvents`, `createInitialState`, persistence bridges)
  - renderer internal candidate `renderRecipeCard`
- Result:
  - Public factory exports are all in active use by `src/app.js`.
  - `renderRecipeCard` had no external usage and was removed from renderer return surface.
  - No test-facing export was removed.

### Boundary Audit Notes
- `src/app.js`: entry-only composition, no business/template/event branching.
- `src/app/business.js`: no DOM access, no localStorage direct access.
- `src/app/render.js`: template/render responsibilities only, consumes `business` and `state`.
- `src/app/actions.js`: state mutation + persistence trigger + render orchestration.
- `src/app/events.js`: DOM events routing only, keeps IME handling in event layer.
- `src/app/state.js`: initialization + persistence bridge only.

### GitHub Pages Safety Checks
- `index.html` still loads `./src/app.js`.
- No required build step introduced.
- Browser-side modules do not import Node-only APIs.

### Residual Risks
- Branch was created from a dirty working tree by design (baseline confirmed as current state).
- `styles.css` remains outside this refactor scope and is intentionally untouched in behavior.

## 2026-05-01 (Cozy UI Refactor Guardrail Notes)

### Allowed Mutation Scope
- Primary edit files:
  - `src/app/render.js`
  - `styles.css`
- Optional sync files:
  - `README.md`
  - `progress.md`
  - `findings.md`

### Disallowed Mutation Scope (this round)
- `src/filters.js`
- `src/app/business.js`
- `src/app/actions.js`
- `src/app/events.js`
- `src/app/state.js`
- `src/storage.js`
- `src/data.js`
- `index.html`
- `package.json`

### Behavioral Safety Constraints
- Keep all existing `data-action` event contract intact.
- Keep IME composition-safe search rendering behavior intact.
- "换一批" remains visual-only (no `data-action`, no event wiring).
- Recipe image area must be placeholder-only (CSS gradient + emoji/initial), no external assets.

### Execution Evidence
- Implemented changes only in:
  - `src/app/render.js`
  - `styles.css`
  - `progress.md`
  - `findings.md`
- No modifications made in restricted runtime/business files (`filters/business/actions/events/state/storage/data/index/package`).
- Validation after implementation:
  - `cmd /c npm test` passed
  - `node --check src/app.js` passed
  - per-file `node --check` for `src/app/*.js` passed
