# G04 — metric (13 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `metric`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ✅ done (13/13: 1 pass unchanged, 12 fixed, 0 open) · **Agent:** B1 review-and-fix agent, 2026-10-06 · **Last commit:** `932752a3`

## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.t.hero-number | metric | element | layout | ✅ | ✅ | 🔧 | ✅ | 🔧 | 🔧 | 🔧 | `883238df` | caption sat on the bottom edge; count-up counted the caption; size 520x330 / min 260x300 |
| tls.d.progress-bar | metric | element | layout | 🔧 | 🔧 | 🔧 | ✅ | ✅ | 🔧 | 🔧 | `3d183129` | value overshot the track (digit widths); size 760x210 / min 240x132. Grows from centre: Y1 |
| tls.d.progress-ring | metric | element | layout | ✅ | ✅ | 🔧 | ✅ | ✅ | 🔧 | 🔧 | `3d183129` | centre value off-centre; min 200x240. Arc "draws" by scaling from centre: Y1 |
| tls.d.stat-compare | metric | group | layout | ✅ | ✅ | 🔧 | ✅ | 🔧 | 🔧 | 🔧 | `c81eeb2d` | +30% pill cramped; count-up on numeric parts only; min 260x132 |
| tls.d.gauge | metric | element | layout | ✅ | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `c81eeb2d` | hub covered the value; min 220x160. Bands fade (draw-path has no effect on fills): Y1 |
| tls.d.trend-badge | metric | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `c81eeb2d` | min 180x36 (label was ellipsised) |
| tls.d.bullet-chart | metric | group | layout | ✅ | 🔧 | ✅ | ✅ | ✅ | 🔧 | 🔧 | `c81eeb2d` | value at the box edge, label clipped at min; min 360x110. Bars grow from centre: Y1 |
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
| Y1 | `motion/presets.ts`, `waapi-driver.ts` (`grow-bars-x`, `grow-bars-y`, `grow-segments`, `draw-path`) | The grow presets are a plain `scale 0 -> 1` about the element's centre (no `transform-origin`), so progress-bar and bullet-chart fills inflate from the middle of the bar instead of growing from the left edge, and the progress-ring arc (a full-block path) scales from the block centre. `draw-path` (`stroke-dashoffset`) does nothing on filled paths, so the gauge bands fade as one block. The recipes are right in intent; the driver needs an origin per part (left for `-x`, bottom for `-y`) and a sweep for arcs. | `metric/d-progress-bar.wide.mid-600.png` (fills spanning 245-950 of a 80-1520 track), `custom/d-progress-ring.wide.mid-750.png`, `metric/d-gauge.wide.mid-600.png` |
| Y2 | `layout/measure.ts` (`tableMetrics` Inter table, `estimateMetrics`) | Same as S10 but specific: the "inter" table has digits 0.52 em (real 0.62) and `%` 0.64 (real 0.98), `+` 0.52 (0.66). Any block outside the data family that centres or right-aligns a number with `ctx.measureText` drifts. The measured table is now in `library/data/_chart/inter-width.ts` (`realWidth`) and could replace the generated one. | `d-progress-bar.wide.png` before the fix |
| Y3 | `tools/visual/scenarios/block-review.js` | The wide mid frames at 120/500 ms show the second block of an expressive slide at its final state (S8) so count-up/draw frames need `REVIEW_MID=450,600,750,900,1100`. With those the in-progress states are visible (hero-number 600-900, ring 600-900). | `custom/t-hero-number.wide.mid-450.png` equals the settled frame |

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-06 | B1 agent | 13/13 reviewed: 12 fixed (`3d183129` `c81eeb2d` `883238df` `932752a3`), 1 unchanged | `withRealWidths` / `realWidth` are available to every block in `library/data/_chart`; use `assertExampleFits(def)` in a spec. Y1 (grow presets scale from the centre) affects every bar/ring/segment recipe. |
