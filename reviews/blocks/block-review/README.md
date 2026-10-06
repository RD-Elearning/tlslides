# Block UI review — overview & progress

**Started:** 2026-10-05 · **Branch:** `plan/block-system` · **Base commit:** `74c0cf13`
**Goal:** every one of the 129 blocks in `BUILT_IN_BLOCKS` is checked in the real app (gallery card,
drag onto a slide, inspector, viewer in a wide and a narrow region, animation, Present mode) and
fixed where its UI breaks. The work is done per block group by one subagent each; this file is the
controller's overview and the resume point.

**To continue later:** read §3 Rules, find the first group in §6 that is not ✅, open its file and
take the first block whose Status is ⬜ or ❌. When a group finishes, update its row in §6 and
append to §8.

| File | Group | Categories | Blocks |
|---|---|---|---|
| [G01-structure.md](G01-structure.md) | G01 | structure | 13 |
| [G02-heading-text-emphasis.md](G02-heading-text-emphasis.md) | G02 | heading, text, emphasis | 12 |
| [G03-list.md](G03-list.md) | G03 | list | 9 |
| [G04-metric.md](G04-metric.md) | G04 | metric | 13 |
| [G05-chart.md](G05-chart.md) | G05 | chart | 16 |
| [G06-table-comparison.md](G06-table-comparison.md) | G06 | table, comparison | 13 |
| [G07-process-timeline.md](G07-process-timeline.md) | G07 | process, timeline | 10 |
| [G08-hierarchy-relationship.md](G08-hierarchy-relationship.md) | G08 | hierarchy, relationship | 8 |
| [G09-media-people-brand.md](G09-media-people-brand.md) | G09 | media, people, brand | 14 |
| [G10-slide-composites.md](G10-slide-composites.md) | G10 | cover, divider, agenda, closing, learning | 11 |
| [G11-chrome-decoration.md](G11-chrome-decoration.md) | G11 | chrome, decoration | 10 |
| | | **23 categories** | **129** |

---

## 1. Priorities (from the user, in order)

1. **The UI adapts to its box.** A block must look right at its preferred size, in a full-width
   region, in a half-width region and at its `size.min`. Text wraps or shrinks instead of
   overflowing; nothing escapes the block's box or the slide; items reflow (fewer columns, smaller
   gaps, dropped secondary parts) instead of being squashed or clipped.
2. **Smooth animation.** Entrances play once, in a sensible order, with no flash of final content
   before the animation starts, no element stuck below full opacity at the end, no jump at the end
   of a timeline, and they honour `motionStyle` (`static` = none, `subtle`, `expressive`) and
   `prefers-reduced-motion`.
3. **Easy for the AI to pick and compose.** `shortDescription`, `describe.when` / `avoid` and
   `describe.example` are accurate; the example props render well in every check below (they are
   also what the gallery card and the drop insert show); `size.preferred` / `size.min` are honest;
   `scope` and `category` are right, so a planner can build a slide from the index alone.

## 2. Per-block checklist

Each block row in a group file has one column per check.

| Id | Check | Where | Pass when |
|---|---|---|---|
| **C1** | Gallery card | `<slug>.card.png` | The preview shows the whole block (no crop, no empty card, no speck), legible at thumbnail size, name + short description + scope badge correct |
| **C2** | Drag-drop + inspector | `<slug>.drop.png`, `<slug>.drop-canvas.png`, report `drop` | Dragging the card onto a slide adds exactly one shape at the drop point, no page error, the selected block opens the inspector with sensible fields, the block on canvas matches the card |
| **C3** | Wide region, expressive | `<slug>.wide.png` + `.wide.mid-*.png`, report `wide` | Title + block in the full-width region: no overflow / escape / stuck parts in the report, nothing clipped, balanced use of the space (not a tiny block in a big empty region, not stretched) |
| **C4** | Narrow region, subtle | `<slug>.narrow.png` + `.narrow.mid-*.png`, report `narrow` | Same block in the left half of `two-column`: still readable, reflows rather than shrinking to illegible, nothing escapes |
| **C5** | Motion | mid frames, report `chain`, `<slug>.present.png` | Mid frames show a deliberate in-progress state (not blank, not already final unless static), the chain completes (`n/n`, no TIMEOUT), no stuck parts; Present mode in the editor shows the same final state |
| **C6** | AI metadata | the block's `index.ts` | `shortDescription`, `describe.when/avoid/example`, `size`, `scope`, `category` accurate; example props exercise the block's real use (realistic text lengths, not lorem) |

