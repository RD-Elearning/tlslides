# Block library expansion — overview & progress

**Started:** 2026-10-03 · **Branch:** `plan/block-system` · **Base commit:** `3804688e`
**Goal:** grow the catalog from 41 to ~120 blocks. Every block gets a semantic **category**, a
**shortDescription** and a **scope**, so an AI planner can pick the right block from a compact
index without reading 120 full slot tables, and a user can browse the gallery by intent
("I need a timeline") rather than by rendering family ("diagram").

**This file is the resume point.** To continue later: read §Rules, open the
first phase in §Phases that is not ✅, and in that phase file take the first block whose status is
⬜. When you finish a block, tick it in the phase file *and* update the counts in §Progress below.

| File | What it holds |
|---|---|
| [00-review.md](00-review.md) | Audit of the 41 blocks that exist today: gaps, overlaps, metadata quality, hard limits |
| [01-taxonomy.md](01-taxonomy.md) | The category vocabulary, the new metadata fields, writing rules for `shortDescription`, and the category mapping for all 41 existing blocks |
| [P0-foundation.md](P0-foundation.md) | Metadata fields + gates, two-tier AI digest, category gallery, icon-set expansion, shared engines (chart, table, connector, radial) |
| [P1-text-lists.md](P1-text-lists.md) | Text, list and emphasis blocks (11) |
| [P2-data.md](P2-data.md) | Metrics, charts and tables (24) |
| [P3-diagram.md](P3-diagram.md) | Process, timeline, hierarchy, relationship and comparison diagrams (21) |
| [P4-media-people.md](P4-media-people.md) | Images, brand, people and decoration (11) |
| [P5-composite.md](P5-composite.md) | Slide-scope and group composites: cover, divider, closing, dashboard, team, quiz… (14) |
| [P6-chrome.md](P6-chrome.md) | Slide furniture: header, footer text, logo mark, progress, section tabs, rule… (7) |

---

## Rules (read before writing any code)

These rules repeat or point to the repo's binding rules. They are not optional.

