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

## Motion engine (M0–M1)

Agent A, 2026-10-06. Commits: `6c496b90` (RVM0, probe), `480def10` (RVM1, engine).

### Probe (M0)

`tools/visual/scenarios/motion-probe.js`, used by the `motion` pass of `block-review.js` (not in
the default passes). It builds its own deck (`review-<category>-motion`: a blank lead slide, then one
slide per block per style; element blocks sit second after a title, which is the S8 case), opens
each slide with ArrowRight and samples every `[data-part]`, block wrapper and driver-touched element
on every animation frame until the chain is done + 1.2 s and 300 ms quiet. Per element: effective
opacity (own × ancestors), translate, scale, visible clip fraction (own × ancestors), dash progress;
plus the inline-style / attribute / WAAPI property names that change (J4). Verdicts J1/J2/J3/J4/J5/
J7/J8 with the worst offender go to `report.json` → `blocks[type].motion[style]`, one summary line
per block goes to stderr and `report.motionSummary`. A motion-only run merges into an existing
`report.json`.

```bash
L=/tmp/tlslides-dist.lock
flock -s $L env REVIEW_PASSES=motion REVIEW_CATEGORY=chart REVIEW_MOTION_STYLES=static,subtle,expressive,reduced \
  node tools/visual/shoot.js block-review --width=1600 --height=900 2>&1 | grep -E '^tls\.|FAILED'
#   REVIEW_BLOCKS=tls.d.bar,… REVIEW_CATEGORY=   one list instead of a category
#   `reduced` = expressive with prefers-reduced-motion emulated
#   put `static` FIRST: J3 then compares each block's end frame with its static render
#   (authored opacities such as a radar area at 0.28 are not "stuck"); without it J3 expects 1/identity/no clip
#   REVIEW_MOTION_PNG=1 three mid PNGs (150/400/800 ms; costs frame timing) · REVIEW_MOTION_DUMP=1 raw samples
```

Cost: ~2 s per block per style, one headless Chrome, no video. After a dev-server restart the first
run can fail once (the API store is lost when `/view` compiles; S27): run it again.

**Thresholds as implemented (use these in M2–M5).** J1: per frame, opacity > 0.35, translate > 40 px,
clip or dash progress > 0.35, scale > 0.35; a change that lasts 1–2 frames is a snap, a longer run
counts only if it lasts > 100 ms and the frame gap is ≤ 50 ms; a jump hidden on both frames is
ignored. J2: visible = effective opacity > 0.05, clip > 1 %, scale > 0.02; flagged on visible →
hidden → visible. J3: end frame equals the static render within 0.01 (else opacity ≥ 0.99, |translate|
< 0.5 px, scale 1 ± 0.005, no clip). J4: no `width/height/top/left/right/bottom/font-size/margin/
padding/inset/line-height/letter-spacing` style changes and no SVG geometry attribute changes. J5:
each moving element 150–900 ms (± one frame), mid-time progress ≥ 0.55 (out ease), same-family
stagger ≤ 120 ms (+ 20 ms slack), block chain ≤ 2.5 s (slide scope 3.5 s). J7: `static`/`reduced`
nothing moves; `subtle` no scale/clip/draw and translate ≤ 12 px. J8: frame gaps > 100 ms while
moving — a finding only when it repeats on a second run.

### Engine faults fixed (M1)

