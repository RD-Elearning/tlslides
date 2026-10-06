# G05 — chart (16 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `chart`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ✅ done (16/16: 0 pass unchanged, 16 fixed, 0 open) · **Agent:** B1 review-and-fix agent, 2026-10-06 · **Last commit:** `7ffdac75`

## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.d.bar | chart | group | layout | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | `0ff35d76` | rebuilt on bar-family: gridlines were `line` nodes (not drawn), labels left-aligned, last label below the box; min 320x240 |
| tls.d.donut | chart | group | layout | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | `0ff35d76` | example drew black slices (accent1..4 are not roles); no labels/centre; now pie engine + hole, centre value, legend |
| tls.d.line | chart | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `1698ee42` | category thinning dry run; sweep-nodes. End label deep red = contrast-solved coral (Y6) |
| tls.d.area | chart | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `1698ee42` | legend label boxes by real width; wipe-x snapped under GSAP -> sweep-nodes |
| tls.d.grouped-bar | chart | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `1698ee42` | bars inflated from their centres (grow-bars-y) -> stagger-children; legend widths |
| tls.d.stacked-bar | chart | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `1698ee42` | segments scaled about the centre -> stagger-children |
| tls.d.pie | chart | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `0ff35d76` | sweep-nodes; label stack falls back to legend one line earlier; PieExtra for the donut |
| tls.d.sparkline | chart | element | layout | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | `032bd592` | 1440x700 in a wide region -> strip <= 150 tall; min 200x60 |
| tls.d.waterfall | chart | group | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `bbe26557` | value labels narrower than glyphs; min 300x210 |
| tls.d.funnel-chart | chart | group | layout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | `bbe26557` | real widths only (passes visually unchanged); drop-off labels sit far right in a wide region |
| tls.d.scatter | chart | group | layout | ✅ | ✅ | 🔧 | ✅ | ✅ | 🔧 | 🔧 | `032bd592` | points on the axis covered the y labels; labels above the dot; realistic example |
| tls.d.radar | chart | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | 🔧 | `bbe26557` | min 350x270 (axis labels ellipsised); polygon fade. Scale labels sit on the first axis and cross the data |
| tls.d.slope | chart | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `bbe26557` | label column by real widths; sweep-nodes |
| tls.d.bubble | chart | group | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `032bd592` | min 340x240; EMEA/APAC/AMER example |
| tls.d.heatmap | chart | group | layout | ✅ | 🔧 | ✅ | ✅ | ✅ | 🔧 | 🔧 | `032bd592` | legend moved under the grid; 4x3 example |
| tls.c.chart-insight | chart | group | layout | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | 🔧 | `7ffdac75` | narrow: takeaway 220 wide wrapped per word -> under the chart; min 960x540 |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to **Shared issues raised** below instead.

**The viewer drives motion with GSAP, which changes what a recipe can be.** `examples/nextjs-sample/components/ViewDeck.tsx` passes `createGsapDriver(gsap)`. Measured with a per-frame trace
(`getComputedStyle` of a bar part on every rAF): (1) the `grow-*` presets are `scale 0 -> 1` about the element
centre, so bars floated and inflated from their middle (`grouped-bar.wide.mid-700.png`); (2) `draw-path`
tweens `stroke-dashoffset`, which does nothing without a dash array, so every "draw-path" chart only faded
with its block; (3) the `wipe-x` / `wipe-y` / `mask-reveal` presets keyframe `inset(100% 0 0 0)` to
`inset(0)`: GSAP cannot interpolate values with a different number of terms and holds the first one until
the end, so a wipe is hidden and then snaps (`inset(100% 0px 0px)` at 543 ms, `inset(0px)` at 877 ms, no
state in between). Only opacity / translate / scale animate smoothly. Every chart now uses `stagger-children`
(bars rise 12 units while fading, left to right) or `sweep-nodes` (fade in reading order); after the change
the trace shows `opacity 0.89 -> 1` and a 2.6 -> 0 unit rise over ~350 ms. The proper fix (an origin per part,
a draw for paths, matching inset terms) is in `motion/`: Y1, Y4.

