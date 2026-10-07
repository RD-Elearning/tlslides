# G10 — cover + divider + agenda + closing + learning (11 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `cover`, `divider`, `agenda`, `closing`, `learning`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ✅ 11/11 reviewed, 8 fixed, 3 unchanged, 0 open · **Agent:** B4 (RV10) · **Last commit:** `b4e0d84b`

## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.c.hero | cover | slide | html | ✅ | ✅ | ✅ | 🔧 | 🔧 | 🔧 | 🔧 | 9a29421e | min [400,200] let the title wrap to 5 lines (1402 tall) past the box: now [1280,472]; subtle motionStyle ignored: one calm fade. Sequential reveal kept (deliberate: kicker, title, subtitle). Top-aligned in `blank` by design (hugs content). |
| tls.c.cover | cover | slide | layout | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | 🔧 | b4e0d84b | min [640,360] overflowed (title+subtitle 840 tall): [1200,600]. Centered/split/bleed x 1 and 12 word titles asserted. |
| tls.c.kinetic-title | cover | slide | html | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | 🔧 | b4e0d84b | min [480,270] -> host 1061 tall: [1040,530]. GSAP mid frames show words rising, chain 1/1, 1 and 12 word titles asserted. |
| tls.c.divider | divider | slide | layout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  | All three variants and 1/12 word titles fit; min fits. No change. |
| tls.c.agenda | agenda | slide | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | 5ff66dc9 | a slide-scope block drew a body-size list in a corner (preferred 700x500, min [280,120] overflowed to 530): biggest type tier that fits, 2-digit index column; [1200,660] / [620,440]. 3 vs 8 items asserted. |
| tls.c.objectives | agenda | slide | layout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  | Fits preferred and min, centred. No change. |
| tls.c.closing | closing | slide | layout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  | Split layout fits preferred and min. No change. |
| tls.c.recap | closing | slide | layout | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | 🔧 | b4e0d84b | min [560,320] overflowed (398): [900,380]. |
| tls.c.contact | closing | group | layout | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | 🔧 | b4e0d84b | min [360,200] overflowed (367): [480,350]. Initials disc now visible (shared avatar fix, RV09). |
| tls.t.qa | learning | element | layout | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | 🔧 | b4e0d84b | min [260,140] overflowed (295): [450,230]. |
| tls.c.quiz | learning | group | layout | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | 🔧 | b4e0d84b | min [560,360] overflowed (611): [1050,550]. |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to **Shared issues raised** below instead.

1. **size.min was dishonest for 8 of 11 blocks.** The slide composites keep the deck's 1920-scale type at every box size, so a "minimum" of 400x200 or 280x120 cannot hold the example (`tls.c.hero` at 400 wide: 1402 tall; `tls.c.agenda` 280x120: 530 tall; cover, kinetic-title, recap, contact, qa, quiz likewise). Each min is now the smallest box (found by probing) in which the example fits; `slide-composites.spec.ts` asserts example-at-preferred and example-at-min for all 11 (root box and every leaf), and that min never exceeds preferred.
2. **tls.c.agenda drew a small list in a corner** (`agenda/c-agenda.wide.png`): a slide-scope block on a body-size scale. It now takes the biggest of four type tiers whose rows fit the box (so 3 items are larger than 8, asserted), with an index column wide enough for two digits; capacity() still estimates at the smallest tier. preferred [1200,660].
3. **tls.c.hero ignored `motionStyle: subtle`**: now one opacity fade per part through `runShowcase` (new spec); expressive timelines and the old specs are untouched. Hero keeps its sequential kicker, title, subtitle, CTA reveal on purpose.
4. **Extremes asserted, nothing broke:** 1 and 12 word titles in cover (centered, split, bleed), divider (numeral, field, minimal), kinetic-title and hero; agenda 3 to 8 items against `capacity()`.
5. **Motion**: every layout-kind block's recipe parts exist in its own tree and every leaf is covered (`assertMotionTargetsExist`, composites laid out with a registry); html blocks hero and kinetic-title show deliberate mid frames (`cover/c-hero.wide.mid-500.png`, `c-kinetic-title.wide.mid-500.png`) and complete (chain 1/1). Present mode shows the settled state for agenda, hero and contact.

Checked and unchanged: divider, objectives, closing (split panel, avatar, button) fit at preferred and min; the quiz option rows, Q and A badges and recap takeaway band read well in wide and narrow regions.

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

| # | Block | Symptom | Shot | Suspected file |
|---|---|---|---|---|
| S28 | tls.c.hero (and any slide-scope block that hugs its content: agenda, contact, qa) | In the harness's `blank` layout the block sits top-left with the lower half of the slide empty, while divider, objectives, recap, closing and kinetic-title fill the area and centre. The hero spec ties poster height to the content on purpose, so the fix belongs in the layout (a region that centres slide-scope blocks) | `cover/c-hero.wide.png`, `agenda/c-agenda.wide.png` | `slide-layouts.ts` (`blank` regionAlign) |
| S29 | tls.c.cover gallery card | "Introductio n": letter-spacing glitch in the scaled preview (font metrics of the thumbnail differ from the real render); real viewer is fine | `cover/c-cover.card.png` | `BlockInserter/BlockPreview.tsx` |

## Motion pass (M5)

