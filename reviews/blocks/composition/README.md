# Composition — the LLM composes many good-looking slides from existing blocks

**Date:** 2026-10-10 · **Branch:** `plan/block-system` · **Against commit:** `23673e8e` (survey)
**Status:** CMP1, CMP2 done (2026-10-10); CMP3 paused mid-phase (2026-10-10, user stop) — resume from Notes — CMP3. Resume from [§6 Progress](#6-progress).
**Factual base:** [SURVEY.md](SURVEY.md). Every finding id below (F1–F12, X1–X12, P/T/U rules,
D1–D14) points into it. Read it before any phase.

**Goal (product owner, 2026-10-10, translated).** Beyond the 45 tier-1 blocks and their knobs, the
LLM must be able to build **many more beautiful designs by composing the parts** (containers,
atoms, layers, anchors, connectors), easily and safely. Motion like a line drawing from one block
to another or a number counting up plays on the web; static output (PNG/SVG today, PPTX later)
shows the final frame. The PPTX exporter itself is **deferred**, but everything built now must make
it easy to add later. Before any real LLM content generation, the output must be something we are
proud of.

**Read before any phase:** this file; [SURVEY.md](SURVEY.md); [../README.md](../README.md)
governing rules (one layout + two renderers, spec-not-pixels, colours as roles, additive schema
only); [../ai-curation/README.md](../ai-curation/README.md) §6 (machine rule, vocabulary rule) and
§8 (variety picker, quality gate); [../layout-oracle/README.md](../layout-oracle/README.md);
[../block-review/MOTION.md](../block-review/MOTION.md); [../BACKLOG-visual.md](../BACKLOG-visual.md)
§2 (commands, ratchets); [../BACKLOG-visual-fix.md](../BACKLOG-visual-fix.md) §1 (rules).
Reference libraries (design sources only, never imported): `ppt-master/`, `transitions.dev/`, the
ui-ux-pro-max skill data under `~/.claude/plugins/cache/ui-ux-pro-max-skill/`.

---

## 1. Decisions

1. **Correct before taught.** The engine silently ignores nested style (F1), five style fields
   (F2), depth > 4 (F3) and schema defaults (F4). The LLM is never shown a feature the engine
   ignores. CMP1 fixes the engine, CMP2 makes the oracle see the result, and only CMP4 teaches it.
2. **Patterns first, free composition second.** The main source of new designs is **composition
   patterns**: parametric spec templates the LLM names and fills, checked against all ten styles
   like recipes. They plug into the variety picker as more designs per role. Free composition is
   allowed under a closed grammar, checked by the oracle, and falls back to a pattern when it fails.
   This keeps "the picker owns the look" (ai-curation §8.7) and costs almost no prompt.
3. **No coordinates for the LLM.** `free[]` stays banned for the model (LLM-ARCHITECTURE §6 rule 4).
   Composition goes through regions, containers, layers, anchors and connectors by **block id**.
4. **Motion is data, the rest state is the final frame.** Every preset already ends at rest (J3).
   Connectors and nested motion follow the same rule. Static export = the laid-out tree.
5. **Export-ready, exporter deferred.** CMP1 and CMP3 implement the export-ready contract (X1–X12)
   wherever they touch code. A PPTX mapping table (node kind → DrawingML, fidelity stable /
   approximate / bake) is written in CMP5. The recommended later route is python-pptx on the
   FastAPI side, fed by a JSON node dump (no new `packages/` dependency).
6. **Gate numbers are not lowered** to let a composition pass; the composition is fixed instead.

---

## 2. Phases

Five phases, run **one at a time** by one subagent each. Model per phase: **opus** for geometry,
renderers, oracle, motion and visual work. **sonnet** for docs, prompt text and data-only work
with a detailed brief (memory: *subagent model choice*).

| Phase | Model | Scope | Survey refs |
|---|---|---|---|
| CMP1 | opus | Engine: nested composition is correct and export-ready | F1–F4, F7, F12, D1.1, D1.2, D1.4, X1–X3, X5, X6, X9 (ids), X12 |
| CMP2 | opus | Oracle and quality gate see inside compositions | F5, F6, D1.3, D4.11–12, P5, P7, P8, U6, T2 |
| CMP3 | opus | Atoms, connectors, nested motion | F8, F11, A4, B2, D3.7–9, P13, P14, X10 |
| CMP4 | opus | Composition patterns, free-composition grammar, picker, digest, contact sheets | D2.5–6, D4.13–14, P2, P3, P12, U1–U3 |
| CMP5 | sonnet | Docs and hand-off: LLM-ARCHITECTURE, PPTX mapping table, authoring guide, readiness report | X1–X12 table, D4 |

### CMP1 — Engine: nested composition is correct and export-ready (opus)

- **Nested style.** `layoutChild` reads `spec.style`, falling back to `props.$block.style` for the
  composites. The validator stops warning on the composites' `$block`. A solid card or container
  surface becomes the surface context of its children, so text ink solves against the card.
- **One children slot.** Document `props.children` as the canonical slot. The validator maps
  `BlockSpec.children` onto it (or rejects it with a clear message). No silent second path.
- **Defaults.** The compiler and the oracle fill schema `defaults` and style `blockDefaults` into
  nested props as they already do at the top level. Fix `tls.t.takeaway` (F4) and add a sweep spec
  proving every built-in lays out with its option slots removed.
- **One depth limit.** The validator and engine share one constant. A dropped subtree is an
  oracle **error** `block/dropped`, never an empty group with no finding.
- **Style fields honest.** Implement `radius`, `elevation`, `tone` (`filled | outline | ghost |
  inverted | gradient`) for card-like containers through `cardNodes`, and `gap` for containers.
  Drop `density` from the digest, or map it to the gap/padding scale. The digest lists only fields
  that act.
- **Layers inside containers.** `tls.l.overlay` children take `anchor` (LO2.1 placement on the
  overlay box) and `layer`. `anchorTo` accepts a nested block id (badge on card 2 of a grid).
  Backdrops take `bleed: true` (may leave the frame without `slide/overflow`). A layered image
  marks its region `overImage`, so text solves light ink or the oracle asks for a scrim.
- **Export-ready contract, the parts that live in the engine:**
  - X1: a headless `layoutSlide(spec, ctx) → { nodes, blocks }`.
  - X2: every `layoutChild` wrapper group carries `blockId` and `type`; part names stay stable.
  - X3: text nodes carry `align` and `weight` (additive; the per-line fallback stays).
  - X5: an alpha-parsing helper for `rgba()` and 8-digit hex.
  - X6: a documented clip policy.
  - Q9 step 3: a default `blocks` callback for `renderPageToSvg` so static export shows real
    blocks instead of placeholders.
- **Done when:**
  - The survey probe decks (`cmp1`–`cmp5`, re-created under `__fixtures__/composition/`) render
    as intended in both renderers. Parity probes are added for nested style, overlay anchors and
    bleed.
  - Every built-in passes the defaults sweep.
  - `cli.js` is clean on all style fixtures and showcases, the dry run reports 0 errors, and
    targeted jest passes. Before/after PNGs of the probe decks have been looked at.

### CMP2 — Oracle and quality gate see inside compositions (opus)

- **Children as sub-blocks.** Children of containers become sub-blocks in `analyzeSlide`, with id
  paths (`g1/c2/b1`) in every finding. Pair checks (overlap, collision, occlusion) run among
  siblings.
- **New findings,** each with a numeric fix in the LO style:
  - `layout/misaligned`: peers' shared tops, baselines or left edges drift by more than 4 units
    (P7/S4).
  - `layout/unequal-peers`: painted sizes in a row or grid differ by more than 5 % (S5).
  - `layout/narrow-child`: a text child under about 12 characters per line, or under 240 units
    wide.
  - `nesting/too-deep`: more than 3 levels for LLM-authored specs.
  - `type/too-many-sizes`: more than 5 distinct text sizes on a slide (P5).
  - `accent/overuse`: more accent-coloured text or fill leaves than the style allows (P10).
  - **`contrast/low`**: every text leaf is checked against the paint actually under it, including
    images and gradients, at 4.5:1 for small text and 3:1 for 24 px or larger at 1280 (P8/H4).
    Text over an image needs a scrim.
  - `text/long-measure`: body text over about 75 characters per line (U6), reported as info with a
    fix.
- **Motion lints from 05-motion §5.9:**
  - `motion/stagger-total`: a stagger group longer than about 300–400 ms in total (T2).
  - `motion/too-many-heroes`: more than 1–2 showy reveals on one slide (U4).
- **Quality gate.** It runs these checks, and S4.1 repair messages stay one line each, grouped
  ("3 of 3 cards: …").
- **Done when:**
  - Every new finding has a positive and a negative spec case.
  - The 30 dry-run decks, all style fixtures and the showcases still report 0 errors.
  - New warnings found on existing designs are **fixed in the block** (contrast in particular),
    not suppressed. Any that remain are listed in Notes with a reason.
  - The survey's cmp decks now produce the expected findings (card 3 contrast, row6 narrow
    child, deep5 dropped, overlay title without scrim).

