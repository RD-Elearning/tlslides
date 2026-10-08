# G06 — table + comparison (13 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `table`, `comparison`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ✅ done 2026-10-06 (13/13: the stopped B1 agent's edits were verified and committed: tsc 0, 15 related suites pass with the parity probes skipped, wide/narrow/card/drop shots reviewed, motion spot-checked on swot and pricing) · **Agent:** B1 (stopped) + controller · **Last commit:** `0ff5ffec`


## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.d.table | table | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `74846ca3` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.d.scorecard | table | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `74846ca3` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.d.ranking | table | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `74846ca3` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.d.compare-table | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `74846ca3` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.d.pricing | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `74846ca3` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.g.matrix-2x2 | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `76fff632` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.g.swot | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `76fff632` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.g.pros-cons | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `76fff632` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.g.before-after | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `76fff632` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.g.iceberg | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `76fff632` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.c.comparison | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `0ff5ffec` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.c.case-study | comparison | slide | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `0ff5ffec` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.c.problem-solution | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `0ff5ffec` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to **Shared issues raised** below instead.

The agent did not write per-block findings before it was stopped; the code changes are in the three `RV06` commits (see `git show <hash>` for each block's diff). Only `tls.g.swot` changed no layout (spec only).

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

_None yet._

## Motion pass (M3)

Agent C, 2026-10-07. Probe: `REVIEW_PASSES=motion REVIEW_MOTION_STYLES=static,subtle,expressive,reduced` per category on the final build (`metric`, `chart`, `table`, `comparison`), plus `REVIEW_MOTION_PNG=1` mid frames (15/40/75 %) and `REVIEW_MOTION_DUMP=1` frame dumps for the changed blocks. Spec: `library/motion-m3.spec.ts` (all 42 M3 blocks: recipe parts exist, every drawn leaf animated or listed as chart frame, expressive 150–900 ms / out ease / stagger ≤ 120 ms / ≤ 2.5 s / block fade only, subtle opacity only, J6 preset per mark, every label after its mark, only numbers count, tables header-first, comparisons side by side).
Engine (minimal, blocks several M3 blocks, with specs in `motion/smoothness.spec.ts`): `11d89574` (partMotion `delay`/`stagger`; one-axis grows follow the bars' geometry; waterfall steps grow from the previous level; stacked segments grow about the zero line by column; count-up keeps the target format on tabular figures; `split-in` settles at 0, mirrored pair) and `c827b476` (count-up tabular style on the part element). Stale specs fixed in `6a113855` (`timeline.spec`) and `16c519d3` (`motion-style.spec`).
Shared conventions: `library/data/_chart/motion.ts` — the chart frame (grid, ticks, categories, legend, tracks) rides the block fade, marks start at 80 ms, labels `LABEL_AFTER` (260 ms) after their mark with the mark's stagger; labels fade with `sweep-nodes` (400 ms: a 250 ms `fade` on an already visible block jumps > 0.35 in its first frame, J1), points/dots/badges enter with `field-in` (`pop`/`pop-points` settle in ~100 ms, J5).
Cells: ✅ pass · 🔧 fixed in this pass · ❌ open · n/a (no such motion: J6 applies to grows, draws and sweeps only). Probe artefacts (not block faults, reported to the controller) are marked ✅ with a note: **A1** a grow/clip part whose from-state is set in the same frame the block wrapper becomes visible reads as a 1→0 jump (prev frame hidden); **A2** J5 stagger: an element's first run merges with the block fade (effective opacity), so marks starting inside the fade are timed from the reveal; **A3** html wrapper `(block)` opacity 0→1 in one frame while its parts are still faint (E3 variant). Each was flaky across runs.

**Counts:** 13/13 fixed (0 unchanged, 0 open). Also `tls.c.feature-reveal` (G03, raised by M1b): card stagger 140 → 120 ms, `803a98e1`.

| Block | J1 | J2 | J3 | J4 | J5 | J6 | J7 | J8 | Fix commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| tls.d.table | ✅ | ✅ | ✅ | ✅ | 🔧 | n/a | ✅ | ✅ | `b355b640` | 🔧 header first, rows 80 ms apart in reading order (was 40 ms + blur, header with the block fade); footer row is the next `row[n]` inside `footer`, so it follows the body (J5 stagger 533 before) |
| tls.d.scorecard | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `b355b640` | 🔧 header first, rows in reading order, row rules wipe with their row |
| tls.d.ranking | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `b355b640` | 🔧 badge + number, name, then the bar grows (`grow-bars-x`) while its value counts; number and note rode the block fade |
| tls.d.compare-table | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `b355b640` | 🔧 header first, rows in reading order; winner column tint rides the block fade |
| tls.d.pricing | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `b355b640` | 🔧 cards side by side 120 ms apart (was 40), each price counts up ("Free" just fades) |
| tls.g.matrix-2x2 | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `e28ab6d0` | 🔧 `axes` matched nothing → axes draw from the origin (wipe-y / wipe-x), heads pop, quadrants + names, then items + labels (names/labels rode the block fade). A1 seen once |
| tls.g.swot | ✅ | ✅ | ✅ | ✅ | 🔧 | n/a | ✅ | ✅ | `e28ab6d0` | 🔧 one `root` piece (J5 not out-eased) → the four cards re-tagged `quad[0..3]`, rise in reading order 100 ms apart |
| tls.g.pros-cons | ✅ | ✅ | 🔧 | ✅ | ✅ | n/a | ✅ | ✅ | `e28ab6d0`, `11d89574` | 🔧 `split-in` ended 24 px right (J3, engine) → pros from the left, cons from the right, together; verdict after |
| tls.g.before-after | ✅ | ✅ | 🔧 | ✅ | ✅ | n/a | ✅ | ✅ | `e28ab6d0`, `11d89574` | 🔧 same split-in fix; before/after enter from both sides together, the arrow fades in after |
| tls.g.iceberg | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `e28ab6d0` | 🔧 three parts at once → water washes down, tip rises, hidden part revealed below |
| tls.c.comparison | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `fa97ba2b` | 🔧 bullets had no part (rode the block fade) → `col[i].bullet[j]`; layout emits titles then rows across the columns, so the reveal is side by side row by row |
| tls.c.case-study | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `fa97ba2b` | 🔧 one `root` piece → client, three panels left to right with label and text, result metric counts |
| tls.c.problem-solution | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | `fa97ba2b` | 🔧 one `root` piece → problem side, solution 120 ms later, arrow between; callouts style as two pieces |

Engine / probe issues raised by M3: see `G04-metric.md` § Motion pass (M3) (A1–A3, DeckViewer settle path, gauge sweep start angle).

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-07 | agent C (M3) | Motion pass: 13/13 fixed (0 unchanged, 0 open). Also `tls.c.feature-reveal` (G03, raised by M1b): card stagger 140 → 120 ms, `803a98e1`. | Rows above; probe artefacts A1–A3 for the controller |