Agent E, 2026-10-07. Probe: `REVIEW_PASSES=motion REVIEW_MOTION_STYLES=static,subtle,expressive,reduced` per category (`cover`, `divider`, `agenda`, `closing`, `learning`) on the final build, `REVIEW_MOTION_PNG=1` mid frames (all 11 looked at), `REVIEW_MOTION_DUMP=1` frame dumps for the html blocks. Spec: `library/motion-m5.spec.ts` (shared with G09; see `G09-media-people-brand.md` § Motion pass (M5)): every variant of cover / divider / closing / recap / qa covered, J5 with the maximum item count (agenda 12, objectives 6, recap 5, contact 6, closing 4 contacts, qa 5, quiz 5), the hierarchy asserted per block (kicker / title first, then subtitle, body / list items staggered, CTA / decoration last), hero in all three variants and kinetic-title with its longest title on the GSAP and driver paths. Before this pass seven of the nine layout composites animated `parts: ['root']`: the whole slide entered as one unit.
Cells: ✅ pass · 🔧 fixed in this pass · ❌ open · n/a. After the pass every block is J1–J8 clean in all four styles except probe artefact **A3** on `tls.c.hero` / `tls.c.kinetic-title` expressive (`(block)` 0→1 in one frame, flaky: hero was clean on some runs; frame dumps: no painted part changes more than 0.12 per frame). Longest chains (expressive, example): quiz 1.3 s, recap 1.27 s, kinetic-title 1.55 s; at the maximum item count all stay under 2.2 s (budget 3.5 s).

**Counts:** 11 fixed, 0 unchanged, 0 open.

| Block | J1 | J2 | J3 | J4 | J5 | J6 | J7 | J8 | Fix commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| tls.c.hero | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | ✅ | ✅ | `0e73c615` | 🔧 positionless `fromTo()` appended each tween after the previous one (steps never overlapped); now explicit positions kicker 0 / title 0.15 / subtitle 0.4 / CTA 0.6 s, 0.6 s rises, expressiveMs 1400; gradient sweep eases out (was in-out); split halves ±60 px (was 100). The variant was read from the host element but the template sets `data-variant` on its inner div: split and gradient-sweep never played in the viewer. Probe J1/J5 `(block)` = A3 |
| tls.c.cover | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `faf891de` | 🔧 was `root`; photo / field / scrim and logo fade in place, kicker, title line by line, subtitle, then meta and decoration last (< 1.1 s with a four-line title) |
| tls.c.kinetic-title | 🔧 | ✅ | ✅ | 🔧 | 🔧 | 🔧 | ✅ | ✅ | `0e73c615` | 🔧 J4: kicker tweened `letter-spacing` (reflow each frame, the line shifted) → opacity + rise; J1: decor layer `set` to 1 jumped → decor and title boxes fade under their children, rule hidden until it draws; J5: orbs 1.4 s / 140 px → 0.9 s / 40 px, rule eased in-out, a 12-word title ran ~3.2 s → word gap shrinks (all in by 0.8 s), KINETIC_TITLE_MS 2150; subtitle rises without blur. Words keep per-word transforms only (no reflow). Probe J1/J5 `(block)` = A3; subtle J4 `inset` = A5 (template now `inset:0px`) |
| tls.c.divider | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `faf891de` | 🔧 was `root`; accent field wipes in (4-term clip, variant `field`), then number, title, subtitle |
| tls.c.agenda | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `70378990` | 🔧 stagger-lines counted each pattern on its own (row 3's title before row 4's number, notes shifted when one was missing); now number, title, note per row (`note[i]` slots), rows 120 ms apart; 12 items 1.9 s |
| tls.c.objectives | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `70378990` | 🔧 was `root`; intro, then badge, number, text 40 ms apart per item, items 120 ms apart, in place (a rise would slide the number inside its badge) |
| tls.c.closing | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `faf891de` | 🔧 was `root`; panel, title (by line), text, person (photo, name, role), contacts, CTA last; both variants and CTA styles |
| tls.c.recap | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `70378990` | 🔧 was `root`; numbered: badge, number, text 40 ms apart; cards: card, number, text; takeaway after the last point |
| tls.c.contact | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `70378990` | 🔧 was `root`; person photo, name, role in place, then each channel (circle, icon, text) 120 ms apart |
| tls.t.qa | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `ea5f2674` | 🔧 stagger-lines by part index (answers of early pairs after later questions); per pair Q badge, question, A badge, answer; pairs 120 ms apart; all three markers |
| tls.c.quiz | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | ✅ | `ea5f2674` | 🔧 was `root`; question, option rows (`row[i]` slots, the answer panel in its own row) 120 ms apart, check mark settles, explanation last |

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-06 | B4 agent | G10 11/11: agenda `5ff66dc9`, hero `9a29421e`, cover/kinetic-title/recap/contact/quiz/qa `b4e0d84b` (divider, objectives, closing unchanged) | S28, S29 raised. Shots for cover, divider, agenda, closing, learning deleted |
| 2026-10-07 | agent E (M5) | Motion pass: 11 fixed, 0 unchanged, 0 open (`0e73c615`, `faf891de`, `70378990`, `ea5f2674`; spec `1d00a403`) | Probe A3 on hero / kinetic-title; S28 (hugging slide blocks top-left) unchanged |
