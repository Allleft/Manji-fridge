# AGENTS.md

## Project Overview

This project is Manji Fridge Recipe Web App, a responsive recipe web app based on the idea:
select ingredients first, then show matching recipes.

The app uses:
- Vanilla JavaScript with ES modules
- CSS
- localStorage
- Node.js local server

Do not introduce a framework unless explicitly requested.

## Core Product Rules

Preserve these rules unless the user explicitly asks to change them:

1. Vegetable matching rule:
   - A recipe must contain at least one selected vegetable.
   - All vegetables required by the recipe must be included in the selected vegetable set.
   - Recipes containing meat must not appear from vegetable-only matching.

2. Meat matching rule:
   - If a recipe contains any selected meat, it should appear.

3. Combined result rule:
   - Vegetable matches and meat matches are merged.
   - Duplicate recipes must be removed by recipe id.

4. Empty selection rule:
   - If no ingredients are selected, the recipe result should be empty.

5. Local persistence:
   - Custom ingredients, hidden default ingredients, and preset recipes must continue to persist through localStorage.

## Code Organization Rules

Keep the project modular.

- `src/app.js`
  - Entry point only.
  - Wire data, state, business logic, renderer, actions, and events together.
  - Do not place large business logic here.

- `src/data.js`
  - Recipe and ingredient data.
  - Be careful when changing generated/imported data.

- `src/filters.js`
  - Pure recipe filtering logic.
  - Any change here must include or update tests.

- `src/app/business.js`
  - Ingredient normalization, blocked ingredient rules, recipe merging, search helpers, and business context.

- `src/app/render.js`
  - HTML rendering only.
  - Avoid changing business rules here.

- `src/app/actions.js`
  - User actions such as selecting ingredients, adding/deleting ingredients, opening recipes, and managing presets.

- `src/app/events.js`
  - DOM event binding only.

- `src/app/state.js`
  - Initial state and persistence bridge.

- `src/storage.js`
  - localStorage read/write helpers.

## Additional Guardrails

### Stage 0: Baseline Freeze
- Create this `AGENTS.md` in repository root before code refactor starts.
- Create `task_plan.md`, `findings.md`, and `progress.md`.
- Run baseline validation:
  - `npm test`
  - `node --check src/app.js`
  - `node --check src/app/*.js`
- Record baseline result in `progress.md`.
- Create a refactor branch before modifying code refactor work:
  - `refactor/structure-convergence`

### Export Safety
- Before removing any export, search the entire repository for usage.
- Do not remove exports used by tests unless the test is updated with equal or stronger coverage.
- Do not reduce behavior coverage just to simplify exports.

### Test Command Safety
- Ensure `npm test` runs all current tests:
  - `src/filters.test.mjs`
  - `src/app/business.test.mjs`
- New tests should remain lightweight.
- Do not introduce heavy DOM frameworks unless strictly necessary.

### GitHub Pages Safety
- Keep `index.html -> ./src/app.js`.
- Do not introduce a required build step.
- Do not introduce Node-only APIs into browser-side modules.
- Keep static asset paths compatible with GitHub Pages.

### README Final Sync
- After the refactor is stable, update `README.md` to match the actual folder structure, test files, and run commands.

## Required Checks After Every Change

After any code change, run:

```bash
npm test
```