| Fault | Root cause | Fix |
|---|---|---|
| S16 clip snap | GSAP tweens a clip-path string by pairing its numbers in order and keeping the end's units: `inset(0 100% 0 0)` → `inset(0)` has one number, and even → `inset(0 0 0 0)` mixes `%` with unitless zeros; the element sat still and snapped at an end (probe: `tls.x.rule` clip 0 → 1 in one frame at ~880 ms) | `motion/clip-path.ts` pairs both insets as four terms of one unit; the GSAP driver applies it to every tween and `set`; presets, block-level wipe states, PresentationRuntime and the hero / kinetic-title literals use four `%` terms; a spec scans every `'inset(…)'` literal in `blocks/` and `components/` |
| S14 grow / draw | `grow-*` were `scale 0→1` (both axes) about the element centre; `draw-path`/`sweep` tweened `stroke-dashoffset` 100 → 0 on elements with no dash array (nothing drawn) | `grow-bars-y` / `grow-segments` = `scaleY` from `50% 100%`, `grow-bars-x` = `scaleX` from `0% 50%` (new `scaleX`/`scaleY` keyframes under `scale`, `MotionOptions.origin`). `MotionRecipe.partMotion` (optional) gives a part its own preset and origin; it plays only with the recipe's showy preset (`expressive ?? preset`), never under a spec `fade` (subtle). Draw presets measure each stroked path (dash array = length, offset L → 0); a filled or non-SVG part gets an equal-term left-to-right clip wipe instead |
| S8 flash | `driver.set()` did not stop tweens still running (or delayed) on the target, so hiding a block whose entrance was playing — Home on the first slide (what the old harness did), any build rewind — lost to that entrance: visible ~400–530 ms, then hidden, then re-entered. Separately the build sync was a passive effect, so a freshly mounted first slide painted every block final for one frame | GSAP `set` kills older tweens of the same properties (`killTweensOf`, `overwrite: 'auto'` fallback); WAAPI `set` cancels its own forwards-filled animations on those properties; DeckViewer's build sync is a layout effect (pre-paint). Probe: Home-rewind and first-mount cases J2 clean; 2-block expressive slides clean |
| S26 hidden container | the viewer hides every `[data-part]` before `animate()`; nothing revealed a part `animate()` did not tween | `motion/animate-guard.ts`: DeckViewer hides through it and, on the block's `onComplete` (or the timeout), fades in (250 ms) any part still at the hidden opacity. `smoothness.spec.ts` runs all 8 html blocks' `animate()` (gsap and driver paths) and asserts each reveals every part by itself — all pass today |
| J7 reduced motion | under `prefers-reduced-motion` blocks were hidden at slide entry and shown one frame later by the zero-delay chain (probe: every block J1/J7 ✗) | DeckViewer shows a run of auto steps at once (`autoRunEnd`); `subtle` was already calm (opacity only) and part presets from `partMotion` never apply under it |

DeckViewer.tsx: only the M1 hunks were committed; the user's uncommitted edits stay in the tree.

**Probe before → after** (`static,subtle,expressive,reduced`): chart (16 blocks) — before 16 ×
`reduced` J1/J5/J7 ✗, radar/bubble J3 ✗ (probe artefact, fixed in M0 by the static reference),
scatter/bubble expressive J5 ✗; after only scatter/bubble expressive J5 (`root` fades 100 ms: the
block's own timing, M3). heading (3 blocks) — before 3 × `reduced` ✗; after all ✓. `tls.x.rule`
expressive (wipe-x): before J1 ✗, after ✓. Spot check with explicit presets: `tls.d.bar` +
`grow-bars-y` grows from the baseline, `tls.d.line` + `draw-path` draws from its start, both J1–J3 ✓.

### For M3: blocks switched away from grow/draw/wipe presets (move back where it now looks right)

| Block | Was | Now | Commit |
|---|---|---|---|
| tls.d.progress-bar | grow-bars-x | sweep-nodes | `3cf6d7f8` |
| tls.d.bullet-chart | grow-bars-x | sweep-nodes | `3cf6d7f8` |
| tls.d.progress-ring | grow-segments | sweep-nodes | `3cf6d7f8` |
| tls.d.gauge | draw-path | sweep-nodes | `3cf6d7f8` |
| tls.d.bar | grow-bars-y | stagger-children | `0ff35d76` |
| tls.d.grouped-bar | grow-bars-y | stagger-children | `1698ee42` |
| tls.d.stacked-bar | grow-segments | stagger-children | `1698ee42` |
| tls.d.pie | grow-segments | sweep-nodes | `0ff35d76` |
| tls.d.line | draw-path | sweep-nodes | `1698ee42` |
| tls.d.area | wipe-x | sweep-nodes | `1698ee42` |
| tls.d.sparkline | draw-path | sweep-nodes | `032bd592` |
| tls.d.radar | draw-path | sweep-nodes | `bbe26557` |
| tls.d.slope | draw-path | sweep-nodes | `bbe26557` |

Use `partMotion` so only the bars/lines grow or draw while labels, axes and legends keep a fade
(a block preset applies to every listed part). For M4: `tls.g.chevrons` left `wipe-x` (RV07), and
`library/diagram/diagram-test.ts` still lists the grow/draw/wipe presets as `BROKEN`.

### Still open

- **`sweep` on filled arcs** (donut, pie, ring) falls back to a left-to-right wipe, not a sweep from
  12 o'clock (J6). A radial reveal needs a per-slice approach (stroke-based ring, or `sweep-nodes`
  in angular order); M3 decides per block.
