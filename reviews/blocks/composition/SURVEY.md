# Composition survey — what the LLM can compose today, motion, export, reference-library rules

**Date:** 2026-10-10 · **Against:** `e373717e` (AC8.6 done) · **Kind:** research only, no code changed.
**Purpose:** the factual base for the planned "composition" phase family (CMP): let the LLM build many
good-looking slide variants by *composing* existing blocks (containers with children, backdrop/overlay
layers, anchors, per-block style, connectors) instead of only picking recipe + knobs, plus motion
(web animated, static/PPTX = final frame).

**Method.** Code read with `file:line` citations (paths relative to `packages/tldraw/src/blocks/` unless
they start with another root). Experiments were run only through `node` with the oracle loader
(`tools/layout-report/load.js`); no jest, tsc or Chromium. Probe decks and scripts live in the session
scratchpad `survey/` (`cmp1-grid-cards.json`, `cmp2-backdrop-overlay.json`, `cmp3-split-stack.json`,
`cmp3-broken-bar.json`, `cmp4-defaults.json`, `cmp5-stress.json`; `probe.js` = validate + quality gate;
`probe2.js` = the editor path `deckSpecToDocument → contextForBlock → layoutBlock` with a node dump;
`sweep.js` = every built-in laid out with its option slots removed). Reproduce with
`node tools/layout-report/cli.js <deck>` and `node <scratchpad>/survey/probe2.js <deck>`.

---

## 0. The findings that decide the plan

| # | Finding | Evidence |
|---|---|---|
| F1 | **A nested child's `BlockSpec.style` is ignored.** `layoutChild` reads a child's style only from `props.$block.style` (a private convention the composites use via `onSurface`), never from `spec.style`. The validator meanwhile validates `spec.style` on nested children and *warns* on `props.$block` as an unknown prop. | `layout/layout-child.ts:286-290`, `library/composite/_kit.ts:255`; cmp1: card `c3` with `style.surface: accent` paints `#EEF3F9` like its siblings; cmp4 `$block` → `slot/unknown` warning |
| F2 | **Of the ten `BlockStyleSpec` fields only four do anything**: `surface` (role string → only `resolveColor('surface')`; Paint → surface context), `on`, `accent`, and `padding`/`align` (box inset, `layoutBlock`). `tone`, `radius`, `gap`, `elevation`, `density` have **zero readers** — yet the detail digest advertises all ten to the LLM. | `layout/layout-child.ts:219-249, 619-700`; grep of `ctx.style.*` across `library/` = 22× `surface`, 2× `padding`, nothing else; `capability-digest.ts:302-316` |
| F3 | **Depth limits disagree**: validator allows 6 levels (`MAX_NESTING_DEPTH = 6`), the layout engine stops at 4 (`MAX_DEPTH = 4`) and silently returns an empty `lint/depth-overflow` group. A 5-deep stack validates clean and the oracle reports "findings: none" with `nat 1728x0`; only the quality gate notices (`quality/sparse`, fill 0 %). | `validate-deck-spec.ts:443`, `layout/layout-child.ts:145, 259-269`; cmp5 `deep5` |
| F4 | **Schema `defaults` are never merged** by compiler, editor or oracle; each block must default its own props. One built-in breaks without its option slots: `tls.t.takeaway` (no `tone`) paints `fill: "undefined12"` in the editor and **throws** in the oracle (`reading 'replace'`), which turns a whole container into `block/layout-failed` (cmp3: one takeaway inside a split blanked the split). 130/131 blocks are fine. | `sweep.js`; `library/text/tls-t-takeaway/layout.ts:51-52, 139-144`; cmp3, cmp4 |
| F5 | **The oracle sees a container as one block.** `analyzeSlide` pairs only top-level region/free blocks; children are text leaves of the parent. It does report a child's text overflow (cmp5 `text/overflow` on the row, naming `text` but not the child id), but never overlap, misalignment or unequal size *between* children, never a too-narrow child (6 titles in a row → 7 chars/line, 5 lines, 0 findings), and never a silently dropped child. | `layout-report.ts:360-378`; cmp5 `overflow`, `row6`, `deep5` |
| F6 | **No contrast check exists in the oracle or the quality gate** (0 occurrences of "contrast" in `layout-report.ts`, `pipeline/quality.ts`). A layered image backdrop does not change its region's surface context (`overImage: false`), so a title overlaid on a photo resolves dark-on-white ink with no scrim and reports clean. | cmp2 `s1`: title `#0B1F33` on photo, 0 findings; `tokens.ts:329, 442-464` |
| F7 | **Layering is region-level only.** `layer` / `anchor` / `anchorTo` take effect only for a block placed directly in a region; inside a container they are ignored (validator warnings `block/layer-nested`, `block/anchor-unused`). `anchorTo` can only target a top-level stacked block, so "badge on card 2 of a grid" is impossible. `tls.l.overlay` stacks every child at full box (no anchors). | `validate-deck-spec.ts:590-632`, `types.ts:45-67`, `library/layout/tls-l-overlay/layout.ts:21-41` |
| F8 | **No cross-block connector exists.** `tls.g.arrow` is a standalone overlay arrow in its own box (4 directions); `LayoutNode.line` is a straight segment with an end marker only (`Stroke` has no dash). Diagram blocks draw their own internal edges. | `library/diagram/tls-g-arrow/schema.ts:9-12`, `types.ts:606, 661-664, 724-729`, `render-svg.ts:336-350` |
| F9 | **Static output is already the final frame** (layout tree = rest state; count-up rewrites DOM text only at runtime; the M-pass probe enforces J3 "ends at rest"). But **headless block export is not wired by default**: `renderPageToSvg` draws a dashed placeholder for every block unless the host passes a `blocks` callback; `renderNodeToSvg` is called only by the parity harness. No PPTX code or dependency exists. | `motion/play-reveal.ts:21-26, 543-551`, `state/render/renderPageToSvg.ts:344-352`, `state/deck/Deck.ts:317-323`, `Tldraw.tsx:313`; `block-review/MOTION.md` §1 J3 |
| F10 | **The LLM is not taught composition at all.** Tier-1 index (16,994 / 17,000 chars) lists every container and every atom (kicker, hero-number, icon, trend-badge, rule, arrow) only as a bare name on an `also:` line; `free[]`, `style`, `children` are not explained; no recipe uses a container or a layer (`grep tls.l. recipes.ts` = 0). LLM-ARCHITECTURE §6 rule 4 bans `free[]` for the model. | `tier1-index.txt` lines 8, 71, 75, 100, 146, 181; `reviews/blocks/LLM-ARCHITECTURE.md:660` |
| F11 | **Children's own motion does not play inside a container**: a container tags children `child/<i>` and staggers them as units (`stagger-children`, 40 ms) under `expressive`; a hero-number's count-up inside a card does not count. `defineCompositeBlock` composites animate as one `root`. | `library/layout/_motion.ts:1-12`, `layout/define-composite.ts:15-16` |
| F12 | The building blocks for composition are otherwise sound: validator recurses `props.children` (cycle and duplicate-id guards), both renderers share one `LayoutNode` tree (parity specs), and `measureBlock` collects nested leaves. The work is plumbing + checks + teaching, not a new engine. | `validate-deck-spec.ts:466-500, 714-731`; `render-svg.ts:87, 164-182`; `layout/measure-block.ts:423` |

