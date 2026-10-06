# G11 — chrome + decoration (10 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `chrome`, `decoration`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ✅ done (10/10 reviewed: 6 🔧, 4 ✅) · **Agent:** B3 · **Last commit:** `a27ba24b`

## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.x.page-number | chrome | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `a27ba24b` | "3 / 24" promised but no `total` slot; align ignored; 60x20 box clipped the digits (card showed a giant crop, viewer a speck) → total slot, align, hugging box; 120x36 / min 72x36 |
| tls.x.footer-text | chrome | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `a27ba24b` | min 200x26 ellipsised the example (and was shorter than its own rule+text) → 380x40; spec: no ellipsis at preferred or min |
| tls.x.logo-mark | chrome | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  | unchanged; fits both sizes (spec) |
| tls.x.header | chrome | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `a27ba24b` | min 200x30 → 400x46 (label and meta no longer ellipsised) |
| tls.x.watermark | chrome | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  | unchanged; sits behind content, scales with the box (wide + narrow checked) |
| tls.l.field | decoration | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `a27ba24b` | claimed "colour or gradient" but ignored style.surface → honours the Paint like card/overlay; when says how to set it |
| tls.g.arrow | decoration | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  | unchanged; shared _kit not touched; fits preferred/min/half (spec); arrow, flow, timeline, matrix specs green |
| tls.m.decoration | decoration | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  | unchanged; the report's "stuck root:0.20" is its designed 20 % tint, not a stuck part |
| tls.m.pattern | decoration | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `a27ba24b` | example tone line + soft = invisible in card/drop/Present → tone accent; "stuck root:0.35" is the designed opacity |
| tls.x.rule | decoration | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `a27ba24b` | preferred 1200x8 with a 96 px short bar = a 1 px speck in the card → 240x8 |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to **Shared issues raised** below instead.

1. **tls.x.page-number — C1/C3/C6** (`chrome/x-page-number.card.png` a giant cropped "1", `.wide.png` a speck). Its description promised "3 / 24" but the schema had no total; `align` was stored and never used; the caption line was taller than the 20 px box. Added the optional `total` slot (additive), `align` start/center/end from browser-true widths (chrome `_kit` `runNode`), muted caption colour, 120x36 / min 72x36. Spec `chrome/chrome-sizes.spec.ts` (text, align, fit).
2. **Honest `size.min` (C6/C4):** footer-text 200x26 -> 380x40, header 200x30 -> 400x46: both ellipsised the example at their minimum. The spec asserts every chrome/decoration example fits preferred and min and contains no "…".
3. **tls.m.pattern — C1/C2** (`decoration/m-pattern.card.png`, `.drop-canvas.png` blank): tone `line` x 35 % opacity is near-invisible on white. The example uses tone `accent`; `when` says line is very faint. The report's `stuck root:0.35` (and decoration's `root:0.20`) is the designed tint, not an animation fault.
4. **tls.x.rule — C1:** example is the 96 px accent bar but the box was 1200 wide, so the card scaled it to a 1 px speck; preferred is now 240x8.
5. **tls.l.field — C6:** ignored `style.surface`; now uses a gradient Paint when set (same rule as card/overlay). Spec: gradient is honoured.
6. **Checked, no change needed:** logo-mark, watermark (behind content in the blank layout, scales in the half region), arrow (diagram `_kit` untouched), decoration. The harness only places blocks in the `blank` region below a title, so slide-edge collisions (`timeline` layout) were not exercised: chrome blocks are free-placed, and the AI has no edge anchor (see S24).

## Motion pass (M2)

Agent B, 2026-10-06. Probe: `REVIEW_PASSES=motion REVIEW_MOTION_STYLES=static,subtle,expressive,reduced` on the final build, plus `REVIEW_MOTION_DUMP=1` timings and viewer mid frames (`REVIEW_MID=600,680,780,950`, block second after a title) for the changed blocks. Spec: `library/motion-m2.spec.ts` (all 44 M2 blocks: recipe parts exist, every drawn leaf covered, expressive 150–900 ms / out ease / stagger ≤ 120 ms / ≤ 2.5 s, subtle opacity only, furniture static). Narrow region: the harness plays it `subtle` (one opacity fade), so wrapping lines change no motion target; containers keep reading order when they reflow (row-major tags).
Cells: ✅ pass · 🔧 fixed in this pass · ❌ open · n/a (no such motion: J6 applies to grows, draws and sweeps only).

