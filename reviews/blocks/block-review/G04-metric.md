# G04 — metric (13 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `metric`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ✅ done (13/13: 1 pass unchanged, 12 fixed, 0 open) · **Agent:** B1 review-and-fix agent, 2026-10-06 · **Last commit:** `932752a3`

## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.t.hero-number | metric | element | layout | ✅ | ✅ | 🔧 | ✅ | 🔧 | 🔧 | 🔧 | `883238df` | caption sat on the bottom edge; count-up counted the caption; size 520x330 / min 260x300 |
| tls.d.progress-bar | metric | element | layout | 🔧 | 🔧 | 🔧 | ✅ | ✅ | 🔧 | 🔧 | `3d183129` | value overshot the track (digit widths); size 760x210 / min 240x132. Motion: sweep-nodes `3cf6d7f8` (grow-bars scaled from the centre, Y1) |
| tls.d.progress-ring | metric | element | layout | ✅ | ✅ | 🔧 | ✅ | ✅ | 🔧 | 🔧 | `3d183129` | centre value off-centre; min 200x240. Motion: sweep-nodes `3cf6d7f8` (the arc scaled from the block centre, Y1) |
| tls.d.stat-compare | metric | group | layout | ✅ | ✅ | 🔧 | ✅ | 🔧 | 🔧 | 🔧 | `c81eeb2d` | +30% pill cramped; count-up on numeric parts only; min 260x132 |
| tls.d.gauge | metric | element | layout | ✅ | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `c81eeb2d` | hub covered the value; min 220x160. Motion: bands sweep in order `3cf6d7f8` (draw-path did nothing on fills, Y1) |
| tls.d.trend-badge | metric | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `c81eeb2d` | min 180x36 (label was ellipsised) |
| tls.d.bullet-chart | metric | group | layout | ✅ | 🔧 | ✅ | ✅ | ✅ | 🔧 | 🔧 | `c81eeb2d` | value at the box edge, label clipped at min; min 360x110. Motion: sweep-nodes `3cf6d7f8` (Y1) |
| tls.c.kpi-tile | metric | element | layout | ✅ | ✅ | 🔧 | ✅ | 🔧 | 🔧 | 🔧 | `883238df` | bottom padding, long value autofit, min 200x210; label out of count-up |
| tls.c.kpi-row | metric | group | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `883238df` | min 480x240 (tiles are 210 tall) |
| tls.c.big-stat | metric | slide | html | ✅ | ✅ | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | `932752a3` | number never visible (opacity stuck 0 on the GSAP path); subtle = one fade; min 520x265 |
| tls.c.stat-card | metric | element | layout | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `883238df` | value wrapped "$4.2/M" and overflowed at 320x200; 520x420 / min 440x400; stretches in a wide region (documented) |
| tls.c.dashboard | metric | slide | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `932752a3` | min 800x600. Line chart direct label drawn in pure red: see G05 tls.d.line |
| tls.c.stat-spotlight | metric | group | html | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | passed unchanged (poster fits preferred and min, spec added in `932752a3`) |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to **Shared issues raised** below instead.

**Root cause behind most of this group (C1/C3/C4).** Every metric block anchors text by its width
(right-aligned values, centred values, pills, columns). `estimateMetrics` and the `tableMetrics`
Inter table are both too narrow for figures: in the app (headless Chromium, Inter 400) a digit is
0.62 em and `%` is 0.98 em, the table says 0.52 and 0.64, so "72%" is 2.16 em, not 1.68. The
percentage in `tls.d.progress-bar` ended ~10 units past its track and the card clipped it, the ring
value was off-centre, the "+30%" pill had no padding. Fix: `library/data/_chart/inter-width.ts`
(measured per-glyph table, kerning ignored, within ~3 %), `withRealWidths(ctx)` and `textAligned`
in `_chart/kit.ts` (centre/end anchoring uses it; start alignment unchanged, so every other chart
gets the same improvement), and the test helpers `assertInkFits` / `assertExampleFits`
(`_chart/chart-test.ts`): every single-line text node must be as wide as its glyphs and the example
must lie inside both `size.preferred` and `size.min`. Every block of the group has such a test.

1. **tls.c.big-stat — C3/C4/C5** (`metric/c-big-stat.wide.png`, report `stuck: ["value:0.00"]`). The
   headline number was never visible. The host hides every `data-part` inline and `animate()` reveals
   it; the GSAP branch only wrote the count-up *text* of `value` (the label and context had their own
   opacity tweens), so the number stayed at opacity 0 for ever. Now it fades in with the count-up and
   ends on the exact formatted text; `motionStyle: subtle` is a calm fade of the three parts with the
   number already final (the narrow variant used to count up). min 300x200 -> 520x265 (the display
   number wraps per letter below that). Tests: `RV04` GSAP-path and subtle tests.