---

## A. Composition capability today

### A1.1 Containers (14 `tls.l.*`, all `scope: element`, all tier 2)

All read children from **`props.children`** (schema slot `kind: 'blocks'`, `allow: layout|text|data|diagram|composite|media`). `BlockSpec.children` (`types.ts:41-42`) is validated (`validate-deck-spec.ts:634-660`) and round-tripped by the shape bridge (`shape-bridge.ts:124, 274`) but **no layout reads it** — two places for the same thing.

| Block | Children | Sizing rule (measured from `layout.ts`) | Own paint | Notes |
|---|---|---|---|---|
| `tls.l.stack` | n | full width; `equal` = same height; `content` = intrinsic heights **scaled up to fill** the box (`tls-l-stack/layout.ts:55-58`) — no packing/top-align, min 50 per child | none | default `gap md` |
| `tls.l.row` | n (digest says 2–4) | same as stack on x | none | no min-width guard (cmp5 `row6`) |
| `tls.l.grid` | n, row-major | `columns × rows` equal cells (1–12 each); `sizing: content` exists | none | children beyond c×r: not checked |
| `tls.l.split` | max 2 | `ratio` 0.1–0.9, `gutter`, `axis x|y` | none | |
| `tls.l.sidebar` | max 2 [side, main] | `sidebarWidth` 100–800 units | none | |
| `tls.l.card` | n (≥2 → delegated to an inner `tls.l.stack` with `sizing: content`, `gap: sm`) | padding token | rect `background` (deck card surface via `cardPaint`, AC4) | `tls-l-card/layout.ts:26-48`; `style.surface` Paint or non-neutral role wins |
| `tls.l.overlay` | n, all at full box, last on top | — | rect `surface` + `clip` | no per-child anchor/size (`tls-l-overlay/layout.ts:21-41`) |
| `tls.l.section` | n below a title + divider | `gap` | title text, rule | |
| `tls.l.repeater` | 1 template × `count` (1–20) | `direction x|y` | placeholder panels if empty | same id repeated n times |
| `tls.l.spacer`, `tls.l.footer`, `tls.l.safe-area`, `tls.l.field`, `tls.l.grid-guide` | — / footer slots / inset / full-bleed fill / editor guide | | | `grid-guide` editor-only |

Child boxes are relative; every child is wrapped in a `group` at its box (`layout-child.ts:328`), children of a Paint-surfaced parent get the Paint resampled at their box (`layout-child.ts:292-302`, the R4 gradient fix). A **solid** card surface is *not* passed down: children solve ink against the slide surface (works today because card surfaces stay close to the page; breaks for a dark card on a light page unless the card sets a Paint).

### A1.2 Nesting across the pipeline

| Stage | Handles nested children? | Detail |
|---|---|---|
| Validator `validateDeckSpec` | yes | recurses `props.<blocks slot>` and `BlockSpec.children`; depth error > 6; cycle + duplicate-id; `scope: slide` nested → warning; layer/anchor nested → warning (`validate-deck-spec.ts:443-660, 714-731`). Validates nested `style`, which layout then ignores (F1). |
| Compiler `compileSlide` | top-level only | a container is one `ComponentShape`; style `blockDefaults` (AC1) are filled into **top-level** props only (`slide-compiler.ts:133`) — nested children get neither schema defaults (F4) nor style knob defaults. |
| Layout `layoutChild` | yes, ≤ 4 deep | depth > 4 → empty group, no throw, no finding (F3). |
| DOM renderer | yes | nests positioned divs per group (`render-dom.tsx:498`); nested html hosts supported (`render-dom-nested-host.spec.tsx`). |
| SVG renderer | yes | group translate, clip, opacity (`render-svg.ts:164-182`). |
| `measureBlock` | yes | walks all leaves (`layout/measure-block.ts:423`). |
| `analyzeSlide` | as one block | F5; per-leaf `text/overflow`; no inter-child checks; `nat 1728x0` for a dropped subtree. |
| Quality gate | as one block | fill/region-fill/lead only (`pipeline/quality.ts:51-70`). |
| Motion | children as units | F11. |
| Digest / recipes | not taught | F10. |

### A1.3 The three requested compositions (+ two stress decks)