### CMP3 — Atoms, connectors, nested motion (opus)

- **Atoms (A4, P13).** Each atom ships with both renderers, a size card, motion, parity probe,
  digest line and conformance:
  - `tls.t.badge`: pill label, anchorable.
  - `tls.t.marker`: numbered circle or oversized numeral.
  - `tls.m.icon` `disc` variant: tinted circle behind the icon.
  - `tls.m.shape`: circle, rounded box or hexagon with a centred label.
  - `Stroke.dash` (`8,4` flow, `4,4` separator), plus a `dash` knob on `tls.x.rule`.
- **Connectors (B2, X10).**
  - Additive `SlideSpec.connectors?: ConnectorSpec[]`:
    `{ id, from: { block, side? }, to: { block, side? }, route: straight | elbow | curved,
    head: end | both | none, tone, weight, dash?, label? }`.
  - Endpoints are block ids, nested ids included (needs CMP1 X2).
  - The connector is compiled after layout into an overlay `line` / `path` node with a marker.
    `path` gains an end marker, or a `polyline` node is added; both renderers and parity are
    covered.
  - Oracle: `connector/unresolved`, `connector/crosses-text` for non-endpoint text,
    `connector/too-short`, and endpoints overlapping.
  - Motion: `draw-path` plays after the later endpoint's reveal, about 400 ms with smoothOut, and
    the arrowhead fades in at the end. The rest state is fully drawn.
  - The data maps 1:1 to PPTX `p:cxnSp` later.
- **Nested motion (F11).**
  - A child's own part recipe plays inside its container's stagger, for example a hero-number
    count-up inside a card, or a progress ring sweeping inside a bento tile.
  - Total stagger is capped at about 300 ms (T2).
  - The frame probe J1–J8 (MOTION.md) passes for every new atom and connector, and for a
    nested-motion fixture.
  - Static output = final frame (J3).
- **Done when:** atoms and connectors are in `BUILT_IN_BLOCKS` and the digest (tier 2, or tier 1
  only if the budget allows; see §4), the fixtures `__fixtures__/composition/connectors.json` and
  `nested-motion.json` are clean, the motion probe passes, the PNGs and a short motion capture or
  frame strip have been looked at.

### CMP4 — Patterns, grammar, picker, digest, contact sheets (opus)

- **Composition patterns.** About 25–40 named, parametric spec templates,
  `CompositionPattern { id, role(s), slots, knobs, build(slots, knobs) → regions }`.
  - Each pattern is grounded in a reference rule:
    - ppt-master relationship structures (P2): focal column, 1:1 comparison, evidence +
      takeaway 7:3 / 8:2, 3-column parallel sequence, hub + satellites, wide visual ≥ 55 %.
    - ppt-master device menu (P13).
    - ui-ux-pro-max slide patterns and type ratios (U1–U3).
  - Examples: `cards-n/{icon|number|marker}+title+body`, `evidence-takeaway`,
    `photo-scrim-title/{bottom-left|left|center}`, `stat-stack+chart`, `numbered-steps-row` with
    connectors, `hub-satellites` with connectors, `quote-on-field`, `kpi-row+sparkline`,
    `bento/{2+1|1+2|hero+3}`, `timeline-strip`, `before-after-arrow`,
    `badge-on-card-highlight`.
  - Not every pattern is a uniform card grid (P3).
  - Each pattern × each of the 10 styles compiles clean through the CMP2 oracle and gate
    (0 errors, 0 warnings, contrast clean) in a `patterns.spec`.
- **Picker.**
  - Patterns become more designs per role in the variety picker (signatures, `avoidSignatures`,
    asset filter).
  - The picker uses `rhythm`: a breathing slide after a dense one (P12).
- **Free-composition grammar (D2.6).**
  - Containers allowed: `stack | row | grid | split | card | overlay`. Depth ≤ 3, ≤ 6 leaves per
    container, element-scope atoms only.
  - Peers in a row or grid must share a type.
  - Style limited to the honest fields (CMP1), connectors by id.
  - The validator enforces the grammar. A failing free composition falls back to the nearest
    pattern.
  - A **random-composition dry run** (a few hundred grammar-valid compositions × 10 styles)
    reports the gate pass rate. Every rejected class is either fixed or written down.
- **Digest.**
  - Pattern ids go on the recipe lines as `looks:`. If the 17k tier-1 ceiling must rise, the
    decision is recorded with numbers.
  - A **composition card** (≤ 2.5k: grammar, containers, atoms with size hints, layer/anchor in an
    overlay, connector syntax) goes only into the S2b detail call when composing, under its own
    budget.
  - No feature the engine ignores is taught.
- **Contact sheets.** One page per pattern × 10 styles in the calibration harness, plus the dry
  run re-run with patterns. The lead judges every sheet by eye.
- **Done when:**
  - Every role has ≥ 8 distinct designs per style (was 2–8 recipes+variants).
  - Seeds differ on ≥ 85 % of slides (was ≥ 75 %).
  - The 30 dry-run decks report 0 errors and 0 quality findings.
  - The free-composition pass rate is reported, with rejected classes listed.
  - The lead marks no sheet "not proud of it".

### CMP5 — Docs and hand-off (sonnet)

- **LLM-ARCHITECTURE.** S2a/S2b get patterns, the composition card and the grammar; S4.1 gets the
  new findings; S5 critic rubric additions (alignment, contrast, rhythm); §6 keeps the `free[]`
  ban.
- **PPTX mapping table.** One row per node kind and per motion preset: DrawingML target, and
  fidelity stable / approximate / bake (from SURVEY §B3 and the ppt-master mapping). Also covers
  the JSON node-dump format (`cli.js --tree`, if CMP1 added it) and the recommended FastAPI +
  python-pptx route.