2. **tls.t.hero-number — C3/C6** (`metric/t-hero-number.drop-canvas.png`: the caption touches the
   bottom edge, as the user saw). The block height was a guess of line heights (`size * 1.2`). It is
   now the bottom of the last text plus the same padding as the top. The real display type is 152
   tall, so size 520x300 -> 520x330 and min 200x120 -> 260x300 (at 200 wide "$4.2M" wrapped to
   "$4.2" / "M"). Autofit reads real widths. Motion: the count-up preset rewrites the digits of every
   listed part, so `caption` "FY2024 total" counted 0 -> 2024; only `value` is listed now and the
   count-up is the `expressive` recipe (subtle/default: fade-up). Tests: caption inset, long value
   on one line, example fits.
3. **tls.d.progress-bar — C1/C3** (`metric/d-progress-bar.card.png`, `.wide.png`). See root cause;
   value column from real widths. Honest size 760x210 / min 240x132 (two rows need 132; the example
   box was 300 tall for 110 of content). Test: value ends on the track edge.
4. **tls.d.progress-ring — C3** (`metric/d-progress-ring.wide.png`: "68 %" 14 units right of centre,
   captions left of it). Centre text and captions use real widths. min 120x140 -> 200x240 (the value
   shrank to 4 units wide and left the box). Test: value/label/caption centred on the ring.
5. **tls.d.stat-compare — C3/C5/C6** (`metric/d-stat-compare.wide.png`). The "+30%" text touched the
   pill's right edge (pill = estimate * 1.12). Pill and value fit use real widths. min 260x120 ->
   260x132. Motion listed `caption` and `connector` under count-up; now only the two values and the
   delta (`expressive`), fade-up otherwise. Test: pill padding >= 4 on both sides.
6. **tls.d.gauge — C1/C3/C4** (`metric/d-gauge.wide.png`: the pointer hub covers "42";
   `d-gauge.drop-canvas.png`: "-100" on the box edge). The hub (0.072 R) grew past the fixed 14 unit
   gap under the baseline. R is solved with a hub allowance, tick labels use real widths. min
   200x140 -> 220x160. Test: value below the hub at 560x380, 1600x800 and 320x220.
7. **tls.d.trend-badge — C6.** At min 100x28 the label was ellipsised to "ch…": min 180x36, pill from
   real widths.
8. **tls.d.bullet-chart — C1/C4/C6.** Label column used `W * 0.28` of a 260 box, so "Revenue" was
   clipped at min: min 360x110; value/label columns from real widths.
9. **tls.c.kpi-tile — C3/C6.** The last line sat on the tile's bottom edge (height ended at the last
   child); a long value wrapped. Bottom padding = top padding, value shrinks (to 0.5) by real width,
   min 200x140 -> 200x210. Motion: `label` removed from the parts (count-up would rewrite
   "Top 10 customers"). Tests: bottom inset, long value on one line.
10. **tls.c.kpi-row — C6.** min 400x180 -> 480x240 (a tile is 210 tall).
11. **tls.c.stat-card — C1/C2/C3** (`metric/c-stat-card.card.png`, `.drop-canvas.png`: "$4.2" and an
    "M" below, outside the card). Preferred 320x200 / min 160x120 could not hold the hero number
    (152 type, 24 + 24 padding). Honest size 520x420 / min 440x400; `when` says to put it in a column
    or grid cell because a full-width region stretches the card (`c-stat-card.wide.png`: 1440x626 card
    with a corner icon). Digest snapshot regenerated for that `when` only.
12. **tls.c.dashboard — C6.** min 800x520 -> 800x600. The line chart's direct label ("Revenue", pure
    red at the end of the line) is a G05 matter (`c-dashboard.wide.png`).

Checked and passing as-is: drag-drop adds one shape at the drop point with no page error for all 13;
inspectors open; no report escapes/overflow; chains complete (`2/2` wide for element blocks, `1/1`
for slide blocks, `1/1` narrow); `tls.c.stat-spotlight` (Vietnamese example, ring draws, expressive
timeline runs to ~1.5 s) needed no change; `tls.d.trend-badge` and `tls.c.kpi-row` only needed their
min. `tls.c.kpi-tile`'s sparkline path is box-local (DOM and SVG disagree: S7), not fixed here.

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

