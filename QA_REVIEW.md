# Tiny Corner — independent code review and fixes

Date: 2026-11-07

## Changes

1. `src/utils/findMyCorner.ts`: no longer returns untrusted Gemini prose as recommendation reasons; it uses stored event fields to generate grounded explanations. Ranking still uses Gemini's ID selections.
2. `src/utils/constraintExtractor.ts`: requires affirmative wheelchair/transit metadata under corresponding hard requirements, adds a compact list of interest tags (up to eight) to each Gemini candidate, and avoids interpreting an ordinary mention of walking as a transit requirement.
3. `src/utils/tinyCornerFixes.test.ts`: 10 new regression tests for explanation integrity, hard-constraint validation before and after model matching, and tag preservation.
4. `.test.ts` and utility imports: use TypeScript `import type` for erased interfaces; one historical test assertion corrected to distinguish explicitly inaccessible from unconfirmed accessibility.
5. `README.md` and `package.json`: document the actual implementation and add an `npm test` script.

## Execution results

- 50 / 50 pure-logic tests passed (`node --experimental-strip-types --test src/utils/*.test.ts`, Node 22.16.0).
- 23 / 23 TS and TSX files parsed without syntax errors using the TypeScript parser.
- Full `npm install`: **not completed** (offline cache missing packages; online install timed out).
- `tsc --noEmit`: **not verified** due missing Vite/client type dependencies.
- `vite build`: **not verified** due missing dependencies.
- Live Gemini API requests: **not tested** (no API credentials in review environment).
- Browser end-to-end and accessibility audits: **not tested**.

## Prototype notes

- Demo event data (including accessibility flags) has not been independently verified. Check venue information with organizers before relying on it.
- Posts and interested states are saved using browser localStorage, not synchronized across users.
- Importing this ZIP does not automatically update any existing Google AI Studio project. Sync updated files into your project using its code editor/repository workflow, then run the app in the original environment and repeat a live Gemini request.
