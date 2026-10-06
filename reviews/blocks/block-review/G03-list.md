# G03 — list (9 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `list`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ✅ done (9/9 reviewed, 9 🔧) · **Agent:** B3 · **Last commit:** `086e60eb`

## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.t.bullets | list | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `086e60eb` | preferred 700x400 held 160 px of content → 700x300 (defaults 300); min 200x80 needed 201 → 520x170 |
| tls.t.numbered | list | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `086e60eb` | preferred 800x480 → 800x240; min 240x120 → 440x230; no early wrap (real widths) |
| tls.t.checklist | list | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `086e60eb` | strike-through ran 25% past the text (estimate width) → real widths; 800x230 / 420x170 |
| tls.t.kv-list | list | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `086e60eb` | aligned value box overshot the right edge by 1 px (placeText) → clamped; real widths; 800x290 / 420x160 |
| tls.t.tags | list | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `086e60eb` | pills 15-30% wider than their label (x1.12 slack on an over-wide estimate) → real widths; 900x140 / 460x140 |
| tls.c.feature-grid | list | group | html | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `086e60eb` | title+desc never appeared (animate released only icons: stuck 0.00 in report); 1920-wide drop; no reflow in half region → all parts animate, columns drop under 200 px cells, 1200x242 / min 1120x242 |
| tls.c.cards | list | group | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `086e60eb` | cards stretched to 460 px for 2 short lines; example 2 cards → 3 with real copy; pad shrinks with card width; 1500x400 / min 1320x400 |
| tls.c.feature-reveal | list | group | html | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `086e60eb` | example had no text (cards = title only, 700 px tall in a wide region); cards now stop growing (260-340) and centre; 1200x340 / min 640x300; defaults 6 → 3 items |
| tls.m.icon-list | list | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `086e60eb` | preferred 760x480 held 272 px → 760x370 (defaults 368); min 280x140 → 420x290 |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to **Shared issues raised** below instead.

1. **Dishonest `size` (C6/C4), all 9.** Preferred boxes were 2-4x the content (bullets 400 tall for 161 of text, icon-list 480 for 272) so the drop and gallery showed a list in a void; mins were far below what the example needs. New preferred = the taller of the example and the defaults; mins are the smallest box where the example fits. Spec `library/list-sizes.spec.ts` (6 element blocks: fits preferred and min, hugs content >= 60 %, 8 items stay inside the width, `assertMotionTargetsExist`); feature-grid/cards/reveal have their own RV03 blocks.
2. **Estimated glyph widths (C3), tags / checklist / kv-list / numbered.** Pills 15-30 % wider than their label, strike-through longer than the text, values short of the right edge. `layoutMarkerRows` (numbered, checklist), tags and kv-list now measure through `withRealWidths` (`data/_chart/kit`); `placeText` clamps an aligned line's box to the column (was +1 px over). Shared engine: all 11 G02 text specs + diagram specs unaffected (green).
3. **tls.c.feature-grid — C5/C3/C2** (`list/c-feature-grid.wide.png`: icons only; report `stuck: cell[*].title/desc 0.00`). `animate()` animated the icon's parent and the icon, but the runtime hides every `data-part`: titles and descriptions stayed at opacity 0 forever. Now every icon/title/desc is released (icon pops, text rises, staggered per cell). The grid also never reflowed (3 columns in a half region) and dropped at 1920 wide: CSS grid with `effectiveColumns()` shared by template and poster (min cell 200), preferred 1200x242. Tests: `RV03 — fits its box, reflows, releases every part`.
4. **tls.c.feature-reveal — C1/C3** (`list/c-feature-reveal.wide.png`). The example had titles only (schema says title + one line) and the cards stretched to the region height (700 px for one word). Example with text; card height capped (`max(260, 400 - 0.25 w)`) and the grid centred; defaults cut from 6 to 3 so preferred can hug.
5. **tls.c.cards — C3/C1.** `total = max(needed, min(H, 460))` made 2 short lines sit in 460 px cards; now `min(H, 1.3 x needed)`. Example 3 cards with real copy; padding shrinks with the card width.
6. **Digest snapshot** regenerated: example props / `when` of cards and feature-reveal changed (intended).

Checked and passing as-is: drag-drop adds one shape at the drop point for all 9 (inspectors open); chains complete (2/2 wide, 1/1 narrow); no overflow reports; list motion parts all exist and are covered (`stagger-lines`, `stagger-children` animate).

## Motion pass (M2)

Agent B, 2026-10-06. Probe: `REVIEW_PASSES=motion REVIEW_MOTION_STYLES=static,subtle,expressive,reduced` on the final build, plus `REVIEW_MOTION_DUMP=1` timings and viewer mid frames (`REVIEW_MID=600,680,780,950`, block second after a title) for the changed blocks. Spec: `library/motion-m2.spec.ts` (all 44 M2 blocks: recipe parts exist, every drawn leaf covered, expressive 150–900 ms / out ease / stagger ≤ 120 ms / ≤ 2.5 s, subtle opacity only, furniture static). Narrow region: the harness plays it `subtle` (one opacity fade), so wrapping lines change no motion target; containers keep reading order when they reflow (row-major tags).
Cells: ✅ pass · 🔧 fixed in this pass · ❌ open · n/a (no such motion: J6 applies to grows, draws and sweeps only).

| Block | J1 | J2 | J3 | J4 | J5 | J6 | J7 | J8 | Fix commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| tls.t.bullets | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ |  | ✅ stagger-lines, marker then text per row, rows 33 ms apart |
| tls.t.numbered | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ |  | ✅ badge → marker → text per row |
| tls.t.checklist | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ |  | ✅ box, tick, text, strike in order |
| tls.t.kv-list | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ |  | ✅ key → value → rule per row |
| tls.t.tags | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ |  | ✅ pill then label, left to right |
| tls.c.feature-grid | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | 🔧 | ✅ | `2c5ea313` | 🔧 animate() ignored `rt.style`: subtle popped the icons (J7) → subtle = one fade; icon pop 0.4→0.7 start over the full step. Probe J1/J5 on `(block)` is the html wrapper going 0→1 in one frame while every part is hidden (dump: only paint-less wrapper/root visible) — probe artefact, reported |
| tls.c.cards | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `2c5ea313` | 🔧 recipe named only `root`: the row rose as one unit → cards cascade left→right, lead/title/text after their card |
| tls.c.feature-reveal | ✅ | ✅ | ✅ | 🔧 | 🔧 | n/a | ✅ | ✅ | `2c5ea313` | 🔧 cards 1000 ms / 90 px, icons 900 ms (J5) → 800 ms / 48 px; chain waited 2400 ms for a ~1.9 s timeline → 2000; J4 width/top/left were the browser re-serialising long fractions → template px rounded. Same html-wrapper J1/J5 probe artefact as feature-grid |
| tls.m.icon-list | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ |  | ✅ iconbg → icon → title → text per row |

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

- **S9/S21 (again)**: wide small-text list cards are small in the 182x100 gallery card (`list/t-bullets.card.png`, `t-kv-list.card.png`); legible only because the content hugs the box now.
- **S10**: the default estimate is still wide for blocks outside this batch (text/_engine `placeText` consumers other than kv-list); G03 switched to `withRealWidths` per block.

- **M2 motion pass**: engine/probe issues E1–E7 are listed in [G11-chrome-decoration.md](G11-chrome-decoration.md) § Shared issues raised.

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-06 | B3 agent | 9/9 reviewed, 9 🔧 — commit `086e60eb` | Next: G01 structure |