| Deck | What it is | Oracle (`cli.js`) | Validator / gate (`probe.js`) | Editor render (`probe2.js`) — what breaks |
|---|---|---|---|---|
| `cmp1` grid of 3 cards (icon + hero-number + body), card 3 `style.surface: accent`, body 3 `style.on: #fff` | 2 blocks, **0 errors 0 warnings**, `9 text leaves 11L`, free 32 % | 1 warning `style/low-contrast-on` (against `#EDEDED`, a surface that is never painted); gate clean (fill 100 %, lead 128) | Card 3 identical to cards 1–2 (F1). Card content distributed by `content` scaling: icon top, number mid, body bottom with ~180-unit voids; hero number y differs across cards (426 vs 437) because value/unit lengths differ — S4/S5-type drift nobody reports. |
| `cmp2/s1` full-bleed image `layer: backdrop` + kicker `overlay top-left` + display title `overlay bottom-left`, `style.surface: surface, padding: lg` | 0 errors; 2 × `layout/overlap` **info** (intended) | clean | Title ink `#0B1F33` on the photo, **no scrim** — `style.surface` role is not painted by `tls.t.title`; `overImage: false` (F6). Kicker sits at 0,0 (no safe-margin inset for anchors). |
| `cmp2/s2` `tls.l.overlay` [image, title] | 0 errors | clean | Title at the top-left of the image (overlay has no anchor), same contrast issue. |
| `cmp2/s3` statement + `free[]` badge + orb deco bleeding off-frame | **1 error `slide/overflow`** on the deco (80 past right) | `free/aspect-risk` warning; gate `quality/small-type` (lead 56 < title) | An intentional bleed is an error: no "may bleed" flag for backdrops. |
| `cmp3` split [stack(hero-number, takeaway), bar] | **`block/layout-failed`**: split throws (`reading 'replace'`), `free 96 %`, `layout/unbalanced` | validator **clean**; gate `quality/sparse` | In the editor it renders but the takeaway paints `undefined12` / no accent bar (F4); oracle and editor disagree. With an empty `tls.d.bar` (`cmp3-broken-bar`) the validator does catch `slot/missing`. |
| `cmp5/overflow` row of 3 cards, one 431-char body | `E text/overflow r \`text\` needs +37` (child id missing) | — | Card 1 body overflows its card by 38 units; card tops align, contents do not. |
| `cmp5/deep5`, `deep7` | **findings: none**, `nat 1728x0` | deep7: `block/nesting-depth` errors; deep5 clean | Both render nothing (F3). |
| `cmp5/row6` 6 titles in a row | `layout/unbalanced` info only | clean | 7 chars/line, 5 lines per title — unreadable, unflagged. |

### A2. Layering, free placement, per-block style, deck styles, contrast

**Layers (LO2/LO2.1).** `BlockLayer = backdrop | content | overlay` (`types.ts:99-109`); definition default by category (decoration → backdrop; 7 non-content built-ins, layout-oracle §3 LO2). A region block with explicit `backdrop`/`overlay` leaves the stack, gets the region box or its natural size at `anchor` (10 values, `types.ts:72-96`), or the box of a *stacked* sibling via `anchorTo` inset `space.sm` (`types.ts:61-67`); compiled in `compileLayered` (`slide-compiler.ts:681-716`). Oracle policy: backdrop behind anything = info, overlay over text = `text/occluded` error, text×text = `text/collision` (info if a backdrop paints behind) (`layout-report.ts:248-279`).

**`free[]`.** `PlacedBlock { block, box }` in slide units (`types.ts:1044-1065`); a free backdrop is moved under the flow (LO8); validator warns `free/aspect-risk`; **LLM-ARCHITECTURE §6 rule 4 bans `free[]` for the model** (`LLM-ARCHITECTURE.md:660`). Composition therefore has to go through regions, containers, layers and anchors — not coordinates.

**`BlockStyleSpec` (`types.ts:112-137`) — who honours what.**

| Field | Read by | Effect today |
|---|---|---|
| `surface` | `layout-child.ts:189-201, 233-246`; 22 reads in 6 blocks (`tls.l.card/overlay/section/field`, `tls.t.takeaway`, `hero`/`big-stat` posters) | Paint → painted + surface context resampled; role string → only `resolveColor('surface')` returns it (a block must paint it itself: title/body/statement do not) |
| `on` | `layout-child.ts:224-226` | overrides the `text` role (role → solver; literal → as is, validator warns < 4.5:1) |
| `accent` | `layout-child.ts:227-229` | overrides the `accent` role |
| `padding`, `align` | `layoutBlock` (`layout-child.ts:619-700`) | insets the box / centres shorter content; identity when absent |
| `tone`, `radius`, `gap`, `elevation`, `density` | **nobody** | none — advertised in `capability-digest.ts:302-316` |

**Deck styles.** `DeckStyle` resolves under the spec: palette = theme, token overrides, `blockDefaults` knob values filled into **top-level** props at compile (`slide-compiler.ts:133`) and recorded as `$block.styleDefaults`; style masters add free backdrop blocks per page (`layout-report.ts:635-650`); `variety` lists allowed knob values (ai-curation §8.6). Card look comes from `DeckTokens.surface` via `cardPaint` (AC4), read by `tls.l.card` and composites — so a hand-composed card already follows the style (glass, outline, raised…), which is good news for composition.

**Contrast.** The solver lives in `tokens.ts` (`resolveColor`, `TEXT_FLIP_FLOORS = [12, 7]` then 4.5, `tokens.ts:239, 299`); it is luminance-aware against the *surface context* passed down. Gaps: (1) solid card fills are not passed as surface context to children; (2) a layered image does not mark its region `overImage`; (3) the only contrast check is the validator's literal `style.on` warning (`validate-deck-spec.ts:806-851`); the oracle and gate have none (F6).

### A3. What the LLM sees

- **Tier-1 index** (`capabilityIndex(reg, {tier:1})`, 16,994 chars, ceiling 17k, AC8.6): header lines on scope, height hints, one **layers** line (line 8: backdrop/overlay/anchor/anchorTo, motionStyle). Containers: one `also:` line of 11 bare names (line 71). Atoms: `tls.t.kicker`, `tls.t.hero-number`, `tls.m.icon`, `tls.d.trend-badge`, `tls.t.tags`, `tls.x.rule`, `tls.g.arrow` all bare names (lines 75, 88, 100, 146, 181). Nothing on `props.children`, `style`, nesting depth, equal-size rules, or when composing beats a composite.
- **Detail digest** (`capabilityDigest(reg, {types})`): per container ~1k chars (6 containers = 6,300 chars incl. shared header; 7 atoms = 6,312) with a JSON example; the style section lists all ten style fields (F2).
- **Recipes** (26 + variants, `recipes.ts`): 0 containers, 0 layered blocks; composition happens only *inside* composites (`defineCompositeBlock`, 28 library files call `layoutChild`).
- **Budget room:** tier-1 index 6 chars; S2a own-role prompt ≤ 16k with 13.8–14.8k used (≈1.2k headroom); top-8 detail 11,987 / 12k (ai-curation §8.7, §8.9).

