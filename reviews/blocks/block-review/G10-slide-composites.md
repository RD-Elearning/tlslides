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

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-06 | B4 agent | G10 11/11: agenda `5ff66dc9`, hero `9a29421e`, cover/kinetic-title/recap/contact/quiz/qa `b4e0d84b` (divider, objectives, closing unchanged) | S28, S29 raised. Shots for cover, divider, agenda, closing, learning deleted |