- **Negative bars** grow from the bottom edge too (origin is per part, not per value); a waterfall or
  a bar below zero needs `partMotion` origin `50% 0%` on those parts.
- **`grow-segments`** is vertical; a horizontal stack should give its segments `grow-bars-x`.
- **count-up under GSAP**: the GSAP driver ignores `MotionOptions.onUpdate`, so `count-up` never
  counts in the viewer (only fades/pops). Engine fix needed (map `onUpdate` to the tween's
  progress) — affects G04/G10 counters.
- The editor/Present path (`render-dom.tsx` html host) also hides parts before `animate()` but has no
  untouched-part guard; harmless while all 8 html blocks pass the spec.
- Failing specs not caused by M1: `timeline.spec` (hero-number recipe) and `motion-style.spec`
  (bar recipe) assert recipes G04/G05 changed; `DeckViewer.spec › retreating into an auto build
  step…` fails with the user's uncommitted retreat change (also without M1).
- `3cf6d7f8` (RV04) deleted `library/data/tls-d-bar/layout-horizontal.ts` (179 lines) in a commit about
  four other blocks; tsc is clean, but worth a look.

## 3. Progress

| Group | Blocks | Motion ✅ | Fixed | Open | Phase | Status |
|---|---|---|---|---|---|---|
| Engine (probe + S8/S14/S16/S26) | — | — | — | — | M0–M1 | ✅ `6c496b90`, `480def10`, `071bc32b` (open: count-up `onUpdate` ignored by the GSAP driver, `sweep` on fills not from 12 o'clock, negative bars → M3) |
| G01 structure | 13 | 13 | 13 | 0 | M2 | ✅ `55d29ae8` |
| G02 heading, text, emphasis | 12 | 12 | 7 | 0 | M2 | ✅ `985f844b` |
| G03 list | 9 | 9 | 3 | 0 | M2 | ✅ `2c5ea313` |
| G11 chrome, decoration | 10 | 10 | 8 | 0 (vertical rule reads as an appear: E7) | M2 | ✅ `b9d32ae4` |
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
| 2026-10-06 | agent A (M0+M1) | Probe `6c496b90`; engine `480def10` (S8 rewind/first-paint flash, S14 baseline grow + real draw-on + `partMotion`, S16 4-term clip pairs, S26 `animate-guard`, J7 reduced = static); notes `071bc32b` | chart/heading probe clean except scatter/bubble `root` 100 ms (J5, M3). Pre-existing spec failures: `timeline.spec`, `motion-style.spec` (assert old G04/G05 recipes, M3 fixes them), `DeckViewer.spec` retreat (user's uncommitted DeckViewer edit). **Next: M2 = G01 + G02 + G03 + G11** |
| 2026-10-06 | agent B (M2) + controller | G01/G02/G03/G11: 44/44 clean (31 fixed, 13 unchanged): `b9d32ae4`, `985f844b`, `2c5ea313`, `55d29ae8` (+ `library/motion-m2.spec.ts`), rows `e67eb580` (its message says 15/29; the right count is 13 unchanged / 31 fixed). Controller repaired `tls-c-hero.spec.ts` (RV10 `9a29421e` had spliced the subtle-style test into a helper: TS1005, suite could not run; 52/52 pass now) | Engine/probe issues E1–E7 (detail in `G11-chrome-decoration.md`): **E1** chained presets (`quote-in`, `title-then-body`, `radiate`, `draw-axis-then-nodes`) never chain, `resolve-motion.ts`; **E2** `resolvePartMotion` drops a part preset's own easing; **E3** probe flags the html wrapper 0→1 while parts are hidden; **E4** probe J4 counts pixel-fraction reformatting; **E5** motion PNGs at fixed 150/400/800 ms miss element blocks that start ~520 ms; **E7** no clip top-down preset for vertical rules. Plus M1 opens: count-up `onUpdate`, sweep from 12 o'clock, negative bars. **Next: engine fix (E1–E5, E7 + M1 opens) before M3**, then re-probe M2 categories in M6 |
