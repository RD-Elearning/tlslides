# G07 — process + timeline (10 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `process`, `timeline`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ✅ done 2026-10-06 (10/10: 6 fixed, 2 unchanged + spec, 1 fixed with C2 pending shared S20, 1 unchanged) · **Agent:** B2 agent · **Last commit:** `66946fdf`

## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.g.steps | process | group | layout | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | `6678fa80` | rebuilt: 12 px badge number in a 12 px box, whole-strip fade-up, steps slot was a JSON text; now real-width text, rows by box, desc dropped before overflow, stagger; min 480x150 |
| tls.g.chevrons | process | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `eceb981b` | `wipe-x` snapped (S16) -> sweep-nodes; "Launch" clip fixed by the real-width `placeLines` |
| tls.g.cycle | process | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `eceb981b`+`d176893e` | passes visually; "Check" box 3 px narrower than the glyphs (fixed in `_kit`); specs added |
| tls.g.funnel | process | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `eceb981b`+`d176893e` | label box widths (`_kit`); specs added |
| tls.g.flow | process | group | layout | ✅ | 🔧 | ✅ | ✅ | 🔧 | ✅ | 🔧 | `eceb981b` | node parts `node[id]` never matched `node[*]` (no part motion): numeric now. C2 was open (S20, `clone-spec.ts` regenerated node ids): fixed in M4 `faf65ba9`, the drop is connected |
| tls.c.steps | process | slide | layout | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `eceb981b` | 14 px numbers on nothing, top-aligned in a tall region, min 200x100: badges, rail, centred, wraps, min 840x460 |
| tls.g.timeline | timeline | group | layout | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | ✅ | 🔧 | `66946fdf` | notes vanished at preferred size (card slack 2 px); `draw-axis-then-nodes` -> sweep-nodes |
| tls.g.roadmap | timeline | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `66946fdf` | motion part `bar[*]` matched nothing + `grow-bars-x` (S14) -> `bar[*][*]` stagger-children; bars scale to 1.8x |
| tls.g.milestones | timeline | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `66946fdf`+`d176893e` | dates/labels/progress line were not motion parts; example-fits + motion-target specs |
| tls.c.journey | timeline | slide | html | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `66946fdf` | unchanged (own GSAP timeline draws the path; mid frames deliberate); min-size geometry spec |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to **Shared issues raised** below instead.

1. **Shared text-width bug (all diagram blocks, `diagram/_kit.ts` `placeLines` / `linesHeight`)**: text boxes came from the flat estimator, a few px narrower than the glyphs ("Check" 63 in a 60 box, "Launch" clipped in `g-chevrons.wide.png`, "$30k", "Q2", "No"). They now measure through `withRealWidths`, and an ellipsised last line is re-fitted so the appended "..." never overshoots the box. Covered by `assertExampleFits` in all 16 diagram specs (G07 + G08 + the earlier siblings run green).
2. **tls.g.steps** (`g-steps.card/.wide/.drop-canvas`): the badge number sat in a 12 px box, description wrapped to three lines past the box, connector dangled in the column gap, the whole strip faded in as one piece and `steps` was a JSON-in-text slot (bad inspector). Rewritten on the diagram kit: `steps` is a list of `{title, description}`, columns by box with a wrap to rows (min column 96), description lines cut 3 -> 0 to fit the height, a rail from badge to badge (`line`/`arrow`/`none`), vertical = badge left / text right; `stagger-children` over `step[*]` and its connectors. Min 400x100 -> 480x150 (honest). Specs: min fit, row wrap, short box drops descriptions, vertical, legacy JSON string. The digest top-8 budget (12 000) forced shorter when/avoid text.
3. **tls.c.steps** (`c-steps.wide.png`: 14 px numbers, content stuck at the top of a 900 px tall region, `size.min` 200x100): accent badges with centred numbers, rail between badges, content centred vertically, wrap to two rows under 130 px columns, shorter example copy, `size.min` 840x460, capacity counts the second row. Spec: example fits both sizes, centring, wrap, vertical columns; the N-1 connector tests still pass untouched.
4. **tls.g.chevrons / tls.g.timeline / tls.g.roadmap** motion: `wipe-x` (S16), `draw-axis-then-nodes` and `grow-bars-x` (S14) do not animate under GSAP; switched to `sweep-nodes` / `stagger-children`. Mid frames now show the axis, then nodes, notes left to right (`custom/g-timeline.wide.mid-700/900/1200.png`) and roadmap bars lane by lane.
5. **tls.g.roadmap / tls.g.flow motion parts matched nothing**: roadmap named `bar[*]` while the layout emits `bar[lane][item]`; flow nodes were `node[<id>]` (letters), and the part matcher needs digits. Now `bar[*][*]` and numeric `node[i]`. New helper `assertMotionTargetsExist` (diagram-test.ts) is in every diagram spec; it also rejects the presets known not to animate.
6. **tls.g.timeline** notes disappeared at 1400x520 (`timeline.wide.png`): drawCard received `cardsH - 2` and `floor(room / lineH)` lost the only note line once widths were exact. Fixed; the pinned "toggle showText removes part text" spec caught it.
7. **tls.g.roadmap**: bars up to 1.8x (was 1.4x) so lanes fill a tall region.
8. **Motion coverage (`d176893e`, see G08 finding 1)**: cycle, funnel and milestones recipes now include their labels, numbers, leaders and arrow heads.
9. **Passed unchanged**: tls.c.journey (html block, its own timeline; geometry at `size.min` now pinned).

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