**Missing to teach composition:** (1) a short composition grammar (which containers, `props.children`, max depth, ids unique, element-scope only inside); (2) named composition patterns with slots (cheaper and safer than free nesting); (3) honest style fields; (4) the layer/anchor line extended to "inside a container use `tls.l.overlay`"; (5) the atoms' one-line size hints.

### A4. Atoms — what exists, what is missing

| Role | Exists (tier) | Fit as a composition part |
|---|---|---|
| Title / heading | `tls.t.title` (1; `size` title…display/fit, `rule`), `tls.t.subtitle` (2) | good |
| Body / lead | `tls.t.body` (1; `size body/lead/subheading`) | good |
| Kicker / eyebrow | `tls.t.kicker` (2; case, tracking, marker) | good, hidden from the LLM |
| Hero number | `tls.t.hero-number` (2; value/unit/caption, emphasis) | good; count-up only top-level (F11) |
| Stat with trend | `tls.d.trend-badge` (2, pill + arrow), `tls.d.stat-compare` (2) | good |
| Icon | `tls.m.icon` (2; sm 24 … xl 128), `tls.m.icon-label` (2) | good; no icon-in-disc/tinted-circle variant |
| Image | `tls.m.image` (1; fit, focal, caption) | good; no shape mask other than radius |
| Decoration / shape | `tls.m.decoration` (1; 14 shapes), `tls.m.pattern` (2; incl. mesh, grain) | good as backdrop; no shape *with text* |
| Rule / divider | `tls.x.rule` (2; axis, weight, tone, length) | good |
| Pills | `tls.t.tags` (2; wrapping pills) | usable as a single badge, not designed for it |
| Callout / takeaway / quote | `tls.t.callout`, `tls.t.takeaway`, `tls.t.quote` | good (takeaway needs F4 fix) |
| Arrow | `tls.g.arrow` (2; straight/curved/elbow, 4 directions, label) | standalone only |
| **Missing** | **badge / chip** (one short label on a filled pill, anchorable), **numbered marker** (circled number / oversized numeral as an atom, ppt-master "numbered circle or badge"), **connector** (A→B, see B2), **shape with text** (circle/rounded box/hexagon with a centred label — today card + child), **highlight / underline marker** on words outside `tls.t.statement`, **icon in disc** (tinted circle behind the icon), **leader line / annotation** (callout pointing at a region of an image/chart), **spacer-free vertical rhythm** (stack that packs top/centre instead of scaling to fill). |

---

## B. Motion today

### B1. Presets, defaults, drivers, timeline

36 presets (`motion/presets.ts:55-523`), tokens identical to transitions.dev (`motion/tokens.ts`: 40/80/150/250/350/400/500 ms, `smoothOut` default, `bounce` for pop) with distances scaled ×3 for the 1920 frame (base 24 vs 8 px).

| Family | Presets (duration token, keyframes) |
|---|---|
| Fades | `fade` (fast, opacity), `fade-up`/`fade-down` (slow, 24 px), `pop` (fast, scale .98, bounce), `field-in` (scale .96) |
| Clips | `wipe-x`, `wipe-y`, `wipe-down` (medium, inset), `mask-reveal` (circle), `reveal-down` (clip + translate) |
| Staggers (40 ms) | `stagger-lines` (+ 3 px blur), `stagger-children`, `stagger-grid`, `words-in` (+ blur), `sweep-nodes`, `pop-points` |
| Data | `count-up` (textContent tween + scale), `grow-bars-x/y`, `grow-segments` (scale from baseline origin), `draw-path`, `sweep` (stroke-dashoffset) |
| Chained | `quote-in`, `draw-axis-then-nodes`, `radiate`, `grow-branches`, `title-then-body`, `title-then-split`, `scrim-then-text`, `cover-in`, `section-in`, `dashboard-in`, `closing-in`, `split-in` |
| Ambient | `ken-burns` (linear, scale 1.06, presentation-only) |
| Deprecated | `none` |

**Defaults over the 131 built-ins** (registry tally): `fade-up` 32, `stagger-children` 31, `stagger-lines` 17, container (`-`, recipe `child` family) 11, `none` 9 (chrome/pattern/field), `stagger-grid` 9, `sweep-nodes` 7, `fade` 3, `draw-axis-then-nodes` 2, `split-in` 2, one each `quote-in`, `words-in`, `title-then-body`, `draw-path` (arrow), `reveal-down`, `count-up` (stat-spotlight), `field-in`, `wipe-x` (rule). `expressive` overrides: `stagger-children` on 27 (all containers + 16 others), `words-in` on title, `fade-up` on body. Part-level recipes carry most showy motion (e.g. hero-number `value: count-up`, `library/text/tls-t-hero-number/motion.ts:16-25`).

**Machinery.** `MotionStyle static | subtle | expressive` per deck/slide (`types.ts:1075, 1122`); `resolveBlockMotion`/`resolvePartMotion` (`motion/resolve-motion.ts`); `playBlockReveal` sets every part hidden, plays block then parts (`motion/play-reveal.ts:1-27`), count-up via driver `onUpdate` writing `textContent` in the final format with tabular digits (`play-reveal.ts:150-160, 543-551`); drivers `createWAAPI_driver` (default, `waapi-driver.ts:151`) and host-injected `createGsapDriver(gsap)` (`gsap-driver.ts:228`); `slideTimeline`/`blockShowDuration` pure timing (`motion/timeline.ts:276, 350`); Present mode build steps from shape `animation.order/trigger` (`state/deck/presentation.ts:54`). Quality: all 129 blocks passed the frame probe J1–J8 (block-review/MOTION.md §3); slide transitions `fade | push | cut` only (05-motion-system §5.8); motion lint rules of §5.9 are designed, not built.