| # | Area (suspected file) | Symptom | Shot / evidence |
|---|---|---|---|
| Y1 | `motion/presets.ts`, `gsap-driver.ts` | `grow-bars-*` / `grow-segments` scale about the element centre and `draw-path` does nothing on fills: bars inflated from the middle, ring arcs from the block centre. Metric blocks were switched to `sweep-nodes` (`3cf6d7f8`); a real grow-from-baseline / sweep needs an origin per part (see G05 Y1, Y4: wipe presets also snap under GSAP). | `metric/d-progress-bar.wide.mid-600.png` (before) |
| Y2 | `layout/measure.ts` (`tableMetrics` Inter table, `estimateMetrics`) | Same as S10 but specific: the "inter" table has digits 0.52 em (real 0.62) and `%` 0.64 (real 0.98), `+` 0.52 (0.66). Any block outside the data family that centres or right-aligns a number with `ctx.measureText` drifts. The measured table is now in `library/data/_chart/inter-width.ts` (`realWidth`) and could replace the generated one. | `d-progress-bar.wide.png` before the fix |
| Y3 | `tools/visual/scenarios/block-review.js` | The wide mid frames at 120/500 ms show the second block of an expressive slide at its final state (S8) so count-up/draw frames need `REVIEW_MID=450,600,750,900,1100`. With those the in-progress states are visible (hero-number 600-900, ring 600-900). | `custom/t-hero-number.wide.mid-450.png` equals the settled frame |

## Motion pass (M3)

