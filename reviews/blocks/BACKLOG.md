# Block system backlog — agent-sized tasks

Phases P20–P32 in [08-phase-plan.md](08-phase-plan.md) are too large to hand to one agent
(P24 alone is 38 blocks). This file breaks them into **one-session tasks**, each with its own
scope, files, and acceptance.

**Before starting any task, read [CONTINUE.md](CONTINUE.md)** — current state, the verified
commands (three of them are traps), the measured baselines, and the traps that have already cost
time. Then read the task's own "Read" line.

**Status legend:** ⬜ not started · 🔄 in progress · ✅ done · ⛔ blocked

---

## How to hand a task to an agent

Give it: the task id, the paths under **Read**, the **Do** and **Acceptance** sections verbatim,
and this line:

> Read `reviews/blocks/CONTINUE.md` first — it has the current state, the verified commands (some
> obvious ones are broken in this repo), the measured baselines you must not regress, and the
> traps. Do not commit; leave changes in the working tree. Report the command outputs verbatim,
> and name anything you could not do rather than hiding it.

**Definition of done for every task, without exception:**

1. Jest: more passing than the baseline, zero failures, the 77 todo tests untouched.
2. Typecheck: still exactly the 10 pre-existing `.spec.ts` errors, zero in non-spec source.
3. eslint on touched dirs: 0 errors, 0 warnings outside spec files.
4. No `TldrawApp.version` bump, no `migrate.ts` change, no new npm dependency.
5. Anything derived from a module-level object is **copied**, asserted with `not.toBe` *and*
   `toEqual`. This bug class has shipped here three times.
6. Layout-facing code is pure and DOM-free (no `document`, `window`, `Date.now`, `Math.random`).
7. Scope cuts are named as follow-ups in the task's notes, never silently dropped.

---

## Epic A — The rendering spine  *(P20 + P21)*

**The critical path.** Nothing visual, no export, and no thumbnail works until A5 lands. Do this
epic first and in order.

