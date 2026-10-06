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

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

- **S24 (chrome blocks, placement)**: nothing in the catalog tells the planner where chrome goes (corner, edge, bottom strip): `tls.x.*` are placed in a normal region by the harness and in a free box by the user. A `placement` hint (e.g. `bottom-strip`, `top-right`) in `describe` or a region type for slide furniture would let the AI and the compiler keep chrome out of content (`structure/` layouts have no such region). Not in lane.
- **S22 (see G01)**: `tls.l.grid-guide` lines are drawn in the viewer and Present.

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-06 | B3 agent | 10/10 reviewed, 6 🔧 / 4 unchanged — commit `a27ba24b` | Batch B3 complete; next B4 (G09 + G10) |
