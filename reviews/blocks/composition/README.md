# Composition — the LLM composes many good-looking slides from existing blocks

**Date:** 2026-10-10 · **Branch:** `plan/block-system` · **Against commit:** `23673e8e` (survey)
**Status:** planned. Resume from [§6 Progress](#6-progress).
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
| CMP1 | ⏳ next | | |
| CMP2 | — | | |
| CMP3 | — | | |
| CMP4 | — | | |
| CMP5 | — | | |

### Session log

| Date | Session | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-10 | survey + plan | SURVEY.md; this plan | Start CMP1 (opus). Read SURVEY §0 and §A first. |