**Same root cause as G04 for widths.** `withRealWidths` and `realWidth` (G04) are now used by every chart
layout; the legend, `categoryLabels` and the label columns of waterfall, radar, sparkline, slope, bubble
and scatter size their boxes from them. `assertExampleFits` is in every chart spec: all 16 examples fit
both `size.preferred` and `size.min`, every single-line label as wide as its glyphs.

1. **tls.d.bar - C1/C2/C3/C4/C5/C6** (`chart/d-bar.card.png`, `d-bar.wide.png`, `d-bar.drop-canvas.png`).
   The first chart had its own pre-P2 geometry: gridlines and axis were `line` nodes (the DOM renderer does
   not draw them: no gridlines at all), bars were clamped to 75% of the plot and re-centred so the first
   bar started ~190 units from the axis labels, category labels were left-aligned under each bar, the
   labels were `max(barWidth, estimate)` wide, and at 800x500 the last label sat at y 480 + 24 = 504, below
   the box. Rebuilt on `_chart/bar-family` (the engine of `tls.d.grouped-bar`): gridlines, baseline,
   centred labels, value labels above the bars (new option `valueLabels: end | none`, default `end`),
   gaps for null / NaN, highlight in accent with the rest dimmed, a title that shrinks to 0.55 before it
   clips, both orientations; part names are now `bar[0][i]`, `cat[i]`, `grid[i]`. The geometry specs were
   rewritten (the old ones pinned the old node layout); the engine unit tests (linear scale, colours) are
   untouched. Example: four quarters with a highlight; size min 200x150 -> 320x240.
2. **tls.d.donut - C1/C2/C3/C4/C6** (`chart/d-donut.card.png`: three black slices). The example used
   `accent1`..`accent4`, which are not colour roles and resolved to black (the failure
   CURRENT-STATE.md warns about), the block drew no labels, no legend and no centre although its
   shortDescription promised a centre label, and its preferred size was 200x200. Now the pie engine with a
   0.6 hole: legend (default) or outside labels with percentages, `centerValue` / `centerLabel`, a `total`
   above the sum leaves the rest of the ring as a track, unknown colours fall back to the categorical ramp,
   the author order is kept. `slices` keeps its shape (`value`, `color`, `label`), so `tls.c.dashboard`
   and `tls.c.chart-insight` (which build donuts) and the demo fixtures keep working. `engine-v2.spec`'s
   donut test pinned the old fixed geometry; it now pins the structure.
3. **tls.d.sparkline - C3/C4** (`chart/d-sparkline.wide.png` before: a 1440x700 line). Capped at a strip
   (<= 150 tall, about 0.3 of the width) so a word-sized chart is not a region filler.
4. **tls.d.scatter - C3** (`chart/d-scatter.wide.png`: the (1, 3) point on top of the "3" axis label,
   (4, 8) on the plot edge). The x range is inset by the dot radius; labels sit above their dot.
5. **tls.d.heatmap - C2** (`chart/d-heatmap.drop-canvas.png`: two rows of cells with the legend at the box
   bottom). The legend follows the grid; the example is 4 x 3 with real names.
