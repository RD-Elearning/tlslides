# Resume brief — continuing the block system

Paste the prompt in §1 into a new session to pick this work up. Everything it needs is either in
this file or reachable from it. Keep this file current: when a phase ships, update
[README.md](README.md)'s tracker and current-state table, and add phase notes to
[08-phase-plan.md](08-phase-plan.md).

---

## 1. The prompt

> Continue the tlslides block system in this repo. Read `reviews/blocks/CONTINUE.md` first — it is
> the resume brief and names the current state, the working agreement, the verified commands and
> the traps. Then read `reviews/blocks/README.md` and the phase you are starting from
> `reviews/blocks/08-phase-plan.md`.
>
> P18 and P19 are shipped and verified. **Work from `reviews/blocks/BACKLOG.md`** — it breaks the
> remaining phases into one-session tasks with their own scope, dependencies and acceptance. Take
> them in the order its dependency graph allows; A5 and A4 are the two that gate everything after
> them.
>
> Working agreement: **subagents implement, you coordinate and review.** Spawn one Sonnet subagent
> per phase with a fully-specified brief (scope, acceptance criteria, verified commands, measured
> baselines, hard rules). When it reports back, **verify every claim yourself** — re-run the tests,
> diff the typecheck against the baseline, read the code, and write your own independent check of
> the phase's headline claim. Do not accept a subagent's report at face value; the last two phases
> each contained a real bug that the subagent's own passing tests did not catch. Fix trivia
> yourself; send substantive findings back to the agent. Then update the tracker and phase notes,
> and tell me what you found.

---

## 2. Where the work is

**Shipped: P18 (block foundations), P19 (design tokens).** Both live in
`packages/tldraw/src/blocks/`, exported from the package root. `packages/blocks` — the separate
library package — does **not** exist yet and is deliberately deferred to P24.

| Module | What |
|---|---|
| `blocks/types.ts` | `BlockSpec`, `BlockDefinition`, `LayoutNode`, `LayoutContext`, `BlockSchema`, token types |
| `blocks/registry.ts` | `BlockRegistry`, `createBlockComponents` (returns placeholders until P20) |
| `blocks/shape-bridge.ts` | `blockToShape` / `shapeToBlock` / `BLOCK_PROP_KEY` (`'$block'`) |
| `blocks/color-math.ts` | WCAG luminance + contrast, hex⇄RGB⇄HSL, two-tier hue-preserving solver |
| `blocks/scales.ts` | type / space / radius / elevation / motion scales, `applyDensity`, categorical ramp |
| `blocks/tokens.ts` | `DeckTokens`, `resolveTokens`, `resolveColor`, `surfaceFromBackground`, `surfaceFromPaint` |
| `blocks/layout/` | box model helpers, `estimateMetrics`, `createLayoutContext`, `layoutChild` (A1) |

Also touched: `types.ts` (`DeckTokens` + optional `TDDocument.tokens`, status colours on
`DeckThemeColors`), `state/shapes/shared/deck-theme.ts` (per-palette `positive`/`negative`/
`warning`), `examples/nextjs-sample/components/p18-blocks.tsx` (live demo, **Add P18 block**),
`examples/tldraw-example/src/develop.tsx` (token fns on `window` for the scenario),
`tools/visual/scenarios/tokens.js`.

**Next: P20** — layout engine, the DOM and SVG renderers, and the parity harness. It is the
heaviest phase and the first with anything visual. Then **P21** (headless block rendering) before
any promise about thumbnails or export is made to anyone. P22 (motion) can run in parallel with
the P20→P21 spine.

---

## 3. Measured baselines

Re-measure on a clean tree before starting; do **not** quote a number out of a phase note (the
Phase 1–17 notes in `reviews/README.md` are in authoring order, not commit order, so they are
stale for HEAD).

| | Current (2026-09-17) |
|---|---|
| Jest | **46 suites · 1000 passed · 77 todo · 19 snapshots** |
| Typecheck | **0 errors in non-spec source** |
| eslint `src/blocks` | **0 errors, 372 warnings (all in spec files)** |

The 77 todo tests and the 10 spec-file type errors are pre-existing. Do not "fix" them. Introduce
no new ones, including in your own spec files.

---

## 4. Verified commands — three of these are traps

```bash
# Tests — npx jest works fine.
cd packages/tldraw && npx jest --silent 2>&1 | tail -8
cd packages/tldraw && npx jest src/blocks --silent

# TRAP 1 — `npx tsc` is broken here: it resolves to a doubled
# node_modules/node_modules/.pnpm/... path and dies with MODULE_NOT_FOUND.
# And `--noEmit` alone fails TS5053 because tsconfig sets emitDeclarationOnly.
cd packages/tldraw && ./node_modules/.bin/tsc -p tsconfig.json --noEmit \
  --emitDeclarationOnly false 2>&1 | grep -E '^src/'

cd packages/tldraw && npx eslint src/blocks --ext .ts,.tsx

# TRAP 2 — `npx turbo` grabs a newer turbo that rejects --stream. Use the repo's own:
./node_modules/.bin/turbo run build:packages        # turbo 1.13.4

# Building one package directly: `lask` spawns bare `tsc` and `tsconfig-replace-paths`
# from PATH, and they live in DIFFERENT bin dirs. Both are needed:
cd packages/tldraw && PATH="$PWD/../../node_modules/.bin:$PWD/node_modules/.bin:$PATH" \
  ./node_modules/.bin/lask

# Visual scenarios. Playwright is deliberately NOT a dependency; the harness finds an
# installation via PLAYWRIGHT_PATH or a hardcoded sibling checkout. It resolves on this machine.
node tools/visual/shoot.js <scenario> [--base=URL]

# The reference host. It consumes packages/tldraw/dist, so REBUILD before expecting
# new exports to appear in it.
cd examples/nextjs-sample && npx next dev -p 5433
```

