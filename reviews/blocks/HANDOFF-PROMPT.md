# Handoff Prompt for Next Agent

## Task
Complete **G5** (browser-dependent items) and **G6** (sign-off) for the tlslides visual fix.

## Context
The previous agent completed G0–G4 fully and G5 partially (code-only). This agent finishes browser-dependent G5 items and produces the G6 sign-off.

## Current Status
- **G0–G4**: Complete, committed
- **G5 (partial)**: Code-only items done. Remaining are browser-dependent.
- **G6**: Pending

## G5 Remaining Items (all browser-dependent)

### 1. container-flex.js rewrite
**File**: `tools/visual/scenarios/container-flex.js`
- Rewrite against the real harness contract (`window.tlapp`), not the broken `window.app`
- Run from repo root, exit 0
- Screenshot opened and described

### 2. Slide-level collision spec
- Create a spec that checks for visual overlap on every slide of every deck fixture
- Must pass (no collisions in the final deck)
- Location suggestion: `packages/tldraw/src/blocks/collision.spec.ts`

### 3. overlap-audit.js gate
**File**: `tools/visual/scenarios/overlap-audit.js`
- Must **FAIL** on an injected overlap
- Prove it: break something on purpose → show non-zero exit → revert

## G6 — Sign-off Requirements
- Per-slide before/after table (original defect → FIXED/STILL PRESENT/REPLACED)
- All seven of BACKLOG-visual.md §2.4's acceptance criteria answered with evidence
- Replace/delete duplicate screenshots, provide `md5sum` over `reviews/blocks/*.png`

## Key Files
- `packages/tldraw/src/blocks/parity-harness.ts` — parity harness (SIGKILL fix in G5)
- `packages/tldraw/src/blocks/slide-compiler.ts` — regionAlign + region/overflow finding
- `packages/tldraw/src/blocks/layout/layout-child.ts` — measureIntrinsicSize (depth guard, memo, try/catch)
- `packages/tldraw/src/blocks/__fixtures__/demo-deck.json` — demo deck (coral-pop theme)
- `packages/tldraw/src/blocks/__fixtures__/colorful-blocks-demo.json` — fixture (coral-pop theme)
- `packages/tldraw/src/state/shapes/shared/deck-theme.ts` — theme definitions

## Gate Commands
- Build from repo root: `npx turborepo run build`
- Typecheck from `packages/tldraw`: `node_modules/.bin/tsc --noEmit --emitDeclarationOnly false`
- Core tests: `node_modules/.bin/jest packages/core --no-coverage --config packages/core/package.json`

## Constraints
- Production `tsc` must be 0 before every commit
- Do NOT change the tldraw jest.config.js
- Browser scenarios must run from repo root and exit 0
- Screenshots must be opened with the Read tool to verify
