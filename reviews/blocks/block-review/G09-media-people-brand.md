# G09 — media + people + brand (14 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `media`, `people`, `brand`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ✅ 14/14 reviewed, 14 fixed, 0 open · **Agent:** B4 (RV09) · **Last commit:** `d942945c`

## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.c.image-text | media | group | layout | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | b14f48f1, d942945c | example used an unresolved asset id (dashed placeholder); now /demo/photo-1.svg. Layout fine at wide/narrow/min. |
| tls.m.image | media | element | layout | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | b14f48f1 | example used an unresolved asset id; /demo/photo-1.svg. Caption, cover crop ok. |
| tls.m.icon | media | element | layout | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | 422a4c4b | 24 px speck in every region and the path was not scaled to the box; additive `size` (sm 24 default, md 48, lg 80, xl 128), example lg, preferred 80. |
| tls.m.icon-label | media | element | layout | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | 422a4c4b | icons 16-32 were bullets, path unscaled; steps 28/44/72, icon shrinks to box, honest min [96,76]; first spec. |
| tls.m.image-grid | media | group | layout | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | b14f48f1 | example had placeholders only; now 3 demo photos. Reflow 1-9 images x 3 boxes asserted in spec. |
| tls.m.image-compare | media | group | layout | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | b14f48f1 | placeholder alt text piled on the handle; real images. Motion used broken wipe-x (S16): stagger-children, parts cover labels/pills/handle. |
| tls.m.device-mock | media | element | layout | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | b14f48f1 | example image; motion parts now cover shadow, dots, address bar. |
| tls.c.testimonial | people | group | html | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | e50290b0 | INVISIBLE in View and Present (stuck quote/avatar/name/role at 0): viewer hides every [data-part], animate() never showed the quote container. New animate.ts on runShowcase; subtle/reduced covered; expressiveMs 2000. |
| tls.c.profile-card | people | element | layout | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | d942945c | stretched across the whole region with text spread apart; layout `auto` (additive enum value) side by side in landscape boxes, capped width/height; honest min [340,420]; initials disc visible on the card. |
| tls.c.team | people | group | layout | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | d942945c | 4 truncated columns in a half-width region and 2-person example; columns drop below 270 px, portraits shrink then bios drop to stay in the box; 4-person example with portraits; min [1280,420]. |
| tls.m.avatar | people | element | layout | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | b14f48f1 | initials disc invisible on surfaceAlt cards (tint toward accent); motion covers ring/gap/initials; preferred [420,320], min [240,200] (old min made the example overflow). |
| tls.m.avatar-group | people | element | layout | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | b14f48f1 | second initial clipped by the next disc ("M/"): smaller initials when overlapped; 2 portraits in the example; motion covers edge/initials/more. |
| tls.m.logo | brand | element | layout | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | b14f48f1 | example /demo/logo-1.svg, ratio 4. |
| tls.m.logo-wall | brand | group | layout | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | b14f48f1 | example had 3 placeholders (and the block says <3 use logo); now 6 demo logos. 2-12 logos x 3 boxes asserted. |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to **Shared issues raised** below instead.