### B2. Cross-block connectors

None (F8). What one needs, by layer:

| Layer | Needed |
|---|---|
| Spec | a slide-level `connectors?: ConnectorSpec[]` (additive): `{ id, from: { block: id, side?: 'top'|'right'|'bottom'|'left'|'auto' }, to: {…}, route: 'straight'|'elbow'|'curved', head: 'end'|'both'|'none', tone, weight, dash?, label? }` — ids, not coordinates, so it survives re-layout and theme change and passes the no-`free[]` rule. Targets: any block id incl. nested children (needs F1-style id → box resolution). |
| Compile | after region/container layout, resolve each endpoint to the painted box of the target (nested boxes are available from the node tree: wrapper groups carry boxes, child ids would need to be recorded on the wrapper — today the group has no id). Route in slide space; emit as a paint-only overlay shape on top of content. |
| Node | `line` with `marker` covers straight; elbow/curved need `path` + end marker (path has no marker today) or a new `polyline` node; `Stroke.dash?` additive. Both renderers + parity probe. |
| Oracle | treat the connector as an overlay: may cross backdrops; must not cross **text** of non-endpoint blocks (`text/occluded`), endpoints must not overlap (`layout/overlap` between A and B), minimum length; report `connector/unresolved` for an unknown id. |
| Motion | `draw-path` exists (stroke-dashoffset, `presets.ts:291`); a connector should draw *after* its source block's reveal (`order = max(order(from), order(to)) + ε`, `afterPrevious`), ~400 ms smoothOut, arrowhead fades in at the end. |
| Export | DrawingML `p:cxnSp` with `stCxn`/`endCxn` idx (bound connector) — the endpoint+route data maps 1:1 (ppt-master mapping §3 "Native connector"). |

### B3. Static output and PPTX

**Static today.** The `LayoutNode` tree *is* the rest frame: count-up targets are laid out at their final text (`05-motion-system.md` §5.6), every preset ends at opacity 1 / identity / no clip (probe J3), ambient loops are presentation-only. `renderNodeToSvg` (pure string, `render-svg.ts:386`) renders that tree; a census over the 10 style fixtures (520 block renders) emitted only `svg g text tspan rect path image clipPath defs filter feDropShadow radialGradient stop` — **no `foreignObject`**, no masks; 16 drop-shadow filters, 34 `rgba()` fills (glass), 150 `letter-spacing`. html blocks (8: hero, stat-spotlight, testimonial, feature-reveal, feature-grid, big-stat, journey, kinetic-title) render their **poster**, which since LO7 is the live geometry. But `renderPageToSvg`/`getThumbnail`/`exportSlidePng` draw blocks as placeholders unless a host passes `blocks` (F9; BACKLOG-demo Q9 step 3 "default `blocks` callback" is not in the tree). PNG is browser-only (`renderSvgToPng`).

**PPTX today:** none (`reviews/blocks/README.md:95, 232`; no `pptx` dependency in any `package.json`).

**ppt-master's approach (reference only — never imported).** SVG is a *closed, project-canonical* intermediate language, not browser SVG (`ppt-master/docs/technical-design.md` §"SVG Is a Project-Specific Intermediate Language"); `svg_to_pptx.py` (+ `scripts/svg_to_pptx/`, ~56k lines Python on `python-pptx` + direct DrawingML) dispatches per element: `rect→prstGeom rect/roundRect`, `path→custGeom`, `line+marker→a:ln head/tail`, connector preset → `p:cxnSp`, `<text>` with positioned `<tspan>` lines → one no-wrap text frame keeping line breaks, gradients → `a:gradFill` (radial = *Approximate*), one outer shadow → `a:outerShdw` (*Approximate*), group opacity → *Approximate*, blur/turbulence/blend/mask → **Bake-required** (`docs/powerpoint-svg-mapping.md` §3–§6). Native charts/tables come from JSON metadata on a marker group with a visible SVG fallback (§7–§8). Animation is a **sidecar** (`animations.json`) keyed by stable top-level `<g id>`; object animation **off by default**, transition `fade 0.4 s` (`docs/animations.md`, technical-design §"Animation & Transition Model"). Units: `1 px = 9,525 EMU`, `1 px = 0.75 pt`.

**Can our output feed it?** Not directly: our SVG uses inline CSS `style=` strings (`font-size:…px; letter-spacing:…em; line-height`), nested `<svg>` for icons, `feDropShadow` filters, `rgba()` paints — all outside ppt-master's canonical allowlist (`references/shared-standards-core.md:63-65`, "inline visual-property allowlist"; "author spacing as `dy`, not `line-height`", :184). **Better route:** map the `LayoutNode` tree (8 primitive kinds) straight to DrawingML — a closed tree is easier than SVG parsing. Two placements: (a) TS port in `packages/` with `pptxgenjs` (MIT, browser + Node; would be a new dependency → needs the user's approval per BACKLOG-visual-fix §1), or (b) FastAPI side with `python-pptx`, fed by a JSON dump of the laid-out tree from the Node oracle (`cli.js --format json` already carries boxes; a `--tree` dump is a small addition). (b) keeps `packages/` dependency-free and fits the deferred FastAPI service; (a) enables in-editor download. Either needs the export-ready contract below first.

**Export-ready checklist (requested by the product owner).** What every block / composition / connector / motion must expose *today* so a later exporter maps nodes to PPTX shapes without re-rendering:

| # | Requirement | Today | Gap / action |
|---|---|---|---|
| X1 | A static final-frame layout tree, absolute boxes, closed node kinds | ✅ `LayoutNode` (`types.ts:589-626`), rest state = final frame | add a headless `layoutSlide(spec) → { nodes, blockIds }` export (the oracle already builds it per block) |
| X2 | Semantic node identity: block id + part name on every node | ⚠️ `part` names exist (`value`, `bar[0][1]`, `child/2`…); block id only on the shape, not on nested wrappers | stamp `blockId` (and `type`) on each `layoutChild` wrapper group; keep part names stable (they become PPTX shape names and animation targets) |
| X3 | Text as runs with family, size, colour, letter-spacing, line breaks resolved | ✅ `TextLine[]` with baselines, `TextRun` bold/italic/colour/size (`types.ts:669-718`) | ⚠️ **no `weight`** in `ResolvedTextStyle` (bold only per run) and **no `align`**: centred/end text is emitted as one text node per line (`library/text/_engine/text-place.ts:1-6`) → exporter would make N text boxes per paragraph. Add `align` + `weight` to the text node (additive), keep per-line fallback |
| X4 | Shapes as primitives, not CSS effects | ✅ rect/path/line/icon(path d)/image; `rect.shadow 0|1|2|hard` | ⚠️ glass `backdrop-filter: blur(18px)` is DOM-only (`library/composite/_kit.ts:356-374`) → export must use the rgba fill alone (acceptable, document it); `grain` is an `image` of an SVG `feTurbulence` data URI (`tls-m-pattern/layout.ts:89-111`) → bake to PNG at export |
| X5 | Paints PPTX can express | ✅ solid, linearGradient(angle), radialGradient(cx,cy) (`types.ts:653-656`) | radial = Approximate; `rgba()`/8-digit hex strings must be parsed to alpha (one helper); mesh = several radial rects with alpha (Approximate) |
| X6 | Clips only where PPTX has them | ⚠️ `group.clip` (rect clip) used by overlay/containers; image radius clip | PPTX has no group clip: pre-clip at export (crop images via `srcRect`, intersect rect boxes) or flag `needsBake` |
| X7 | html blocks export through the poster | ✅ LO7 posters are live geometry (`types.ts:607-626`) | template-only effects (kinetic letter motion, CSS gradients on text) must also exist in the poster or be declared `bake` |
| X8 | Charts/tables carry data, not only drawn marks | ⚠️ drawn as primitives; data only in block props | keep block props alongside nodes (`blockId` → `props`) so an exporter can choose native chart (`p:graphicFrame`) or drawn shapes |
| X9 | Motion as data with a final state | ✅ `BlockMotionSpec` + recipe parts + preset keyframes + `slideTimeline` timing; final = tree | map presets to PPTX entrance effects (fade→`fade`, fade-up→`fly`/`float in`, wipe→`wipe`, pop→`zoom`, draw/sweep→`wipe` approx, count-up→none (final value), ambient→drop); targets need X2 part ids |
| X10 | Connectors as endpoint + route data | ❌ (B2) | specify `ConnectorSpec` with ids and sides from day one → `p:cxnSp` |
| X11 | Fonts declared | ✅ families resolved per style (`styles/*.ts` `FONTS`) | export needs font embedding or theme fonts; Inter/Fraunces/… availability is a delivery check |
| X12 | Composition must not depend on DOM-only layout | ✅ containers are pure geometry | keep it so: no CSS flex/grid in any new container |

---

## C. Design guidance from the reference libraries

Legend: ✅ we already do it · ◐ partly · ❌ not yet. Rules are restated short; source in brackets.

### C1. ppt-master (`skills/ppt-master/references/*`, `docs/*`)

| # | Rule | Status |
|---|---|---|
| P1 | Safe area 40 px of 1280 (= 60 of 1920) margins; title band ≈ 100/720, footer ≈ 40/720 [executor-base "layout structures"] | ✅ 96-unit margins (stricter) |
| P2 | Starting structures by relationship: one focal claim = column 800–1000/1280 (≈ 1200–1500/1920), 40–60 % empty; equal comparison 1:1 with 40–60 gap; **dominant evidence + takeaway = 3:7 or 2:8**; parallel sequence = 3 columns, 30–40 gap; hub 200–300 + 4–6 satellites; wide visual ≥ 55 % of the field [executor-base] | ◐ layouts exist; no 3:7 "evidence + takeaway" composition pattern, `section-stack` ≤ 1200 matches the focal-column rule |
| P3 | "Repeating symmetric card grids without a page job is the failure mode" — prefer a page field / outline carrier before uniform cards [executor-base:86, shared-standards-core §6 Containers] | ❌ cards are our default content device |
| P4 | Peer containers share treatment; unequal weight only for unequal information [core §6] | ◐ composites yes; hand composition unchecked (cmp1 card 3 would differ only if F1 were fixed — which is then a rule to enforce) |
| P5 | Fewest type roles; consolidate near-neighbour sizes [core §6] | ◐ fixtures: 3 distinct sizes per slide typical, max 6 (`st_09` big-stat 256/72/56/44/28/22; histogram over 202 slides {1:7, 2:28, 3:99, 4:22, 5:36, 6:10}) |
| P6 | Leading: titles 1.2–1.3, dense body 1.4–1.5, body 1.5–1.6, airy 1.6–2.0 [core:184] | ◐ token line heights; not gated |
| P7 | Alignment drift > 4 px on a shared grid line is a defect; N-card row spacing must not differ by > 5 % [visual-review S4, S5] | ❌ not checked (cmp1 hero numbers 11 units apart) |
| P8 | Text over a complex image needs a scrim; contrast < 4.5 (small) / < 3.0 (≥ 24 px) is a hard fail [visual-review H4] | ❌ F6 |
| P9 | Shadows: 2–3 floating objects per page at most; peers flat; `dy 4–8`, opacity 0.06–0.10 (max 0.20) [executor-base effects] | ◐ AC4 `elevation` per deck surface; no per-slide count |
| P10 | Colour 60-30-10; accent on the key number/word, not everywhere [executor-base] | ◐ style `rules` (luxury, corporate, swiss "one accent"), critic-only |
| P11 | Image overlays: directional scrim `0.88 → 0.30 → 0`, bottom fade `0 → 0.72`; never a uniform flat wash [executor-base] | ◐ `image-full` `scrim: gradient` (AC8); cover scrim |
| P12 | Breathing page after a dense page; a `breathing` page must not hold a ≥ 3 rounded-card grid [executor-base, visual-review S10] | ◐ `rhythm` field exists (`types.ts:1061`), unused by the picker |
| P13 | Device menu: numbered circle/badge, KPI card, takeaway box (tint 0.06–0.10), accent rule 2–4 px, icon 32–48 px with label, quote block, timeline strip, callout/leader line, elevated primary object [executor-base:51-71] | ◐ most exist as composites; numbered badge, leader line, icon disc missing (A4) |
| P14 | Lines: dash `8,4` for flow connectors, `4,4` separators, hairline dividers at 0.2–0.3 alpha, `marker-end` arrowheads [executor-base] | ❌ no dash in `Stroke` |
| P15 | Inline emphasis: bold primary colour on numbers and 1–2 load-bearing nouns, never connectives [executor-base] | ◐ `TextRun.bold/color`; statement `emphasis` |
| P16 | Animation off by default; transition fade 0.4 s; lifecycle before effect; anchor animation on top-level groups [docs/animations.md] | ✅ 05-motion §5.5 adopted |
| P17 | Visual review = hard rules H1–H9 (bounds, overflow, overlap, contrast, collision, missing element) + soft S1–S10, 1 iteration, rollback on new hard hit [visual-review] | ✅ oracle covers H1–H3, H6; ❌ H4 |