### A1 · Layout engine core ✅
**Depends:** — · **Size:** M
**Read:** `01-architecture.md` §1.6–1.8, `04-block-anatomy.md` §4.2–4.6
**Do:** `blocks/layout/` — box model helpers (`insetBox`, `anchorBox`, `splitBox`), `layoutChild`
with the depth cap at 4, the `measureText` provider interface, and `estimateMetrics` (reuse Phase
15's `estimateTextSize` heuristic — do not write a second one). Construct a real `LayoutContext`;
it is currently declared but never instantiated.
**Acceptance:** a `LayoutContext` can be built from a theme + tokens + box; `layoutChild` nests 3
deep correctly and rejects 5 with a lint error, not a stack overflow; `measureText` returns the
same result in Node and jsdom for the same input.

### A2 · DOM renderer ✅
**Depends:** A1 · **Size:** M
**Read:** `01-architecture.md` §1.6, §1.12
**Do:** `blocks/render-dom.tsx` — every `LayoutNode` kind → React, absolutely positioned in slide
units, `data-part` stamped on every node carrying a `part`.
**Acceptance:** all 8 node kinds render; `data-part` attributes match the parts the tree declares;
no layout is computed in the renderer (it only places what layout already resolved).

### A3 · SVG renderer ✅
**Depends:** A1 · **Size:** M · **Parallel with A2**
**Read:** `01-architecture.md` §1.6, §1.12 items 5–6
**Do:** `blocks/render-svg.ts` — pure string output, no DOM. Gradients via `<defs>`.
**Acceptance:** runs in Node with no `document`; **paint set via inline `style`, never the `fill`
attribute** (Phase 11: a CSS class beats a presentation attribute regardless of specificity);
**paint on inner nodes, never an outer container** (Phase 8a: outer paint looks right live and
vanishes from export).

### A4 · Parity harness + 3 probe blocks ✅
**Depends:** A2, A3 · **Size:** M
**Read:** `09-testing.md` §3
**Do:** `assertParity(definition, props, box)` — render once through `layout()`, then compare DOM
geometry (Playwright, `getBoundingClientRect` at zoom 1, converted to slide units) against SVG
geometry (parsed attributes). Plus three throwaway blocks exercising every node kind.
**Acceptance:** parity within **1 slide unit** per part; fill/stroke exact; text content and line
count exact. A deliberately broken renderer must make it fail — prove that, don't assume it.
**This is the test the whole architecture rests on.** If it is weak, 170 blocks drift.

### A5 · Headless block rendering ✅
**Depends:** A3 · **Size:** S · **CRITICAL**
**Read:** `07-integration-readiness.md` §7.3 G1, `state/render/renderPageToSvg.ts` end to end
**Do:** add `RenderPageToSvgOptions.blocks?: (shape, ctx) => string | undefined`; pass it through
`Deck.getThumbnail` / `Deck.exportSlidePng` / a new optional `<Tldraw blocks>` prop; route Tier-B
`poster()`.
**Acceptance:** with **no** `blocks` option, output is byte-identical to the pre-A5 snapshot (the
placeholder contract is preserved); with it, a slide of blocks renders real SVG in Node; a Tier-B
block exports its poster, not a hole.
**Why it matters:** until this lands, every server thumbnail, SVG export, PNG **and** PDF of a
block-built slide is a dashed placeholder. `Deck.exportSlidePng` does not escape it — it
rasterizes `renderPageToSvg`'s output.

### A6 · Live editor draws real blocks ✅
**Depends:** A2 · **Size:** S
**Do:** `ComponentUtil` renders through `render-dom` instead of `createBlockComponents`'
placeholder. Update `examples/nextjs-sample`'s **Add P18 block** demo to show a real block.
**Acceptance:** a visual scenario screenshot shows a rendered block, not a grey box. Look at it.

---

## Epic B — Motion  *(P22)* — parallel with Epic A

### B1 · Driver + tokens ✅
**Depends:** — · **Size:** S
**Read:** `05-motion-system.md` §5.2, §5.6
**Do:** `blocks/motion/` — the transitions.dev token scale (durations/easings/distances×3/scales/
blur) as data, the `MotionDriver` interface, and `waapiDriver` (Web Animations API, **no new
dependency**).
**Acceptance:** the driver only ever animates `opacity`/`translate`/`scale`/`clip-path`/`filter`/
`stroke-dashoffset` — a test asserts no call touches `transform`, `width`, `height`, `top`,
`left`, `box-shadow`. `will-change` is removed on finish.

### B2 · The 34 presets ✅
**Depends:** B1 · **Size:** M
**Read:** `05-motion-system.md` §5.3 (the full table)
**Acceptance:** every preset in the table exists and is unit-tested for the properties it emits;
`motion.parts` names match parts `layout()` emits (rule `motion/orphan-part`).

### B3 · Build-step playback ✅
**Depends:** B1, A6 · **Size:** M
**Read:** `components/Presentation/PresentationRuntime.tsx` **in full** before touching it
**Do:** block-level reveal compiles to `ShapeAnimation` so `computeBuildSteps` drives it
unchanged; part-level motion runs inside the block via the driver.
**Acceptance:** **a `fadeIn` block exports at full opacity** and `renderPageToSvg` output is
unchanged by any motion field (the Phase 16 guarantee); `prefers-reduced-motion` keeps build steps
but makes transitions instant; use `translate`/`scale`, **never `transform`** (`usePosition` owns
it via a mobx autorun — last write wins, silently).

### B4 · Slide transitions ⬜
**Depends:** B1 · **Size:** S
**Do:** add `wipe`, `cover`, `uncover`, `zoom` alongside the existing fade/push/cut. One-sided, and
honest about it.

### B5 · GSAP adapter (optional) ⬜
**Depends:** B1 · **Size:** S
**Do:** `gsapDriver(gsap)` as a separate entry point taking the **host's own** gsap instance. No
bundled copy, no peer dependency, no import from the main entry.

---

## Epic C — Text  *(P23)*

### C1 · RichText + line breaking ✅
**Depends:** A1 · **Size:** M
**Do:** `RichText = { runs: { text, bold?, italic?, color?, size? }[] }` — inline runs only, no
nesting, no HTML. Line breaking preserves runs across breaks; output `TextLine[]` with explicit
baselines.
**Acceptance:** a paragraph with 3 runs wrapped over 4 lines keeps run boundaries; CJK+Latin mixed
measurement works (different rates).

### C2 · Metrics providers ✅
**Depends:** C1 · **Size:** M
**Do:** `estimateMetrics` (default), `tableMetrics` (Node, the 4 built-in faces), `canvasMetrics`
(browser, opt-in). **Deck-level choice, not per call.**
**Acceptance:** editor and export pick the same provider by default — mixed providers make a slide
reflow between edit and export, which is worse than both being approximate.

### C3 · Autofit, lists, vertical align ✅
**Depends:** C1 · **Size:** M
**Acceptance:** autofit shrinks to a 0.75 floor then reports overflow, never below; list markers
(dot/dash/chevron/number/icon) with indent levels; **`style.scale` multiplies font size in every
path** — that exact omission silently broke every template export from Phase 13 to 15.

### C4 · Rich text in both renderers ⬜
**Depends:** C1, A2, A3 · **Size:** S
**Do:** `<tspan>` runs in SVG, `<span>` runs in DOM.
**Acceptance:** parity (A4) passes for rich text at 3 widths.
**Known unhandled, keep visible:** bidi/RTL. Add a failing-by-design fixture, do not pretend.

---

## Epic D — Slide & deck data structures  *(pulled forward from P29/P32)*

**D1–D3 depend on nothing and can start immediately, in parallel with Epic A.** Only D5 needs real
blocks. This is the half of the data model that does not exist yet: `TDPage` already persists
`size`/`background`/`notes`/`skipInPresentation`, but there is no authoring/compile layer.

### D1 · SlideSpec / MasterSpec / DeckSpec types ✅
**Depends:** — · **Size:** S
**Read:** `06-slide-composition.md` §6.2, §6.5, §6.7
**Do:** the three types, plus optional `TDDocument.masters?` and `TDPage.masterId?`.
**Acceptance:** additive only — no version bump, no migration; a document without them loads
unchanged; full JSON round-trip.

### D2 · The 16 slide layouts ✅
**Depends:** D1 · **Size:** M
**Read:** `06-slide-composition.md` §6.3, `02-design-language.md` §2.7
**Do:** each layout as a pure `compile(frame, tokens) → Record<string, Box>`. Pure geometry plus
the P19 spacing scale — **no block needs to exist for this.**
**Acceptance:** every region stays inside the safe margin at 16:9, 4:3 and 9:16; declared ratios
are actually produced; no two regions overlap. All numeric — no renderer required.

### D3 · compileSlide ✅
**Depends:** D2 · **Size:** M
**Do:** `compileSlide(SlideSpec, frame, tokens) → { shapes, background, masterId }`, using
`blockToShape`. Add `Deck.addSlideFromSpec(spec, opts?)`.
**Acceptance:** a 3-slide `DeckSpec` compiles to a valid `TDDocument` in Node with no editor
mounted; every shape gets a unique id and childIndex (the P18 bug).

### D4 · Master rendering ✅
**Depends:** D1, A2, A3 · **Size:** M
**Read:** `06-slide-composition.md` §6.5 — this closes the master/layout follow-up open since P13
**Acceptance:** master blocks render behind slide content in editor, presentation **and**
`renderPageToSvg`; are not in `page.shapes` and cannot be selected; page numbers stay correct after
a reorder; `editorOnly` blocks (`x.safe-area`, `x.grid-guide`) never appear in any export path.

### D5 · Overflow cascade ⛔ *(needs real blocks)*
**Depends:** D3, E2 · **Size:** M
**Read:** `06-slide-composition.md` §6.4, `01-architecture.md` §1.8
**Do:** expand → reflow → shrink → paginate → truncate, in that order.
**Acceptance:** a 30-item list paginates into 2 slides with build order preserved; **truncation
always emits a visible marker and a lint finding** — a silently cut bullet is the worst outcome.

### D6 · AI contract ⬜
**Depends:** D3, G1 · **Size:** M
**Read:** `06-slide-composition.md` §6.7
**Do:** `validateDeckSpec()` returning structured, actionable findings; a prompt-sized capability
digest **generated from the library** (never hand-written — a copy drifts); 10 golden fixtures.
**Acceptance:** 20 adversarial specs (unknown type, missing slot, 400-char title, 60-item list,
6-deep nesting, wrong region name, cyclic children) each produce a specific finding and **never** a
crash or a silently broken slide.

---

## Epic E — The block library  *(P24–P28)*

**Do not start before A4.** Without the parity harness, 170 blocks drift apart silently.
Every block must meet the **ten-point definition of done** in `04-block-anatomy.md` §4.9.
E2–E7 are independent of each other — this is the epic to fan out across agents.

| id | Task | Count | Depends | Read |
|---|---|---|---|---|
| **E1** ✅ | Layout containers | 14 | A4 | `03` §A, `04` E1–E2 |
| **E2** ✅ | Text blocks | 24 (9 done) | E1, C3 | `03` §B, `04` E3–E4 |
| **E3** ✅ | Chart engine (`_engine/`) | — | E1 | `04` §4.8 |
| **E4** 🔄 | Data & chart blocks | 32 (1 done) | E3 | `03` §C, `04` E5–E6 |
| **E5** ⬜ | Diagram blocks, part 1 (order/link) | 15 | E1 | `03` §D, `04` E7 |
| **E6** ⬜ | Diagram blocks, part 2 (parent/contrast/membership) | 15 | E1 | `03` §D |
| **E7** ⬜ | Media & icon blocks | 24 | E1 | `03` §E, `04` E8 |
| **E8** ⬜ | Composite slide blocks | 20 | E1–E7 | `03` §F, `04` E9 |
| **E9** ⬜ | Chrome / master blocks | 14 | D4 | `03` §G |
| **E10** ⬜ | Tier-B live blocks | 12 | A6 | `03` §H, `04` E10 |

**Per-epic acceptance beyond the ten points:**
- Every block renders its `defaults` under all 5 themes on light/dark/gradient with **zero lint
  findings**.
- Contact-sheet scenario per family, run against the adversarial set in `09-testing.md` §9.5
  (1 item, 40 items, a 400-char word, CJK, all-zero, one huge outlier, missing values, missing
  asset). **Look at the screenshots.**
- E3: zero baseline always; ≤6 hues; single series uses `accent` not `categorical[0]`; NaN/null
  explicit per chart type, never silently zeroed.
- E5/E6: no block may use `LineShape.handles` semantics — a block's `line` node is in the block's
  own coordinate space (Phase 13 shipped three invisible dividers this way).
- E8: composites introduce **no new `LayoutNode` kind** — assert their layout delegates entirely
  to `layoutChild`.

---

## Epic F — Authoring UX  *(P30)*

**Every task here must carry `stopKeyPropagationUnlessEscape` on every free-typed field**, or
<kbd>Tab</kbd> clones the shape being edited and every later edit lands on the clone. Test it by
actually typing Tab and asserting the selection did not change.

| id | Task | Depends |
|---|---|---|
| **F1** ⬜ | Block inserter — search by name/keywords/summary, previews via `renderNodeToSvg` (so a preview can never drift from what insertion produces) | E1 |
| **F2** ⬜ | Inspector generated from `BlockSchema` — content slots first, options second | E1 |
| **F3** ⬜ | In-place text editing on text parts | C1, E2 |
| **F4** ⬜ | Master editing mode | D4 |
| **F5** ⬜ | Carried debts: replace `window.prompt` rename with a real inline input; surface `ImageShape.alt` (reserved since Phase 3, still no UI) | — |

**Acceptance:** every inspector edit is one undo step; a slider drag is one, not one per pixel;
overlays portal to `document.body` (`.tl-positioned-div` clips); block interactions
`stopPropagation` on pointer-down. Drive the **real UI** in the scenario — follow the
`stylepanel.js` precedent where `window.app` only seeds and reads.

---

## Epic G — Deck Doctor  *(P31)*

| id | Task | Depends | Read |
|---|---|---|---|
| **G1** ⬜ | Linter core + legibility rules (contrast, type scale, overflow) | E1 | `02` §2.8 |
| **G2** ⬜ | Composition + colour/effect rules | G1 | `02` §2.8 |
| **G3** ⬜ | Motion + deck-level rhythm rules | G1, B2 | `05` §5.9 |
| **G4** ⬜ | Deck Doctor panel | G1 | — |

**Acceptance:** one positive **and** one negative fixture per rule (the negative asserting **no**
finding); the linter never edits — assert by deep-comparing the document before and after; runs in
Node with no DOM; a 60-slide deck lints in under 2s. **Report only, no auto-fix** — a linter that
edits is a linter nobody trusts.

`resolveColor` can return `ok: false` only for floors above √21 ≈ 4.583; nothing uses such a floor
today, but treat it as a real finding rather than assuming success.

---

## Epic H — Packaging & carried debt

| id | Task | Depends | Notes |
|---|---|---|---|
| **H1** ⬜ | Create the `packages/blocks` workspace package | E1 | Deferred from P18 on purpose. Touches `pnpm-workspace.yaml`, root `package.json`, `turbo.json`, needs a reinstall. **Must ship transpiled `dist`** — raw JSX fails at a consumer's *runtime*, not at build time. |
| **H2** ⬜ | Add `@tlslides/blocks` to `examples/consumer-smoke` + bundle budget check | H1 | < 250KB min+gzip, importable per family (`@tlslides/blocks/data`). 170 blocks in one bundle is a real risk for a host. |
| **H3** ⬜ | Rework `tools/visual/scenarios/tokens.js` | A6 | It proves contrast numerically but draws every swatch on one dark card, so it cannot show legibility on the surface under test — which was the whole point of a visual check. |
| **H4** ⬜ | Fix `surfaceFromPaint` doc/signature drift if P20 finds a better shape | A1 | Currently 3 args (`paint, box, parentBox`); §2.4 records why. |
| **H5** ⬜ | Rebuild `dist` + re-verify `examples/nextjs-sample` after each epic | any | The sample app consumes `dist`, not `src`. New exports do not appear until a rebuild. |

---

## Suggested order

```
A1 ─┬─ A2 ─┬─ A4 ── A6 ──────────────── E1 ─┬─ E2 ─ E4* ─ E5 ─ E6 ─ E7 ─ E8
    └─ A3 ─┘       └─ A5  (CRITICAL)        ├─ E3 ─┘
                                             ├─ F1, F2, G1
B1 ─ B2 ─ B3 ─ B4 ─ B5      (parallel)       └─ H1 ─ H2
C1 ─ C2 ─ C3 ─ C4           (after A1)
D1 ─ D2 ─ D3 ─ D4 ─ D5 ─ D6 (D1–D3 parallel from day one)
```

Three things worth holding to:

1. **A5 before any promise about thumbnails, export or PDF.** It is small and it is the difference
   between a product and a demo.
2. **A4 before Epic E.** The parity harness is what stops 170 blocks from drifting; writing blocks
   first means writing them twice.
3. **D1–D3 are free right now** — pure types and pure geometry, no dependency on any block
   existing. They complete the data model (block ✅ / slide ❌ today) and de-risk D6, the AI
   contract, which is otherwise last in the queue.
