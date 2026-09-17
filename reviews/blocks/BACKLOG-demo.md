# Demo backlog — `DeckSpec` as source of truth, two modes from one JSON

**Date:** 2026-09-16 · **Branch:** `plan/block-system` · **Against commit:** `5523646b`

This file does **not** replace [BACKLOG.md](BACKLOG.md). It is a vertical slice to a shippable
product: one `DeckSpec` JSON that renders as an **edit mode** and as an **animated read-only mode**,
and round-trips back to JSON. Everything else (the remaining 156 blocks, the full Deck Doctor,
PPTX, packaging) stays in `BACKLOG.md`. Mapping table in [§8](#8-mapping-back-to-backlogmd).

Each task below carries a **Contract** (signatures and data shapes), an **Implementation** section
(the actual algorithm and the edge cases), and **Acceptance**. A task is specified well enough that
an implementing agent does not need to re-derive the design.

---

## Progress tracker — Q0 through Q20

**Q0–Q13 and Q16 shipped** in commit `82b1c7a7` (2026-09-16). **Q4 and Q14 were marked done in that commit but were not implemented**, and have since been completed properly, verified independently. **Q7's commit claimed a Levenshtein suggester and shipped a longest-common-prefix scorer** — so `"lft"` scored 0.25 against `"left"`, under its own 0.3 cutoff, and the most likely region typo produced no suggestion. It is a real Levenshtein now, shared with `validateDeckSpec` via `blocks/nearest-name.ts`. **Q15, Q18, Q19 shipped** in commits `603379d2` and `2a4df990`. **Q17 shipped**: editor ↔ viewer parity passes (109 rows compared, 0 failing, worst delta 0.7 units); SVG export turns out not to render blocks at all, so the third path is still unproven. **Q20 is this task.**

| Task | Status | Notes |
|---|---|---|
| Q0 | ✅ | Typecheck command fixed; baselines recorded |
| Q1–Q5 | ✅ | Spine and parity harness — stages 0–1 of the graph |
| Q6 | ✅ | Schema v1 landed |
| Q7 | ✅ | `compileSlide` v2 with regions, free[], findings. **Repaired:** the nearest-region suggester was a longest-prefix scorer despite the commit claiming Levenshtein; it is Levenshtein now. |
| Q8 | ✅ | `documentToDeckSpec` — the reverse path, round trip works |
| Q9 | ✅ | `deckLayoutContext` — one context, three consumers |
| Q10–Q13 | ✅ | Nine text and data blocks + bar chart engine |
| Q14 | ✅ | `<DeckViewer>` — editor-free read-only viewer. **Repaired:** was shipping the old editor-backed component. |
| Q15 | ✅ | Edit route in Next.js sample; round trip visible in UI |
| Q16 | ✅ | Build-step motion in the editor (block-level reveal) |
| Q17 | ✅ | Parity measured. Editor ↔ viewer **PASS** (109 rows, 0 failing). SVG export renders no blocks at all — see the commit and `RUN-demo.md`. |
| Q18 | ✅ | Next.js demo app with two routes and mock API |
| Q19 | ✅ | Validation (`validateDeckSpec`) and capability digest |
| Q20 | ✅ | This task: RUN-demo.md, tracker, phase notes |

**Two tasks repaired after shipping:** Q4 (editor uses real deck tokens, not hardcoded `DEFAULT_TOKENS`) and Q14 (the real read-only viewer was never written; the old editor-backed component was shipped instead). Both are verified and working. The issue surfaced in the 2026-09-17 review, fixing them required comparing the file against its spec, and the import-graph test now walks the module graph transitively to catch this class of bug.

---

## 1. Target architecture

```
                    FastAPI  ──  Postgres: DeckSpec JSON  (source of truth)
                        │
              ┌─────────┴─────────┐
              ↓                   ↓
      EDIT MODE              READ-ONLY MODE
   <Tldraw> + blocks         <DeckViewer>
   compileSlide              compileSlide
        ↓                         ↓
   TDDocument (cache)        renderNodeToDom + WAAPI
        ↓ user edits              ↓
   documentToDeckSpec        build-step animation
        ↓                    (no editor mounted)
   DeckSpec → PUT FastAPI
                                  ↓
                        EXPORT: renderNodeToSvg (pure Node)
                        thumbnail · PNG · PDF · share card
```

**One `layout()`, three consumers.** Governing rule #1 now carries three paths, not two:

| Consumer | Renderer | Runs where | Purpose |
|---|---|---|---|
| Edit mode | `renderNodeToDom` | browser + editor | authoring |
| Read-only mode | `renderNodeToDom` + WAAPI | browser, **no editor** | viewing, with animation |
| Export | `renderNodeToSvg` | pure Node | thumbnail, PNG, PDF, SEO/share |

Edit mode and read-only mode **share `render-dom.tsx`**, which is what makes them structurally
unable to diverge. Export uses SVG and must be proven equal by test (Q17).

`<DeckViewer>` has no `TldrawApp`, no MobX, no canvas, no session system. It is `compileSlide` →
`layout()` → `renderNodeToDom` plus a motion driver and keyboard navigation — roughly 300 lines. For
this product it is the **primary** surface: viewers vastly outnumber authors, and they should not
download the editor bundle.

---

## 2. The data contract

### 2.1 Why the current structure has to change

`06-slide-composition.md` §6.7 specified one thing; D1 implemented another. The first three
differences block the architecture above:

| | Design doc §6.7 | Implemented (`blocks/types.ts`) | Consequence |
|---|---|---|---|
| version | `version: 1` | **absent** | FastAPI stores an unversioned schema |
| region | `Record<string, BlockSpec[]>` | `Record<string, BlockSpec>` | one block per region — cannot hold `[title, chart, caption]` |
| theme | `string \| DeckTheme` | `{ colors?, fonts? }` | the AI has to emit hex; violates governing rule #3 |
| aspect | `'widescreen' \| [w,h]` | absent | frame only readable from `TDPage.size` |
| role/rhythm | present | absent | loses `ppt-master`'s page-rhythm discipline |
| slide id | present in the example | absent | FastAPI cannot address a slide for partial update |

Plus three gaps that block the round trip:

- **No reverse path.** `grep -rn "toSlideSpec\|toDeckSpec\|decompile" src/` returns **nothing**.
  `shapeToBlock` exists but only at block granularity, never at slide granularity.
- **`TDPage` does not store `layout`.** It has `size`/`background`/`notes`/`skipInPresentation`/
  `masterId` and no `layout`. A compiled slide forgets which layout produced it, so the round trip
  is impossible in principle, not merely unimplemented.
- **`compileSlide` drops data silently** (`blocks/slide-compiler.ts:77`): a content slot matching no
  region hits `continue`, commented as a "graceful fallback". For an AI contract that is silent data
  loss — the model misnames a region and the slide quietly comes out empty.

### 2.2 Schema v1

```ts
interface DeckSpec {
  version: 1
  id: string
  title: string
  theme: string | DeckTheme                 // a built-in theme id ('mono-grid'), NOT hex
  aspect: 'widescreen' | 'standard' | 'square' | [number, number]
  tokens?: DeckTokens                       // brand-kit overrides
  masters?: MasterSpec[]
  slides: SlideSpec[]
}

interface SlideSpec {
  id: string                                // stable — FastAPI's key for partial updates
  layout: SlideLayoutId                     // one of the 16 in blocks/slide-layouts.ts
  role?: 'cover' | 'section' | 'content' | 'closing'
  rhythm?: 'anchor' | 'dense' | 'breath'
  regions: Record<string, BlockSpec[]>      // ARRAY — several blocks per region
  free?: PlacedBlock[]                      // ← the ONLY place coordinates exist
  background?: Paint
  notes?: string
  skip?: boolean
  masterId?: string
}

interface PlacedBlock {
  block: BlockSpec
  box: Box                                  // slide units, 1920×1080 reference frame
}

interface BlockSpec {
  id: string                                // CHANGED: required, no longer optional
  type: string
  props: Record<string, unknown>
  style?: BlockStyleSpec
  motion?: BlockMotionSpec
  children?: BlockSpec[]
}
```

### 2.3 `free[]` — the load-bearing idea

This is what makes the round trip possible without choosing between "forbid the user to move
blocks" and "lose the user's edits":

- A block **that stays in its region** is stored semantically, in `regions`. The AI can read it, a
  theme change restyles it, an aspect change re-lays it out.
- A block **the user drags out of its region** moves to `free[]` with explicit coordinates. Nothing
  is lost.
- **The AI only ever writes `regions`.** It never needs to know `free[]` exists, so the prompt does
  not grow.

`free[]` is also where non-block shapes (an arrow, a hand-placed text shape) go, if free drawing on
top of a slide is allowed later.

### 2.4 A complete slide, for review

```json
{
  "id": "sl_03",
  "layout": "two-column",
  "role": "content",
  "rhythm": "dense",
  "regions": {
    "title": [
      { "id": "b1", "type": "tls.t.title",
        "props": { "text": { "runs": [
          { "text": "Margin fell on " },
          { "text": "infrastructure", "bold": true }
        ] } } }
    ],
    "left": [
      { "id": "b2", "type": "tls.d.bar",
        "props": { "categories": ["Q1","Q2","Q3"], "series": [64, 64, 61], "highlightIndex": 2 },
        "motion": { "preset": "bars-grow", "order": 2, "trigger": "onClick" } }
    ],
    "right": [
      { "id": "b3", "type": "tls.t.takeaway",
        "props": { "text": "Compute spend grew 2.4× while revenue grew 1.2×." },
        "motion": { "preset": "fade-up", "order": 3 } },
      { "id": "b4", "type": "tls.t.caption",
        "props": { "text": "Source: internal Q3 financials" } }
    ]
  },
  "notes": "Land on the 61 — this is the hinge slide."
}
```

No coordinates, no color values, no font sizes. Changing `theme` restyles everything; changing
`aspect` to `[9,16]` makes all 16 layouts re-compile. That is the precondition for an AI to generate
directly usable content.

### 2.5 Two contract decisions worth stating explicitly

1. **Region names belong to the layout.** `title`/`left`/`right` are decided by the layout function,
   so the AI must know which layout offers which regions. Q19 generates that table **from code**; a
   hand-written copy drifts.
2. **`aspect` is mutable after creation.** Because `regions` are semantic, changing aspect is just a
   re-compile — but blocks in `free[]` carry hard coordinates and **will** be misplaced. Q8 must
   report this as a finding rather than silently rescaling.

---

## 3. Definition of "demo done"

A Next.js app reads **one `DeckSpec` JSON from FastAPI** (a mock is fine) and demonstrates all four:

1. **Read-only mode** — `<DeckViewer>` renders 6 slides, blocks arrive on build steps with
   animation, keyboard/click navigation works, `prefers-reduced-motion` makes transitions instant
   rather than removing them. **No editor mounted.**
2. **Edit mode** — the same JSON opens in `<Tldraw>`; blocks select, drag and edit; a theme change
   restyles every block.
3. **Round trip** — edit → `documentToDeckSpec` → `DeckSpec` → PUT → reload → **identical**. A block
   dragged out of its region appears in `free[]`.
4. **Export** — `exportSlidePng` produces an image matching both modes within 1 slide unit on every
   part.

Item 3 is what makes an AI product work: without it the AI can only create, never revise a deck the
user has touched.

**Not in the demo:** F1/F2 (inserter/inspector UI), E5–E10, PPTX, real LLM calls, real auth/storage.

---

## 4. Why Stage 0 exists

The 2026-09-16 review found three blocking defects, **each verified with an independent test**:

| | Defect | Evidence |
|---|---|---|
| a | `layoutChild` discards `box.x`/`box.y` → **all 14 containers** stack their children at (0,0) | `tls.l.stack` with 2 children → both `{"x":0,"y":0,…}` |
| b | `style.scale` ignored in `measure` and both renderers → **autofit is a no-op** | autofit returns `scale:0.75`; re-measuring gives `height 650` in an `80` box |
| c | The typecheck command in `CONTINUE.md` §4 points at a binary that does not exist → every run reported "0 errors" | measured: **170 errors, 52 outside spec files** |

(a) and (b) survived 1364 green tests because the fake leaf in
`blocks/library/layout/test-helpers.ts:64` writes `box: ctx.box` — aliasing the context object,
which happens to still carry `x`/`y` at runtime — while every real block, including all three A4
probe blocks, positions itself at `{x:0,y:0}`. (c) is why (a) and (b) survived at all: the type error
`test-helpers.ts(64,7): Type 'Size' is missing … x, y` has been in `tsc` output for a long time with
nobody able to see it.

---

## 5. Stage graph

```
Q0  (alone, 15 min — fix the instrument before measuring anything)
 │
 ├─ Lane A ── Q1 coordinates ─────┬─ Q5 parity ─┐
 ├─ Lane B ── Q2 style.scale ─────┘             │
 ├─ Lane C ── Q3 library type/lint ─────────────┤
 └─ Lane D ── Q4 real deck tokens ──────────────┤
                                                │
                    Q6 SCHEMA v1  ←─────────────┘   ⚠ everything after targets this
                     ├─ Q7 compileSlide v2 ──┐
                     ├─ Q8 documentToDeckSpec┤       (Q7, Q8, Q9 parallel)
                     └─ Q9 deckLayoutContext ┘
                                             │
        ┌──────────────┬──────────────┬──────┴───────┐
        Q10 title      Q11 body       Q12 kpi/quote  Q13 bar chart
        └──────────────┴──────────────┴──────────────┘
                              │
            ┌─────────────────┼─────────────────┐
         Q14 DeckViewer   Q15 edit+save    Q16 motion (B3)
            └─────────────────┼─────────────────┘
                     Q17 three-way parity
                              │
                  Q18 Next.js demo app + mock FastAPI
                              │
              Q19 validateDeckSpec (cuttable) ─ Q20 close out
```

**Critical path: 9 sequential sessions** (Q0 → Q1 → Q5 → Q6 → Q7 → Q10 → Q14 → Q17 → Q18), with two
4-way fan-outs. With 4 agents in parallel: ~9–11 sessions instead of 21.

**Q6 is the new bottleneck.** It is small — types only — but fourteen tasks target it. Do not run it
concurrently with anything that consumes it.

---

## 6. File ownership matrix — read before fanning out

A lane may only **write** files in its own column. Two lanes touching `render-svg.ts` /
`render-dom.tsx` is allowed, but they must own different `switch` cases.

| File | Q1 | Q2 | Q3 | Q4 | Q7 | Q8 | Q10–Q13 | Q14 |
|---|---|---|---|---|---|---|---|---|
| `blocks/layout/layout-child.ts` | **W** | — | — | — | — | — | — | — |
| `blocks/layout/measure.ts`, `autofit.ts` | — | **W** | — | — | — | — | — | — |
| `blocks/render-svg.ts` | **W** `case 'group'` | **W** `case 'text'` | W line 82 | — | — | — | — | — |
| `blocks/render-dom.tsx` | **W** `case 'group'` | **W** `case 'text'` | W line 146 | — | — | — | — | R |
| `blocks/probe-blocks.ts` | **W** | — | — | — | — | — | — | — |
| `blocks/library/layout/**` | W `test-helpers.ts` | — | **W** rest | — | — | — | — | — |
| `blocks/library/text/**`, `data/**` | — | — | — | — | — | — | **W** (one dir each) | — |
| `blocks/library/index.ts` | — | — | **create** | — | — | — | — | — |
| `blocks/types.ts` | — | — | — | — | — | — | — | — |
| `blocks/slide-compiler.ts` | — | — | — | — | **W** | R | — | R |
| `blocks/slide-decompiler.ts` | — | — | — | — | — | **create** | — | — |
| `blocks/deck-context.ts` | — | — | — | — | — | — | — | R |
| `state/shapes/ComponentUtil/**` | — | — | — | **W** | — | — | — | — |
| `components/DeckViewer/**` | — | — | — | — | — | — | — | **create** |

**Stage 2 conflict rule:** each lane creates `library/<family>/<block-id>/` and exports it by
**appending a line** to `library/<family>/index.ts`. Nobody edits `blocks/index.ts` during Stage 2 —
Q3 creates the `library/index.ts` aggregator, and Q18 is the only task that wires it upward.

**`blocks/types.ts` is owned exclusively by Q6**, which runs alone.

---

## 7. Tasks

> **Handoff line** (paste with every task):
> Read `reviews/blocks/CONTINUE.md` first — current state, verified commands, and the traps that
> have already cost time. **Note that the typecheck command in its §4 is broken; use the one in §9
> of `BACKLOG-demo.md`.** Do not commit; leave changes in the working tree. Report command output
> verbatim, and name anything you could not do rather than hiding it.

**Definition of done for every task** — the 7 points in `BACKLOG.md`, with point 2 amended:

2. ~~Typecheck: still exactly the 10 pre-existing `.spec.ts` errors~~ → **Typecheck: no new errors
   against the Q0 baseline, and every file you touched is at zero.**

---

### Stage 0 — Spine repair

---

#### Q0 · Fix the instrument · XS · *alone, before everything*

**Depends:** — · **Owns:** `reviews/blocks/CONTINUE.md`, `reviews/blocks/baseline-typecheck.txt`

**Problem.** `CONTINUE.md` §4 prescribes `cd packages/tldraw && ./node_modules/.bin/tsc …`. That
binary does not exist — `packages/tldraw/node_modules/.bin/` contains only `eslint` and `lask`. The
command dies with `No such file or directory`, which the documented `| grep -E '^src/'` then
swallows, so the check has been reporting a clean tree for as long as it has existed.

**Implementation.**
1. In `CONTINUE.md` §4, change the path to `../../node_modules/.bin/tsc` and add a note that
   `$?` after a pipe is the exit code of the last command in the pipe — use `${PIPESTATUS[0]}`.
2. Run the real check, save full output to `reviews/blocks/baseline-typecheck.txt`, and record the
   split between non-spec and spec errors at the top of that file.
3. Do the same for `eslint src/blocks` and `jest`.

**Acceptance.** The baseline file exists with explicit numbers. **Not one line of source changes.**
Current measurements to reproduce: typecheck **170 total / 52 non-spec / 118 spec**; eslint
`src/blocks` **4 errors, 136 warnings**; jest **127 suites, 1364 passed, 77 todo, 19 snapshots**.

---

#### Q1 · The coordinate contract · M · **Lane A** · ⚠ gates everything

**Depends:** Q0 · **Read:** `01-architecture.md` §1.6–1.8; `blocks/layout/layout-child.ts` in full
**Owns:** `blocks/layout/layout-child.ts`, `blocks/render-svg.ts` (`case 'group'`),
`blocks/render-dom.tsx` (`case 'group'`), `blocks/probe-blocks.ts`,
`blocks/library/layout/test-helpers.ts`, `01-architecture.md` §1.6

**Problem.** `layoutChild(spec, box)` accepts a `Box`, builds the child context with
`box: { ...options.box }` assigned into `LayoutContext.box` (typed `Size`), then returns
`def.layout(props, childCtx)` directly (`layout-child.ts:181-205`). The `x`/`y` never reach the
output. Independently, `render-svg.ts` emits a bare `<g>` (children in absolute coordinates) while
`render-dom.tsx` emits a `<div>` absolutely positioned at `box.x/y` (children relative to it) — the
two renderers disagree about what a group means.

**Decision to make and record.** Pick **one** model and apply it in all three places. Recommended:
**child coordinates are relative to the parent group** — it matches DOM already, and it is what makes
a child block genuinely pure, since it never needs to know where it sits.

**Implementation.**
```ts
// layout-child.ts — wrap, do not return bare
layoutChild: (spec, box) => {
  // ... existing depth cap and registry lookup unchanged ...
  const childNode = def.layout(spec.props, childCtx)
  return { k: 'group', box, children: [childNode] }   // box carries x/y; child stays at 0,0
}
```
```ts
// render-svg.ts case 'group'
const t = (node.box.x || node.box.y) ? ` transform="translate(${node.box.x},${node.box.y})"` : ''
return `<g${t}${otherAttrs}>${children}</g>`
```
The `clipPath` rect in the same case currently uses `node.box.x/y`; once the `<g>` translates, the
clip rect must become `x="0" y="0"` or it double-offsets. This is the easiest thing to get wrong
here.

`probe-blocks.ts`: add a fourth probe with a **two-level nested group whose `box.x/y ≠ 0`**. This
trap cannot fire today because all three probes have their root group at (0,0).

`test-helpers.ts:64`: the fake leaf must build its box explicitly (`{ x: 0, y: 0, width:
ctx.box.width, height: ctx.box.height }`), never `box: ctx.box`. That line is both a module-object
alias (the trap that has shipped three times) and the `Size`→`Box` type error.

**Acceptance.**
- `tls.l.stack` with 3 children yields 3 distinct `y` values, measured **on the returned node**, not
  on the `childBox` passed in.
- A two-level nested group resolves to the same absolute coordinates in DOM and SVG, within 1 slide
  unit.
- All 14 container specs stay green after `test-helpers.ts` is fixed. If any assertion had to be
  relaxed, name it.
- `test-helpers.ts` reaches zero typecheck errors.

---

#### Q2 · Wire `style.scale` · S · **Lane B**

**Depends:** Q0 · **Read:** `BACKLOG.md` C3; `blocks/layout/autofit.ts`
**Owns:** `blocks/layout/measure.ts`, `blocks/layout/autofit.ts`, `blocks/render-svg.ts`
(`case 'text'`), `blocks/render-dom.tsx` (`case 'text'`)

**Problem.** `grep -n scale` across `measure.ts`, `render-svg.ts` and `render-dom.tsx` returns
**nothing**; all three read `style.size` raw. `autofitText` returns `{ size: baseSize, scale:
floorSize/baseSize }` (`autofit.ts:74`) and nobody reads `scale`, so autofit computes a correct
shrink and then discards it. This is precisely the defect C3's acceptance criterion forbade.

**Implementation.** One helper next to `ResolvedTextStyle`:
```ts
export function effectiveFontSize(style: ResolvedTextStyle): number {
  return style.size * (style.scale ?? 1)
}
```
Apply it in **all five paths**: `estimateMetrics`, `canvasMetrics`, `tableMetrics`, `render-svg`
`case 'text'`, `render-dom` `case 'text'`. Line height must scale with it — `lineHeight` is a
multiplier, so `lineHeight * effectiveFontSize(style)` rather than `lineHeight * style.size`.
Per-run `run.size` is an em multiplier on top: `effectiveFontSize(style) * run.size`.

Resolve `applyLetterSpacing` (`measure.ts:454`) in the same pass — it currently always
`return 0` and has no callers, while `letterSpacing` *is* emitted into CSS and SVG. Either put it
into measurement for real, or delete it and record the divergence as a known approximation. Leaving
it as an unfulfilled promise is the one option that is not acceptable.

**Acceptance.**
- `estimateMetrics(t, {...s, scale: 0.5})` returns exactly half the width of `scale: 1` (±1).
- `renderNodeToSvg` with `scale: 0.5, size: 100` emits `font-size:50px`.
- A closed-loop test: `autofitText(...)` → re-measure with the style it returned → **fits the box**.
  This test must fail on the current tree; demonstrate that before fixing.

---

#### Q3 · Library type/lint cleanup + aggregate export · S · **Lane C**

**Depends:** Q0 · **Owns:** `blocks/library/layout/**` (except `test-helpers.ts`),
`blocks/library/index.ts` (new), `blocks/index.ts`, `render-svg.ts:82`, `render-dom.tsx:146`

**Implementation.** Most of the 52 non-spec type errors live here.
- `schema.ts` ×10 — `{ kind: 'enum', values: [...] }` widens to `kind: string`, which does not match
  the `SlotType` union. Add `as const` or annotate the literal as `SlotSpec`.
- `index.ts` ×13 — `Type 'XxxProps' is not assignable to 'Record<string, unknown>'`. Fix at the
  source: either relax `BlockDefinition<P extends Record<string, unknown>>` to accept a plain
  interface, or declare `interface XxxProps extends Record<string, unknown>`. **Do not** paper over
  it with `as unknown as`; the existing `as` casts on the `layout` field are the reason the error
  count grew unnoticed.
- 3 eslint `no-empty-interface` errors: `tls-l-field`, `tls-l-overlay`, `tls-l-spacer`.
- `render-svg.ts:82` — `node.fill` is read on a union where only `rect`/`path` carry `Paint` and
  `icon` carries a `string`. For an icon node `resolvePaintToFill('#fff')` falls through every case
  and returns `undefined`. Narrow the union properly (`node.k === 'rect' || node.k === 'path'`).
- `render-dom.tsx:146` — `Type 'string | number' is not assignable to 'Fill'`.

**Create `blocks/library/index.ts`:**
```ts
export const BUILT_IN_BLOCKS: BlockDefinition[] = [...layoutBlocks, ...textBlocks, ...dataBlocks]
export function registerBuiltInBlocks(registry: BlockRegistry): void
```
`library/layout/index.ts` currently exports 14 bare names and no array. Both F1 (the inserter) and
Q19 (the AI capability digest, which must be **generated** from the library) need the aggregate.

**Acceptance.** `blocks/library/**` and both renderers reach **0 typecheck errors and 0 eslint
errors**. `registerBuiltInBlocks` registers all 14 containers, asserted by count. No file outside
this lane's column is modified.

---

#### Q4 · Editor uses the deck's real tokens · S · **Lane D**

**Depends:** Q0 · **Read:** `ComponentUtil.tsx:28-66`; `blocks/tokens.ts`
**Owns:** `state/shapes/ComponentUtil/**`, a new `useDeckTokens` hook

**Problem.** `ComponentUtil` hardcodes `DEFAULT_TOKENS` — a **second** scale that disagrees with the
canonical one in `blocks/scales.ts`:

| token | `scales.ts` (canonical, slide units) | `ComponentUtil` |
|---|---|---|
| `type.display.size` | 152 | 48 |
| `type.body.size` | 28 | 16 |
| `space.md` | 24 | 12 |
| `radius.md` | 16 | 8 |

These are not near-misses; they are two different unit systems. A block renders roughly 3× smaller
in the editor than the same block does on export, and the deck's theme is ignored entirely
(governing rule #3).

**Implementation.** Source tokens from the document, alongside the existing `useBlockRegistry`:
```ts
// hooks/useDeckTokens.ts
export function useDeckTokens(): ResolvedTokens {
  const app = useTldrawApp()
  const doc = app.useStore(s => s.document)
  return React.useMemo(
    () => resolveTokens(activeDeckTheme(doc.theme), doc.tokens),
    [doc.theme, doc.tokens]
  )
}
```
Signatures to match exactly: `resolveTokens(theme: DeckTheme, tokens?: DeckTokens): ResolvedTokens`;
`surfaceFromBackground(background, box, pageSize, theme?): SurfaceContext`. The surface must come
from the slide's real background through `surfaceFromBackground` — that is the entire reason P19
exists. Delete `DEFAULT_TOKENS` and `DEFAULT_SURFACE`.

Memoise on `doc.theme`/`doc.tokens` identity, not on the resolved object: `resolveTokens` allocates
a fresh object each call, and an unmemoised call in render re-lays-out every block on every store
tick.

**Acceptance.** `app.deck.setTheme()` restyles canvas blocks immediately (render test).
`grep -rn "DEFAULT_TOKENS" src/` returns nothing.

---

#### Q5 · Harden the parity harness · M · **Lane A** · ⚠ gates Stage 2

**Depends:** Q1, Q2 · **Read:** `09-testing.md` §3; `blocks/parity-harness.ts` in full
**Owns:** `blocks/parity-harness.ts`, `blocks/parity-worker.ts`, `blocks/parity.spec.ts`

**Problem.** The harness never runs `renderNodeToDom`. `parity-harness.ts:118-186` contains
`nodeToHtml`, a hand-written re-implementation of the DOM output (the stated reason — Jest 27's VM
sandbox — is legitimate; the consequence is that `render-dom.tsx` has never once been measured).
That violates governing rule #1 inside the very tool meant to enforce it. And
`GEOMETRY_KINDS = new Set(['rect','image','host'])` (`parity-harness.ts:344`) leaves 5 of 8 node
kinds with no geometry check at all; text is checked for content and line count only.

Three real divergences sit inside the unchecked region:
- **Text baseline.** SVG uses `y = box.y + line.baseline`, a true baseline
  (`render-svg.ts:246`). DOM uses `top: line.baseline` (`render-dom.tsx:175`), which is the top of
  the line box. DOM text sits roughly `0.8 × lineHeight` lower than SVG text.
- **Nested groups.** See Q1.
- **`path` / `line`.** DOM wraps them in `<svg viewBox="0 0 w h">` positioned at the box
  (box-local coordinates); SVG emits `<path d>` / `<line x1…>` in absolute space. The harness header
  records this as "scope cut #1" — honest, but still open.

**Implementation.** Move `renderToStaticMarkup(<BlockRenderer node={…}/>)` into the **worker
process**: `parity-worker.ts` is already a separate `fork`ed child (`parity-harness.ts:207-213`,
`execArgv: ['-r', '@swc-node/register']`), so it is outside Jest's sandbox and can import React DOM
Server freely. Send the `LayoutNode` tree as JSON — it already is (`treeJson`) — and render inside
the worker. Then delete `nodeToHtml`.

If that proves impossible, the fallback is to keep `nodeToHtml` **and** add a test asserting it is
string-identical to `renderNodeToDom`'s output for all 4 probes. A duplicate may exist; a drifting
duplicate may not.

Widen `GEOMETRY_KINDS` to include `text`, `group`, `line`, `path`, then fix the three divergences
until it passes. For `text`, compare the position of the **first line's baseline**, not the
container box — the container is explicit in DOM and font-dependent in SVG, which is scope cut #2
and stays.

Add a test that breaks the **DOM** side (e.g. offset one `case` by 10 units through a test-only
injection point). There are currently two SVG-breaking tests and, structurally, no way to break DOM.

**Acceptance.** Parity within 1 slide unit across **all 8 node kinds** on 4 probe blocks; a
deliberately broken DOM renderer makes the suite fail — demonstrate it, do not assume it. Any
remaining scope cut is named in the file header with its reason, as the current header already does.

---

### Stage 1 — Contract and foundations

---

#### Q6 · Schema v1 · S · ⚠ **runs alone, gates Stages 1–4**

**Depends:** Q0 · **Read:** `06-slide-composition.md` §6.2/§6.5/§6.7; §2 of this file
**Owns:** `blocks/types.ts`, `src/types.ts` (`TDPage` only), `reviews/blocks/SCHEMA.md` (new)

**Implementation.** Land the schema in [§2.2](#22-schema-v1) verbatim. Then add to `TDPage`:
```ts
export interface TDPage extends TLPage<TDShape, TDBinding> {
  // ... existing size / background / notes / skipInPresentation / masterId ...
  layout?: SlideLayoutId     // D-demo: which layout compiled this slide
  slideSpecId?: string       // D-demo: the SlideSpec.id this page was compiled from
}
```
Without these two, Q8 is impossible in principle rather than merely unwritten.

**Hard rule: additive only.** Every new field on a persisted type is optional,
`TldrawApp.version` **stays at 16**, and `migrate.ts` gets **no new block**. If a migration seems
necessary, stop and re-read `01-architecture.md` §7 — Phases 11, 13, 17 and D1 all landed persisted
fields this way.

`BlockSpec.id` becomes **required at the `DeckSpec` layer** (the app-facing contract) while
`shapeToBlock` must still read older shapes that lack one — mint an id when absent, do not throw.
Keep them separate if that reads more clearly: `BlockSpec` (required id, what the API exchanges) and
a looser internal type for what `shapeToBlock` can produce.

Write `reviews/blocks/SCHEMA.md`: the full contract with a worked example per layout. **FastAPI and
the prompt side read this file, not `types.ts`.** It must stand alone — no "see §6.7 for details".

**Acceptance.** `DeckSpec` survives `JSON.parse(JSON.stringify(x))` with `toEqual` **and**
`not.toBe`. An existing `TDDocument` without the new fields loads unchanged.
`TldrawApp.version === 16`. `git diff` on `migrate.ts` is empty. `SCHEMA.md` exists and is
self-contained.

---

#### Q7 · `compileSlide` v2 · M

**Depends:** Q6 · **Read:** `blocks/slide-compiler.ts` in full
**Owns:** `blocks/slide-compiler.ts`, `state/deck/Deck.ts` (`addSlideFromSpec` only)

**Contract.**
```ts
interface CompileSlideResult {
  shapes: ComponentShape[]
  background?: Paint
  masterId?: string
  notes?: string
  skipInPresentation?: boolean
  layout: SlideLayoutId          // NEW — written onto TDPage
  slideSpecId: string            // NEW — written onto TDPage
  findings: CompileFinding[]     // NEW — replaces the silent `continue`
}

interface CompileFinding {
  level: 'error' | 'warning'
  rule: 'region/unknown' | 'region/overflow' | 'block/unregistered'
  slideId: string
  region?: string
  blockId?: string
  message: string
  suggestion?: string            // nearest valid region name, for the AI repair loop
}
```

**Implementation.**
1. Resolve regions: `getSlideLayout(spec.layout)?.compile(frame, tokens)`. Keep the `'blank'`
   fallback for an unknown layout id, but **emit a finding** rather than falling back silently.
2. For each `regions[name]: BlockSpec[]`, stack the blocks vertically inside the region box,
   separated by `tokens.space.md`. Height split: give each block its declared
   `definition.size.preferred[1]` clamped to the remaining space, then distribute leftover space to
   the last block. A region with one block behaves exactly as v1 did — verify that with the existing
   D3 tests before touching them.
3. For each `free[]` entry, call `blockToShape(entry.block, entry.box, { childIndex })` directly. No
   region resolution, no clamping.
4. `childIndex` is a single counter across regions **and** `free[]`, so z-order is deterministic and
   `free[]` blocks land on top. Document that ordering choice; it is observable.
5. Replace the `continue` at `slide-compiler.ts:77` with a `region/unknown` finding carrying
   `suggestion` = nearest valid region name by Levenshtein over `Object.keys(regions)`. **The block
   is not dropped** — place it in the layout's primary region (`content`, else the first region) so
   the author sees it and can move it.
6. `Deck.addSlideFromSpec` writes `result.layout` and `result.slideSpecId` onto the page, and
   returns findings so the host can surface them.

**Acceptance.** A 6-slide `DeckSpec` compiles to a valid `TDDocument` **in Node with no editor
mounted**. Every shape has a unique `id` and `childIndex` (the P18 bug). A region holding 3 blocks
stacks them without overlap. A misnamed region produces exactly one finding, a `suggestion`, and
**no lost block**. The existing D3 tests pass unchanged for single-block regions.

---

#### Q8 · `documentToDeckSpec` — the reverse path · M · ⚠ this is item 3 of §3

**Depends:** Q6, Q7 · **Read:** `blocks/shape-bridge.ts` (`shapeToBlock` already exists per block)
**Owns:** `blocks/slide-decompiler.ts` (new), its spec

**Contract.**
```ts
export function pageToSlideSpec(
  page: TDPage,
  tokens: ResolvedTokens,
  opts?: { tolerance?: number }        // default 2 slide units
): { spec: SlideSpec; findings: DecompileFinding[] }

export function documentToDeckSpec(
  doc: TDDocument,
  opts?: { tolerance?: number }
): { spec: DeckSpec; findings: DecompileFinding[] }
```

**Implementation.**
1. Read `page.layout` (written by Q7). If absent — a page authored before this work, or drawn by
   hand — fall back to `'blank'` and put **every** shape in `free[]`, with one finding. Never guess
   a layout from geometry; a wrong guess silently relocates the user's content.
2. Re-compile the region boxes: `getSlideLayout(page.layout).compile(frame, tokens)` — the same
   function Q7 used, so the two are structurally consistent.
3. For each shape, in `childIndex` order:
   - `shapeToBlock(shape)` → `BlockSpec | undefined`. `undefined` means a non-block shape (arrow,
     hand-placed text): emit a `shape/non-block` finding and, per the Q6 decision, either drop with
     a finding or carry as an opaque `free[]` entry. Pick one, record why.
   - Match the shape's `{point, size}` against every region box within `tolerance`. On a match,
     append to `regions[name]`. Otherwise append to `free[]` with the explicit box.
   - When a region holds several blocks, sort by `point[1]` (vertical order) so the array order
     matches what Q7 will re-compile.
4. `documentToDeckSpec` walks pages in `childIndex` order, reads `theme`/`tokens`/`masters` off the
   document, and derives `aspect` from `defaultPageSize`.
5. **Aspect + `free[]`:** when `free[]` is non-empty and the target aspect differs from the one the
   coordinates were authored at, emit `aspect/free-block-drift`. Do not rescale (see §2.5).

**Acceptance — the single most important test in this backlog:**
`DeckSpec → compileSlide → TDDocument → documentToDeckSpec → DeckSpec'` with `toEqual` **exact** on
the 6-slide demo deck. Plus: drag a block out of its region → it appears in `free[]` with the right
box; drag it back → it returns to `regions`. Changing `aspect` with a non-empty `free[]` produces a
finding.

**Known limit to state, not hide.** A block moved *within* its region's tolerance is snapped back to
region order on the round trip — its exact pixel offset is not preserved. That is the intended
trade (semantic beats pixel-exact), but it must be written down, because it is user-visible.

---

#### Q9 · `deckLayoutContext()` — one context, three consumers · M · *parallel with Q7/Q8*

**Depends:** Q1, Q4 · **Read:** `07-integration-readiness.md` §7.3 G1; `state/deck/Deck.ts:292-330`
**Owns:** `blocks/deck-context.ts` (new), `state/deck/Deck.ts` (the `blocks` callback),
`state/render/renderPageToSvg.ts` (the `blocks` option signature)

**Problem.** The editor builds a `LayoutContext` one way (`ComponentUtil`), export another (the host
supplies it), and `Deck.blocks` defaults to `undefined` — so **out of the box, exporting a block
still produces a dashed placeholder**. A5 deliberately kept the default byte-identical, but the
effect is that "headless block rendering works" is conditional on the host wiring it up.

**Contract.**
```ts
export function deckLayoutContext(
  doc: TDDocument,
  box: Size,
  opts: { headless: boolean; slideBackground?: SlideBackground | string; depth?: number }
): LayoutContext
```

**Implementation.**
1. `deckLayoutContext` composes what already exists: `resolveTokens(activeDeckTheme(doc.theme),
   doc.tokens)` → `surfaceFromBackground(bg, box, pageSize, theme)` → `createLayoutContext({...})`.
   It is the only place those three are wired together.
2. All three consumers call it: `ComponentUtil` (`headless: false`), `<DeckViewer>`
   (`headless: false`), the export callback (`headless: true`).
3. Give `Deck` a **default** `blocks` callback built from the `BlockRegistry` +
   `renderNodeToSvg`. Keep `opts.blocks` taking precedence, and keep the "no blocks registered →
   original placeholder" path so A5's guarantee survives.
4. Widen the A5 signature to `(shape: ComponentShape, ctx: LayoutContext) => string | undefined`.
   It is currently `(shape) => …` (`renderPageToSvg.ts:181`), and the missing `ctx` is exactly where
   Q4 went wrong.

**Acceptance.** The existing `renderPageToSvg` snapshot for a block-free deck is **byte-identical**.
A slide containing a block exports real SVG in Node with no host wiring. The same `BlockSpec` and box
produce a **structurally identical tree** (`toEqual`) through all three paths — that is this task's
headline test, and it is the one that keeps the three consumers honest.

---

### Stage 2 — Minimum block set · *4-way fan-out, fully independent*

Common to Q10–Q13:

- **Depends:** Q5, Q6, Q9. Do not start earlier — without parity, blocks drift and get rewritten.
- **Read:** `03-block-catalog.md` §B; `04-block-anatomy.md` §4.9 (the ten-point definition of done)
- One directory per block: `library/<family>/<id>/` with `schema.ts` · `layout.ts` · `motion.ts` ·
  `index.ts` · `<id>.spec.ts`, following the 14 existing containers exactly.
- `layout()` is pure: no `document`, `window`, `Date.now()`, `Math.random()`, no throwing.
- **Common acceptance:** every block passes `assertParity` at **3 widths**; renders its `defaults`
  under all 5 themes on light/dark/gradient backgrounds with **zero lint findings**; survives the
  adversarial set in `09-testing.md` §9.5 (1 item, 40 items, a 400-char word, CJK, missing values).

| Task | Blocks | Implementation notes |
|---|---|---|
| **Q10** | `tls.t.title` · `tls.t.subtitle` · `tls.t.kicker` | `title` accepts `RichText` (the §2.4 example bolds one word) — `measure.ts` already preserves runs across line breaks via `sliceRunsForLine`. Use Q2's autofit for long titles; `maxLines` truncates with a visible marker, never silently. |
| **Q11** | `tls.t.body` · `tls.t.bullets` · `tls.t.caption` | `bullets` consumes `blocks/layout/lists.ts` — C3 already ships dot/dash/chevron/number markers and indent levels. **Do not write a second list layout.** |
| **Q12** | `tls.t.hero-number` · `tls.t.quote` · `tls.t.takeaway` | `hero-number`'s default motion is `count-up`, already in B2's `MOTION_PRESETS`. `quote`'s glyph is a `path` node, not a text glyph, so it scales with the box. |
| **Q13** | minimal chart engine + `tls.d.bar` | See below. |

**Q13 implementation.** `library/data/_engine/` covers vertical bars only: linear scale, tick
selection (1/2/5 × 10ⁿ), axis layout, series color assignment. Pure functions, no block dependency,
no DOM. Then `tls.d.bar` composes them.

**Q13 additional acceptance** (from `BACKLOG.md` E3): baseline is **always** zero; at most 6 hues; a
**single series uses `accent`, not `categorical[0]`**; `NaN`/`null` are handled explicitly for bars
(omit the bar and note it) and **never silently coerced to 0**. Leave the seam for donut/line but do
**not** implement them — that is E4's scope.

---

### Stage 3 — The two modes

---

#### Q14 · `<DeckViewer>` — animated read-only · M · ⚠ the primary product surface

**Depends:** Q7, Q9, Q10–Q13 · **Read:** `components/Presentation/PresentationRuntime.tsx` in full;
`state/deck/presentation.ts` in full
**Owns:** `components/DeckViewer/**`, its export from `src/index.ts`

**Contract.**
```tsx
export interface DeckViewerProps {
  spec: DeckSpec
  slideIndex?: number                 // controlled; uncontrolled when absent
  buildStep?: number
  onSlideChange?: (index: number) => void
  onBuildStepChange?: (step: number) => void
  driver?: MotionDriver               // defaults to createWAAPI_driver()
  autoAdvanceMs?: number
  className?: string
}
export const DeckViewer: React.FC<DeckViewerProps>
```

**Implementation.**
1. **No `TldrawApp`, no MobX, no canvas, no session system.** Assert this structurally (see
   acceptance), not by convention.
2. Per slide: `compileSlide(spec.slides[i], frame, tokens)` → for each shape, `shapeToBlock` →
   `registry.get(type).layout(props, deckLayoutContext(...))` → `renderNodeToDom(node)`.
   *Optimisation available if needed:* skip the shape round trip and lay the `BlockSpec` out
   directly from the region box. Only do that if profiling says so — going through `compileSlide`
   keeps the viewer and the editor provably on one path, which is worth more than the allocation.
3. **Build steps: reuse, do not reimplement.** `computeBuildSteps(page: TDPage): BuildStep[]` and
   `stepChainDelayMs(page, steps, index): number` in `state/deck/presentation.ts` are **pure
   functions of a `TDPage`** with no editor coupling — the module's own doc comment says they were
   kept that way for exactly this. `PresentationRuntime.tsx` is the part that binds to
   `useTldrawApp`; do not reach into it. Feed them the `TDPage` that `compileSlide` produced.
   If a spec-level variant reads more cleanly (`computeBuildStepsFromSpec(SlideSpec)` reading
   `motion.order`/`motion.trigger` straight off each `BlockSpec`), that is acceptable — record which
   you chose and why.
   `BuildStep` is `{ shapeIds: string[]; auto: boolean }`; `auto` steps self-reveal on a timer of
   `stepChainDelayMs`, others wait for an advance.
4. Motion runs through `MotionDriver` from B1 (`play` / `set` / `timeline` / `cancelAll`). Animate
   only `opacity`, `translate`, `scale`, `clip-path`, `filter`, `stroke-dashoffset` — the driver
   already asserts this. **Never `transform`.**
5. Navigation: →/Space/Enter/click advance the build step then the slide; ←/Backspace reverse;
   Home/End jump. Honour `spec.slides[i].skip`.
6. `prefers-reduced-motion`: keep the build steps, make transitions instant. Use `driver.set()`
   instead of `driver.play()`; do not skip the step.
7. Call `driver.cancelAll()` on slide change and on unmount. An abandoned WAAPI animation holding
   `will-change` on an unmounted subtree is a real leak.

**Acceptance.** The viewer renders the demo deck **importing nothing from `state/TldrawApp`** —
assert that with an import-graph test (walk the module graph from `components/DeckViewer/index.tsx`),
not by eye. `prefers-reduced-motion` keeps every build step. Measure and report the viewer's bundle
size in isolation — that is the number a host cares about most.

---

#### Q15 · Edit mode and save-back · S · *parallel with Q14*

**Depends:** Q7, Q8 · **Owns:** `examples/nextjs-sample/**` (edit route only)

**Implementation.** Load `DeckSpec` → `addDeckFromSpec` → `<Tldraw>`. A **Save** button calls
`documentToDeckSpec(app.document)` and PUTs to the mock API. Render the diff between the spec that
went in and the spec that came out, so the round trip is visible rather than asserted.

**Acceptance.** Edit a block's text → save → reload → the edit is there. Drag a block out of its
region → save → it is in `free[]`. Both verified through the real UI, not through `window.app`.

---

#### Q16 · Build-step motion in the editor · M · *= B3; parallel with Q14/Q15*

**Depends:** Q7 · **Read:** `components/Presentation/PresentationRuntime.tsx` **in full** first
**Owns:** `components/Presentation/**`, `blocks/shape-bridge.ts` (the animation derivation only)

**Implementation.** Block-level reveal compiles to a `ShapeAnimation`
(`{ effect, trigger, order, durationMs, delayMs }`) so `computeBuildSteps` drives it unchanged —
`blockToShape` already derives one when `spec.motion` carries `order` or `preset`. Part-level motion
runs inside the block through the WAAPI driver.

**Acceptance.** A `fadeIn` block **exports at full opacity**, and `renderPageToSvg` output is
unchanged by any motion field (the Phase 16 guarantee). Use `translate`/`scale`, **never
`transform`** — `usePosition` owns `transform` through a MobX autorun, and the last write wins,
silently.

---

#### Q17 · Three-way parity · S · ⚠ this is item 4 of §3

**Depends:** Q14, Q15 · **Owns:** `tools/visual/scenarios/parity-3way.js`, its spec

**Implementation.** For all 6 demo slides, measure every part's geometry on all three paths —
editor canvas (Playwright, `getBoundingClientRect` at zoom 1, converted to slide units),
`<DeckViewer>`, and the `renderPageToSvg` output — then compare each pair. Reuse
`parity-harness.ts`'s part-collection walk rather than writing a third one.

**Acceptance.** Within 1 slide unit on every part, every slide, every pair. Where it does not match,
**report the number**; do not widen the tolerance to pass.

---

### Stage 4 — Assembly and close-out

---

#### Q18 · Next.js demo app + mock FastAPI · M

**Depends:** Q17 · **Owns:** `examples/nextjs-sample/**`, `blocks/index.ts` (the library wire-up)

**Implementation.** Routes `/edit/[deckId]` and `/view/[deckId]`, both reading `DeckSpec` from a
mock API (a route handler returning static JSON is enough — do not stand up a real FastAPI here).
The 6-slide demo deck follows the §2.4 example. This is the only task that wires
`library/index.ts` into `blocks/index.ts` (see §6).

**Acceptance.** One JSON URL serves both routes. **`H5`:** rebuild `dist` before expecting
`nextjs-sample` to see new exports — the sample app consumes `dist`, not `src`, and this has cost
time before.

---

#### Q19 · `validateDeckSpec` + AI capability digest · M · *cuttable, but do not cut it for long*

**Depends:** Q6, Q7 · **Read:** `06-slide-composition.md` §6.7
**Owns:** `blocks/validate-deck-spec.ts` (new), `blocks/capability-digest.ts` (new)

**Implementation.** `validateDeckSpec(spec, registry)` returns structured findings **written to be
fed straight back to the model as a fix instruction** — `BACKLOG.md` calls this "the cheapest quality
lever in the entire plan, worth more than any amount of prompt tuning". Unknown block type → nearest
by keyword. Missing required slot → name it. Over `maxChars`/`max` budget → say by how much.

The capability digest is **generated from `BUILT_IN_BLOCKS`** (Q3) and includes the layout → region
name table from §2.5. Never hand-written; a copy drifts from the library within one sprint.

**Acceptance.** 20 adversarial specs — unknown type, missing required slot, 400-char title, 60-item
list, 6-deep nesting, wrong region name, cyclic `children` — each produce a specific finding and
**never** a crash or a silently broken slide.

---

#### Q20 · Close out · XS

**Depends:** Q17, Q18

**Implementation.** Write `reviews/blocks/RUN-demo.md` (commands to run the demo from a clean
checkout). Update the tracker in `README.md` and the phase notes in `08-phase-plan.md`. **State what
the demo does not prove** — governing rule #8.

---

## 8. Mapping back to `BACKLOG.md`

| Demo | Old id | Relationship |
|---|---|---|
| Q0 | — | New (fixes a defect in `CONTINUE.md` §4) |
| Q1 | A1 | **Repair** — A1 is marked ✅ but `layoutChild` never placed a child |
| Q2 | C3 | **Repair** — the `style.scale` acceptance criterion was never met |
| Q3 | H4 + new | Debt cleanup + the aggregate `library/index.ts` that does not exist |
| Q4 | A6 | **Repair** — A6 renders blocks, but with fabricated tokens |
| Q5 | A4 | **Harden** — A4 is marked ✅ but never runs the DOM renderer; covers 3 of 8 kinds |
| Q6 | **D1** | **Replaces** — D1 drifted from its own §6.7 design; this is the corrected version |
| Q7 | **D3** | Extends — `regions[]`, `free[]`, findings instead of a silent `continue` |
| Q8 | — | **New; absent from the old backlog**, which assumed a one-way flow |
| Q9 | A5 + §7.3 G1 | Completes — A5 leaves `Deck.blocks` undefined by default |
| Q10–Q12 | **E2** (9 of 24) | Slice |
| Q13 | **E3 + E4** (1 of 32) | Slice; engine leaves a seam for donut/line |
| Q14 | — | **New.** The old backlog assumed read-only meant presentation mode inside the editor. |
| Q15 | — | New (needs Q8) |
| Q16 | **B3** | Unchanged |
| Q17 | — | New. The test the architecture is missing — now three-way, not two. |
| Q18 | — | New |
| Q19 | **D6** | Reduced (validate + digest; not yet the 10 golden fixtures) |
| Q20 | — | New |

The four tasks with no old-backlog equivalent (Q8, Q14, Q15, Q17) all trace to one assumption the
old backlog made and this architecture breaks: that a deck lives inside the editor and `DeckSpec` is
a one-way import format. Once the database holds `DeckSpec` and viewers never open the editor, all
four become mandatory.

---

## 9. Verified commands

```bash
# Tests — npx jest works fine.
cd packages/tldraw && npx jest --silent 2>&1 | tail -8

# Typecheck — tsc lives in the ROOT node_modules, NOT in packages/tldraw.
# (`packages/tldraw/node_modules/.bin/` contains only eslint and lask.)
# `--noEmit` alone fails TS5053 because tsconfig sets emitDeclarationOnly.
cd packages/tldraw && ../../node_modules/.bin/tsc -p tsconfig.json \
  --noEmit --emitDeclarationOnly false 2>&1 | grep -E 'error TS'

# `cmd | tail` followed by `$?` reports tail's exit code. Use ${PIPESTATUS[0]}.
# The build tool does NOT fail on type errors — read its output, don't trust its exit code.

cd packages/tldraw && npx eslint src/blocks --ext .ts,.tsx

# Build — call turbo directly, NOT through the yarn script.
# The pinned turbo (1.13.4) removed `--stream`, and the root package.json still
# passes it, so `yarn build:packages` AND `yarn test` both die with
# "unexpected argument '--stream'". That also means the husky pre-commit hook
# (which runs `yarn test`) can never pass — commit docs with --no-verify, and
# run jest yourself. The replacement flag is `--log-order=stream`.
# CONTINUE.md §4 blames a "newer turbo grabbed by npx"; that is backwards.
./node_modules/.bin/turbo run build:packages

node tools/visual/shoot.js <scenario> [--base=URL]
cd examples/nextjs-sample && npx next dev -p 5433  # consumes dist — REBUILD first
```

**Worth fixing as part of Q0:** change the root `test` and `build:packages` scripts from `--stream`
to `--log-order=stream`. Two characters of real work, and it restores the pre-commit hook for
everyone.

`tsconfig.tsbuildinfo` is an incremental cache and **is tracked by git** — running `tsc` dirties the
working tree. Do not commit it with your changes.

---

## 10. Where to go after the demo

Return to `BACKLOG.md` with **nothing to rewrite**. Recommended order:

1. **The rest of E2** (15 text blocks) — the cheapest lane; the pattern is set by Q10–Q12 and it
   fans out freely.
2. **F1 + F2** (inserter + inspector) — moves the demo from "code builds a deck" to "a person builds
   a deck". Both need only E1, which is done; `BUILT_IN_BLOCKS` from Q3 is F1's input.
3. **Full D6** (the 10 golden fixtures) — Q19 laid the groundwork; this is where AI output quality
   gets locked down.
4. **The rest of E4** and **E7** (media/icons) — Q13's engine is the foundation.
5. **D5** (overflow cascade) — only now are there real blocks to overflow, and a `<DeckViewer>` to
   watch them overflow in.
6. **B4**, **G1–G4**, **E5/E6**, **E8–E10**.
7. **H1/H2** (`packages/blocks`) — when the block count makes bundle size a real problem. With
   `<DeckViewer>` shipping to every viewer, that arrives sooner than the old backlog assumed.

Four things hold regardless of the route taken:

- **Q0 before anything.** A broken instrument turns every later task into guesswork.
- **Q5 before any Epic E task.** The parity harness is what stops 170 blocks from drifting; writing
  blocks first means writing them twice, and the 2026-09-16 review shows that has already happened.
- **Q6 alone.** It is small, but fourteen tasks target it.
- **Q8 before any promise to the AI side.** Without the reverse path the model can only create, never
  revise — and revision is most of the value of an AI slide product.
