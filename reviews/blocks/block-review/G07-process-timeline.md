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
| tls.g.cycle | process | group | layout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | `eceb981b` | passes visually; "Check" box 3 px narrower than the glyphs (fixed in `_kit`); specs added |
| tls.g.funnel | process | group | layout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | `eceb981b` | label box widths (`_kit`); specs added |
| tls.g.flow | process | group | layout | ✅ | ❌ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `eceb981b` | node parts `node[id]` never matched `node[*]` (no part motion): numeric now. C2 open: drop shows an unconnected column (S20, `clone-spec.ts` regenerates node ids) |
| tls.c.steps | process | slide | layout | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `eceb981b` | 14 px numbers on nothing, top-aligned in a tall region, min 200x100: badges, rail, centred, wraps, min 840x460 |
| tls.g.timeline | timeline | group | layout | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | ✅ | 🔧 | `66946fdf` | notes vanished at preferred size (card slack 2 px); `draw-axis-then-nodes` -> sweep-nodes |
| tls.g.roadmap | timeline | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `66946fdf` | motion part `bar[*]` matched nothing + `grow-bars-x` (S14) -> `bar[*][*]` stagger-children; bars scale to 1.8x |
| tls.g.milestones | timeline | group | layout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `66946fdf` | unchanged; example-fits + motion-target specs |
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
8. **Passed unchanged**: tls.g.cycle, tls.g.funnel (only the shared text fix), tls.g.milestones, tls.c.journey (html block, its own timeline; geometry at `size.min` now pinned).

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

- **S20 (tls.g.flow; any block whose props carry `id` references)**: dragging the card from the gallery runs `cloneSpecWithFreshIds`, which regenerates every `id` key inside props, so flow edges (`from`/`to`) point at ids that no longer exist and the drop is an unconnected column of nodes with no arrows (`process/g-flow.drop-canvas.png`; the viewer, which uses the example as-is, is fine). Suspected file: `packages/tldraw/src/blocks/clone-spec.ts` `clonePropsWithFreshIds` (rewrite references consistently, or skip `id` fields inside list slots of non-block objects).
- **S21 (all diagram blocks, gallery cards)**: group blocks 800-1400 wide still scale to specks in the 182x100 card (`process/g-steps.card.png`, `g-chevrons.card.png`): same cause as S9.

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-06 | B2 agent | G07 10/10: steps `6678fa80`, chevrons/cycle/funnel/flow/c-steps `eceb981b`, timeline/roadmap/milestones/journey `66946fdf` | Shared `diagram/_kit.ts` text fix is in; G08 follows. flow C2 waits for S20 |
