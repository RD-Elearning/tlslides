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
#   REVIEW_PASSES=gallery,drop,viewer,present (any subset) · REVIEW_THEME=midnight · REVIEW_MID=300,800
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

## 6. Progress

Update a row when its group agent reports back. Counts are blocks whose Status is ✅ or 🔧.

| Group | Blocks | Done | Fixed (🔧) | Blocked (⏸) / open (❌) | Shared issues raised | Last commit | Status |
|---|---|---|---|---|---|---|---|
| G01 structure | 13 | 0 | 0 | 0 | — | — | ⬜ |
| G02 heading, text, emphasis | 12 | 0 | 0 | 0 | — | — | ⬜ |
| G03 list | 9 | 0 | 0 | 0 | — | — | ⬜ |
| G04 metric | 13 | 0 | 0 | 0 | — | — | ⬜ |
| G05 chart | 16 | 0 | 0 | 0 | — | — | ⬜ |
| G06 table, comparison | 13 | 0 | 0 | 0 | — | — | ⬜ |
| G07 process, timeline | 10 | 0 | 0 | 0 | — | — | ⬜ |
| G08 hierarchy, relationship | 8 | 0 | 0 | 0 | — | — | ⬜ |
| G09 media, people, brand | 14 | 0 | 0 | 0 | — | — | ⬜ |
| G10 slide composites | 11 | 0 | 0 | 0 | — | — | ⬜ |
| G11 chrome, decoration | 10 | 0 | 0 | 0 | — | — | ⬜ |
| **Total** | **129** | **0** | **0** | **0** | | | |

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