- **`guides/blocks-authoring.md`.** New sections "Adding a composition pattern", "Adding an atom"
  and "Connectors".
- **Readiness report (§5 below).** Every item checked against the tree with evidence.
- Progress, session log and notes in this README; CLAUDE.md pointer.

---

## 3. Vocabulary this plan adds (approved once here)

`BlockStyleSpec.tone/radius/elevation/gap` become **active** (no new names); `density` is removed
from the digest or mapped; `BlockSpec.bleed?: boolean`; overlay child `anchor`/`layer` (existing
names, new place); `anchorTo` accepts nested ids; `LayoutNode` group `blockId?`, `type?`; text
node `align?`, `weight?`; `Stroke.dash?: number[]`; `layoutSlide`; findings `block/dropped`,
`layout/misaligned`, `layout/unequal-peers`, `layout/narrow-child`, `nesting/too-deep`,
`type/too-many-sizes`, `accent/overuse`, `contrast/low`, `text/long-measure`,
`motion/stagger-total`, `motion/too-many-heroes`, `connector/unresolved`,
`connector/crosses-text`, `connector/too-short`; block types `tls.t.badge`, `tls.t.marker`,
`tls.m.shape`; `tls.m.icon` value `disc`; `tls.x.rule` knob `dash`; `SlideSpec.connectors`,
`ConnectorSpec` (`from`, `to`, `side`, `route: straight|elbow|curved`, `head: end|both|none`,
`tone`, `weight`, `dash`, `label`); `CompositionPattern`, `COMPOSITION_PATTERNS`, pattern ids;
composition grammar validator rule ids `grammar/*`. Everything optional and additive;
`TldrawApp.version` stays 16. Anything else a phase needs is added here first, in the same commit.