### C2. transitions.dev (`skills/transitions-polish/SKILL.md`)

| # | Rule | Status |
|---|---|---|
| T1 | Token scale durations 40/80/150/250/350/400/500, `smoothOut` default, bounce for entrances only | ✅ identical tokens (`motion/tokens.ts`) |
| T2 | Stagger 40 ms/item (80 for a few large items); **total ≤ ~300 ms**, cap long lists | ◐ J5 allows ≤ 120 ms/item; designed lint `motion/stagger-total` (> 400 ms) not built |
| T3 | Travel scales with ceremony: text 4–12 px, > 40 px only for panels (×3 on our frame → 12–36, > 120 = panel) | ✅ base 24 = 8 px ×3 |
| T4 | Pre-scale 0.96–0.99; below ~0.9 reads as zoom | ✅ (count-up's old 0.7 zoom removed in RVM3) |
| T5 | Blur 2–3 px only on swaps/slides/text reveals, never on a plain fade | ✅ `stagger-lines`/`words-in` 3 px |
| T6 | Closes faster/quieter than opens; never bounce or delay a close; trim duration before adding delay | ✅ adopted §5.5 (we have no exits) |
| T7 | Match on usage, not nearest number | ✅ preset per role |

### C3. ui-ux-pro-max (`~/.claude/plugins/cache/ui-ux-pro-max-skill/ui-ux-pro-max/2.13.0/`)

| # | Rule (data file) | Status |
|---|---|---|
| U1 | Slide type scale by content: hero statement 120/32/14, metric callout 96/18/12, data insight 48/20, feature grid 28/16/12, quote 36/18 italic, title-only 80/24 — i.e. **primary : secondary ≈ 3–4 : 1**, weight 700/400 (`design-system/data/slide-typography.csv`, px at 1280) | ◐ our ratios similar (display 152 vs body 28 ≈ 5.4); weight not modelled (X3) |
| U2 | Feature grid 3–6 cards, metrics dashboard 3–4 KPIs, gap 16–24 px (24–36 at 1920) (`design/references/slides-layout-patterns.md`) | ◐ kpi-row 2–5, cards 2–4 |
| U3 | Card variants: icon-left, accent-bar, metric, avatar, pricing (same file) | ◐ cards `lead` icon/number/image; no accent-bar card |
| U4 | Animate 1–2 key elements per view; transform/opacity only; reduced motion = final readable state (`ux-guidelines.csv` Animation rows) | ◐ subtle/expressive; no per-slide hero count |
| U5 | Stagger ≤ ~8 children, ≤ 0.1 s/item; no overshoot on dense data; split-text only for headlines < 8 words (`motion.csv` rows 5, 7–9) | ◐ `words-in` on titles any length |
| U6 | Body line length 65–75 characters; line height 1.5–1.75 (ux-guidelines Typography) | ❌ no measure cap (cmp1 body ~37 cpl ok; a full-width body at 1728 ≈ 110 cpl) |
| U7 | Chart choice by data relationship + "direct labels, never colour alone" (`charts.csv`, 25 types) | ✅ chart blocks label directly; 7 kinds in chart-insight |
| U8 | Narrative layout logic: hook → split-hero 70 % visual; agitation → full-bleed stat 100 % text (`slide-layout-logic.csv`) | ◐ recipe roles; no emotional-beat mapping |

---

## D. Recommendations (ranked)

Ranked by (beauty × safety gained for the LLM) / work. "S" = small, "M" = medium, "L" = large.

### D1. Make composition correct and honest before teaching it (blockers)

1. **CMP0 — nested style & defaults plumbing (S–M).** `layoutChild` reads `spec.style` (fallback `props.$block.style` for the composites); a solid card surface becomes the children's surface context (so ink solves on the card); compile fills schema `defaults` + style `blockDefaults` under nested props too (or every block defaults its own option props — fix `tls.t.takeaway` either way); one depth limit shared by validator and engine, and a `block/dropped` oracle error for any `lint/depth-overflow` node. Settle `BlockSpec.children` vs `props.children` (document one, validator maps the other). Fixes F1, F3, F4.
2. **CMP1 — style fields: implement or remove (S).** Implement `radius`, `elevation`, `tone` (outline/ghost/filled) for the card-like containers via `cardNodes`, and `gap` for containers; drop `density` (or map it to gap/padding scale). Make the digest list only fields that act. Fixes F2.
3. **CMP2 — oracle sees inside containers (M).** Report children as sub-blocks (`id` path `g/c1/c1b`), run pair checks among siblings, carry child ids in findings, and add composition checks: `layout/misaligned` (shared baselines/tops of peers drift > 4 units, ppt-master S4), `layout/unequal-peers` (siblings of a row/grid differ in painted size > 5 %, S5), `layout/narrow-child` (a text child < ~12 chars/line or < 240 units wide), `block/dropped`, `nesting/too-deep` (> 3 for the LLM), `type/too-many-sizes` (> 5 distinct sizes; today max 6, typical 3), `accent/overuse` (accent-coloured text/fill leaves > 1–2 per slide, style-dependent), and **`contrast/low`** (every text leaf vs the paint actually under it, incl. images = needs a scrim; ppt-master H4). Each with a numeric fix, like LO findings.
4. **CMP3 — layered composition inside containers (M).** Give `tls.l.overlay` per-child `anchor` (reuse LO2.1 placement on the overlay's box) and let a child declare `layer` inside overlay/card; allow `anchorTo` a nested id (badge on card 2). Add `bleed: true` for backdrops (decoration may leave the frame without `slide/overflow`). A layered image marks its region `overImage` so text solves light ink or demands a scrim.

### D2. Make composing cheap for the LLM (variety without free-form risk)

5. **CMP4 — composition patterns as data (M, highest payoff).** Like recipes, a small library of *parametric spec templates* (`CompositionPattern { id, slots, build(slots, knobs) → BlockSpec }`, cf. `defineCompositeBlock`) that the LLM names and fills: e.g. `cards-n/{icon,number,body}`, `evidence-takeaway 7:3`, `photo-scrim-title {bottom-left|left|center}`, `stat-stack + chart`, `numbered-steps-row`, `quote-on-field`, `kpi-row + sparkline`, `bento 2+1/1+2/hero+3`. Each pattern × each style is compiled by a spec like `recipes.spec` (0 errors, 0 warnings, quality clean, contrast clean). Patterns plug into the variety picker as more `RecipeVariant`s. This yields many designs per role at near-zero prompt cost and keeps the "picker owns the look" decision (ai-curation §8.7).
6. **CMP5 — free composition, gated (M).** Allow the LLM a constrained grammar: containers `stack|row|grid|split|card|overlay`, depth ≤ 3, ≤ 6 leaves per container, element-scope atoms only, peers must be the same type (a row of 3 cards, not card+chart+title), style limited to `surface` role / `tone` / `radius` / `emphasis` names. Validator enforces the grammar; oracle (D1.3) judges the geometry; failures fall back to a pattern.
7. **CMP6 — atoms (S each).** `tls.t.badge` (pill label, anchorable), `tls.t.marker` (numbered circle / big numeral), icon `disc` variant on `tls.m.icon`, `tls.m.shape` with centred label (circle/rounded/hexagon), `Stroke.dash` + `tls.x.rule` `dash`. Promote kicker, hero-number, icon, badge to tier 1 only if budget allows (see below).

### D3. Motion and connectors, with the web / export split built in

8. **CMP7 — connectors (M–L).** `SlideSpec.connectors[]` by block id + side + route (B2), compiled to `line`/`path`+marker overlay nodes after layout, oracle checks (unresolved id, crosses text, endpoints overlap), `draw-path` after the later endpoint's reveal, `p:cxnSp`-ready data. Needs X2 (ids on nested wrappers).
9. **CMP8 — nested motion (S–M).** Let a child's own part recipe play inside a container (hero-number count-up in a card), sequenced inside the container's stagger; cap total stagger at 300 ms (T2) and build the §5.9 lints `motion/stagger-total`, `motion/too-many-heroes`, `motion/always-on` as oracle findings.
10. **CMP9 — export-ready contract (S now, exporter later).** Do X1, X2, X3 (`align`, `weight` on text nodes), X5 alpha parsing helper, X6 clip policy, and wire the default `blocks` callback for `renderPageToSvg` (Q9 step 3) so static export shows real blocks. Record per node kind its PPTX mapping and fidelity (stable / approximate / bake) in a table in this phase's README; the exporter itself stays deferred (product-owner decision). Recommend the python-pptx-on-FastAPI route fed by a JSON node dump (no new `packages/` dependency).

### D4. Before real LLM content generation starts

11. **Contrast and over-image gate** (D1.3 + D1.4) — the most visible defect class the oracle cannot see today.
12. **Measure cap**: body text wider than ~75 characters per line → `text/long-measure` info with a fix (narrower column or larger size).
13. **Honest digest**: remove phantom style fields; add a 1-line composition grammar to the S2a header only when D1 is done; never teach a feature the engine ignores.
14. **A composition contact sheet** in the calibration harness (one page per pattern × 10 styles) judged by eye once, like AC8's sheets; the dry run gains a seed path through patterns so variety numbers can be re-measured (≥ 70 % seed difference must hold).

### Prompt-budget implications

- Tier-1 index is full (16,994 / 17,000). Composition must not go there as prose. Options, cheapest first: (a) patterns appear as extra `looks:` ids on existing recipe lines (≈ 10–15 chars each; ~40 patterns ≈ 0.6k → needs the header trimmed or the ceiling raised to 18k with a recorded decision); (b) a **composition card** (~1.5–2.5k: grammar, containers, the 6 atoms with size hints, layer/anchor-in-overlay, connector syntax) sent only in the S2b detail call when the picker chose a pattern or "compose" (detail budget 12k is at 11,987 → the card needs its own allowance, e.g. detail ≤ 14k when composing); (c) atom detail via `capabilityDigest({types})` costs ~0.9k per atom (6.3k for 7) — send only the atoms a pattern uses.
- S2a own-role prompt has ≈ 1.2k headroom (13.8–14.8k of 16k): enough for a pattern list per role, not for the grammar.
- Every finding added to the oracle lengthens the repair prompt; keep messages ≤ 1 line with a numeric fix and group repeated peer findings ("3 of 3 cards: …").

---

## Appendix — reproduction

```
node tools/layout-report/cli.js <scratchpad>/survey/cmp1-grid-cards.json        # oracle text report
node <scratchpad>/survey/probe.js  <scratchpad>/survey/cmp3-split-stack.json      # validate + quality gate
node <scratchpad>/survey/probe2.js <scratchpad>/survey/cmp1-grid-cards.json       # editor-path node dump
node <scratchpad>/survey/sweep.js                                                 # 131 blocks, option slots removed
```
Tier-1 index dump: `<scratchpad>/survey/tier1-index.txt` (16,994 chars). Type-size histogram and SVG
feature census: inline `node -e` scripts in this session (analyzeDeck over
`__fixtures__/styles/*.json`; `renderNodeToSvg` over the same decks via `contextForBlock`).