| Block | J1 | J2 | J3 | J4 | J5 | J6 | J7 | J8 | Fix commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| tls.x.page-number | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `b9d32ae4` | 🔧 empty recipe → a slide style gave it fade-up/fade: furniture rose in and held a chain step → `preset: none` (static; explicit preset still plays) |
| tls.x.footer-text | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `b9d32ae4` | 🔧 empty recipe → a slide style gave it fade-up/fade: furniture rose in and held a chain step → `preset: none` (static; explicit preset still plays) |
| tls.x.logo-mark | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `b9d32ae4` | 🔧 empty recipe → a slide style gave it fade-up/fade: furniture rose in and held a chain step → `preset: none` (static; explicit preset still plays) |
| tls.x.header | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `b9d32ae4` | 🔧 empty recipe → a slide style gave it fade-up/fade: furniture rose in and held a chain step → `preset: none` (static; explicit preset still plays) |
| tls.x.watermark | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `b9d32ae4` | 🔧 empty recipe → a slide style gave it fade-up/fade: furniture rose in and held a chain step → `preset: none` (static; explicit preset still plays) |
| tls.l.field | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `b9d32ae4` | 🔧 background panel rose in → static (`none`) |
| tls.g.arrow | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | ✅ | ✅ | `b9d32ae4` | 🔧 part `arrow` matched none of `arrow[path]`/`arrow[head-*]`: the line never drew, label wiped on an in-out ease (J5) → tail head, path draw-on, label, tip head staggered on an out ease |
| tls.m.decoration | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ |  | ✅ field-in (0.96→1 + fade) on the shape; designed 20 % tint |
| tls.m.pattern | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `b9d32ae4` | 🔧 texture rose 24 px under expressive → static (`none`); spec asserts it |
| tls.x.rule | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  | ✅ horizontal rule wipes from its start. Open (minor): a vertical rule also wipes across its 2–8 px thickness (reads as a quick appear, no snap); a top-down draw needs a clip-only top-down preset, which does not exist (vocabulary) |

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

- **S24 (chrome blocks, placement)**: nothing in the catalog tells the planner where chrome goes (corner, edge, bottom strip): `tls.x.*` are placed in a normal region by the harness and in a free box by the user. A `placement` hint (e.g. `bottom-strip`, `top-right`) in `describe` or a region type for slide furniture would let the AI and the compiler keep chrome out of content (`structure/` layouts have no such region). Not in lane.
- **S22 (see G01)**: `tls.l.grid-guide` lines are drawn in the viewer and Present.

**M2 (motion pass) — engine / probe issues for the controller** (not block-local; worked around per block where possible):
- **E1 chained presets never chain** (`motion/resolve-motion.ts`): `quote-in`, `title-then-body`, `title-then-split`, `radiate`, `draw-axis-then-nodes`, `grow-branches`, `scrim-then-text` play their own keyframes on every part at once; `chain` is ignored and there is no stagger unless the preset has `staggerMs`. M2 spelled the chains out with `expressive: 'stagger-children'` + `partMotion` (quote, definition).
- **E2 a part preset's easing is ignored** (`resolvePartMotion`: `blockEasing || …` is always truthy): a `partMotion` `pop` gets the block's ease (no bounce), and any part of a `draw-path`/`sweep` block gets `ease-in-out` (fails J5's out ease). Arrow worked around it with a `stagger-children` expressive preset.
- **E3 probe: html wrapper flagged J1/J5** (`motion-probe.js`): for every html block the shape wrapper and its `root` go 0→1 in one frame while every part inside is still hidden (dump: nothing with paint is visible), so `tls.c.feature-grid` / `tls.c.feature-reveal` show J1 ✗ / J5 ✗ `(block) 17 ms` on every style. Ignore paint-less elements whose visible descendants are all hidden.
- **E4 probe: J4 counts CSSOM re-serialisation** of unchanged inline values (`452.333333px` → `452.333px` the first time a tween writes the style) as layout-property changes. Compare parsed numbers with a tolerance. (feature-reveal now rounds its px, so it is clean.)
- **E5 probe: motion PNGs at fixed 150/400/800 ms from slide start**; an element block starts at ~520 ms, so two of the three frames show only the title. Make them relative to the block's start (M2 used the viewer pass with `REVIEW_MID=600,680,780,950`).
- **E6 `tls-c-hero.spec.ts` does not compile** (line ~954, `TS1005`, from `9a29421e`): `result.push({ part: n.part, lines: n.lines` is cut off; that suite cannot run. G10's file.
- **E7 no clip-only top-down preset**: a vertical `tls.x.rule` can only `wipe-x` (across its thickness) or `wipe-y` (bottom-up); `reveal-down` adds a 24 px slide. Vocabulary decision.

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-06 | B3 agent | 10/10 reviewed, 6 🔧 / 4 unchanged — commit `a27ba24b` | Batch B3 complete; next B4 (G09 + G10) |