**Added by CMP1 (engine-internal or export API; none is LLM-facing spec vocabulary):**
`MAX_NESTING_DEPTH` (the existing validator constant, now exported from `types.ts` and shared with
the engine); `layoutChild(spec, box, opts?)` with `opts.surface` / `opts.overImage` (how a container
tells a child what it painted under it — needed for "a solid card surface becomes the children's
surface context"); `CreateLayoutContextOptions.blockDefaults` / `nestLevel` / `authoredBlock` /
`authored` (carry the style knob defaults and the authored nesting level through a layout pass);
`imageSurface()` (`tokens.ts`); `$block.overImage` (compiled shape meta, never authored — how a
layered image backdrop "marks its region"); `BlockReport.bleed` (report field mirroring
`BlockSpec.bleed`); `layoutDeck`, `layoutPage`, `defaultBlockSvg`, `LaidOutSlide`, `LaidOutBlock`,
`LayoutSlideContext` (the X1 / Q9 export API next to `layoutSlide`); `parseColorAlpha` (X5);
`Deck.blockRegistry` (the registry the default export callback lays blocks out with); CLI flag
`cli.js --tree`.

**Added by CMP2 (engine-internal; none is LLM-facing spec vocabulary):** the paint model
`layout/paint-model.ts` (`collectPaint`, `PaintOp`, `InkLeaf`, `backgroundsAt`, `inkContrast`,
`floorOf`, `CONTRAST_FLOOR`, `arcPoints` moved here) and the ink guard `layout/ink-guard.ts`
(`guardInk`, `GLASS_MARGIN`, `surfaceBase`, `opaqueHex`) — needed so accent parts are contrast-solved on
the paint actually under them (open item a); `CreateLayoutContextOptions.literalInks` /
`paintSurface`, `SURFACE_PAINTERS`, `isAuthoredContext` (layout-child; paint an authored
`style.surface`, open item b; pack only authored cards, item c); `tls.l.stack` internal prop `pack`
(set by card/section on their `$stack`, not in the schema); `SurfaceContext.place` (where a block
sits on a slide gradient); `LayoutNode` text/icon `solved?: true` and `PosterText.color` (an html
template paints the guard's colour); `isColorRole` exported from `tokens.ts`.
Oracle side: `design-checks.ts` (`inspectBlock`, `designFindings`, `DESIGN_CODES`,
`DESIGN_THRESHOLDS`, `ACCENT_BUDGET`, `SHOWY_PRESETS`, `accentUses`); `SubBlockReport`,
`BlockReport.children`, `TextLeafReport.block`; `AnalyzeSlideOptions.background` / `theme` /
`motionStyle` / `family` / `llmAuthored` (how "LLM-authored" is signalled: the AI pipeline's S4.1 —
`dryRun.ts` — passes it; CLI flag `cli.js --llm`); quality gate `QualityFinding.code` widened to the
design codes.

**Added by CMP3:** `ConnectorEnd` / `ConnectorSide` (the type names of `ConnectorSpec.from`/`to` and
`side`, values exactly as listed above plus `auto`, the default); `ConnectorSpec.tone` values
`line | accent | text` and `weight` values `hairline | md | bold` (the `tls.x.rule` words; a connector
needs a recessive default and the text colour, not a gradient); `ConnectorSpec.dash` and the
`tls.x.rule` `dash` knob are booleans (the pattern is the engine's: flow `[8,4]`-like, separator 1:1);
`RULE_DASH` (rule layout constant). `tls.m.icon` knob name `iconStyle` (the value `disc` needs a
knob; `iconStyle` is the name `tls.m.icon-list` / `tls.c.feature-grid` already use for the same
idea), atoms' knobs `tone` (`solid | soft | outline`, the `tls.t.tags` values), `size`
(`sm | md | lg`), `variant` (`circle | numeral`, marker), `shape` (`circle | rounded | hexagon`,
shape) and the content slots `text` / `icon` / `value` / `label`; `library/text/_engine/atom.ts`
(`atomPaint`, `chipRadius`, `behindColor`, `isSharpStyle`). **Connectors:** block type
`tls.g.connector` (the compiled form of one connector — one overlay shape each, so both renderers,
motion, Present and export handle it with no new node kind; AI-hidden) with compiler-filled props
`fromBox` / `toBox` / `fromRound` / `toRound`; `connectors.ts` (`CONNECTOR_BLOCK_TYPE`,
`connectorMotion`, `connectorProps`, `connectorFromBlock`, `findBlockSpec`, `isRoundBlock`),
`layout/connector-route.ts` (`connectorRoute`, `CONNECTOR_WEIGHT`, `MIN_CONNECTOR_LENGTH`,
`polylineHitsBox`, …), `resolveConnectorEnd` (compiler), compile rule `connector/unresolved`;
validator rules `connector/malformed`, `connector/duplicate-id`, `connector/unresolved`;
`LayoutReport.connectors` / `ConnectorReport`; digest `CONNECTORS_LINE`; motion `dashedDraw`.
**Nested motion:** DOM attributes `data-nested-id` / `data-nested-type` on a nested block's wrapper
(`data-block-id` is taken by DeckViewer's shape wrapper); `play-reveal.ts` `STAGGER_CAP_MS`,
`cappedStagger`, `NESTED_PART_PRESETS`, `authoredChildIds`, `rememberBlockDefinition` (called by
`BlockRegistry.register`).

---

## 4. Budgets and machine rule

- **Prompt:** the tier-1 index is at 16,994 of 17,000 characters and the S2b detail at 11,987 of
  12,000 (SURVEY §A3). Composition never goes into the tier-1 index as prose. Pattern ids go on
  recipe `looks:` (~0.6k) and the composition card into detail only. Raising a ceiling is a
  recorded decision with numbers.
- **Machine (binding, ai-curation §6):** WSL ~4.9 GB, no swap.
  - One subagent at a time.
  - jest **targeted only**, from `packages/tldraw` with `--maxWorkers=1`.
  - One tsc at a time; never jest/tsc while Chromium runs.
  - Check `free -m` before heavy steps and stop if available < 1200 MB. Kill strays by PID.
- **Git:**
  - Never `git stash`, `checkout`, `restore`, `reset` or `add -A`; stage explicit paths.
  - Never touch `packages/tldraw/src/components/DeckViewer/DeckViewer.tsx` or
    `packages/tldraw/tsconfig.tsbuildinfo` (back the latter up before tsc and restore it after).
  - Commit in small pieces, `CMP<n>: <what>`, ending with
    `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The lead pushes.
- **Tests:** never weakened. A changed expectation is a deliberate behaviour change and is listed
  in the phase notes.

---

## 5. Readiness before real LLM content generation (checked in CMP5)

These items make the first LLM decks good rather than merely valid. Each is owned by a phase above
or recorded as open.

1. Contrast and over-image text are gated (CMP2), the most visible defect class today.
2. Alignment and equal peers are gated (CMP2), so compositions look designed, not assembled.
3. Measure cap and type-size count (CMP2), so text reads well at any width.
4. Honest digest (CMP1, CMP4): no phantom fields; patterns and grammar are taught only once they
   work.
5. Variety numbers re-measured with patterns (CMP4): ≥ 8 designs per role per style, seeds differ
   ≥ 85 %.
6. Contact sheets of every pattern × style judged by the lead (CMP4).
7. Static export shows real blocks (CMP1 default `blocks` callback), so thumbnails and PNG export
   match the editor.
8. Motion: connectors draw after their endpoints, count-up inside cards, stagger ≤ ~300 ms
   (CMP3, CMP2).
9. **Golden briefs:** a set of about 10 real briefs (Vietnamese and English; business, teaching,
   pitch) with expected roles, written as fixtures for the later FastAPI eval (LLM-ARCHITECTURE
   §10). Data only; CMP5 (sonnet).
10. **Vietnamese typography check:** diacritics, line height and width tables on the composition
    sheets (AC3 fixture extended). CMP4.

---

## 6. Progress

| Phase | Status | Commit | Notes |
|---|---|---|---|
| Survey | ✅ 2026-10-10 | `23673e8e` | [SURVEY.md](SURVEY.md) |
| CMP1 | ✅ 2026-10-10 | `4c7f43a4` `c327fb3e` `383b60d2` `b7a53735` `a2f6299e` + docs | [Notes — CMP1](#notes--cmp1) |
| CMP2 | ✅ 2026-10-10 | `603c94ec` `ea701dab` `3fd665dd` `dab86d1a` `223a68df` `6c32b303` `1b34acbb` `46ac51c5` `27c6fcb1` + docs | [Notes — CMP2](#notes--cmp2) |
| CMP3 | ⏸ paused 2026-10-10 | `67e0f750` `51a3c927` `99c37666` `59ed922e` `26819966` `7e69b725` + docs | [Notes — CMP3](#notes--cmp3): built + tested; left: motion probe J1–J8, PNG sheets (connectors ×3 styles, frame strips), parity chunk run, notes numbers |
| CMP4 | — | | |
| CMP5 | — | | |

### Session log

| Date | Session | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-10 | survey + plan | SURVEY.md; this plan | Start CMP1 (opus). Read SURVEY §0 and §A first. |
| 2026-10-10 | CMP3 (opus subagent), paused by the user | atoms (badge, marker, shape, icon disc), `Stroke.dash` + rule `dash`, connectors (spec → compiled overlay shape, route, oracle, validator, round trip, draw-on motion), nested motion + 300 ms stagger cap, bento lead tile, fixtures `connectors.json` / `nested-motion.json`; WAAPI driver fixes | Resume CMP3 from Notes — CMP3 "Resume steps". |
| 2026-10-10 | CMP2 (opus subagent) | oracle inside compositions (sub-blocks, id paths, sibling pairs) + 10 design checks + gate; paint model + ink guard; painted `style.surface`; authored cards pack; safe inset on full-bleed; block fixes (bento, steps, comparison, image-full, html kicker/value/icon colours); fixture `cmp6-design-checks` | Start CMP3 (opus). Read Notes — CMP2 "Open" first: the guard's glass margin and the bento/steps look changes want the lead's eye. |
| 2026-10-10 | CMP1 (opus subagent) | engine: nested style, surface pass-down, one depth limit + `block/dropped`, style knob defaults nested, honest style fields, overlay anchors/layers, nested `anchorTo`, `bleed`, `overImage`; export contract X1/X2/X3/X5/X6 + default `blocks` export + `cli.js --tree`; fixtures `__fixtures__/composition/cmp1–cmp5`; parity probes | Start CMP2 (opus). Read Notes — CMP1 "Open for CMP2" first: the contrast cases it lists are real and visible on the fixture PNGs. |

### Notes — CMP3

**Status: paused by the user mid-phase.** Code, specs and fixtures below are committed and pass their
targeted specs; the visual / motion verification and the final numbers are not done.

**Built (commits):**
- `67e0f750` `Stroke.dash` (both renderers: path/line `stroke-dasharray`, rect SVG dash / DOM
  `border-style: dashed`), `tls.x.rule` knob `dash` (equal dashes, a stroked path in the same box and
  part), `ConnectorSpec` / `SlideSpec.connectors` types.
- `51a3c927` atoms `tls.t.badge` (overlay, anchor top-right, pill or square tag by the style's radius),
  `tls.t.marker` (disc 48/72/104 or oversized numeral), `tls.m.shape` (circle / rounded / hexagon,
  centred label + optional icon), `tls.m.icon` `iconStyle: disc`; shared `library/text/_engine/atom.ts`
  (tones solid/soft/outline; doodle/memphis ink border, memphis hard shadow, glass frosted soft). All
  aiTier 2; tier-1 index 16,993 ≤ 17,000 (paid for by trimming three header phrases); size cards
  regenerated; catalog count 131 → 135.
- `99c37666` connectors: each connector is compiled **after layout** into one overlay
  `tls.g.connector` shape (AI-hidden block type: renderers, Present, motion and export need no new
  node kind). Endpoints by block id incl. nested ids (painted box via the X2 wrapper); sides auto /
  explicit; straight (level when facing, else centre line; round ends clipped to the circle), elbow
  (rounded corners), curved (one cubic); stealth arrowheads on a gap off the box; label pill.
  Decompiler returns them to `SlideSpec.connectors`; validator rules `connector/malformed`,
  `connector/duplicate-id`, `connector/unresolved`; oracle `connector/unresolved` (error),
  `connector/crosses-text`, `connector/too-short` (also endpoints overlapping), `LayoutReport.connectors`;
  JSON schema; full digest `## Connectors` section. Motion: joins the later endpoint's build step
  (`withPrevious`, order + 0.5, delay = its delay + duration), `draw-path` 400 ms smoothOut, head fades
  in at ~280 ms; subtle = fade; static = none. **Engine bugs found and fixed:** the WAAPI driver (the
  viewer's default) wrote keyframes as `clip-path` / `stroke-dashoffset` — WAAPI ignores hyphenated
  names, so every wipe and draw-on played nothing and those parts stayed hidden; a replayed draw-on
  read its own `L L` dash as an authored dash. Dashed strokes now draw on by growing the dash
  pattern (`dashedDraw`, proxy tween).
- `59ed922e` `connectors.spec.ts` (21 tests).
- `26819966` nested motion: a container playing its showy preset plays its *authored* children's
  data / draw part reveals (`NESTED_PART_PRESETS`: count-up, sweep, draw, grows, …) starting with the
  container part that carries the child; DOM wrappers carry `data-nested-id` / `-type`; definitions
  known via `BlockRegistry.register`; settle covers nested parts; every indexed family's stagger is
  capped at 300 ms (`STAGGER_CAP_MS`); `motion/too-many-heroes` counts nested heroes (path ids).
  Bento: the largest point tile (≥ 1.5× every other text tile) takes its own bigger step, the others
  share theirs with body-size small text (≤ 5 sizes with the slide title; doodle st_09 "Teams, not
  users" 44 → 68). Fixtures `__fixtures__/composition/connectors.json` (7 slides: straight, flow of 4,
  hub + satellites, elbow fan-in, curved dashed with label, nested endpoints, bad slide) and
  `nested-motion.json` (3 slides). `nested-motion.spec.ts` (6 tests).
- `7e69b725` WAAPI `onUpdate` reads the animation's own eased progress (count-up follows a slowed
  timeline; a cancelled tween ends on its final value).

**Verified so far:** tsc production 0, spec 329. Targeted jest at `26819966`/`7e69b725`, all green:
rule, badge, marker, shape, icon(+list/label) (102+36), catalog-conformance + digest + block-metrics +
defaults-sweep + layout-report + decompiler + validator + compiler + deck-document + layout-layers +
motion (2223), connectors (21), nested-motion (6), motion + design-checks + motion-m2..m5 + render-dom +
registry + motion-showcase + composition-engine (988), bento + design-checks (48 → +2 bento), motion
dir after the onUpdate change (267). `cli.js`: all 19 `__fixtures__/styles` decks and showcases 0 errors
0 warnings; `connectors.json` clean except the bad slide's 4 intended findings (unresolved bad2,
crosses-text bad1, too-short bad3 overlap, too-short bad4); `nested-motion.json` clean. Dry run: 30
decks 0 errors 0 warnings, only the 10 pre-existing `quality/sparse` repairs. PNGs looked at (in
`/tmp/claude-1000/…/scratchpad/cmp3/`): `atoms-10-styles.png` (before the shape label-size fix) and
`connectors-corporate.png` (lines draw and rest fully drawn after the WAAPI fix).

**Deliberate behaviour changes:** wipes / draw-ons now actually play under the WAAPI driver (they
were invisible-then-snapped-by-settle or stuck hidden); stagger families longer than 300 ms step
faster; bento lead tile bigger; `layout-layers.spec` lists badge + connector as overlay; catalog count
135; digest snapshots; full digest gains `## Connectors`; three tier-1 header phrases trimmed.

**Resume steps (in order):**
1. Re-render and look: `scratchpad/harness/` (`build.js OUT decks.json`, `sheet.js OUT sheets.json DEST`,
   `gen-atoms.js`, `gen-fixture.js OUT name cols composition/connectors.json:<style>:<theme>`,
   `gen-connectors.js` / `gen-nested.js` regenerate the fixtures). Atoms × 10 styles again (shape label
   sizing changed), connectors in corporate + glass + doodle, nested-motion; fix what is not beautiful.
2. Frame strips 0/25/50/75/100 % of a connector draw-on and a count-up in a card: CDP
   `Animation.setPlaybackRate(0.1)` on the live viewer (`window.live(deck)` in the harness bundle),
   screenshot on a schedule (the onUpdate change makes the count follow the slowed timeline).
3. Motion probe J1–J8 (MOTION.md) for the 4 atoms, `tls.g.connector`, and the nested-motion fixture,
   `static,subtle,expressive,reduced` — the probe's in-page sampler (`motion-probe.js installSampler`)
   works on the harness viewer too; the WAAPI fix changes what wipes/draws do in every block, so a
   wider re-probe (chart, decoration, process) is advisable.
4. Parity chunks: `parity.spec`, `parity-3way.spec`, `composition-parity.spec`, plus
   `src/blocks/library` composites/data/diagram suites and `state/render`, `state/deck`, `components`
   (expect only `BlockInserter.spec` and the DeckViewer retreat test to fail, both pre-existing).
5. ESLint on changed files; record numbers; finish this note (PPTX mapping below is drafted).

**PPTX mapping (draft for CMP5):** connector → `p:cxnSp` (`stCxn`/`endCxn` idx: top 0, left 1,
bottom 2, right 3), straight/elbow/curved → `straightConnector1` / `bentConnector3` /
`curvedConnector3`, heads → `a:tailEnd`/`a:headEnd type="triangle"`, dash → `a:prstDash dash`, weight
→ `a:ln w` (units × 9,525 EMU); a nested endpoint has no PPTX shape: use the compiled `fromBox`/`toBox`
as a free connector. Atoms: badge/marker/shape → `prstGeom roundRect`/`ellipse`/`hexagon` with a text
body; icon disc → ellipse + icon picture/freeform. Motion: connector draw → `wipe` (approximate),
nested count-up → none (final value), stagger → sequential entrance delays.

**Open:** the connector shape's bbox catches clicks over blocks in the editor (editor-only); a nested
`tls.t.body size: subheading` in a packed card reports `text/overflow` +3 units (pre-existing
measure/pack mismatch, avoided in the fixture); `motion/stagger-total` still measures the authored
recipe (the engine now caps at 300 ms); composites' internal (non-authored) children never get nested
motion by design.

### Notes — CMP2

**What was built** (commits `603c94ec` engine, `ea701dab` block fixes, `3fd665dd` oracle + gate,
`dab86d1a` engine follow-ups, `223a68df` fixtures, `6c32b303` specs + parity, `1b34acbb` size cards,
`46ac51c5` / `27c6fcb1` guard tuning, then this docs commit):

- **Sub-blocks (F5).** `inspectBlock` (`design-checks.ts`) matches the wrapper groups `layoutChild`
  stamps (`blockId`/`type`) to the authored specs in every `blocks` slot, so a container's own
  internal wrappers (`$stack`, a composite's spec tree) stay part of their block. `BlockReport.children`
  lists them (`g1/c2/b1`, level, layer, box, painted), every text leaf names its owner
  (`TextLeafReport.block`), `text/overflow` names the child, and the text report prints one indented
  line per child (≤ 12). Pair checks (overlap / collision / occlusion by layer) run among siblings
  with the child paths; a child whose own text leaves its box is a `text/overflow` naming it.
- **Paint model** (`layout/paint-model.ts`): paint ops in paint order (fills with alpha × group
  opacity, gradients sampled per point, path fills as flattened polygons, images / opaque hosts as
  "unknown" = both black and white), inks (text and icon leaves with sample points). `contrast/low`
  composites every ink down through every block below it to the slide background (`theme:` colours
  resolved; a decoration's image — a pattern's grain tile — is a texture, not a photo).
- **Report on the real page.** `analyzeDeck` passes the slide background (own, else the style
  master's), the theme, the motion style and the style family; blocks are laid out on that surface as
  the editor lays them out (the report used a white surface for every deck before).
- **Design checks and the gate.** All in `design-checks.ts`, thresholds in `DESIGN_THRESHOLDS` /
  `ACCENT_BUDGET` (tighten only):

| code | sev | threshold |
|---|---|---|
| `contrast/low` | error | text < 4.5:1, large text (≥ 36 units, bold ≥ 28) and icons < 3:1, on the actual paint; photo = black and white; ink alpha × opacity < 0.3 is decoration (skipped); backdrop / style-master blocks skipped |
| `layout/misaligned` | warning | peers (same type, children of row / grid) side by side: matching text tops drift > 4 units; stacked in a column: start-aligned left edges > 4. Fix names the earlier leaf whose line count differs |
| `layout/unequal-peers` | warning | peers side by side: box (a card: painted) widths or heights spread > 5 % |
| `layout/narrow-child` | warning | nested text child wrapping (≥ 2 lines) at < 12 chars/line or in < 240 units; fix = peers per row at the width that gives 12 chars |
| `nesting/too-deep` | warning | `llmAuthored` only (S4.1 / `dryRun.ts` sets it, CLI `--llm`): authored level > 3 (region block = 1) |
| `type/too-many-sizes` | warning | > 5 distinct sizes on the slide (within 1 unit = one); fix merges the closest pair |
| `accent/overuse` | warning | blocks / nested children painting the accent (same hue ±12°, lightness ±0.25; a block counts once) > premium 4, professional 6, modern 6, playful 10 (no style 6); mono accents skipped |
| `text/long-measure` | info | wrapping text ≤ 40 units over 75 chars/line; fix = width for 75 |
| `motion/stagger-total` | warning | one part's step × (items − 1) > 400 ms (reveal motion: own, else the slide style's) |
| `motion/too-many-heroes` | warning | > 2 blocks with a `count-up` / `words-in` / `sweep` reveal |

  Peer findings are one line, grouped: "3 of 3 card in d2r (d2c1, d2c2, d2c3): …". `slideQuality`
  returns every non-info design finding as a gate finding (`QualityCode` widened); `dryRun.ts`'s
  geometry `bad()` leaves them to the gate so nothing counts twice.
- **CMP1 open items, fixed in the engine and the blocks (not by silencing):**
  a. **Ink guard** (`layout/ink-guard.ts`): after a slide-level block is laid out, every text / icon
     leaf failing its floor on the paint under it is re-solved along its hue (`solveForContrast`),
     up to three rounds against the new worst background; ink that vanished (< 1.5:1) goes to 7:1.
     Never an authored literal (`literalInks`: what an *authored* block asked `resolveColor` for as a
     literal — a composite's derived colours are fair game). Over a bare photo it does nothing (the
     report asks for a scrim); over a scrimmed photo it solves against both extremes. On a slide
     gradient it samples under each leaf (`SurfaceContext.place`). Over glass or on a gradient page it
     keeps 50 % headroom (`GLASS_MARGIN = 1.5`): a block cannot see the style master's glows painted
     between page and block. Html posters: a solved leaf is marked `solved` and the hero / kinetic /
     big-stat / feature-grid templates paint the poster colour for it (`posterText().color`).
  b. **Painted `style.surface`**: an authored `style.surface` on a block that does not paint it
     itself (not card / section / overlay / field / takeaway / hero) is a `surface` rect behind it,
     hugging the content (+ horizontal padding), radius from `style.radius`; its content solves ink
     on it (a dark translucent `scrim` over a photo keeps the photo surface: ink light). Export-
     friendly: a plain rect / gradient node. Parity probe added. A composite's `$block.style` surface
     stays a context, never painted.
  c. **Packing**: an *authored* `tls.l.card` / `tls.l.section` packs its children at their natural
     heights from the top (centre / end per `style.align`) instead of scaling them to fill
     (`tls.l.stack` internal `pack`). Composites' cards are untouched (geometry diff over all fixtures,
     showcases and the 30 dry-run decks: only the composition fixtures and the deliberate block
     changes below moved).
  d. **Safe inset**: a region block with a non-`fill` anchor and no `anchorTo` is anchored inside the
     slide's safe area (`contentArea`): identity everywhere except `full-bleed`.
  e. `c5_row6` → `layout/narrow-child` ("at most 3 per row at this size").
- **Block fixes for findings on existing designs:** bento text tiles share one type step (6 sizes
  on a slide → ≤ 5; P4), step numbers within 15 % of the body size are set at the body size (30 → 28),
  comparison stagger 60 → 40 ms (9 items = 320 ms), image-full `scrim: gradient` holds 0.62 alpha over
  the whole text column before fading (text read at ~0.4 alpha on tall titles).

**Numbers.** Findings the new checks raised before the fixes (measured during the session, first-pick
designs of the 30 dry-run decks, round-1 repairs): `contrast/low` 26, `accent/overuse` 24 (then a
per-part metric; 0 under the final per-block metric), `type/too-many-sizes` 8, `motion/stagger-total`
4; 19 style fixtures + showcases: `contrast/low` 65 (13 once pattern grain stopped counting as a
photo), `accent/overuse` 15 (part metric), `type/too-many-sizes` 10, `motion/stagger-total` 3. After:
**0** on both (`cli.js` 0 errors 0 warnings on all 19; dry run 30 decks 0 errors, 0 warnings, 0
quality findings, output and all 30 decks **byte-identical** to the baseline, variety table
unchanged — seed difference not lower; only the 10 pre-existing `quality/sparse` repairs remain).
Composition fixtures (analysed as LLM-authored), exactly as `design-checks.spec` pins: `c2_photo`
2 × `contrast/low` (overlay kicker and title on the photo, no scrim), `c5_deep6` too-deep, `c5_deep7`
`block/dropped` + too-deep, `c5_row6` narrow-child, and one finding per bad slide of the new
`cmp6-design-checks` deck (`d_card3` contrast — the survey's "card 3", now a pinned literal ink —,
`d_misaligned`, `d_unequal`, `d_deep`, `d_sizes`, `d_accent`, `d_measure` info, `d_motion` stagger +
heroes); `cmp1`, `cmp3`, `cmp4`, `c2_overlay`, `c2_bleed`, `d_scrim_ok` clean. The four demo
fixtures (not gated) gain warnings — tour 5, colorful 17, demo 1, motion-showcase 3 — mostly
`motion/stagger-total` on long lists and catalogue slides that put 7+ accent blocks on one page.
Calibration (DOM harness, 37 slides of the touched decks incl. all composition fixtures): table line
breaks vs the browser **0 mismatches**, html parts 0 line-count mismatches (as before). tsc
production 0, spec 329 (= ceiling); ESLint on every changed file 0 errors. Targeted jest
`--maxWorkers=1`, all at the final HEAD: `src/blocks/*.spec` 43 suites / 1871; `src/blocks/library`
147 suites / 5446 (4 skipped, pre-existing); motion + layout + styles + pipeline + icons +
state/render + state/deck + components 45 suites, 977 passed, **2 failed**: `BlockInserter.spec`
(pre-existing, fails at `421162a9`) and `DeckViewer.spec` "retreating into an auto build step…" —
caused by the **uncommitted** `DeckViewer.tsx` edit in the working tree (its new `retreat` skips auto
steps), not by CMP2; CMP2 never touched that file.

**Deliberate behaviour changes (each pinned by a spec or a regenerated artefact):**
1. Ink colours change wherever derived ink failed contrast on what is painted under it (240 slides
   of the fixtures and dry-run decks change a colour; no geometry): e.g. doodle's orange big
   numbers (2.2:1 on paper) are a deeper orange, coral icons and accent kickers on light pages
   darker, light labels on an orange gantt bar dark, glass muted text a little lighter.
2. Authored cards / sections pack their children (size card `tls.l.card`: `fill` → container
   height; block-metrics regenerated). Only the composition fixtures move (no other fixture, showcase or
   dry-run deck has an authored multi-child card); geometry elsewhere moves only on the bento (`st_09`,
   `content-bento`) and steps slides of item 3–4.
3. Bento: one shared headline step (`swiss` / `doodle` / `editorial` … `content-bento` slides: the
   point tile's headline and body step down to the quote tile's size).
4. Steps numbers 30 → 28 units; comparison stagger 40 ms; image-full gradient fade darker over text.
5. `analyzeDeck` lays blocks out on the real page background (colours in the report's tree match
   the editor); report findings gain the design codes; text report prints nested children.
6. Region anchors on `full-bleed` keep the 96-unit safe margin (`c2_photo`'s kicker and title move).
7. Fixtures: `cmp1` lost its `style.accent: 'text'` and `gap: 'lg'` workarounds, `cmp2`'s kicker
   padding workaround, `cmp3` the hero caption (6 sizes); `c2_overlay`'s kicker sits on a scrim.

**Pictures.** Before (`b59c2fd0`, scratch worktree) | after, DOM through the calibration harness:
`/tmp/claude-1000/…/scratchpad/cmp2/ba/*.png` (37). Looked at: composition fixtures (cards packed,
card-3 icon light without the workaround, overlay kicker on a small scrim label, `d_scrim_ok` title on
a scrim panel), doodle bento and big stat, glass cover, luxury-ivory cover, memphis image-full fade,
minimal steps, swiss bento, surfaces-glass pricing.

**Open, named (for CMP3 / CMP4 or the lead):**
- `GLASS_MARGIN = 1.5` is a heuristic: a block's guard cannot see the style master's glows. The
  clean fix composites the master paints into the page surface (`deckLayoutContext`); not done.
- The bento shared step makes a large point tile read sparse (small headline in a big tile); the
  lead should judge `content-bento` on a contact sheet (CMP4).
- Doodle's signature orange numbers are now visibly deeper (contrast); a lead call whether the
  palette's accent should change instead.
- Nested motion (F11) is not built: children's own reveals do not play inside containers, so
  `motion/too-many-heroes` counts slide-level blocks only — CMP3 must count nested heroes once it
  plays them, and cap stagger in the engine (T2).
- `accent/overuse` budgets were set from the designed decks (none exceed them); catalogue demo slides
  do. `text/long-measure` stays info.
- The parity harness still pairs DOM/SVG by part name (CMP1 note); the two new probes keep parts unique.
- Html templates paint a guard-solved colour only for the parts listed (hero kicker, kinetic kicker
  and subtitle, big-stat value, feature-grid icons); another html part the guard re-solves would
  differ DOM vs poster — the census over all fixtures and dry-run decks found no other.

### Notes — CMP1

**What was built** (commits `4c7f43a4` engine, `c327fb3e` digest, `383b60d2` export contract,
`b7a53735` fixtures + parity + light ink over photos + page parenting, `a2f6299e` JSON schema +
parity-3way, then this docs commit):

- **Nested style (F1).** `layoutChild` reads a child's `BlockSpec.style` (the composites' private
  `$block.style` stays as a fallback; `spec.style` wins key by key). `measureIntrinsicSize` now
  measures a child with *its own* style and nesting level — it used the container's context, so a
  padded container added its own padding to every child it measured. The validator no longer
  calls `$block` an unknown prop.
- **Surface pass-down.** `layoutChild(spec, box, { surface })`: `tls.l.card`, `tls.l.section` and
  `tls.l.overlay` pass the paint they drew (a translucent glass fill passes what is behind it), so
  a child's text solves against the card — an inverted or accent card gets light ink.
- **One children slot.** `props.children` is the slot; a non-empty block-level `children` is a
  validator error (`block/malformed`, message names `props.children`; the subtree is still
  validated). An empty `children: []` is not flagged; `tls.g.steps`' example lost its stray one.
- **One depth limit (F3).** `MAX_NESTING_DEPTH = 6` (types.ts) for validator and engine. The engine
  counts **authored** levels only: a spec is authored when it came out of an authored block's
  `blocks` slot (tracked by identity per layout pass), so a composite's own spec tree and a card's
  inner `$stack` stay on their author's level (a 6-deep tree ending in a stat-card draws). 32
  layout hops remain a recursion safety net. A dropped child is an empty `lint/depth-overflow`
  group carrying `blockId`/`type`; the report calls it **`block/dropped`** (error, names the child).
- **Defaults (F4).** `tls.t.takeaway` with no tone paints `accent` (it painted `undefined12` in the
  editor and threw in the report, which blanked a whole split). The deck style's `blockDefaults`
  reach authored nested children through `layoutChild` (option `blockDefaults`, set by the
  compiler, the report, `deckLayoutContext` and `useBlockLayoutContext`) — exactly what the
  compiler fills into a slide-level block, so a block looks the same at any level
  (`defaults-sweep.spec` compares nested vs top for every style × type pair). **Deviation from the
  plan text:** schema `defaults` are *not* filled at any level. They are the gallery's sample
  content (a timeline's four example events, `alternate: true`); filling them changed a nested
  timeline's look against the same block at the top (`colorful-blocks-demo` sl_34 moved 72 units
  in the first attempt) and would inject sample text. Instead `defaults-sweep.spec` lays out every
  built-in (all 131 at the top, the 115 non-slide-scope ones also nested) with its option slots removed, and fails on a
  throw, `undefined`/`NaN` in the tree, or a nested tree that differs from the top-level one
  (nested html hosts' colour `vars` excepted, by design). All pass.
- **Style fields honest (F2).** `tone` (`filled | outline | ghost | inverted | gradient`),
  `radius` (token or units) and `elevation` (0/1/2) restyle `tls.l.card` and `tls.l.section`
  through `cardNodes` (`library/layout/_style.ts`); `gap` (token or units) spaces the children of
  stack, row, grid, card (its inner stack), section, repeater, split and sidebar (gutter). With no
  style field a container paints byte-identically. `density` is gone from the digest (kept in the
  type, marked deprecated); the digest's style section says where each field acts and is shorter
  than before.
- **Layers inside containers (F7).** `tls.l.overlay` children take `anchor` (natural size at that
  anchor, inset `space.lg`, or the overlay's own `style.padding`; sized by two probes so a padded
  card wraps as measured) and `layer` (paint order backdrop → content → overlay; motion parts keep
  the authored order). A child painted over an image child sits on an image surface. `anchorTo`
  may name a block nested inside a stacked region block (the compiler finds its wrapper group by
  `blockId`): the fixture's badge sits on card 2 of a grid. `BlockSpec.bleed: true` on a backdrop:
  no `slide/overflow`, not counted in the slide margins. A layered `tls.m.image` backdrop marks its
  region's stacked and overlay shapes `$block.overImage`; editor, deck context and report then use
  an image surface, and **foreground roles solve light over a photo** (text near-white, 18:1 against
  black; before, the mid-grey 0.5 luminance guess kept dark ink on photos).
- **Export-ready contract.** X1 `layoutSlide(spec, { deck, registry })` / `layoutDeck` /
  `layoutPage`: the editor's own path (`deckSpecToDocument` → `contextForBlock` → `layoutBlock`) at
  rest, one group per block at its absolute box with `blockId`/`type`, plus `blocks[]` with id,
  type, box, layer, z and props (X8). X2: every `layoutChild` wrapper group carries `blockId` and
  `type`. X3: text nodes carry `align` where centred/end text is emitted per line (`text-place`,
  composites' `alignText`) and `weight` (700 when every run is bold, else 400, set by
  `layoutSlide`); renderers ignore both. X5: `parseColorAlpha` (`#rgb`, `#rrggbb`, `#rrggbbaa`,
  `rgb()`, `rgba()`, `transparent`). X6: clip policy on `LayoutNode` group `clip` — rectangle only;
  an exporter pre-clips (crop images with `srcRect`, intersect rects, bake the rest). **Q9 step 3:**
  `defaultBlockSvg(doc, page, registry)`; `Deck.getThumbnail` / `exportSlidePng` draw real blocks
  with no host callback (a host callback still wins; an unknown type still draws the placeholder;
  `<Tldraw blockRegistry>` reaches the Deck). Found on the way: `deckSpecToDocument` left every
  compiled shape at `parentId: 'page'`, and `renderPageToSvg` draws only page children, so a
  compiled deck exported **blank** — shapes are now parented to their page (the parity-3way test
  that pinned the blank output was rewritten, see below). `cli.js --tree` prints `layoutDeck` as
  JSON (68 KB for the 10-slide corporate fixture) — the input for the later python-pptx exporter.

**Fixtures and pictures.** `__fixtures__/composition/` (generated, then committed):
`cmp1-grid-cards` (accent card with an icon/body styled light; five card tones; a badge
`anchorTo` card 2), `cmp2-backdrop-overlay` (full-bleed image backdrop + overlay kicker and title;
`tls.l.overlay` with a backdrop photo, an inverted caption card bottom-left and a kicker
top-right; a bleeding orb), `cmp3-split-stack` (split [stack(hero-number, tone-less takeaway),
bar]), `cmp4-defaults` (minimal style: a nested tone-less takeaway takes the style's muted tone,
`$block` channel, explicit tone wins), `cmp5-stress` (overflowing card, 6-deep drawn, 7-deep
`block/dropped`, six titles in a row). Rendered before (`421162a9`, a scratch worktree) and after,
DOM through the calibration harness (`DeckViewer`) and SVG through `renderPageToSvg` +
`defaultBlockSvg` in headless Chromium; all looked at. Before → after: card 3 accent (was identical
to its siblings), tones visible (were five identical grey cards), badge on card 2 (was on card 3,
the grid's top-right), photo title light (was dark ink), overlay photo with anchored caption card
and kicker (was a grey panel with the children stacked at the top-left), takeaway with its accent
bar and tint (was bare text), 6-deep drawn (was blank). DOM and SVG agree on every slide (the SVG
page has no background where the DOM shows the theme's off-white; gradient angle in a non-square
card differs slightly — both pre-existing). Calibration on the 72 text leaves of these decks:
table line breaks vs the browser 0 mismatches.

**Numbers.** tsc production 0, spec 329 (= ceiling). ESLint on every changed file: 0 errors.
Targeted jest, all `--maxWorkers=1`, all green except one pre-existing failure:
layout/validator/compiler/report/anchor/layers/bridge/decompiler/takeaway (37 suites, 669),
composites (36, 1165, 3 skipped pre-existing), defaults sweep (320), composition engine (15),
digest + conformance + recipes (1796; digest snapshot updated), layout-slide + Deck (56), text +
composites + render-dom/svg + renderPageToSvg + deck-document + round-trip + tour (64 suites, 1731),
tokens/surface/layout library/media/ComponentUtil (43, 1074), composition parity (6), parity +
parity-3way + nested host + shadow + html posters + motion (18 suites, 956), pipeline + recipes +
dry-run + slide-layouts + block-metrics + data/diagram/chrome libraries + conformance + misc
(74 suites, 3618, 1 skipped). The one failure, `components/BlockInserter/BlockInserter.spec.tsx`
(`app.useStore is not a function` in `useDeckTokens` under the gallery test's mock app), fails
identically at `421162a9` (1 failed / 23 passed there). `cli.js`: all 19 `__fixtures__/styles` decks
and showcases 0 errors 0 warnings (unchanged); the four demo fixtures keep their findings;
geometry diff against the baseline: only the four `colorful-blocks-demo` stacks with a numeric `gap`
(see behaviour changes). Dry run: output and all 30 decks byte-identical to the baseline (0 errors,
0 warnings, variety table unchanged). Size cards and the tier-1 index unchanged (their specs pass);
only the digest markdown snapshot changed.

**Deliberate behaviour changes (each with its test):**
1. Depth: 6 authored levels draw (was 4 layout hops, silently blank — composites spent hops);
   deeper is `block/dropped`. `layout.spec` "rejects depth 5" became "rejects an authored child
   past MAX_NESTING_DEPTH" + "a block-built child is not a level".
2. Non-empty `BlockSpec.children` is an error. `validate-deck-spec.spec` "a tls.g.timeline inside a
   tls.l.card validates clean" used it (the card rendered empty while the validator said clean) and
   now uses `props.children`.
3. A stack honours a numeric `gap` (a section's inner stack and authored numeric gaps were
   silently `md`): `colorful-blocks-demo` sl_07/13/14/17 stacks move 0–9 units.
4. Children of a card/section/overlay solve ink against its fill; text over a photo solves light.
5. `measureIntrinsicSize` measures a child with its own style, not its container's.
6. `deckSpecToDocument` parents shapes to their page; `parity-3way.spec`'s first export test pinned
   the blank export and now asserts the placeholder for each block.
7. `Deck` thumbnails / PNG export draw real blocks by default.
8. Text nodes may carry `align` (additive; no spec compared trees with it).

**Open for CMP2 (and later), named:**
- **Accent-role parts are not contrast-solved**: an icon, kicker or hero-number unit in `accent`
  vanishes on an accent card or a photo (the fixtures set `style.accent: 'text'` on those children
  to look right). `contrast/low` must check every leaf against the paint under it.
- **A title's `style.surface` role is not painted** (F6): the photo title has no scrim; "year" sits
  on a white blob in `c2_photo`. CMP2 asks for a scrim; CMP4's `photo-scrim-title` paints one.
- **Stacks scale children to fill** (A4): cards with icon + number + body leave voids between them
  (`c1_accent`, `c1_tones`) — a packing/top-align mode is not in CMP1.
- **Region anchors have no safe inset** in `full-bleed` (a kicker at the frame edge); the fixture
  uses the kicker's own `style.padding`.
- **Six titles in a row** (`c5_row6`) still wrap mid-word with no finding — `layout/narrow-child`.
- The parity harness pairs DOM and SVG elements by **part name**; children with the same part
  names in one probe cannot be compared, so the CMP1 probes keep leaf parts unique (one card per
  tone). A per-occurrence pairing would let CMP3 probe whole compositions.
- `BlockStyleSpec.density` stays in the type (deprecated, not read; the validator does not warn).
- `useDeckTokens`' `app.useStore` mock gap in `BlockInserter.spec` (pre-existing, above).