**TRAP 3 — `cmd | tail` followed by `$?` reports `tail`'s exit code, not the command's.** Use
`${PIPESTATUS[0]}`. This is how a failing type check reads as a pass. It has already happened
twice in this work.

Also: the build tool does not fail on type errors (Phase 5/7). **Read** `build:packages` output;
do not trust its exit code.

---

## 5. Governing rules

The full set is in [README.md](README.md). The ones that have actually bitten:

1. **One layout, two renderers, proven equal.** A Tier-A block is authored once as a pure
   `layout()`. Parity is enforced by test, not by eye.
2. **The document stores a spec, never React and never pixels.**
3. **Colors are roles, not hex.**
4. **Additive schema only.** `TldrawApp.version` stays at 16; `migrate.ts` gets no new block.
5. **Motion is tokenized and off by default.**
6. **No new runtime dependency without a named reason.** GSAP is a host-injected adapter, never a
   package dependency.
7. **Screenshot everything, and look at it.**
8. **Report what you did not build**, as a named follow-up.

---

## 6. Traps that have already cost time

**Never assign a module-level object or array by reference — copy it.** Three occurrences so far:
`DEFAULT_SLIDE_SIZE` (Phase 3), `style: defaultStyle` (P18 review), `mergeTypeScale`'s
`{ ...TYPE_SCALE }` shallow copy (P19). **`toEqual` passes happily while aliasing; only `not.toBe`
catches it.** Assert both.

Carried from earlier phases, and every one of them is live for block work:

- Any free-typed input inside a block needs `stopKeyPropagationUnlessEscape`, or <kbd>Tab</kbd>
  clones the shape being edited and every later edit lands on the clone (Phase 8b).
- `.tl-positioned-div` sets `overflow: hidden` + `contain: layout style size` — block overlays are
  clipped; portal them to `document.body`.
- A block's own interactive controls must `stopPropagation` on pointer-down or the gesture starts
  a shape drag.
- `isStateful = true` keeps every block mounted off-screen forever; tear down timers and loops.
- Paint on an outer `<SVGContainer>` looks right live and vanishes from SVG export (Phase 8a) —
  put it on the inner node.
- A CSS class rule beats an SVG presentation attribute regardless of specificity (Phase 11) — set
  overrides via inline `style`.
- `LineShape.handles` are shape-local, not page-absolute (Phase 13 shipped three invisible
  dividers this way). A block's `line` node is in the block's own coordinate space.

Phase-specific debt:

- `surfaceFromPaint(paint, box, parentBox)` — **three** arguments. P20's `layoutChild` needs this.
- `tools/visual/scenarios/tokens.js` proves contrast numerically but draws every swatch on one
  dark card, so it cannot show legibility on the surface under test. Rework when P20 can render a
  real slide.
- `resolveColor` returns `ok: false` only for floors above √21 ≈ 4.583 (because
  contrast-to-white × contrast-to-black = 21 exactly, for any background). Nothing uses such a
  floor today; P31's linter must still handle it as a real finding.

---

## 7. Review protocol

This is what has caught every bug so far, and both were invisible to the implementer's own
passing tests.

1. **Re-run everything yourself.** Jest, typecheck diffed against the saved baseline, eslint.
2. **Read the code**, especially anything the report describes as clever.
3. **Write an independent check of the phase's headline claim** — not a re-run of their test. In
   P19 that meant a 1800-sample contrast sweep and verifying the √21 identity from scratch; it
   found a solver that reported failure on a solution that existed.
4. **Verify your own test before reporting a finding.** A review test that fails may be the
   review's bug — this happened once (`GRADIENT_PRESETS[i]` wraps stops under `.background`).
5. **Push back on rationalized gaps.** "17 lint warnings are acceptable" needed checking; it
   turned out to be true. "The clamp exists so `ok:false` stays reachable" was backwards.
6. Fix trivia yourself; send substantive findings back with a reproduction.
7. Update the tracker and write the phase notes.

---

## 8. Git

Work is on branch **`plan/block-system`**, not `main`. One commit so far (the plan docs);
P18 + P19 implementation is uncommitted in the working tree at the time of writing.

Attribution for commits:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RHPmUmM1VE2kjXa27PmG4L
```

`ppt-master/` and `transitions.dev/` are git-ignored reference clones — design sources, never
dependencies. Nothing in `packages/` may import from them.