1. **Read first:** [../CURRENT-STATE.md](../CURRENT-STATE.md) (file anatomy, wiring, "before
   writing a new block"), [../block-authoring/README.md](../block-authoring/README.md) §Pitfalls
   (deep-merge, `$block`, children channels, depth cap, byte-identical fixtures, tsc gate), and
   [../BACKLOG-visual.md](../BACKLOG-visual.md) §2 (commands, OOM guard, quality ratchets).
2. **A block not in `BUILT_IN_BLOCKS` does not exist.** Wire it and bump `EXPECTED_BLOCK_COUNT` in
   `library/catalog-conformance.spec.ts` in the same commit.
3. **Never invent vocabulary.** The closed sets are: `ColorRole` (12 roles in `types.ts`),
   `LayoutNode.k` (8 kinds: group, rect, path, text, image, icon, line, host), `SlotType.kind` (12),
   motion presets (`motion/presets.ts`: 30 ids), `BlockFamily` (8), and, after P0,
   `BlockCategory` and `BlockScope`. A block that seems to need a new value **stops** and records
   the need in its phase file's "Blocked" column. Only P0 adds vocabulary.
4. **Prefer the cheapest build path.** `composite` (`defineCompositeBlock`, no layout math), then
   `layout` (hand-written Tier A `layout()`), then `html` (Tier B) only when CSS is genuinely
   required. Every block entry in the phase files names its path.
5. **Additive schema only.** Never rename or remove a block type, slot or option value that is
   already shipped. Fixing a bad name means adding the right one and steering the AI away from the
   old one via `describe.avoid`.
6. **Gates per block:** `tsc` production count = 0 (run it from `packages/tldraw`, see the command
   below), the block's own spec + `catalog-conformance.spec.ts` + `capability-digest.spec.ts` pass.
   **Gates per phase:** one full suite, one screenshot pass of the phase's demo slide with the PNG
   actually opened (`tools/visual/shoot.js`).
7. **Commit once per block** (or per small group of siblings that share an engine, at most 4),
   message `L<phase>: <type>[, <type>…]`. Fill the phase file row with the hash.

### Gate commands (verified 2026-10-03 with pnpm)

```bash
# from repo root, once
COREPACK_ENABLE_STRICT=0 pnpm install
node node_modules/playwright/cli.js install chromium-headless-shell   # parity specs need it

# from packages/tldraw
node_modules/.bin/tsc --noEmit --emitDeclarationOnly false | grep -v '\.spec\.' | grep -c 'error TS'   # must print 0
../../node_modules/.bin/jest src/blocks/library/<family>/<block-dir> src/blocks/library/catalog-conformance src/blocks/capability-digest
../../node_modules/.bin/jest      # full suite: once per phase; kill stray parity-worker processes first
```

> `npx jest` inside `packages/tldraw` resolves the wrong jest. Use the hoisted binary above.
> Check that `tsc` exists before trusting a `0`. A missing binary also makes `grep -c` print 0.

---

## Phases

| Phase | Scope | New blocks | Depends on | Status |
|---|---|---|---|---|
| **P0** | Foundation: metadata fields, conformance gates, backfill 41 blocks, two-tier digest, category gallery, icon set ×8, shared engines | 0 (+1 option on `tls.d.bar`) | — | ✅ P0.1–P0.9 done (one P0.5 box open) |
| **P1** | Text, lists, emphasis | 11 | P0.1–P0.3 | ⬜ |
| **P2** | Metrics, charts, tables | 24 | P0.1–P0.3, P0.6 (chart), P0.7 (table) | ⬜ |
| **P3** | Diagrams | 21 | P0.1–P0.3, P0.8 (connector/radial) | ⬜ |
| **P4** | Media, brand, people, decoration | 11 | P0.1–P0.3, P0.5 (icons) | ⬜ |
| **P5** | Composites (slide/group scope) | 14 | P1–P4 blocks they compose | ⬜ |
| **P6** | Chrome (+ P6.0 deck-position prerequisite) | 7 | P0.1–P0.3 | ⬜ |
| — | Parked (needs new vocabulary or a dependency) | 13 | see §Parked | — |

**Parallelism:** after P0, phases P1, P2, P3, P4 and P6 touch disjoint folders and can run in
parallel (one agent per phase or per engine group). P5 goes last, because composites can only use
blocks that already exist.

**Priority inside each phase:** every block is tagged **must**, **should** or **could**. Do all
the **must** blocks across phases before any **could** block. Must-level is the minimum set an AI
needs to build a typical business, lecture or pitch deck without falling back to raw text.

---

## Progress

Update these counts when you tick a block. The detailed status lives in the phase files.

| Phase | must | should | could | Done | Last commit | Last update |
|---|---|---|---|---|---|---|
| P0 | 8 tasks | 1 task | — | 9 / 9 tasks | 795f0ae6 | 2026-10-03 |
| P1 | 7 | 3 | 1 | 0 / 11 | — | — |
| P2 | 12 | 8 | 4 | 0 / 24 | — | — |
| P3 | 10 | 7 | 4 | 0 / 21 | — | — |
| P4 | 5 | 4 | 2 | 0 / 11 | — | — |
| P5 | 8 | 4 | 2 | 0 / 14 | — | — |
| P6 | 3 | 3 | 1 | 0 / 7 | — | — |
| **Total new blocks** | **45** | **29** | **14** | **0 / 88** | | |

Catalog size: **41** today → **86** after all must-level blocks → **129** when complete.

### Session log

Append one line per working session (date, who, what moved, anything the next session must know).

| Date | Session | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-03 | L0 agent | P0.1–P0.4 shipped (`2ef8837b`, `d508b7bb`, `7f5a3dfe`, 72e2a610) | Next: P0.5 icons (then update the index's icon list automatically, it reads `ICONS`), P0.6–P0.9. Index for 41 blocks is ~5.5k chars. Budgets now: index <= 20k, detail <= 12k per 8 types. Gallery: tools/visual/scenarios/block-gallery.js (needs a rebuilt `packages/tldraw/dist`, the sample reads dist). |
| 2026-10-03 | L0 agent | P0.5–P0.9 shipped (`1f8dc1b4`, `c0e30cf7`, `d239df03`, `5f039d79`, `795f0ae6`) | P0 is done: P1–P6 can start. Open: P0.5 all-icons SVG parity probe (DOM verified by screenshot only). Icons: 87, `ICON_GROUPS`, warning `icon/unknown`; Lucide path data has round caps in the original, renderers draw butt caps, so keep icons stroke 1.5 and dots as tiny circles. Engines: chart `library/data/_engine/` (+ guides/blocks-authoring.md §2.9), table `blocks/layout/table.ts`, diagrams `blocks/layout/diagram/` (tree cap = 4 levels incl. root). `.husky/pre-commit` is not executable here, so commits do not run the full suite. Parity specs time out (5 s) when many run in parallel: use `--runInBand --forceExit` and pipe jest to a file, not to `grep`/`head` (a piped jest hung on open browser handles). |
| 2026-10-03 | plan | Plan written | Start at P0.1. The digest budget test (`capability-digest.spec.ts`) is already at its 60k ceiling, so P0.4 must land before any phase adds blocks, or every new block fails that test. |

---

## Parked (not scheduled, with the reason)

Each of these needs either a new `LayoutNode` capability, a third-party runtime, or interaction.
Per rule 3, none may be started without first agreeing on the vocabulary change.

| Block | Why parked |
|---|---|
| `tls.t.formula` | LaTeX layout needs KaTeX/MathJax, a new dependency |
| `tls.m.image-shaped` (circle/arch/blob/hex) | `image` node supports only `radius`; a path clip needs a new `clipPath` on `group` (renderer change, both DOM and SVG) |
| `tls.m.image-duotone` | Needs an image filter (SVG `feColorMatrix`), a new node capability |
| `tls.m.qr` | Pure-TS QR encoder (~400 lines) or a dependency. Feasible as Tier A paths; deferred on cost, not on design |
| `tls.m.map` | Needs tiles or a bundled world shape set |
| `tls.m.video`, `tls.v.*` (12 live blocks) | Live/interactive family: Tier B with timers and state; out of the editor-only scope decision |
| `tls.g.swimlane`, `tls.g.journey`, `tls.g.kanban`, `tls.g.stakeholders`, `tls.g.callout-pin` | Real needs, but each one needs its own geometry engine. Revisit after P3 if the AI planner asks for them |
| `tls.d.combo` (column + line, dual axis) | Dual axis is against the chart rules unless justified. Revisit after P2 |
| Rotation on `LayoutNode` | Blocks `tls.m.image-collage` and diagonal `tls.x.watermark`. Decide once whether a `rotate` field is worth a renderer change in both DOM and SVG |
| Dashed `Stroke` | `tls.t.kv-list` dot leaders fall back to the `rule` style until one is agreed |
| `tls.l.masonry`, `tls.l.frame`, `tls.l.thirds`, `tls.l.band` | Covered by `grid`, `split`, `field` and `section`. Add only if the AI planner keeps hand-building them |