Agent C, 2026-10-07. Probe: `REVIEW_PASSES=motion REVIEW_MOTION_STYLES=static,subtle,expressive,reduced` per category on the final build (`metric`, `chart`, `table`, `comparison`), plus `REVIEW_MOTION_PNG=1` mid frames (15/40/75 %) and `REVIEW_MOTION_DUMP=1` frame dumps for the changed blocks. Spec: `library/motion-m3.spec.ts` (all 42 M3 blocks: recipe parts exist, every drawn leaf animated or listed as chart frame, expressive 150–900 ms / out ease / stagger ≤ 120 ms / ≤ 2.5 s / block fade only, subtle opacity only, J6 preset per mark, every label after its mark, only numbers count, tables header-first, comparisons side by side).
Engine (minimal, blocks several M3 blocks, with specs in `motion/smoothness.spec.ts`): `11d89574` (partMotion `delay`/`stagger`; one-axis grows follow the bars' geometry; waterfall steps grow from the previous level; stacked segments grow about the zero line by column; count-up keeps the target format on tabular figures; `split-in` settles at 0, mirrored pair) and `c827b476` (count-up tabular style on the part element). Stale specs fixed in `6a113855` (`timeline.spec`) and `16c519d3` (`motion-style.spec`).
Shared conventions: `library/data/_chart/motion.ts` — the chart frame (grid, ticks, categories, legend, tracks) rides the block fade, marks start at 80 ms, labels `LABEL_AFTER` (260 ms) after their mark with the mark's stagger; labels fade with `sweep-nodes` (400 ms: a 250 ms `fade` on an already visible block jumps > 0.35 in its first frame, J1), points/dots/badges enter with `field-in` (`pop`/`pop-points` settle in ~100 ms, J5).
Cells: ✅ pass · 🔧 fixed in this pass · ❌ open · n/a (no such motion: J6 applies to grows, draws and sweeps only). Probe artefacts (not block faults, reported to the controller) are marked ✅ with a note: **A1** a grow/clip part whose from-state is set in the same frame the block wrapper becomes visible reads as a 1→0 jump (prev frame hidden); **A2** J5 stagger: an element's first run merges with the block fade (effective opacity), so marks starting inside the fade are timed from the reveal; **A3** html wrapper `(block)` opacity 0→1 in one frame while its parts are still faint (E3 variant). Each was flaky across runs.

**Counts:** 13/13 fixed (0 unchanged, 0 open).

| Block | J1 | J2 | J3 | J4 | J5 | J6 | J7 | J8 | Fix commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| tls.t.hero-number | ✅ | ✅ | ✅ | ✅ | 🔧 | n/a | ✅ | ✅ | `6a113855` | 🔧 expressive was block `count-up` (whole block zoomed in from 0.7; unit/caption rode it) → block fades, `value` counts up (format kept, tabular figures), unit and caption rise after |
| tls.d.progress-bar | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `27ee6939` | 🔧 back to `grow-bars-x` from the track start, value counts with its fill, row by row (RV04 fade). A1 seen once |
| tls.d.progress-ring | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `27ee6939` | 🔧 arc + caps in a `ring` group with an unpainted full-ring guide: sweeps clockwise from 12 o'clock over the still track, value counts. A1 seen once |
| tls.d.stat-compare | ✅ | ✅ | ✅ | ✅ | 🔧 | n/a | ✅ | ✅ | `a342683c`, `c827b476` | 🔧 was block `count-up` (pill counted with the numbers) → before, after, connector wipe, pill + figure; J5 `<div>` stagger came from the count style on the text line (engine fix) |
| tls.d.gauge | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | ✅ | ✅ | `27ee6939` | 🔧 dial wipes in from its start side as one (a filled `sweep` opens at 12 o'clock: wrong for a 180° dial), value counts, needle/hub fade after (the pop was 100 ms, J5) |
| tls.d.trend-badge | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `a342683c` | 🔧 arrow, figure and label rode the block fade ahead of the pill → pill first, figure counts, label after |
| tls.d.bullet-chart | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `27ee6939` | 🔧 back to `grow-bars-x`, value counts, target wipes down after its bar (rode the block fade) |
| tls.c.kpi-tile | ✅ | ✅ | ✅ | ✅ | 🔧 | n/a | ✅ | ✅ | `6a113855` | 🔧 was block `count-up` (zoom 0.7, delta counted too) → value counts as a part, delta rises after |
| tls.c.kpi-row | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `6a113855` | 🔧 tiles rise left to right 100 ms apart, every tile value counts (numbers were final) |
| tls.c.big-stat | ✅ | ✅ | ✅ | ✅ | 🔧 | n/a | ✅ | ✅ | `28b45edf` | 🔧 number fade was 100 ms (J5) and the count ~400 ms → 300 ms fade, 800 ms out-eased count in the target format on tabular figures. A3 once on subtle |
| tls.c.stat-card | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `6a113855` | 🔧 `preset: 'stagger'` was not a preset id (moved as one piece) → icon pops, number counts, unit and caption rise |
| tls.c.dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `331e975c` | 🔧 one `root` piece → KPIs rise, chart marks grow/draw/sweep (`composeWithChart` keeps the chart's roles: `chart[line][0]`…), labels after, insight last |
| tls.c.stat-spotlight | ✅ | ✅ | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | ✅ | `28b45edf` | 🔧 arc/count 1.8 s in-out, stats 150 ms apart → ≤ 900 ms out-eased, 120 ms, chain 2.1 s; arc is a path from 12 o'clock at rest fully drawn (J3: rotated circle read as 546 px), stat padding on an inner box (J4). A3 seen |

**M3 — engine / probe issues for the controller** (not block-local):
- **A1 (probe J1)**: a part whose entrance has no opacity term (`grow-*`, `sweep`, `wipe-*`) gets its from-state in the same frame the block wrapper's fade starts; when the sampled frame before was hidden (wrapper 0) the probe still reports the value jump (scale/clip 1 → 0.15). The earlier value was never visible; J1 should ignore a jump whose previous frame was hidden. Seen once each on progress-bar, progress-ring, matrix-2x2; clean on re-runs.
- **A2 (probe J5 stagger)**: an element's sample includes the ancestors' opacity, so its first run starts at the block reveal when its own motion begins inside the block fade; a family with members starting inside and after the fade shows a false gap (grouped-bar 333 ms, waterfall connectors 417 ms; recipes are 60/120 ms, pinned in `motion-m3.spec`).
- **A3 (probe E3 variant)**: an html block's wrapper goes 0 → 1 in one frame while its parts are still faint (≤ 0.2), flagged J1 + J5 `(block) 17 ms` (stat-spotlight, feature-reveal, big-stat subtle; alternates between runs).
- **DeckViewer settle path** (`DeckViewer.tsx`, "already revealed: settle to visible"): sets `{opacity, translate, scale}` on parts only, not `clipPath` / `strokeDashoffset`; a skip mid-chain relies on running wipe/draw/sweep tweens finishing. Not seen as a fault; worth a `set` of the full rest state.
- `sweep` opens filled parts from 12 o'clock only; a 180° gauge uses a `wipe-x` instead (a start-angle option would give it a true sweep).

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-06 | B1 agent | 13/13 reviewed: 12 fixed (`3d183129` `c81eeb2d` `883238df` `932752a3`), 1 unchanged | `withRealWidths` / `realWidth` are available to every block in `library/data/_chart`; use `assertExampleFits(def)` in a spec. Y1 (grow presets scale from the centre) affects every bar/ring/segment recipe. |
| 2026-10-07 | agent C (M3) | Motion pass: 13/13 fixed (0 unchanged, 0 open). | Rows above; probe artefacts A1–A3 for the controller |