1. **Every example rendered the dashed placeholder** (all 14 cards, drops and viewer slides: `media/m-image.card.png`, `brand/m-logo-wall.wide.png`): examples used abstract ids (`asset-hero-photo`) that no asset table resolves. They now point at `/demo/*.svg` (portraits, logos, before/after, photos), the way `tls.c.cover` already does. This is what the AI and the gallery show, so the cards are now real. Covered by `media-motion.spec.ts` (examples laid out with resolved assets at preferred and min).
2. **tls.c.testimonial invisible in View and Present** (`people/c-testimonial.wide.png`, report `stuck: quote, avatar, name, role at 0.00`): the viewer sets opacity 0 on every `[data-part]` before `animate()`, but the old `animate()` only tweened the words inside the quote, so the quote container (and `fromTo` on a sequential timeline with per-word `delay`) never became visible. New `animate.ts` on `runShowcase`: container shown, words stagger, attribution rises; subtle and reduced motion follow the showcase contract; `expressiveMs: 2000`. The two old animate specs asserted the buggy shape (5 `fromTo` calls) and were replaced with specs for the container-shown behaviour plus `showcaseSuite`.
3. **tls.m.icon / icon-label drawn as 24 px specks and unscaled**: the renderers draw an `icon` node's path in a viewBox equal to its box, so a bigger box does not scale the 24-unit path (shared `iconLeaf` already scales). Both blocks now use `iconLeaf`; icon got an additive `size` option (sm 24 default, md 48, lg 80, xl 128; example lg, preferred [80,80]); icon-label steps are 28/44/72 and the icon shrinks to fit a short or narrow box (min [96,76]). Specs: `tls-m-icon.spec.ts`, new `tls-m-icon-label.spec.ts`.
4. **tls.c.profile-card stretched and spread out** in a full-width region (`people/c-profile-card.wide.png`): a stacked card as wide as the region, text spread over the region height. Additive `layout: 'auto'` (default): side by side when the box is at least 1.3 wide for 1 tall, else stacked; width capped (640 stacked, 1080 side), height card-like. `resolveLayout`/`resolve` in `index.ts`; sizes spec `people-media-sizes.spec.ts`; min [340,420].
5. **tls.c.team truncated names in a half-width region** (`people/c-team.narrow.png`: "Dr...", "Nguy..."): columns now drop until each card is at least 270 wide (`colsFor(n, cols, width, gap)`), portraits shrink to `md` when the grid is taller than the box, bios drop as a last step; the example is 4 people with portraits; min [1280,420] (4 across).
6. **Initials disc vanished on a filled card** (profile-card, team without photos): the disc was `surfaceAlt` on a `surfaceAlt` card; now `surfaceAlt` mixed 22 % toward the accent with accent-readable letters. `tls-m-avatar.spec.ts` asserts the tinted fill (changed on purpose, it asserted the plain `surfaceAlt`). Overlapped avatars (avatar-group) use smaller initials so the second letter is not clipped by the next disc.
7. **Motion recipes**: `tls.m.image-compare` used `wipe-x` (S16, snaps) and left the label pills and handle outside every part; now `stagger-children` over before, labels, after, labels, divider, handle. Avatar, avatar-group and device-mock recipes name ring/gap/initials, edge/more.disc, shadow/dots/address. `media-motion.spec.ts` runs `assertMotionTargetsExist` (parts exist, every drawn leaf covered, preset not in the broken list) over the ten media blocks.
8. **Honest sizes**: avatar preferred [420,320] / min [240,200] (the example overflowed the old min [100,80]); profile-card min [340,420]; team min [1280,420]; icon-label min [96,76]. Checked by the new size specs.
9. Digest snapshot regenerated on purpose (new examples, icon `size` option, profile-card `layout` auto); the top-8 digest budget test still passes.

Checked and fine: image-grid caption placement and cover crops, image-compare split handle, device-mock aspect and frame, logo contain-fit, logo-wall reflow from 2 to 12 logos, avatar-group +N bubble, `size.min` fit for every media block.

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

| # | Block | Symptom | Shot | Suspected file |
|---|---|---|---|---|
| S25 | tls.m.icon, any block emitting an `icon` node | The renderers draw an `icon` node's path in a viewBox equal to its own box, so a box larger than 24 does not scale the path; every author must pre-scale with `iconLeaf`/`scaleIconPath`. Worth a lint or a renderer-side scale | `media/m-icon.wide.png` before the fix | `render-dom.tsx` (case `icon`), `render-svg.ts` |
| S26 | tls.c.testimonial (and any html block) | The viewer hides every `[data-part]` before `animate()`; an `animate()` that only tweens descendants leaves the container invisible. The contract is written in `_showcase.ts` but nothing checks the older html blocks (hero, big-stat, feature-grid): G10 audits them | `people/c-testimonial.wide.png` before the fix | `components/DeckViewer/DeckViewer.tsx` (hide step), block `animate()` |
| S27 | review harness | First shoot after a dev-server restart fails once or twice with `waitForSelector` timeouts (cold compile of `/edit` and `/view`); re-running works. Also `pkill -f 'next dev -p 5433'` run from a bash tool call kills the calling shell (pattern matches its own command line): use `pgrep -f` + `kill <pid>` | n/a | README §4 | 

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-06 | B4 agent | G09 14/14 fixed: `422a4c4b`, `b14f48f1`, `e50290b0`, `d942945c` | S25-S27 raised. Dev server was stale after the third build (S5): restarted with the heap cap, decks re-PUT by the harness. Shots for media/people/brand deleted |
