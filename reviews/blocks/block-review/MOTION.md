# Motion smoothness pass (2026-10-06)

Follow-up to the block UI review ([README.md](README.md)). The user asked for a double check:
**every block must animate as smoothly as possible.** The first review checked motion from a few
screenshots (`REVIEW_MID`). That cannot see a snap between two frames, a part that flashes before
it enters, or an animation that ends off its rest state. This pass measures motion frame by frame,
fixes the shared engine faults first, and then re-checks all 129 blocks.

README §3 (rules) and §4 (commands, **low-resource mode**) are binding here too. One subagent runs
at a time, and each takes a batch of related groups.

## 1. Smoothness criteria (per block, per motionStyle)

| # | Criterion | Measured by |
|---|---|---|
| J1 | **No snap.** No part's opacity changes by more than 0.35, its translate by more than 40 px, or its clip inset by more than 35 % between two consecutive frames while it is tweening (a deliberate ≤ 100 ms tween is exempt). A jump on the last frame counts too (S16) | probe |
| J2 | **No flash.** No part is visible (opacity > 0.05) before its own entrance starts, and none goes visible → hidden → visible (S8, S26) | probe |
| J3 | **Ends at rest.** After the chain every part has opacity 1, an identity transform and no clip, so the final frame matches the static render | probe + PNG |
| J4 | **Compositor-only.** Tweens touch only `opacity`, `transform`/`translate`/`scale`, `clip-path`, `stroke-dashoffset`; never `width`/`height`/`top`/`left`/font size | probe (property log) + code |
| J5 | **Timing in tokens.** Each part tweens for 150–900 ms with an out ease (never `linear` on an entrance), a per-item stagger of at most 120 ms, and the whole element block chain done within 2.5 s (a slide composite within 3.5 s) | probe |
| J6 | **Grows from the right origin.** Bars grow from their baseline, lines draw from their start, and a radial chart or donut sweeps from 12 o'clock, never from the element centre (S14) | PNG mid frames |
| J7 | **Styles behave.** `static` shows the final frame at once, `subtle` uses calm opacity/short-translate entrances only, `expressive` may use the block's recipe; `prefers-reduced-motion` behaves like `static` | probe ×3 styles |
| J8 | **Frame budget.** No frame gap over 100 ms during a chain in headless Chrome (the timing is noisy, so this is reported but only a finding when it repeats) | probe |

## 2. Phases

| Phase | Who | Scope | Done when |
|---|---|---|---|
| M0 | agent A | **Motion probe** in `tools/visual/scenarios/block-review.js`: new pass `motion` (in `REVIEW_PASSES`). In the viewer it records every `[data-part]` (and any element the driver tweens) on each `requestAnimationFrame` for the chain: computed opacity, transform matrix, clip-path and timestamp, plus the property names GSAP/WAAPI touch. It writes `motion` per block into `report.json` with J1–J5/J7/J8 verdicts and the worst offender, for `REVIEW_MOTION_STYLES=static,subtle,expressive` (default `expressive`) | `REVIEW_PASSES=motion REVIEW_CATEGORY=chart` writes verdicts; a known snap (a `wipe-x` part, S16) is flagged and an opacity fade is clean |
| M1 | agent A | **Shared engine faults:** S16 (clip-path keyframes with unequal terms snap), S14 (grow presets scale about the centre: add a per-part transform origin and a real baseline grow; draw-path/sweep on fills), S8 (the second block shows final ~400 ms before its entrance), S26 (DeckViewer hides containers whose `animate()` only tweens descendants: make it impossible, or detect it in a spec across all html blocks), reduced-motion (J7) | Related motion specs and DeckViewer specs pass; tsc 0; the probe shows no J1/J2 hit for the presets; blocks that were switched away from grow/draw presets in G04/G05 because of S14 are listed for M3 |
| M2 | agent B | Audit + fix **G01, G02, G03, G11** (structure, text, list, chrome/decoration) with the probe, all three styles | Every block row in §3 has J1–J8 ✅ or a written reason |
| M3 | agent C | Audit + fix **G04, G05, G06** (metric, chart, table/comparison); move the charts back to real baseline grows and line draw-ons where M1 made them possible | Same |
| M4 | agent D | Audit + fix **G07, G08** (process, timeline, hierarchy, relationship); also S20 (flow drop) since the flow edges draw on | Same |
| M5 | agent E | Audit + fix **G09, G10** (media, people, brand, slide composites) | Same |
| M6 | controller | Re-run `REVIEW_PASSES=motion` for every category on the final build, update this file and README §5/§6, push | All 129 rows ✅; README §5 statuses updated |

Each agent records a row per block in its group file under a new heading `## Motion pass`
(columns: block, J1–J8, fix commit, notes) and reports back. The controller updates §3 and §4.

## 3. Progress

| Group | Blocks | Motion ✅ | Fixed | Open | Phase | Status |
|---|---|---|---|---|---|---|
| Engine (probe + S8/S14/S16/S26) | — | — | — | — | M0–M1 | ⬜ |
| G01 structure | 13 | | | | M2 | ⬜ |
| G02 heading, text, emphasis | 12 | | | | M2 | ⬜ |
| G03 list | 9 | | | | M2 | ⬜ |
| G11 chrome, decoration | 10 | | | | M2 | ⬜ |
| G04 metric | 13 | | | | M3 | ⬜ |
| G05 chart | 16 | | | | M3 | ⬜ |
| G06 table, comparison | 13 | | | | M3 | ⬜ |
| G07 process, timeline | 10 | | | | M4 | ⬜ |
| G08 hierarchy, relationship | 8 | | | | M4 | ⬜ |
| G09 media, people, brand | 14 | | | | M5 | ⬜ |
| G10 slide composites | 11 | | | | M5 | ⬜ |
| **Total** | **129** | | | | | |

## 4. Session log

| Date | Session | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-06 | controller | Plan written | Start M0 + M1 (one agent). Resume from the first ⬜ row in §3 |