Slide-scope blocks (`scope: 'slide'`) are placed in the `blank` layout for both variants; "narrow"
then means `motionStyle: subtle` at full size, and C4 checks them at `size.min` instead (use a
`free` box in a custom deck or a unit test).

## 3. Rules (binding for every agent)

All the repo rules still hold: [../block-library/README.md](../block-library/README.md) §Rules and
[../BACKLOG-visual.md](../BACKLOG-visual.md) §2. In short and in addition:

1. **Stay in your lane.** Edit only files under your group's block folders
   (`packages/tldraw/src/blocks/library/<family>/<tls-x-name>/`) and family helpers that only your
   group's blocks use. Anything else (`blocks/*.ts` root files, `render-dom.tsx`, `render-svg.ts`,
   `motion/`, `components/`, `state/`, a `_engine`/`_kit` shared with another group, the review
   scenario) is **not yours**: write it up in your group file's **Shared issues raised** section
   (block, symptom, shot file, suspected file) and in your final report, and move on. Only the
   controller edits this README; it copies those entries into §5.
2. **Never invent vocabulary** (ColorRole, LayoutNode kinds, SlotType kinds, motion preset ids,
   BlockFamily, BlockCategory, BlockScope). **Additive schema only**: never rename or remove a
   shipped block, slot or option value. A block that needs either is ⏸ with the reason.
3. **Never weaken a test to make it pass.** Byte-identical fixtures/snapshots change only when the
   rendering change is the intended fix, and the commit message says so.