6. **tls.c.chart-insight - C4** (`chart/c-chart-insight.narrow.png`: "Users / doubled in / two /
   quarters." in a 220-wide column). A side panel narrower than 380 goes under the chart.
7. **Category label thinning (tls.d.line, tls.d.area, bar-family) - regression found by running the
   sibling specs.** Switching label widths to real ones made the "long category labels never overlap"
   specs fail: the old check compared only the longest word with the flat estimate. `categoryLabels` now
   does a dry run (<= 2 lines, edge labels slid back inside, neighbours never touch) before choosing the
   stride.
8. **Honest sizes (C6)**: radar min 260x200 -> 350x270 (axis labels were ellipsised), waterfall 260x180 ->
   300x210, bubble 260x180 -> 340x240, sparkline 120x36 -> 200x60, chart-insight 640x360 -> 960x540.
9. **AI metadata (C6)**: bar's when/avoid name pie, grouped-bar, line and hero-number; donut's avoid names
   bar, progress-ring and table; scatter, bubble, heatmap examples use real names. The digest top-8 budget
   (12,000) forced the bar and donut slot help texts down to a few words.

Checked and passing as-is: drag-drop adds one shape with no page error for all 16; chains complete (`2/2`
wide, `1/1` narrow); no escapes / overflow / stuck parts; line, area, grouped-bar, stacked-bar, pie,
waterfall, funnel-chart, radar, slope and bubble look right at card, drop, wide and narrow after the width and
motion work. Left as is: radar scale labels (10 / 7.5 / 5 / 2.5) sit on the first axis and are crossed by the
series; the funnel's drop-off labels sit at the far right of a wide region; the end label of a line
(`Users`) is the series colour solved for 4.5:1 contrast, which turns coral into a deep red (`readableOn`).

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

| # | Area (suspected file) | Symptom | Shot / evidence |
|---|---|---|---|
| Y1 | `motion/presets.ts`, `gsap-driver.ts` | `grow-bars-x`, `grow-bars-y`, `grow-segments` scale about the element centre (GSAP's default origin; no per-part origin), `draw-path` / `sweep` animate `stroke-dashoffset` (no effect without a dash array and on fills). Charts and metrics now avoid them (opacity / translate presets) but a real "bar grows from the baseline" or "line draws on" needs an origin per part and a dash-based draw. | `chart/d-grouped-bar.wide.mid-700.png` (old: bars floating mid-air) |
| Y4 | `motion/presets.ts` (`wipe-x`, `wipe-y`, `mask-reveal`, `section-in`, ...) | Their clip-path keyframes pair `inset(100% 0 0 0)` with `inset(0)` (4 terms vs 1). The GSAP driver (used by ViewDeck.tsx) cannot interpolate that: the element stays at the first value and snaps at the end (trace of `bar[0][1]`: `inset(100% 0px 0px)` at 543 ms, `inset(0px)` at 877 ms). Pair equal terms (`inset(0 0 0 0)`, same units) and the wipe animates. `tls.d.area` shipped with `wipe-x` and snapped. | frame trace in the group file; `custom/d-bar.wide.mid-780.png` (hidden) vs `mid-860.png` (final) |
| Y5 | `tools/visual/scenarios/block-review.js` (present pass) | The present pass dies with `page.waitForFunction: Timeout 30000ms` on the 9th-10th block of a category (chart: after `d-scatter`), so no report is written for a full run (run `REVIEW_PASSES=gallery,drop,viewer` for the report); and `d-donut.present.png` shows the editor, not Present mode (S11 not fully fixed). | `chart/d-donut.present.png` |
| Y6 | `text/_engine/color.ts` (`readableOn`) used by `_chart/line-family.ts` | A direct label takes the series colour solved for 4.5:1: coral `#ff6b6b` becomes `#e00000`-ish pure red next to a coral line. Blending 35-40% toward `text` would keep the hue and the contrast. Cosmetic. | `chart/d-line.wide.png`, `metric/c-dashboard.wide.png` |
| Y7 | `layout/measure.ts` | The `inter` table is wrong for figures (see G04 Y2); `library/data/_chart/inter-width.ts` has measured widths, one source for both. | G04 Y2 |

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-06 | B1 agent | 16/16 reviewed, 16 fixed (`3cf6d7f8` `1698ee42` `0ff35d76` `032bd592` `bbe26557` `7ffdac75`) | A frame trace (rAF + `getComputedStyle`) is the only way to see GSAP motion here: screenshots land between 700 and 860 ms and miss it. The viewer needs a dev-server restart after `pnpm build` (S5 again). tls.d.bar part names changed (bar[0][i]). |
