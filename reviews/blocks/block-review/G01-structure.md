# G01 — structure (13 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `structure`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ✅ done (13/13 reviewed, 13 🔧; spacer C1 empty by design) · **Agent:** B3 · **Last commit:** `d034d863`

## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.l.stack | structure | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `d034d863` | empty gallery card → 3 labelled tiles; min 100x100 → 360x320; preferred 800x480 |
| tls.l.row | structure | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `d034d863` | empty → 3 tiles; 800x300 / min 480x140 |
| tls.l.grid | structure | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `d034d863` | empty → 2x2 tiles; 800x480 / min 400x260 |
| tls.l.split | structure | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `d034d863` | empty → Question/Answer tiles; 800x360 / min 400x200 |
| tls.l.overlay | structure | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `d034d863` | empty → panel + a callout drawn on top (two texts at top-left overlapped, so the layer is a panel); 800x360 / min 360x200 |
| tls.l.card | structure | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `d034d863` | empty → heading + body inside the panel; 640x300 / min 360x260 |
| tls.l.section | structure | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `d034d863` | empty → titled bullet list; 800x420 / min 400x260 |
| tls.l.repeater | structure | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `d034d863` | showed bare placeholder panels → template tile x3; 800x420 / min 360x310 |
| tls.l.spacer | structure | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `d034d863` | invisible by design (C1 stays an empty card; when says so); size unchanged 200x200 |
| tls.l.safe-area | structure | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `d034d863` | empty → one tile inside the margin; claimed "editor only" (no such mechanism, S22): wording made honest; 800x420 / min 400x200 |
| tls.l.grid-guide | structure | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `d034d863` | lines were invisible: line nodes had zero-width/height boxes (clipped by the svg) and 0.5 px stroke → full boxes, 2 px; wording honest (also drawn in the viewer, S22) |
| tls.l.sidebar | structure | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `d034d863` | empty → Sidebar + Main tiles; 800x360 / min 480x200 |
| tls.l.footer | structure | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `d034d863` | empty → Main + Footer strip; 800x420 / min 400x260 |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to **Shared issues raised** below instead.

1. **C1 empty gallery card, 11 containers** (`structure/l-stack.card.png` ... `l-footer.card.png`: a grey or pink box). A container is invisible without children and every example had `children: []`. Examples now carry child blocks in `props.children` (the field the layouts read; the top-level `children: []` of the spec was never used): labelled callout tiles from `layout/_example.ts` (`tile`), a heading + body for card, a bullet list for section, a template tile for repeater. The card, the drop and the AI's example now show the arrangement. `describe.when` states "Container: ... child blocks (props.children)", with the counts each container takes.
2. **Digest budget.** First tries (card tiles with a nested title) pushed the top-8 digest over its 12 000 limit; tiles are one callout each (one level, no nested title), ids and `when` strings are short. Snapshot regenerated (intended).
3. **tls.l.grid-guide — C1/C3** (`structure/l-grid-guide.wide.png` empty). Its `line` nodes had zero-width / zero-height boxes (and a 0.5 px stroke), so the DOM svg for each line was clipped away: nothing drew in the gallery, the editor or the viewer. Boxes are now the whole block, stroke 2 px. Wording: the lines are drawn in the viewer as well (S22), so `avoid` says not to leave it on a presented slide.
4. **tls.l.safe-area** claimed "editor-only: invisible in exported output"; it draws nothing, it only insets its children. Summary, shortDescription and avoid rewritten. A guide frame was tried and dropped: three shipped specs assert the node has exactly the child group.
5. **Dishonest `size.min` (C6/C4), all.** 100x100 for every container; with the new examples the smallest box that keeps every label inside is 360x320 (stack) ... 480x140 (row). Preferred shrunk from 800x600 to the content scale (row 800x300). Spec `layout/structure-examples.spec.ts` (11 containers: carries children, children drawn, fits preferred / min / half-width, labels inside the box).
6. **Checked, no change needed:** gap/padding/sizing, reflow in the half-width region (tiles re-wrap, nothing escapes), chains `2/2` and `1/1`, drop adds one shape of the preferred size. S20: no example references ids between children, so the id regeneration drops them intact.

## Motion pass (M2)