4. **The working tree is shared with other agents running at the same time.** Never `git stash`,
   `git checkout -- <path>`, `git reset`, or `git add -A` / `git add .`. Stage your own paths by
   name. Do not touch or commit `packages/tldraw/src/components/DeckViewer/DeckViewer.tsx` or any
   `tsconfig.tsbuildinfo` (the user's uncommitted work).
5. **Locks.** `dist` is shared by every agent and by the dev server, so build and shoot under one
   lock: build with an exclusive lock, shoot with a shared one. Commit under the git lock. The
   commands are in §4; use them verbatim.
6. **OOM guard: only the related tests.** Run the block's own spec(s),
   `catalog-conformance.spec.ts` and `capability-digest.spec.ts`, with `--maxWorkers=2`. Never run
   the full suite. Kill nothing you did not start.
7. **Keep `src` compiling at every moment** (another agent may build `dist` from it). Make each
   edit complete; run the tsc gate before every build.
8. **Commit once per block** (or per ≤4 siblings sharing a fix): message
   `RV<group>: <type>[, <type>…] — <what>` in English, ending with the co-author line. Put the hash
   in the block's row. A block that passes every check unchanged is ✅ with no commit of its own;
   its row is committed together with the group file.
9. **Look at every PNG you judge.** A check is only ✅ after you opened the shot. The report's
   automatic probes (overflow / escapes / stuck) catch some problems, not all.

## 4. Commands (verified 2026-10-05)

The dev server runs at `http://localhost:5433` (`examples/nextjs-sample`, `next dev -p 5433`).
If it is down: `cd examples/nextjs-sample && COREPACK_ENABLE_STRICT=0 nohup pnpm exec next dev -p 5433 > /tmp/next-5433.log 2>&1 &`.
Playwright is reused from `taumi-fms` (headless; see `tools/visual/playwright.js`).

```bash
L=/tmp/tlslides-dist.lock; G=/tmp/tlslides-git.lock

# review one category (all passes) or some blocks (shared lock: many shoots at once is fine)
flock -s $L env REVIEW_CATEGORY=chart node tools/visual/shoot.js block-review --width=1600 --height=900
flock -s $L env REVIEW_BLOCKS=tls.d.bar,tls.d.line REVIEW_CATEGORY= node tools/visual/shoot.js block-review --width=1600 --height=900
#   REVIEW_PASSES=gallery,drop,viewer,present (any subset) · REVIEW_THEME=midnight · REVIEW_MID=60,200,500,1000
#   output: tools/visual/shots/review/<category or "custom">/ + report.json

# from packages/tldraw: tsc gate (must print 0; check the binary exists first)
../../node_modules/.bin/tsc --noEmit --emitDeclarationOnly false | grep -v '\.spec\.' | grep -c 'error TS'

# from packages/tldraw: related tests only
../../node_modules/.bin/jest --maxWorkers=2 src/blocks/library/<family>/<tls-x-name> src/blocks/library/catalog-conformance src/blocks/capability-digest

# rebuild dist after a src change (exclusive lock), then wait ~5 s for next dev to pick it up
flock $L sh -c 'cd packages/tldraw && COREPACK_ENABLE_STRICT=0 pnpm build 2>&1 | tail -2'

# commit (git lock; explicit paths only)
flock $G git add <paths…> && flock $G git commit -m "RV05: tls.d.bar — …"
```

**Is my change live?** After every `pnpm build`, wait ~5 s and re-shoot the block you changed; if the
PNG shows no change after two tries, the dev server is stale (S5): restart it with
`pkill -f 'next dev -p 5433'; cd examples/nextjs-sample && COREPACK_ENABLE_STRICT=0 nohup pnpm exec next dev -p 5433 > /tmp/next-5433.log 2>&1 &`
(the controller started it, so you may), then re-PUT the decks by re-running the harness.
The harness no longer presses ArrowRight to nudge a chain (DeckViewer turns that into "skip the chain").

### Low-resource mode (this machine has 3.9 GB RAM; a full session crashed it on 2026-10-06)

Run **one heavy thing at a time**: the dev server (~1 GB), one headless Chrome (~0.5 GB), jest or `pnpm build` never overlap.
- Dev server with a heap cap: `NODE_OPTIONS=--max-old-space-size=1536 COREPACK_ENABLE_STRICT=0 nohup pnpm exec next dev -p 5433 > /tmp/next-5433.log 2>&1 &`.
- Jest: `NODE_OPTIONS=--max-old-space-size=1536 ../../node_modules/.bin/jest --maxWorkers=1 -t '^(?!.*parity).*$' <paths>`; never several `jest` at once; never the full suite.
- Shoot one category at a time with `REVIEW_PASSES=gallery,drop,viewer REVIEW_MID=500` (the Present pass is the slowest and the one that holds the editor open: run it only for blocks you changed, with `REVIEW_BLOCKS=…`).
- Batch fixes: rebuild dist (`pnpm build` writes ~30 MB twice plus declarations) once per 3–4 blocks, not after every edit; run `tsc` once before each rebuild.
- Writes: shots are git-ignored but real files; when a group is finished delete its category folder (`rm -rf tools/visual/shots/review/<cat>`), keep only `report.json` copies if needed. Never keep video, never commit PNGs.
- Check `free -m` before starting a heavy step; if `available` < 1200 MB, stop the dev server, finish what is running, and restart it.

Known noise, not a finding: the `Accessing element.ref was removed in React 19` console error and
the Next.js "1 Issue" badge it causes. Known pre-existing failure, not yours:
`BlockInserter.spec.tsx › renders category tabs with counts and hides empty categories`
(`app.useStore is not a function`, fails at `3ddad145` too).

## 5. Shared issues (outside any one group — controller fixes these)

| # | Found by | Area | Symptom | Status |
|---|---|---|---|---|
| S1 | controller | `BlockInspector/fields/FieldControls.tsx` | Selecting any block with a `list` slot crashed the editor (`reading 'kind'`): every drag-drop from the gallery ended in "Application error" | 🔧 `74c0cf13` |
| S2 | controller | `BlockInserter/BlockPreview.tsx` | Every gallery card showed a thumbnail-sized corner of the block (empty card or a coloured speck); tall blocks cropped | 🔧 `74c0cf13` |
| S3 | controller | `BlockInserter/BlockInserter.tsx` | Category tab bar capped at 104 px hid Media … Decoration behind an invisible scroll | 🔧 `74c0cf13` |
| S4 | controller | `BlockInserter.spec.tsx` | `renders category tabs with counts…` fails with `app.useStore is not a function` (pre-existing) | ⬜ |
| S5 | G02 (X1) | `next dev` on :5433 | Stopped recompiling `packages/tldraw/dist` after 16:35:51 UTC (stale chunks through two rebuilds + touch). Restart it before any re-shoot | 🔧 restarted 2026-10-06 (stale again after any reboot: restart `next dev`, then re-PUT decks by running the harness) |
| S6 | G02 (X2) | `blocks/parity-harness.ts`, `parity-worker.ts` | DOM/SVG parity probe hangs >150 s even on untouched blocks; killing jest orphans parity-worker + Chrome. Workaround: `-t '^(?!.*parity).*$'` | ⬜ |
| S7 | G02 (X3) | `blocks/render-svg.ts` | `path` node drawn without its box offset (render-dom applies it): tls.t.quote mark lands top-left in SVG export | ⬜ |
| S8 | G02 (X4) | `motion/` or DeckViewer build steps | Second block on an expressive slide shows final for ~400 ms, vanishes, then enters (`custom/t-title.wide.mid-120.png` vs `mid-600`) | 🔧 `480def10` (set() now kills older tweens; hide before first paint) |
| S9 | G02 (X5) | `BlockInserter/BlockPreview.tsx` | Wide, small-text blocks scale to specks in gallery cards (`text/t-footnote.card.png`, `heading/t-subtitle.card.png`); needs a content-aware crop or min scale | ⬜ |
| S10 | G02 (X6) | `layout/measure.ts`, `library/text/_engine/text-place.ts` | Default text-width estimate 15–30 % too wide: early wraps in the editor, off-centre placement (engine shared with G03) | ⬜ |
| S11 | G02 (X7) | `tools/visual/scenarios/block-review.js` | Present pass leaves every block after the first in edit mode (`emphasis/t-callout.present.png`) | 🔧 harness |
| S12 | G02 (X8) | `block-review.js` defaults | Default mid frames 350/900 ms miss subtle entrances (done < 350 ms); use `REVIEW_MID=40,120,220` | 🔧 default is now 60,200,500,1000 |
| S13 | G02 (X9) | `slide-layouts.ts` / tls.c.quote-image | Claims full-bleed photo but the `blank` layout gives it margins (`emphasis/c-quote-image.wide.png`) | ⬜ |
| S14 | G04 Y1 / G05 Y1 | `motion/presets.ts`, `gsap-driver.ts` | `grow-bars-*` / `grow-segments` scale about the element centre; `draw-path` / `sweep` do nothing on fills (no dash array). Metric and chart blocks were switched to opacity/translate presets; a real grow-from-baseline / line draw-on needs an origin per part | 🔧 `480def10` engine (baseline grow, draw-on, `partMotion`); blocks move back in MOTION M3 |
| S15 | G04 Y2 / G05 Y7 | `layout/measure.ts` | The `inter` width table is wrong for figures (digits 0.52 em vs real 0.62, `%` 0.64 vs 0.98, `+` 0.52 vs 0.66). Measured table already exists in `library/data/_chart/inter-width.ts`; make it the single source (extends S10) | ⬜ |
| S16 | G05 Y4 | `motion/presets.ts` (`wipe-x`, `wipe-y`, `mask-reveal`, `section-in`, …) | clip-path keyframes pair `inset(100% 0 0 0)` with `inset(0)`; GSAP cannot interpolate unequal terms, so the element snaps at the end. Pair equal terms (`inset(0 0 0 0)`) | 🔧 `480def10` (`motion/clip-path.ts`) |
| S17 | G05 Y5 | `block-review.js` present pass | Dies with `waitForFunction` timeout on the 9th–10th block of a category (so no report.json on a full run; use `REVIEW_PASSES=gallery,drop,viewer`), and `d-donut.present.png` shows the editor: S11 only partly fixed | 🔧 2026-10-06: per-block retry from a fresh editor, waits for the Present bar, writes report.json first, records `presentError` |
| S18 | G05 Y6 | `library/text/_engine/color.ts` `readableOn` | Direct chart labels take the series colour solved for 4.5:1: coral becomes near-pure red. Blend 35–40 % toward `text` instead. Cosmetic | ⬜ |
| S19 | G04 Y3 | `block-review.js` | With S8 present, mid frames at 120/500 ms show the second block already final; count-up/draw frames need `REVIEW_MID=450,600,750,900,1100` | ⬜ |
| S20 | G07 | `blocks/clone-spec.ts` (`clonePropsWithFreshIds`) | Dropping a card from the gallery regenerates every `id` inside props, so `tls.g.flow` edges point at ids that no longer exist and the dropped flowchart is an unconnected column (`process/g-flow.drop-canvas.png`). Viewer is fine; tree/mindmap unaffected (they nest). Blocks flow C2 | ⬜ |
| S21 | G07 | `BlockInserter/BlockPreview.tsx` | Wide group blocks scale to specks in 182×100 gallery cards (`process/g-steps.card.png`, `g-chevrons.card.png`); same cause as S9 | ⬜ |
| S22 | G01 | `render-dom.tsx` / DeckViewer, or the block | `editorOnly` is not implemented anywhere: `tls.l.grid-guide` lines are drawn in viewer and Present (`structure/l-grid-guide.wide.png`). Needs a flag honoured by the renderer, or the block should leave the AI catalog | ⬜ |
| S23 | G01 | `library/text` `tls.t.callout` | Callout tiles hug their content, so container cards show strips instead of filled slots; a fill-the-slot option would show slot extents | ⬜ |
| S24 | G11 | slide-layouts / harness / planner docs | Nothing tells the planner where chrome blocks go (corner, edge, bottom strip) and the harness only places them in a normal region, so collisions with the `timeline` layout were not tested. Needs a placement hint or a furniture region type | ⬜ |
| S25 | G09 | `render-dom.tsx` (case `icon`), `render-svg.ts` | Renderers draw an `icon` node's path in a viewBox equal to its box, so a bigger box does not scale the path; authors must pre-scale with `iconLeaf` / `scaleIconPath`. A lint or a renderer-side scale would help | ⬜ |
| S26 | G09 | `DeckViewer.tsx` hide step, per-block `animate()` | The viewer sets opacity 0 on every `[data-part]` before `animate()`: an `animate()` that only tweens descendants leaves the container invisible (this made `tls.c.testimonial` invisible; fixed in the block). Nothing checks the older html blocks (big-stat, feature-grid, …) | 🔧 `480def10` (`motion/animate-guard.ts`) |
| S27 | G09 | README §4 | After a dev-server restart the first shoot fails once or twice (cold compile); `pkill -f 'next dev -p 5433'` run from a bash tool call also kills the calling shell. (Harness PUT retry partly covers the first part) | 🔧 partly |
| S28 | G10 | `slide-layouts.ts` (`blank` regionAlign) | Slide-scope blocks that hug their content (hero, agenda, contact, qa) sit top-left with the lower half empty, while fill blocks centre | ⬜ |
| S29 | G10 | `BlockInserter/BlockPreview.tsx` | The cover gallery card shows "Introductio n" (letter-spacing glitch in the scaled preview); the real viewer is fine | ⬜ |

## 6. Progress

Update a row when its group agent reports back. Counts are blocks whose Status is ✅ or 🔧.

| Group | Blocks | Done | Fixed (🔧) | Blocked (⏸) / open (❌) | Shared issues raised | Last commit | Status |
|---|---|---|---|---|---|---|---|
| G01 structure | 13 | 13 | 12 | 0 | S22, S23 | `d034d863` | ✅ |
| G02 heading, text, emphasis | 12 | 12 | 12 | 0 | S5–S13 | `04d99f1a` | ✅ (quote-image + subtitle re-shot 2026-10-06, both OK) |
| G03 list | 9 | 9 | 9 | 0 | — | `086e60eb` | ✅ |
| G04 metric | 13 | 13 | 12 | 0 | S14, S15, S19 | `932752a3` (+`3cf6d7f8` motion) | ✅ |
| G05 chart | 16 | 16 | 16 | 0 | S14–S18 | `7ffdac75` | ✅ |
| G06 table, comparison | 13 | 13 | 12 | 0 | — | `0ff5ffec` | ✅ |
| G07 process, timeline | 10 | 10 | 9 | 1 (flow C2 open: S20) | S20, S21 | `66946fdf` | ✅ |
| G08 hierarchy, relationship | 8 | 8 | 6 | 0 | — | `d176893e` | ✅ |
| G09 media, people, brand | 14 | 14 | 14 | 0 | S25, S26, S27 | `d942945c` | ✅ |
| G10 slide composites | 11 | 11 | 8 | 0 | S28, S29 | `b4e0d84b` | ✅ |
| G11 chrome, decoration | 10 | 10 | 6 | 0 | S24 | `a27ba24b` | ✅ |
| **Total** | **129** | **129** | **120** | **1** (flow C2, S20) | | | **review complete** |

## 7. Harness

`tools/visual/scenarios/block-review.js` (header comment has the full description). It generates
two decks through the mock API (`PUT /api/decks/review-<category>` and `review-blank`; in memory,
lost on a dev-server restart, re-PUT on every run), so nothing under `data/decks/` changes. The
example props it uses are each block's own `describe.example.props` (else `defaults`), so fixing
an example fixes the card, the drop and the viewer at once.

## 8. Session log

| Date | Session | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-05 | controller | Harness + plan; S1–S3 fixed (`74c0cf13`) | Started G02, G04, G05 in parallel; on the user's request G04/G05 were stopped before any edit. **One agent at a time; after G02 each agent takes a batch of related groups** (shared engines, better cache reuse): B1 = G04 + G05 + G06 (data) → B2 = G07 + G08 (diagram) → B3 = G01 + G03 + G11 (layout, list, chrome) → B4 = G09 + G10 (media, composites) |
| 2026-10-05 | G02 agent | 12/12 fixed: quote `b4481fa0`, quote-image `e9a6b498`, statement `29de0427`, kicker `7805d506`, body/caption/footnote/takeaway `5c4f6837`, title/subtitle/definition/callout `2a5fa613`, group file `04d99f1a` | Every G02 spec now asserts the example fits preferred and min size. Next session: restart `next dev` (S5), re-shoot `REVIEW_BLOCKS=tls.c.quote-image,tls.t.subtitle`, then start batch B1 (G04 + G05 + G06). Fix S11/S12 in the harness first so B1's present/mid shots are trustworthy |
| 2026-10-06 | B1 agent (G04 + G05, G06 in progress) | G04 13/13 (12 fixed, stat-spotlight unchanged): `3d183129`, `c81eeb2d`, `883238df`, `932752a3`, motion `3cf6d7f8`, file `560c27f9`. G05 16/16 fixed: `1698ee42`, `0ff35d76`, `032bd592`, `bbe26557`, `7ffdac75`, file `ee53da81`→`ee22a1e8`. Shared issues S14–S19 | **Resume point:** the user asked to stop after B1. If G06 is not ✅ in §6, open `G06-table-comparison.md`, check `git status` for uncommitted edits under `library/data/_table`, `library/diagram/tls-g-{matrix-2x2,swot,pros-cons,before-after,iceberg}`, `library/composite/tls-c-{comparison,case-study,problem-solution}` (the agent's in-flight work: review the diff, run the related specs, commit or revert deliberately) and continue from the first ⬜ row. Then B2 (G07 + G08), B3 (G01 + G03 + G11), B4 (G09 + G10). `packages/tldraw/src/blocks/_scratch/` is an untracked scratch folder from the agent: delete once G06 is committed. Fix S5/S17 before B2 |
| 2026-10-06 | controller | G06 closed: stopped agent's edits verified and committed (`74846ca3`, `76fff632`, `0ff5ffec`); harness PUT retry `cd6b1578`; scratch folder deleted. B1 complete: G04 + G05 + G06 | **Next: B2 = G07 (process, timeline) + G08 (hierarchy, relationship)**, then B3 (G01 + G03 + G11), B4 (G09 + G10). S17 is fixed: a full run with all passes is safe again |
| 2026-10-06 | B2 agent + controller | G07 10/10 (`6678fa80`, `eceb981b`, `66946fdf`, file `ccc10e36`), G08 8/8 (`d176893e`, file `80d0447f`); controller re-shot timeline/hierarchy/relationship on the final build: no probe findings, breakdown/venn/milestones looked at | Diagram `_kit.ts` `placeLines`/`linesHeight` now use browser-true widths (also affects matrix-2x2, swot, pros-cons, before-after, iceberg, arrow; their specs pass). Helper `assertMotionTargetsExist` in `diagram-test.ts` checks every motion part exists and every drawn leaf is animated: port it to the other families (labels/leaders visible before their box was the common fault). **Next: B3 = G01 (structure) + G03 (list) + G11 (chrome, decoration)**, then B4 = G09 + G10 |
| 2026-10-06 | B3 agent + controller | G03 9/9 (`086e60eb`, file `cc9a893b`), G01 13/13 (`d034d863`, file `5cfc131b`), G11 10/10 (`a27ba24b`, file `70c01295`); controller re-ran gallery/drop/viewer on the final build for list, structure, chrome, decoration: 30/32 probe-clean, the other two (decoration, pattern) flag their designed tint (`root:0.20`/`0.35`), not a fault | feature-grid titles/descriptions never appeared (animate only released icons) - fixed; containers had empty children (empty gallery cards) - examples now carry child tiles via `library/layout/_example.ts`; `tls.x.page-number` got an additive `total` slot. **Digest budget:** the top-8-largest-blocks digest test is near its 12 000-char limit; B4 examples that grow will trip it (keep `describe.when` short). Container examples: children go in `props.children`. Slot-size rule: `size.min <= size.preferred` in both dimensions. **Next: B4 = G09 (media, people, brand) + G10 (slide composites)** - the last batch |
| 2026-10-06 | B4 agent + controller | G09 14/14 fixed (`b14f48f1`, `d942945c`, `e50290b0`, `422a4c4b`, file `fca1f0d6`), G10 11/11 (8 fixed, divider/objectives/closing unchanged: `b4e0d84b`, `9a29421e`, `5ff66dc9`, file `556f126f`). **All 129 blocks reviewed.** An earlier B4 attempt crashed the 3.9 GB machine (low-resource mode added to §4) | Biggest finds: every G09 example pointed at an unresolvable asset id (all 14 cards showed the placeholder); testimonial was invisible in View/Present (S26); icons were unscaled 24 px specks (S25); 8 slide composites had dishonest `size.min`. **Open work (not block-local):** S7–S10/S13/S14–S16/S18/S20–S26/S28/S29 in §5 (renderer, motion presets, gallery preview scaling, clone-spec ids, text-width estimator, blank-layout alignment). Suggested next phase: fix the shared issues in that order of impact: S14/S16 (animation presets), S20 (flow drop), S9/S21/S29 (gallery previews), S10/S15 (width estimator), S8 (flash), then re-run `REVIEW_CATEGORY=<each>` once to confirm |
| 2026-10-06 | controller | Motion smoothness pass planned | See [MOTION.md](MOTION.md) (M0–M6); resume from its §3 |