- **S20 (tls.g.flow; any block whose props carry `id` references)**: dragging the card from the gallery runs `cloneSpecWithFreshIds`, which regenerates every `id` key inside props, so flow edges (`from`/`to`) point at ids that no longer exist and the drop is an unconnected column of nodes with no arrows (`process/g-flow.drop-canvas.png`; the viewer, which uses the example as-is, is fine). Suspected file: `packages/tldraw/src/blocks/clone-spec.ts` `clonePropsWithFreshIds` (rewrite references consistently, or skip `id` fields inside list slots of non-block objects).
- **S21 (all diagram blocks, gallery cards)**: group blocks 800-1400 wide still scale to specks in the 182x100 card (`process/g-steps.card.png`, `g-chevrons.card.png`): same cause as S9.

## Motion pass (M4)

Agent D, 2026-10-07. Probe: `REVIEW_PASSES=motion REVIEW_MOTION_STYLES=static,subtle,expressive,reduced` per category (`process`, `timeline`, `hierarchy`, `relationship`) on the final build, `REVIEW_MOTION_PNG=1` mid frames and `REVIEW_MOTION_DUMP=1` frame dumps for the flagged blocks. Spec: `library/motion-m4.spec.ts` (all 18 M4 blocks: recipe parts exist, every drawn leaf animated, expressive J5 with the example **and with the maximum item count**, subtle opacity only, connectors start after their source and no later than their target, labels after their own shape even with a text missing, journey tweens). Shared choreography in `library/diagram/_motion.ts` (G07/G08 only): `STEP` 120 ms between items, a connector `WIRE_AFTER` 80 ms after its source, its head `TIP_AFTER` 320 ms, a label `LABEL_AFTER` 150 ms after its shape; optional texts sit in per-item slots emitted for every item. No engine change.
Cells: ✅ pass · 🔧 fixed in this pass · ❌ open · n/a. Probe artefacts (not block faults, flaky across runs, verified on frame dumps): **A1** a clip part's from-state set the frame the block shows reads as 1→0 (timeline `rail-x`, layers `slab[0]` once each, clean on re-run); **A2** J5 stagger folds the first element into the block fade (chevrons `seg[*]` 367 — dump: wipes start 540/670/790/890 ms, 120 apart; cycle/mindmap/hub-spoke `<path>` 300–417 — dump: hub wires start 650/780/890 ms); **A3** html wrapper `(block)` 0→1 in one frame (journey); **A4** c.steps `root` 150 once: title and description are delegated blocks whose wrappers are both named `root`, so the probe mixes two families (clean on re-run).

**Counts:** 10/10 fixed (0 unchanged, 0 open).

| Block | J1 | J2 | J3 | J4 | J5 | J6 | J7 | J8 | Fix commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| tls.g.steps | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `43ea9615` | 🔧 steps settle (field-in) one STEP apart; connector lives in its step group and wipes towards the next step, arrow head after (was a rise with the connector at its own index). Vertical rail: 2 px wipe reads as a fade |
| tls.g.chevrons | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `43ea9615` | 🔧 back on `wipe-x` (RV07 workaround gone): each chevron wipes over its own tight `seg[i]`, a rolling left-to-right reveal; labels after. Probe J5 = A2 |
| tls.g.cycle | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `43ea9615` | 🔧 centre, then nodes clockwise from 12 o'clock; arrows draw node to node, heads after; `mark[i]`/`cap[i]` slots (icons were not a part; a node without a note shifted later notes before their node). Probe J5 = A2 |
| tls.g.funnel | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `43ea9615` | 🔧 stages pour in over their own shape (`seg[i]` wipe-down, horizontal `col[i]` wipe-x), label, then note + leader slot `side[i]` |
| tls.g.flow | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `43ea9615` | 🔧 builds by DAG layer: `layer[k]` fades, edges leaving it draw on (`out[k]`), heads/labels after; back edges once their source is there; 12 layers < 2.5 s. S20 fixed (`faf65ba9`): dropped flowchart is connected (`process/g-flow.drop-canvas.png`) |
| tls.c.steps | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `43ea9615` | 🔧 was `stagger-lines` (500 ms fade + rise + blur per part by its own index: later titles before earlier badges); now `step[i]` slots: badge settles, number, title, description, rail wipes. Probe J5 once = A4 |
| tls.g.timeline | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `43ea9615` | 🔧 axis + now-fill wipe along the axis (`rail-x` / `rail-y`), then events in date order: node settles, mark + stem, card slot. Probe J1 once = A1 |
| tls.g.roadmap | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `43ea9615` | 🔧 bars `grow-bars-x` from their start date (origin `left center` so the zero-line heuristic never grows one backwards), 60 ms apart (30 bars < 2.5 s), labels after, today line wipes down |
| tls.g.milestones | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `43ea9615` | 🔧 line + done part wipe along the axis, diamonds settle about their own centre (`gem[i]`), date + label slot `cap[i]` (a missing date shifted later labels) |
| tls.c.journey | ✅ | ✅ | 🔧 | ✅ | 🔧 | ✅ | ✅ | ✅ | `43ea9615` | 🔧 draw 2.6 s linear → 900 ms eased out, nodes timed by the inverse ease (`back.out(1.6)` from 0.4, was `back.out(3)` from 0); halos pulsed to 0 then were `set` to 1 at the end (J3 snap) → ease into rest; 3.4 s → 1.6 s. Probe J1/J5 `(block)` = A3 |

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-06 | B2 agent | G07 10/10: steps `6678fa80`, chevrons/cycle/funnel/flow/c-steps `eceb981b`, timeline/roadmap/milestones/journey `66946fdf` | Shared `diagram/_kit.ts` text fix is in; G08 follows. flow C2 waits for S20 |
| 2026-10-07 | agent D (M4) | Motion pass: 10/10 fixed (0 unchanged, 0 open); S20 fixed `faf65ba9` | Rows above; probe artefacts A1–A4 for the controller |