Agent B, 2026-10-06. Probe: `REVIEW_PASSES=motion REVIEW_MOTION_STYLES=static,subtle,expressive,reduced` on the final build, plus `REVIEW_MOTION_DUMP=1` timings and viewer mid frames (`REVIEW_MID=600,680,780,950`, block second after a title) for the changed blocks. Spec: `library/motion-m2.spec.ts` (all 44 M2 blocks: recipe parts exist, every drawn leaf covered, expressive 150–900 ms / out ease / stagger ≤ 120 ms / ≤ 2.5 s, subtle opacity only, furniture static). Narrow region: the harness plays it `subtle` (one opacity fade), so wrapping lines change no motion target; containers keep reading order when they reflow (row-major tags).
Cells: ✅ pass · 🔧 fixed in this pass · ❌ open · n/a (no such motion: J6 applies to grows, draws and sweeps only).

| Block | J1 | J2 | J3 | J4 | J5 | J6 | J7 | J8 | Fix commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| tls.l.stack | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `55d29ae8` | 🔧 was one unit rising as a whole; children now tagged `child/<i>` and stagger in reading order (40 ms) |
| tls.l.row | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `55d29ae8` | 🔧 was one unit rising as a whole; children now tagged `child/<i>` and stagger in reading order (40 ms) |
| tls.l.grid | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `55d29ae8` | 🔧 was one unit rising as a whole; children now tagged `child/<i>` and stagger in reading order (40 ms) (row-major) |
| tls.l.split | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `55d29ae8` | 🔧 was one unit rising as a whole; children now tagged `child/<i>` and stagger in reading order (40 ms) |
| tls.l.overlay | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `55d29ae8` | 🔧 was one unit rising as a whole; children now tagged `child/<i>` and stagger in reading order (40 ms) over a fading background |
| tls.l.card | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `55d29ae8` | 🔧 was one unit rising as a whole; children now tagged `child/<i>` and stagger in reading order (40 ms) after the panel |
| tls.l.section | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `55d29ae8` | 🔧 was one unit rising as a whole; children now tagged `child/<i>` and stagger in reading order (40 ms) after surface, title, divider |
| tls.l.repeater | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `55d29ae8` | 🔧 was one unit rising as a whole; children now tagged `child/<i>` and stagger in reading order (40 ms) (one per stamped item) |
| tls.l.spacer | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `55d29ae8` | 🔧 draws nothing but held ~0.3 s of the expressive chain → `preset: none` |
| tls.l.safe-area | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `55d29ae8` | 🔧 was one unit rising as a whole; children now tagged `child/<i>` and stagger in reading order (40 ms) |
| tls.l.grid-guide | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `55d29ae8` | 🔧 guide lines faded/rose in → `preset: none` (static; S22 still open) |
| tls.l.sidebar | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `55d29ae8` | 🔧 was one unit rising as a whole; children now tagged `child/<i>` and stagger in reading order (40 ms) (left column first) |
| tls.l.footer | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `55d29ae8` | 🔧 was one unit rising as a whole; children now tagged `child/<i>` and stagger in reading order (40 ms) (main, then footer) |

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

- **S22 (grid-guide, safe-area: "editorOnly" does not exist)**: the docs of both blocks say "editor-only, invisible in output", but no code hides them: `headless: false` in the viewer, Present and the gallery, so `tls.l.grid-guide` lines are drawn on a presented slide (`structure/l-grid-guide.wide.png`). Needs a per-block `editorOnly` flag honoured by `render-dom.tsx` / `DeckViewer` (out of lane), or the blocks should be dropped from the AI catalog. Spacer and the two guides are inherently empty gallery cards (S9-like C1 note).
- **S23 (layout containers, gallery card)**: callout tiles hug their content, so the card shows strips at the top of each slot rather than filled slots; a `fill`-the-slot option on `tls.t.callout` (text family, G02) would show the slot extents.

- **M2 motion pass**: engine/probe issues E1–E7 are listed in [G11-chrome-decoration.md](G11-chrome-decoration.md) § Shared issues raised.

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-06 | B3 agent | 13/13 reviewed, 12 🔧 + spacer unchanged-by-design — commit `d034d863` | Next: G11 chrome + decoration |
