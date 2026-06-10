# Guidance for AI coding agents (project-specific)

This repository is a single-page React + Vite demo: an interactive dashboard that visualizes a utility-based portfolio allocation engine. Use these instructions to make focused, low-risk code changes and to be productive quickly.

Key facts (quick):
- Framework: React 19 with Vite 8 (entry: `index.html` → `src/main.jsx` → `src/App.jsx`).
- Styling: Tailwind CSS (configured in `tailwind.config.js`, imports in `src/index.css`).
- Charts: Recharts used heavily inside `src/App.jsx` (PieChart, BarChart, AreaChart, Scatter/Canvas hybrid).
- Data: All asset data, correlation matrix, frontier generator, pseudo-random sampler, and investor profiles are hardcoded in `src/App.jsx` (no network calls).
- PDF/PNG export: Uses dynamic import of `html2canvas` and `jspdf` in `src/App.jsx` (`downloadReport` function).
- Scripts: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint` (see `package.json`).

What to look for when editing:
- Single-file logic: `src/App.jsx` contains the full UI + domain logic (5000-sample frontier generator, Monte Carlo sampler, plotting helpers). Avoid large restructures unless requested.
- Deterministic pseudo-randomness: The UI uses simple seeded functions (`seededRandom`, `pseudoNormal`) to create repeatable visuals. Preserve seeding when touching plots/tests.
- Performance-sensitive rendering: Frontier plotting is rendered on a canvas (`CanvasFrontierPlot`) to draw 5,000 points. If you change data volume or drawing, keep the ResizeObserver and DPR handling.
- Export flow: `downloadReport` imports `html2canvas` and `jspdf` lazily. When modifying export, maintain dynamic imports to avoid bundling these libs into dev hot-reload cycles.

Conventions and patterns specific to this repo:
- No TypeScript — files are `.jsx` and ESLint is configured for modern JS (see `eslint.config.js`).
- Inline hardcoded datasets (assets, covariance matrix, profiles) live at the top of `src/App.jsx`. Prefer editing there for demo-data changes.
- Charts are non-animated (isAnimationActive={false}) to ensure consistent screenshots/exports — keep this for reproducible exports.
- Rebalancing modes and profile adjustments are computed via pure helper functions (`adjustAllocation`, `computeAdjustedProfiles`, `computeGrowthData`) inside `src/App.jsx`. Tests or feature changes should call these helpers to validate outputs.

Developer workflows (commands and notes):
- Install: `npm install` (if peer dependency issues occur, use `npm install --legacy-peer-deps`).
- Dev server: `npm run dev` → open `http://localhost:5173`.
- Build: `npm run build` → `dist/` created. Preview: `npm run preview`.
- Lint: `npm run lint` (ESLint flat config; `dist` is ignored).

Quick examples (cite locations):
- To change the six demo assets, edit the `assets` array at the top of `src/App.jsx` (tickers, expectedReturn, risk, color).
- To adjust Monte Carlo sample size, update the loops in `generateFrontierData()` and `computeMonteCarloHistogram()` inside `src/App.jsx`.
- To tweak export resolution, change the `scale` passed to `html2canvas(reportRef.current, { scale: 2 })` in `downloadReport()`.

Safety rules for automated edits (must follow):
1. Keep changes small and contained to a few functions/files. This is a demo app; large refactors must be proposed first.
2. Preserve seeded randomness and non-animated chart flags to keep UI deterministic for screenshots and student grading.
3. Avoid adding runtime network calls or environment secrets. This project intentionally uses hardcoded data.
4. When editing UI text, keep existing classNames and layout structure to avoid visual regressions — styling uses Tailwind utility classes.
5. If adding dependencies, update `package.json` and explain why; prefer lazy/dynamic imports for large libs (see `html2canvas`/`jspdf` usage).

Files to reference when changing behavior:
- `src/App.jsx` — primary source of data, logic, and UI (most important).
- `src/main.jsx` — React root mount.
- `index.html` — Vite entry template.
- `package.json` — scripts and dependency versions.
- `tailwind.config.js`, `postcss.config.js` — styling pipeline.
- `eslint.config.js` — lint rules and global ignores.

When adding tests or examples:
- This repo has no test framework preinstalled. If requested, propose adding a lightweight test setup (Vitest + React Testing Library). Keep tests focused on pure helpers (e.g., `adjustAllocation`, `generateFrontierData`) rather than DOM-heavy charts.

If you are unsure or planning a larger change, summarize the change in 3–5 bullet points and request a review before applying.

— End of file
