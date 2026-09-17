# Enhancement backlog — from demo to an AI-composed deck product

**Date:** 2026-09-17 · **Branch:** `plan/block-system` · **Against commit:** `8320c6a0` · **Supersedes nothing** —
[BACKLOG-demo.md](BACKLOG-demo.md) (Q0–Q20) is closed; [BACKLOG.md](BACKLOG.md) stays the long-form
epic list. This file is the **next vertical slice** and the order in which to work it.

It was written after a review of the running demo (a real browser driving `/view` and `/edit`,
screenshots looked at) and an audit of the block/slide source against the product vision below.
§1 is the review. §2 is the gap analysis. §3 is the prioritised task list, each task carrying an
implementation direction and a checkable expected output so an implementing agent does not need
to re-derive the design. The companion how-to is
[guides/blocks-authoring.md](../../guides/blocks-authoring.md): using the demo, adding a block,
and the FastAPI/LLM integration flow.

## 0. The product vision this measures against

A Next.js host embeds the editor and the viewer. A FastAPI backend calls an LLM which **picks
block templates from a catalog and composes them into slides**. Therefore:

- Blocks are **composite clusters** (heading + body + image; icon + title + description × N;
  KPI tile with value + delta + label), not a single word, sentence or picture.
- Every block is **describable in a short text** so the model can understand the whole catalog and
  fill a block correctly from one prompt.
- Every block instance has configurable **text color, background color including linear
  gradient, entrance animation, delay before showing**, and a **computable total show duration**
  so the backend can plan the choreography of a slide numerically.
- A person can **edit a block's content quickly in the editor UI**.
- Blocks can be **HTML (DOM)** so custom animation libraries such as **GSAP** can drive them.
  **HTML support comes first.**

---

## 1. Review of the demo (what actually happened in a browser)

Environment: dev server on `:5433`, headless Chromium 1600×1000, 15 `ArrowRight` presses on
`/view`, then `/edit` driven by pointer. Screenshots were taken and looked at; the claims below
are from the pixels, not from HTTP status codes.

### 1.1 What works

| Area | Evidence |
|---|---|
| Round trip `JSON → editor → JSON` | `/edit` Save produces the round-trip panel; findings are the two expected ones (`shape/no-region-match` info and `free/aspect-risk` warning on the hand-placed block of slide 6). |
| Viewer build steps | 14 presses walk 6 slides and 12 build steps in the declared order; the chart, insight box and bullets on slide 3 build in three steps. |
| Console | **Zero** errors and zero warnings across the whole viewer session. |
| Editor ↔ viewer geometry | Q17's measurement stands: 109 rows compared, 0 failing, worst delta 0.7 units. |
| Mock API | GET serves `data/decks/deck-demo-q3.json`; PUT stores in memory; ids are sanitised. |

### 1.2 What is broken — visible in the screenshots

**F1 · Text overlaps on three of six slides** (`view-s1-step0.png`, `view-8.png`, `view-9.png`).

- Slide 1: the subtitle "Q3 FY2026 · prepared for the board" is drawn *through* the two-line title.
- Slide 4: each `hero-number` value wraps ("$4.2" / "M") and its second line sits on top of the
  unit label; "61%" and "118" overlap their labels too.
- Slide 5: the kicker "Q3 engineering retrospective" is drawn through the quote text.

Two causes, both structural, both cheap to fix:

1. **`compileSlide` splits a region equally among its blocks** — `slide-compiler.ts:123-141`
   sets `blockHeight = (regionBox.height − gaps) / totalBlocks`. The title region of the `title`
   layout holds kicker + title + subtitle, so a `display`-size title is given one third of the
   region and paints past its box into the subtitle's. Blocks have no say in their own height
   even though every text block *measures* its content in `layout()`.
2. **The metrics the layout uses are not the metrics the browser renders with.** `resolveText`
   returns a `family`, but no theme sets one and the Next.js sample loads no web font
   (`app/layout.tsx` is bare), so Chromium falls back to DejaVu Sans, which is markedly wider than
   the estimate table assumes. The estimate says "$4.2M" fits on one line in a 400-unit column;
   the browser wraps it.

The editor and the viewer *agree* on the geometry (Q17) — they agree on the wrong geometry. Parity
measured boxes, not glyphs.

**F2 · The editor shows slide 1 without its title** (`edit-initial.png`). The kicker is there, the
subtitle is visible as the top half of one line of glyphs, and the title is not painted at all.
The viewer paints all three. The likely mechanism is the shape wrapper's `overflow: hidden`
(`ComponentUtil.tsx:242`) clipping to the one-third box from F1 while the viewer's DOM has no such
clip — the title's first painted line starts below its own box. Hypothesis; the task below
verifies before fixing.

**F3 · No content can be edited from the UI.** Double-click, click-then-click and
click-then-double-click on the title never produced a selection or an editable field;
`document.activeElement` stayed on a wrapper `div`. Typing " EDITED" was consumed as tldraw
shortcuts (the tool switched to Draw). The GET after Save still holds the original title.
`ComponentUtil.tsx` has no `onDoubleClick`, no `contentEditable`, no inspector binding — the only
interaction is generic select/drag/resize. Editing a block today means `app.updateShapes` from
code.

**F4 · No per-block style or motion affordance in the UI.** "Styles", "Background" and "Theme"
act on the canvas or the theme. Right-click on a block opens the browser's own menu.

**F5 · Chrome in the way.** The slide-thumbnail strip opens by default on `/edit`, floats over the
right ~15% of the canvas, and is not dismissed by Escape or a canvas click. A persistent red
"1 Issue" badge sits bottom-left. Neither is fatal; both make the demo look unfinished.

**F6 · Nothing exposes viewer position.** No `data-slide-index`, `data-build-step`, `aria-*` or
"n / N" text anywhere in `/view`'s DOM. Automation and assistive tech are both blind; the QA run
had to detect the end of the deck by comparing screenshots.

---

## 2. Gap analysis — the code against the vision

Each row: what the vision needs, what exists, where the gap is, and which task closes it.

| Need | Exists today | Gap | Task |
|---|---|---|---|
| **HTML blocks** | `LayoutNode` has `k: 'host'` (`types.ts:292`). `render-dom.tsx:283` renders it as an **empty `<div data-render>`** — no children, no ref, no mount hook. `render-svg.ts:311` draws a dashed placeholder. **No shipped block emits a host node**; the only user is a test probe. | No mount/update/unmount lifecycle, no registry of host renderers, no way to inject markup, nothing for GSAP to attach to. | **R1, R2** |
| **GSAP** | README rule 6 already allows GSAP *as a host-injected adapter*. `MotionDriver` interface exists (`motion/driver.ts:111`). B5 in `BACKLOG.md` is the adapter, not started. | No adapter, no per-block `animate()` hook, no timeline shared between a block and the slide's build steps. | **R3** |
| **Per-block text/background color, gradient** | `BlockStyleSpec` (`types.ts:51-72`) declares `surface`, `on`, `accent`, `tone: 'gradient'`. `Paint.linearGradient` exists and **both renderers already draw gradients** (`render-dom.tsx:31`, `render-svg.ts:40`), but only for slide/master backgrounds. | `style` is persisted by `shape-bridge.ts` and **read by nobody** — no `layout()` and not `createLayoutContext` consult it; `surface` cannot carry a `Paint`. The field is inert. | **R4** |
| **Entrance animation, delay, duration, stagger** | `BlockMotionSpec` declares all of them; 35 presets in `motion/presets.ts`; `resolveBlockMotion` / `resolvePartMotion` exist and are unit-tested. | `shape-bridge.ts:93` hardcodes `effect: AnimationEffect.FadeIn` for every block. `resolvePartMotion` has **zero call sites**. `DeckViewer` animates the whole shape element only. Every preset plays as a fade; `delay`/`duration`/`stagger` are ignored at runtime. | **R5** |
| **Total show duration per block** | Timing tokens, `computeBuildSteps`, `stepChainDelayMs` (`state/deck/presentation.ts:54,74`). | No function sums preset duration + delay + stagger × items into one number; nothing gives a slide's timeline. | **R6** |
| **Describable for an LLM** | `capabilityDigest()` is generated from the registry: summary, keywords, slot table with writer guidance, one worked slide example. `validateDeckSpec` with 18 rules. | Digest has **no motion vocabulary** (preset ids are `string`), no style vocabulary (the 12 `ColorRole`s are not listed), no per-block filled example, no machine-readable JSON Schema for the backend. | **R7** |
| **Composite blocks** | 24 blocks: 14 layout containers (arrangement only), 9 atomic text blocks, 1 bar chart. `family: 'composite' | 'media'` exist as types and are **empty**. | No image block at all (`k: 'image'` is never emitted by any library block). No hero, feature grid, image+text, comparison, timeline, agenda, team, testimonial, KPI tile with delta. | **R8, R9, R10** |
| **Quick edit in UI** | Generic select/drag/resize. P30 "Authoring UX" is not started. | No inline text editing, no inspector, no inserter. | **R11, R12, R13** |
| **Export / thumbnails** | `renderNodeToSvg` renders a `LayoutNode` tree faithfully. | `renderPageToSvg` treats every `ComponentShape` as an opaque host component and draws a dashed rect (Q17 finding). | **R14** |

The governing rules in [README.md](README.md) hold with two clarifications, recorded here so
nobody relitigates them:

- **Rule 1 (one layout, two renderers)** applies to Tier-A blocks. An HTML block is Tier-B by
  definition; its parity obligation is the one Tier-B already has: a `poster()` layout that the
  SVG renderer draws. The DOM and the poster are *allowed* to differ (that is the point of an
  HTML block); the poster must be a faithful still.
- **Rule 3 (colors are roles)** is satisfied by an HTML block that reads its colors from CSS
  custom properties the runtime sets from the resolved tokens. A template that hardcodes a hex
  value fails review.

---

## 3. Tasks — in the order to do them

**Status legend:** ⬜ not started · 🔄 in progress · ✅ done · ⛔ blocked
**Size:** XS < ½ day · S ≈ 1 day · M ≈ 2–3 days · L = fan out across agents

Every task inherits the **definition of done** in [BACKLOG.md](BACKLOG.md#how-to-hand-a-task-to-an-agent)
(jest green with no todo touched, zero non-spec type errors, eslint clean, no `TldrawApp.version`
bump, no new npm dependency in `packages/`, layout code DOM-free, scope cuts named). Every task
that changes pixels ships or extends a `tools/visual/scenarios/*.js` scenario **and the screenshot
is looked at** — F1 above is exactly the bug class that green tests do not catch.

### The four phases

Each phase has an **entry** condition (what must be true to start), an **exit** condition (what a
reviewer checks, in a browser, before the next phase starts), and a dependency graph. Phases are
sequential; tasks inside a phase run in parallel where the graph allows. The `deck-demo.js`
scenario from R0 is re-shot at the end of every phase and the PNGs are looked at.

| Phase | Goal | Tasks | Entry | Exit (checked in a browser) |
|---|---|---|---|---|
| **A** | The demo stops lying; the HTML/GSAP door is open | R0 → R1 → R2 → R3 | commit `8320c6a0` | No overlapping text on any of the 6 slides; slide 1 is an html hero that animates with GSAP in the sample and degrades to WAAPI without it; SVG of slide 1 shows the poster |
| **B** | Every field the vision needs is live; the catalog is legible to a model | R4 ‖ R5 ‖ R7 ‖ R8, then R6 | Phase A exit | A gradient-surface block renders identically in editor, viewer and SVG; `slide-in-up` visibly differs from `fade`; `slideTimeline().totalMs` matches the recording driver; `GET /api/capabilities` and `/api/schema` serve generated output; 10 golden decks validate clean |
| **C** | The block families and the authoring surface | R9 ‖ R10 (fan out), R11 → R12, R13 | Phase B exit (R7's `describe`, R8's image) | 10 new composites in the digest with contact sheets looked at; double-click edits text and survives Save/GET; the inspector changes surface, gradient, preset and delay and persists them |
| **D** | Export, transitions, the backend contract | R14 ‖ R15 ‖ R16 | Phase B exit (R16's document can start any time) | `parity-3way` compares three paths with 0 failing rows; the mock serves all six endpoints; a generated deck from the mock validates clean |

```
Phase A   R0 ── R1 ── R2 ── R3
Phase B   R4   R5 ── R6   R7   R8            (R4 / R5 / R7 / R8 touch disjoint files)
Phase C   R9   R10  R11 ── R12   R13         (R9 / R10 one agent per block; R11 before R12)
Phase D   R14  R15  R16
```

Every task below carries a **Watch out** section where the logic is genuinely hard. Those
paragraphs were written after reading the code paths involved; they name the trap, why it is a
trap here specifically, and the test that proves it was avoided. An implementing agent should
read them before the **Do** list, not after.

---

### Phase A — The demo stops lying; the HTML/GSAP door is open

#### R0 · Demo polish — the six review findings · S · ⬜

**Goal.** A person opening `/view` and `/edit` sees a deck with no overlapping text, an editor
that shows every block, and no chrome covering the slide.

**Read.** §1.2 above; `blocks/slide-compiler.ts:99-145`; `blocks/layout/measure.ts` (the
`estimate | canvas | table` providers); `components/DeckViewer/DeckViewer.tsx`;
`examples/nextjs-sample/app/layout.tsx`, `components/EditDeck.tsx`.

**Do.**
1. **Intrinsic-height stacking (F1, cause 1).** In `compileSlide`, when a region holds more than
   one block, ask each block for its content height before assigning boxes: run
   `def.layout(props, ctx)` with the region width and read the returned root `box.height`
   (every text block already measures; containers report their preferred height). Assign each
   block its measured height, put `tokens.space.md` between them, and distribute leftover height
   according to the region's vertical alignment (top for `title`-like regions, centre for
   `quote`). A block that measures taller than the region still gets its measured height and a
   `region/overflow` finding is emitted — do not silently shrink it. Keep the equal split only as
   the fallback for a block whose layout throws.
2. **Load the theme font and measure with its real metrics (F1, cause 2).** Give every
   built-in theme an explicit `family` in its type tokens (Inter for the neutral themes, keep
   whatever `02-design-language.md` names for the others) and load it in the sample with
   `next/font/local` from a woff2 checked into `public/fonts` (`next/font/google` fetches at
   build time and fails offline CI). Then fix the measurement side: `measure.ts` has only four
   hand-authored **category** tables (`sans`, `serif`, `mono`, `script`, `ADVANCE_WIDTH_TABLES`
   at `measure.ts:584`, "typical metrics for each font category") — there is no table derived
   from a real font, and `estimateMetrics` buckets by the same categories. Add a one-off script
   under `tools/fonts/` (its own `devDependencies`, never `packages/`) that reads a font file
   and emits a per-glyph advance-width JSON, check in `inter.json`, register it under face key
   `inter`, and make `createMetricsProvider` pick the table by the resolved `family` with the
   category table as the loud fallback (a `metrics/unknown-family` finding).
3. **Verify then fix the editor's missing title (F2).** Reproduce with the `blocks.js` scenario,
   confirm whether `.tl-positioned-div { overflow: hidden }` is clipping; if so, the fix is (1) —
   re-screenshot after (1) before touching CSS.
4. **Chrome (F5).** In `EditDeck.tsx`, mount the slide manager closed by default and keep the
   issue badge collapsed until a finding exists.
5. **Expose position (F6).** `DeckViewer` root gets `data-slide-index`, `data-slide-count`,
   `data-build-step`, `data-build-step-count`, and `aria-live="polite"` text "Slide n of N".

**Watch out — the hard parts.**

- *Measuring needs a context before the shape exists.* `compileSlide` today never calls
  `layout()`; it only assigns boxes. To measure, build a `LayoutContext` with
  `deckLayoutContext()` (Q9) for a box of the region's width and the region's full height as
  the upper bound. Never pass `Infinity` as height — several text layouts use `ctx.box.height`
  for vertical alignment and autofit. `layout()` is pure, so calling it once to measure and once
  to render is safe; do not cache across compiles keyed on anything but `(type, props, width)`.
- *The metrics provider must be the same in all three places or the fix moves the bug.*
  `compileSlide` runs in Node (backend validation, SVG export) and in the browser (editor,
  viewer). If the editor measured with `canvas` metrics and Node with `estimate`, the editor
  would stack correctly and the exported SVG would overlap — a parity failure that
  `parity-3way` would catch only after the fact. Use the `table` provider for the theme font
  (Inter) everywhere, generated once and checked in; keep `estimate` only for a font the table
  does not know. The estimate table is per-family after this task, so an unknown family is
  loud (a finding), not silently wrong.
- *A block taller than its region must still round-trip to the same region.* `documentToDeckSpec`
  matches a shape to a region in `shapeMatchesRegion` (`slide-decompiler.ts:78-89`): x equal,
  width equal, top inside, **and bottom inside** (`bottomOk`). With intrinsic heights a
  `display` title can legitimately extend past the region's bottom edge, so `bottomOk` fails and
  the title comes back as `free[]` — the demo's own round trip regresses. **Write this test
  first** (compile a region with an over-tall block, decompile, assert it is back in the
  region), then drop `bottomOk` or give it a generous tolerance; x, width and top are enough to
  identify a region. Emit `region/overflow` from the compiler; do not clamp the box — a clamped
  box is what the editor's `overflow: hidden` wrapper clips against, which is F2.
- *Vertical alignment is a property of the region, not the block.* Kicker/title/subtitle stack
  from the top; a quote centres. `SlideLayout.compile` returns plain `Record<string, Box>`
  (`slide-layouts.ts:449`) with no room for it, so add an optional
  `regionAlign?: Record<string, 'start' | 'center' | 'end'>` on `SlideLayout` (additive,
  default `start`, `quote` sets `center`) and distribute leftover height in `compileSlide`. Do
  not let blocks reach for it — a block does not know where it is.
- *Geometry of every existing slide changes.* No spec pins the demo's numbers (checked:
  `demo-deck-contract`, `demo-deck-roundtrip`, `parity-3way` compare paths against each other,
  not against constants), so nothing should need a snapshot bump. If one does, update it in the
  same commit and say why; do not "fix" the layout back to the old numbers.
- *Font loading is asynchronous; measurement is not.* With `next/font` the face is available
  before hydration, but a host that loads Inter with a plain `<link>` renders one frame in the
  fallback face. The table provider makes the layout right regardless; the only visible effect
  is a reflow of glyphs, not of boxes. Do not add a "wait for fonts" step to the viewer.

**Expected output.**
- `node tools/visual/shoot.js parity-3way` still reports 0 failing rows.
- New scenario `tools/visual/scenarios/deck-demo.js` (modelled on `blocks.js`, which drives the
  Next.js sample on `:5433`; `parity-3way.js` drives an internal harness page instead)
  screenshots all six slides at their final build step; a checked-in text assertion per slide
  that no two text nodes' bounding boxes intersect (measure with `getBoundingClientRect` in the
  page). This is the regression test for F1 — it fails today on slides 1, 4 and 5.
- `edit-initial` screenshot shows kicker, title and subtitle on slide 1, no thumbnail strip.
- `/view` DOM carries the five attributes; the QA script can read "Slide 4 of 6".

**Acceptance.** All of the above plus: jest suites for `slide-compiler` extended with a
three-block region whose middle block is 2× the others, asserting the three boxes are disjoint
and ordered.

---

#### R1 · The host-node contract — a real lifecycle for DOM blocks · S · ⬜

**Goal.** A `k: 'host'` node mounts real DOM through a registered renderer, gets updated when
props change, is torn down cleanly, and hands its root element to whoever wants to animate it.
This is the foundation R2 and R3 stand on; it changes no existing block.

**Read.** `blocks/types.ts:292` (host node), `blocks/render-dom.tsx:283-291`,
`blocks/render-svg.ts:311-319`, `04-block-anatomy.md` §4.2 (contexts), README rule 2.

**Do.**
1. Add to `blocks/host-registry.ts`:
   ```ts
   export interface HostRenderContext {
     box: Box                       // block-local, slide units
     tokens: ResolvedTokens
     surface: SurfaceContext
     props: Record<string, unknown>
     motion?: ResolvedBlockMotion   // from R5; undefined until then
     headless: boolean
   }
   export interface HostRenderer {
     mount(root: HTMLElement, ctx: HostRenderContext): void | (() => void)
     update?(root: HTMLElement, ctx: HostRenderContext): void
     unmount?(root: HTMLElement): void
   }
   export class HostRegistry { register(id, renderer); get(id); has(id) }
   ```
   `HostRenderContext.tokens` is copied, not shared (DoD item 5).
2. `render-dom.tsx` `case 'host'` renders a `<HostMount>` React component: a `<div>` with a ref;
   `useLayoutEffect` looks up `node.render` in the `HostRegistry` supplied via a React context
   (`HostRegistryProvider`, defaulting to an empty registry), calls `mount` once, `update` on
   prop change (compare `ctx.props` by reference, then shallow), and the returned disposer /
   `unmount` on removal. Unknown `render` id → the div stays empty and gets
   `data-host-missing="<id>"`; never throws.
3. Before mounting, set the resolved tokens as CSS custom properties on the div:
   `--tls-surface`, `--tls-on`, `--tls-accent`, `--tls-text-muted`, `--tls-font-family`, and
   the `type.*` sizes. This is how an HTML block obeys README rule 3 without knowing the theme.
4. `render-svg.ts` keeps the placeholder **unless** the node carries `poster: LayoutNode`
   (additive field on the host node) — then it renders the poster subtree. R2 supplies posters.
5. `DeckViewer` and `ComponentUtil` both wrap their `renderNodeToDom` call in
   `HostRegistryProvider`; the registry is a new optional prop on `<Tldraw>` (`hostRegistry`)
   beside the existing `blockRegistry`. `<DeckViewer>` gets **both** `registry` and
   `hostRegistry` props — today it builds one module-level registry from
   `registerBuiltInBlocks` and a host-registered block renders in the editor but not in the
   viewer.

**Watch out — the hard parts.**

- *React StrictMode mounts twice in development.* The sample sets `reactStrictMode: true`
  explicitly (`examples/nextjs-sample/next.config.js:35`) and the App Router defaults to it
  anyway, so `mount → unmount → mount` on the same element is the normal dev path. `mount` must start by
  clearing the element (`root.replaceChildren()`), the disposer must be idempotent, and the
  probe test in jsdom must run under `<React.StrictMode>` to prove it.
- *tldraw re-renders shapes far more often than props change.* Selection, hover, camera and
  drag all re-render `ComponentUtil`'s component; `usePosition` writes `transform` to
  `.tl-positioned-div` via a mobx autorun on every move. If `HostMount` calls `update` on
  every render, a drag re-templates the block sixty times a second and destroys any GSAP state
  inside it. Trigger `update` only when `props` **structurally** differ from the last mounted
  props (compare a `JSON.stringify` of props, cached per mount — props are small JSON and tldraw
  may hand you a cloned object with identical content on every store change, so reference or
  shallow equality would re-template on every drag) **or** `box.width/height` changed; never
  on `box.x/y`. Test: render, change only `x`, assert `update` count is 0; re-render with a deep
  clone of the same props, assert 0; change `width`, assert 1.
- *Coordinates inside the host are slide units.* Both the editor (through the camera) and the
  viewer (through one `scale()` on the slide root) scale the whole canvas, so a host div of
  `box.width × box.height` CSS px is correct and a template must use `px` sizes equal to slide
  units — never `vw`, `rem` or percentages of the viewport. Put that sentence in the
  `HostRenderer` doc comment; it is the first thing a template author gets wrong.
- *Never set `transform` on the host root.* `.tl-positioned-div` owns it. Inside the host root,
  descendants are free (that is what makes GSAP usable, see R3). The renderer must not add
  `transform`, `will-change: transform` or `contain` to the host div.
- *CSS custom properties are the theme contract.* Keep the variable list in one exported
  constant (`HOST_CSS_VARS`) and set them in `HostMount`, not in each renderer, so R4 can turn
  `--tls-surface` into a gradient string in one place. Values must be copied from the tokens,
  not read lazily from a shared object (DoD item 5).
- *`useLayoutEffect` on the server.* The viewer is client-only in the sample (`ssr: false`),
  but the package cannot assume that. Use an isomorphic layout effect (`typeof window`
  guard) so a host that server-renders a page containing `<DeckViewer>` gets no warning spam.
- *Missing renderer is a finding, not an exception.* The registry lookup can fail when a host
  forgets to register, or when the viewer got a deck authored against a bigger registry. An
  empty div with `data-host-missing` is the deliberate degrade; `validateDeckSpec` (with the
  registry passed) is where the person learns about it.

**Expected output.**
- `blocks/host-registry.spec.tsx` (jsdom): a probe renderer that writes `root.textContent` in
  `mount`, counts `update`s, and flips a flag in `unmount`; assert mount once, update on prop
  change only, unmount on removal, disposer honoured, unknown id → `data-host-missing`.
- `render-svg.spec.ts`: host node with a `poster` renders the poster's rects; without one, the
  dashed placeholder as before.
- Parity harness still passes for all 24 existing blocks (none emit host nodes; nothing moves).

**Acceptance.** No new dependency. `render-dom.tsx` remains free of `dangerouslySetInnerHTML`
(markup injection is R2's job and lives behind the renderer, not in the renderer switch).

---

#### R2 · `kind: 'html'` blocks — author a block as a template, get a poster for free · M · ⬜

**Goal.** A block author writes an HTML template plus a schema and a short description and gets a
block that the editor and the viewer render as real DOM, the SVG path renders as a still, the
digest describes, and `validateDeckSpec` checks. First block: `tls.c.hero` (kicker + title +
subtitle + optional CTA), because it is the block every deck starts with and the one the current
`title` layout gets wrong.

**Read.** R1; `04-block-anatomy.md` §4.1, §4.5, §4.9; `library/text/tls-t-title/*` as the
folder pattern; `blocks/capability-digest.ts`; `blocks/validate-deck-spec.ts`.

**Do.**
1. Extend `BlockDefinition` additively:
   ```ts
   kind?: 'layout' | 'html'                        // default 'layout'
   html?: {
     template(props: P, ctx: HtmlTemplateContext): string   // returns markup; MUST use ctx.esc()
     poster(props: P, ctx: LayoutContext): LayoutNode        // required — the SVG/thumbnail still
     animate?(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void)   // R3 fills rt
   }
   ```
   `HtmlTemplateContext` = `{ esc(s): string, cssVar(role): string, box, tokens }`. `esc` is
   HTML-escaping; the template is **code in the registry, never in the `DeckSpec`** — the JSON
   carries `props` only, so rule 2 holds and no user-supplied markup is ever injected.
2. `kind: 'html'` blocks get a generated `layout()`: it returns a single host node filling the
   box with `render: def.type` and `poster: def.html.poster(props, ctx)`. **No second
   registration:** `HostMount` (R1) resolves a `render` id first against the `BlockRegistry` —
   a `kind: 'html'` definition whose `type` equals the id is rendered by a built-in
   `HostRenderer` derived from its `html` object (`mount` sets `root.innerHTML = template(...)`,
   `update` re-templates only when props changed, `unmount` runs the disposer) — and only then
   against the `HostRegistry`, which stays for host-supplied renderers that are not blocks. One
   registry to pass to the viewer, one to the editor, nothing to keep in sync.
3. Each html block still ships `schema`, `defaults`, `summary`, `keywords`, `motion.parts` (the
   parts are `data-part` attributes in the template), `size`. The ten-point DoD applies; the
   parity test for an html block compares the **poster** against the SVG renderer, and a jsdom
   test asserts the template's text content equals the poster's text content — the two must
   tell the same story.
4. Ship `library/composite/tls-c-hero/` as the first html block: template with
   `data-part="kicker|title|subtitle|cta"`, poster built from the existing title/subtitle text
   layouts, description written for the model ("Opening slide. One idea in the title, no full
   sentence; subtitle gives date/audience; CTA optional"), an `example` instance.
5. Add `kind` and, for html blocks, the `data-part` names to `capabilityDigest()`.

**Watch out — the hard parts.**

- *`innerHTML` and React must never touch the same node.* The host div is a leaf: no React
  children, ever. React does not know about the injected DOM, so it will not remove it, but if
  anything renders React children into that div the next reconciliation wipes the template.
  The `HostMount` component from R1 renders `<div ref>` with nothing inside — keep it that way
  and add a test that the element's React fiber has no children after mount.
- *`update` destroys running animation.* Re-templating replaces every node, so a GSAP tween on
  a part loses its target. The order in `update` is: call the disposer from the previous
  `animate`, re-template, and **do not** call `animate` again — reveal animation runs only
  when the viewer or the editor's build-step preview says so (R3). An editor edit (R11) during a
  preview simply ends the preview; that is the intended behaviour.
- *Escaping is the whole security story.* Props come from the LLM and from people; the template
  is trusted code. `ctx.esc()` must escape `& < > " '` and templates may only place props in
  text content or in quoted attribute values — never in `style=""`, never in `on*=""`, never as
  a URL without a scheme allow-list (`https:` and raster `data:image/png|jpeg|gif|webp` only —
  `data:image/svg+xml` can carry script). Write one generic test that runs
  every html block's `template()` with `<img src=x onerror=alert(1)>` in every string slot and
  asserts the parsed DOM contains no `img` and no `on*` attribute. It runs against all html
  blocks automatically because it iterates the registry.
- *The poster is the geometry.* An html block cannot measure itself in Node, and `compileSlide`
  (R0) stacks by measured height. For `kind: 'html'` the compiler and the parity harness use
  `html.poster()` as the layout. Consequently the poster must be honest about height: a
  template that renders taller than its poster overlaps its neighbour exactly as F1 did. The
  template-vs-poster test compares text; add a jsdom check that the template's rendered
  `scrollHeight` at the poster's width is within 8 units of the poster's height, for
  `defaults` and for the adversarial props.
- *Two things must agree by name.* `motion.parts` and the `data-part` attributes in the template;
  `data-prop-path` and the schema's slot keys (R11 relies on both). A registry-wide test
  renders each html block's `defaults`, collects the attributes, and asserts equality with the
  declared parts and schema keys.
- *`size.preferred` is what the inserter drops and what `free[]` uses.* Set it from the poster
  of `defaults`, not by hand, or the two drift.

**Expected output.**
- `/view` slide 1 rendered by `tls.c.hero` instead of three stacked text blocks; the
  `deck-demo.js` scenario screenshot shows the hero with no overlap.
- `renderNodeToSvg` of the same slide shows the poster with the same three strings.
- `validateDeckSpec` accepts the hero's `example` and rejects a hero with `title` over 120 chars
  with a specific finding.
- Attempting `props.title = '<img onerror=…>'` renders as literal text (escaping test).

**Acceptance.** `kind` absent behaves exactly as today for all 24 blocks (registry snapshot
test). The demo JSON is updated to use the hero on slide 1.

---

#### R3 · GSAP adapter and the per-block animation hook · M · ⬜

**Goal.** A host that has GSAP passes it in once; html blocks that declare `animate()` get a
timeline positioned inside the slide's build-step choreography; hosts without GSAP get the WAAPI
preset on the whole block, unchanged. This is `BACKLOG.md` **B5** done properly, plus the hook
that makes it useful.

**Read.** `motion/driver.ts` (interface, `ALLOWED_PROPERTIES`, `FORBIDDEN_PROPERTIES` and why
`transform` is forbidden — `usePosition` owns it), `motion/waapi-driver.ts`,
`components/DeckViewer/DeckViewer.tsx:340-390`, `05-motion-system.md` §6, README rule 6.

**Do.**
1. `blocks/motion/gsap-driver.ts`: `createGsapDriver(gsap): MotionDriver`. It takes the
   **host's** gsap instance as an argument and contains **no `import` of `gsap`** — so it adds
   no dependency and about 2 KB, and it can be exported from the main entry like every other
   driver. (B5 asked for a separate entry point to keep gsap out of the bundle; that is
   achieved by not importing it. `lask` builds a single entry from `src/index.ts` with no
   `exports` map in `package.json`, so a second entry point would mean a build-tool change for
   no gain.) It maps the same keyframe vocabulary WAAPI uses to `gsap.fromTo`, refuses
   `FORBIDDEN_PROPERTIES` exactly as the WAAPI driver does, and reports `finished` through the
   driver's promise so build-step chaining is unchanged. Type the parameter structurally
   (`{ fromTo, timeline, … }`), not as `typeof import('gsap')`, so `@types/gsap` is not needed
   either.
2. Define `BlockMotionRuntime`:
   ```ts
   interface BlockMotionRuntime {
     driver: MotionDriver
     gsap?: unknown                  // the host's instance, if the driver was created with one
     timing: { delayMs: number; durationMs: number; staggerMs: number; ease: string }
     reducedMotion: boolean
     onComplete(): void              // MUST be called; the viewer waits on it for afterPrevious
   }
   ```
   `DeckViewer` and the editor pass it to `HostRenderer.mount` via `HostRenderContext.motion`
   (R1 left the slot). An html block's `animate(root, rt)` runs **instead of** the whole-block
   preset when present; when absent, the block behaves as any other shape.
3. Guard rails that keep rule 5 intact: `animate` is only invoked on reveal (never at load in
   the editor), `reducedMotion` true means `animate` is skipped and `onComplete` is called
   immediately, and a block that never calls `onComplete` is timed out at
   `timing.durationMs + 2000` with a console warning naming the block id.
4. `examples/nextjs-sample` adds `gsap` as a **dependency of the sample only**, creates the
   driver in `ViewDeck.tsx`, and the hero from R2 gets an `animate` that staggers its
   `data-part`s with a GSAP timeline.

**Watch out — the hard parts.**

- *`transform` is forbidden on the wrapper, not inside the block.* The rule in
  `motion/driver.ts` exists because `usePosition` owns `transform` on `.tl-positioned-div`;
  a second writer there fights a mobx autorun and the shape jumps. Inside a host root,
  descendants have no such owner, so GSAP's `x`, `y`, `scale`, `rotation` (which write
  `transform`) are fine on **parts**. State the rule precisely in `BlockMotionRuntime`'s doc:
  the driver keeps refusing forbidden properties on any element it is handed; `animate()` may
  do anything to descendants of `root` and nothing to `root.style.transform`. Test: after
  `animate` on the hero, `root.style.transform === ''`.
- *`onComplete` is load-bearing.* The viewer chains `afterPrevious` and auto-advance on the
  driver's `finished` promise. With `animate()` there is no driver call to await, so the viewer
  awaits a promise resolved by `rt.onComplete()`. Three failure modes to close: the block never
  calls it (timeout at `durationMs + 2000`, warn with the block id, continue); it calls it twice
  (idempotent resolve); it calls it synchronously before the viewer has stored the promise
  (create the promise before calling `mount`).
- *Going backwards must kill timelines.* `←` and jumping to another slide call
  `motionDriver.cancelAll()`; that cancels WAAPI animations the driver started but knows nothing
  about a GSAP timeline inside a block. Keep the disposers returned by `animate()` in the
  viewer's step state and run them on every cancel path (step back, slide change, unmount).
  Test with a stub gsap whose timeline records `kill()`.
- *Hidden state before reveal.* A block that will `animate` must be invisible until its step,
  and its parts must start from their "from" state. The viewer already sets `hiddenState` on the
  block element; `animate` is responsible for its parts' starting values (GSAP `from` tweens do
  this synchronously on creation). Without that, a part flashes at full opacity for a frame
  when the block becomes visible. The three-frame scenario catches the flash if the first frame
  is captured on the same tick the step advances — use `page.evaluate` to advance and
  `requestAnimationFrame` before the screenshot.
- *Reduced motion and the editor.* `prefers-reduced-motion` → skip `animate`, call
  `onComplete` immediately, set the parts to their final state (the template's static state
  already is that). In the editor, `animate` runs only inside the Q16 build-step preview, never
  on document load — a deck nobody animated must not move (rule 5).
- *Seconds vs milliseconds.* GSAP takes seconds, the runtime hands out milliseconds. Do the
  division once in the driver and in `BlockMotionRuntime.timing`'s doc, and put one test on a
  known duration; this is the bug every adapter ships once.
- *Prove the bundle is gsap-free.* After the build, `grep -c "from 'gsap'\|require('gsap')" dist/index.js`
  must be 0 and `dist/index.js` must exist (the 2a4df990 incident: a bad import graph emits
  `.d.ts` files and no JS while the build exits 0). The import-graph test asserts no module
  under `src/` imports `gsap`.

**Expected output.**
- `motion/gsap-driver.spec.ts` with a stub gsap object: fromTo called with expected vars,
  forbidden property rejected, finished promise resolves.
- Import-graph test (`import-graph.spec.ts` pattern) asserting no module under `src/` imports
  `gsap`, and `dist/index.js` contains no `gsap` import after the build.
- Scenario `deck-demo.js` variant with GSAP: three screenshots at t = 0, t = half, t = end of
  the hero reveal, visibly different, final frame identical to the no-GSAP final frame.
- With `prefers-reduced-motion`, the final frame appears immediately.

**Acceptance.** `packages/tldraw/package.json` has no `gsap` in any dependency field.
Bundle size of `dist/index.js` grows by no more than 4 KB (the driver itself), and `gsap`
appears nowhere in it.

---

### Phase B — Every field the vision needs is live; the catalog is legible to a model

#### R4 · Wire `BlockStyleSpec` — per-instance colors, gradient backgrounds · M · ⬜

**Goal.** `style.surface`, `style.on`, `style.accent` on a block instance actually change what
renders, `style.surface` may be a `Paint` (so a linear gradient), and the contrast solver still
runs against whatever the instance chose.

**Read.** `blocks/types.ts:51-72, 325`, `blocks/layout/layout-child.ts:130`
(`createLayoutContext`), `blocks/tokens.ts:243` (`resolveColor`) and `:298-445` (gradient
luminance sampling — already written for slide backgrounds), `blocks/shape-bridge.ts:76-78`,
`library/layout/tls-l-card/layout.ts:24` (hardcoded surface), `deck-context.ts`.

**Do.**
1. Widen additively: `BlockStyleSpec.surface?: ColorRole | string | Paint`.
2. `createLayoutContext` takes `style?: BlockStyleSpec` and builds the context so that
   `ctx.resolveColor('surface' | 'onSurface' | 'accent')` returns the instance override when set,
   the theme's value otherwise. When `surface` is a `Paint`, `ctx.surface` (luminance, isDark)
   is computed by the existing gradient sampler at the block's box, so text colors keep passing
   contrast. Expose `ctx.style` read-only for blocks that want the raw value.
3. `ComponentUtil`, `DeckViewer`, headless export and the parity harness all pass
   `shape.props.style` through — one helper, `contextForBlock(shape, …)`, so the three consumers
   cannot drift.
4. Blocks that paint their own background (`card`, `takeaway`, `section`, `overlay`, `hero` from
   R2) draw `ctx.resolveColor('surface')`-or-`Paint` instead of a hardcoded role; html blocks get
   the gradient as the `--tls-surface` custom property's `background` value.
5. `validateDeckSpec`: a new rule flags a literal hex `on` color whose contrast against the
   resolved surface is below 4.5 (warning), and a gradient with fewer than 2 stops (error).
6. `documentToDeckSpec` round-trips `style` byte-for-byte (it already persists; add the test).

**Watch out — the hard parts.**

- *Precedence, and what the contrast solver may override.* Order is: instance `style` →
  theme role → contrast solver. A role-valued `on` still goes through `resolveColor`'s solver
  (it may darken/lighten to reach the floor). An explicit **literal** `on` set by a person is
  honoured as written and produces a validation warning when it fails 4.5:1 — never silently
  replaced, because a colour that changes under the user's hand is a bug report every time.
  Write both cases as tests.
- *Gradient luminance is position-dependent and must chain through children.* The sampler in
  `tokens.ts` samples a `Paint` at a box; for a card inside a gradient section the child's
  `SurfaceContext` must be derived from the **parent's resolved paint at the child's box**, not
  from the theme surface. Today `ctx.layoutChild` forwards the parent's `surface` object
  unchanged into the child context (`layout/layout-child.ts:203-215`), so a child inside a
  gradient card would inherit the slide's luminance, not the card's. That is where
  light-on-light text on nested blocks will come from; derive the child surface there. Test: gradient parent dark-to-light, two
  children at the two ends, assert their resolved text colours differ.
- *SVG gradient ids collide today.* `render-svg.ts:21-23` mints ids from a per-call counter
  with the fixed prefix `'svg'` (`svglg0`, …), reset on every `renderNodeToSvg` call, and no
  caller passes `idPrefix` (`parity-harness.ts:382`, `parity-3way.spec.ts:391`). Two gradient
  blocks rendered separately and placed on one slide both produce `svglg0`. Make `idPrefix`
  the block id at every call site (the page exporter in R14 included) and assert on a two-card
  fixture that the SVG contains two defs with different ids, each `fill="url(#…)"` resolving.
- *`style` lives in shape props and is an object.* Every read that hands it to a context must
  copy it (`not.toBe` and `toEqual`, DoD 5). The decompiler already persists it; the test to
  add is the byte-for-byte round trip with a `Paint`, because `Paint` has nested arrays (stops)
  that a shallow copy shares.
- *Html blocks receive the gradient as a string.* `--tls-surface` becomes a CSS
  `linear-gradient(...)` string when the paint is a gradient and a hex when it is solid;
  templates use it as `background`, never as `color`. Provide `--tls-surface-color` (solid
  fallback: the paint's average) for templates that need a plain colour.

**Expected output.**
- Demo slide 2 (`section`) gets `style.surface = { linearGradient: … }` and `style.on = 'onAccent'`
  in the JSON; the `deck-demo.js` screenshot shows the gradient in the editor **and** the viewer,
  and `renderNodeToSvg` emits a `<linearGradient>` def for it.
- Parity harness: 0 failing rows with the styled fixture added.
- Unit tests: override of `on` changes the text color hex in the layout output; gradient surface
  flips `ctx.surface.isDark` when the stops are dark; a light text on light gradient produces the
  contrast warning.

**Acceptance.** No block definition ships a literal hex (grep `#[0-9a-f]{6}` under
`library/` finds only test fixtures). Themes untouched.

---

#### R5 · Motion wiring — presets, delay, duration, stagger and parts actually play · M · ⬜

**Goal.** The preset a block declares is what plays; `delay`, `duration`, `stagger`, `ease` are
honoured; part-level choreography (bullets one by one, count-up on a hero number, bars growing)
runs through the existing `data-part` attributes.

**Read.** `motion/resolve-motion.ts` (`resolveBlockMotion`, `resolvePartMotion`,
`deriveShapeAnimation`), `motion/presets.ts`, `shape-bridge.ts:90-99`,
`components/DeckViewer/DeckViewer.tsx:340-390`, `components/DeckViewer/motion-helpers.ts`,
`state/deck/presentation.ts`, `05-motion-system.md` §5.4–5.6.

**Do.**
1. `shape-bridge.ts`: replace the hardcoded `FadeIn` with `deriveShapeAnimation(spec.motion, def.motion)`.
   The persisted `ShapeAnimation` (`src/types.ts:485-491`) **already has** `effect`, `trigger`,
   `order`, `durationMs`, `delayMs` — so carry the spec's `delay`/`duration` into those two
   existing fields (check whether the bridge fills them today or leaves preset defaults) and add
   only `easing?: string` (optional, additive). `documentToDeckSpec` reads all of them back.
2. `DeckViewer` reveal step: resolve the block's motion with `resolveBlockMotion`, then for each
   `parts` entry call `resolvePartMotion` and play it on `el.querySelectorAll('[data-part="…"]')`
   with the resolved stagger, via the driver. The whole-block preset plays on `el` as now. Both
   respect `ALLOWED_PROPERTIES`; count-up is a `textContent` tween driven by the driver's
   progress callback (add `onUpdate` to `MotionDriver`, optional), never a layout change.
3. The editor's Present mode (`components/Presentation/PresentationRuntime.tsx`, which is where
   Q16's build-step playback lives, with `AnimateMenu` as its UI) uses the same helper, so the
   editor and viewer play the same thing — one function, `playBlockReveal(el, spec, def, rt)`,
   in `motion/play-reveal.ts`.
4. Presets that today map to `null` effect get a real keyframe set or are removed from the
   catalog; the digest (R7) lists only presets that play.

**Watch out — the hard parts.**

- *The viewer plays the compiled document, not the `DeckSpec`.* `computeBuildSteps` reads the
  `TDPage`'s shape `animation` fields. So `delay`, `duration`, `ease` and the resolved effect
  must be **persisted on the shape** by `shape-bridge.ts` (additive optional fields), and the
  viewer resolves motion from the shape, falling back to the block definition's default. Do not
  make the viewer look up the original `BlockSpec` — after an edit there is none.
- *Parts must be hidden before the block becomes visible, in the same frame.* The whole block is
  at `opacity: 0` until its step, so parts can be set up while hidden. On reveal, the order is:
  `driver.set(part, hiddenState)` for every part synchronously, then `driver.play(block)`, then
  the part plays with their stagger. If the part setup happens after the block reveal starts,
  every part is visible for one frame — a flash the eye catches and screenshots miss unless
  taken on that frame. Test with the recording driver: the first calls are `set` on parts,
  the first `play` is on the block.
- *Count-up fights React.* A tween that writes `textContent` will be reset if React re-renders
  the text node mid-tween. In the viewer that only happens on step change (which cancels the
  tween anyway). In the editor's build-step preview, any store change re-renders
  `ComponentUtil` and snaps the number to its final value — acceptable, but document it, and
  never write the intermediate value into the shape's props. Implement count-up through the
  driver's `onUpdate(progress)` (new optional callback) so it obeys `cancelAll()` and reduced
  motion like everything else.
- *Stagger indexes are in DOM order, which is layout order.* `part/i` attributes come from the
  layout; `querySelectorAll('[data-part^="item/"]')` returns them in DOM order, which for a
  bullets block is top-to-bottom. For a grid that animates column-first, the layout must emit
  children in the order it wants them revealed. Make that a one-line rule in
  `04-block-anatomy.md` §4.4.
- *`null`-effect presets.* Removing a preset id breaks any saved deck that used it. Keep the id
  as an alias resolving to the nearest real effect, mark it `deprecated: true` so R7's digest
  hides it, and log nothing at runtime.
- *One function, three callers.* `playBlockReveal` is called by the viewer, by
  `PresentationRuntime` in the editor and by the R12 inspector's Preview button. Put it in `motion/play-reveal.ts` with no
  React import; the `import-graph` test asserts it does not reach `TldrawApp`.

**Expected output.**
- `deck-demo.js` mid-reveal screenshots: slide 3's bullets show items 1–2 opaque and 3–4 not
  yet, slide 4's first hero number mid-count.
- `motion/play-reveal.spec.ts` with a recording driver: `slide-in-up` produces translate
  keyframes, `fade` produces opacity only, delay/duration reach the driver, stagger = index ×
  `staggerMs`, parts selected by attribute.
- Round-trip test: a block with `{preset:'slide-in-up', delay: 200, duration: 600, stagger: 40}`
  survives `deckSpecToDocument → documentToDeckSpec` unchanged.

**Acceptance.** A deck with no `motion` anywhere still does not move (rule 5 test: recording
driver receives zero calls). `resolvePartMotion` has call sites outside its own module.

---

#### R6 · `blockShowDuration` and `slideTimeline` — the numbers the backend plans with · S · ⬜

**Goal.** Pure functions that tell the backend, the viewer and the digest exactly how long a
block takes to appear and when each block of a slide starts and ends.

**Read.** `motion/resolve-motion.ts`, `motion/tokens.ts`, `state/deck/presentation.ts:54-90`.

**Do.**
```ts
blockShowDuration(spec: BlockSpec, def: BlockDefinition): { delayMs, activeMs, totalMs }
  // activeMs = preset duration + stagger × (partCount − 1) + longest part override
slideTimeline(slide: SlideSpec, registry): { steps: Array<{ index, startsAtMs, endsAtMs,
  blocks: Array<{ id, startsAtMs, endsAtMs, trigger }> }>, totalMs }
  // withPrevious blocks share a start; afterPrevious start at the previous block's endsAtMs;
  // onClick opens a new step starting at 0
```
Both DOM-free, both exported from `blocks/index.ts`. `DeckViewer.autoAdvanceMs` uses
`slideTimeline().totalMs` as the floor so auto-advance never cuts a reveal. The digest (R7)
includes each preset's default `activeMs` so the model can reason about pacing.

**Watch out — the hard parts.**

- *Trigger semantics, written down once.* `onClick` opens a new step whose clock starts at 0
  (a person decides when). `withPrevious` starts at the previous block's **start** plus its own
  `delay`. `afterPrevious` starts at the previous block's **end** plus its own `delay`. A
  block's `activeMs` is the preset duration plus `stagger × (partCount − 1)`, plus the longest
  part override beyond that. `ambient` motion is infinite and excluded. A slide's `totalMs` is
  the sum of step durations, and `steps[i].endsAtMs` is relative to that step's start — expose
  both so a caller does not add human click time into the sum.
- *Build from the same source the viewer plays.* Compute the timeline from the compiled page
  (`computeBuildSteps` + the shape's persisted motion fields + `resolveBlockMotion`), not from
  the raw `DeckSpec`, or the two disagree the moment a person edits a delay in the editor. The
  acceptance test is literal: recording driver's last `finished` time equals
  `slideTimeline().totalMs` within one frame, on every demo slide.
- *Part counts need the layout.* `stagger × (partCount − 1)` requires knowing how many
  `item/i` parts a bullets block has, which only `layout()` knows. Call it (it is pure and
  cheap) with the block's box; for html blocks use the poster. Cache per compile, not globally.

**Expected output.** Unit tests on the demo deck: slide 3 has 3 steps; slide 4 step 2 lasts
`count-up.duration + 3 × stagger` within 1 ms; a slide with no motion has `totalMs = 0`. A jsdom
test with the recording driver asserts the viewer's last driver call finishes at
`slideTimeline().totalMs ± 16 ms`.

**Acceptance.** `slideTimeline` on a 60-slide deck runs under 20 ms.

---

#### R7 · Capability digest v2 — everything the model needs, machine-readable too · M · ⬜

**Goal.** One generated document (Markdown for the prompt) and one generated JSON Schema (for
FastAPI validation and structured output) that together let an LLM pick a block, fill it, style
it and choreograph it without reading source.

**Read.** `blocks/capability-digest.ts`, `blocks/capability-digest.spec.ts`,
`blocks/validate-deck-spec.ts`, `06-slide-composition.md` §6.7, `BACKLOG.md` D6.

**Do.**
1. Extend `BlockDefinition` additively with `describe?: { when: string; avoid: string; example: BlockSpec }`
   and require it (test) for every built-in block. `example` must pass `validateDeckSpec`.
2. `capabilityDigest()` gains sections: **Color roles** (the 12 `ColorRole` ids with one line
   each), **Style** (`BlockStyleSpec` fields and the gradient shape), **Motion** (every preset that
   plays, its family, default `activeMs` from R6, the triggers, and the `delay/duration/stagger`
   fields), **Layouts** with a one-line "use when" per layout, and per block: `kind`, parts,
   `describe.when/avoid`, and the `example` as JSON.
3. `deckSpecJsonSchema(registry)` — a JSON Schema draft-2020-12 for `DeckSpec` with `props`
   discriminated by `type`, generated from each block's `SlotSpec`s. Exported for the backend;
   the Next.js mock serves it at `GET /api/schema` and the digest at `GET /api/capabilities`.
4. Golden fixtures: 10 decks in `blocks/__fixtures__/golden/` that the model is expected to be
   able to produce (title-only, KPI row, chart + insight, agenda, comparison, quote, image+text,
   timeline, team, closing) — each validates clean and renders without a finding.

**Expected output.** Snapshot test of the digest (it changes only when the registry does); a
test that every `example` validates; `ajv`-free structural test that the generated schema
accepts all 10 golden decks and rejects a deck with an unknown block type. Digest under 8k
tokens for the current 24 + R2/R9/R10 blocks (assert a character budget; split per family if
exceeded).

**Acceptance.** No hand-written catalog text anywhere outside block definitions.

---

#### R8 · `tls.m.image` — the first media block, and asset resolution · S · ⬜

**Goal.** An image block (fit `cover | contain`, focal point, optional caption, alt text) so
composites in R9/R10 have a picture to include. Today no library block emits an `image` node.

**Read.** `blocks/render-dom.tsx:215`, `blocks/render-svg.ts` image case, `03-block-catalog.md`
§E, `04-block-anatomy.md` E8, `ImageShape` asset handling in `state/`.

**Do.** Folder `library/media/tls-m-image/` with schema (`src` as asset id or URL, `alt` required
for the model, `fit`, `focal: [fx, fy]`, `caption?`, `radius`), layout that emits one `image`
node plus the caption text node, poster = same layout (Tier A). `LayoutContext` gains
`resolveAsset(id): string | undefined` supplied by the host (the Next.js sample maps ids to
`/assets/…`); headless export inlines nothing and keeps the URL. Missing asset → dashed frame
with the alt text, never a broken image icon.

**Expected output.** Parity rows for the block, a screenshot with `cover` vs `contain` on a
non-square source, the missing-asset frame, and the demo deck's slide 6 gaining an image.

---

### Phase C — The block families and the authoring surface

#### R9 · Composite blocks, layout kind (Tier A) · L · ⬜ — fan out, one agent per block

**Goal.** The clusters the model will reach for most, authored as pure layouts so they export
headlessly and pass parity. Each delegates to existing text/media blocks via `layoutChild`
(`BACKLOG.md` E8 rule: no new `LayoutNode` kind).

| id | Parts (all `data-part`s, all editable) | Notes |
|---|---|---|
| `tls.c.kpi-tile` | `value`, `delta`, `label`, `sparkline?` | replaces `hero-number` for KPIs; `polarity: up-good | down-good` colors the delta |
| `tls.c.kpi-row` | `tile/i` | 2–5 tiles, equal split, uses `kpi-tile` |
| `tls.c.image-text` | `image`, `kicker`, `title`, `body` | image left/right/top; uses `tls.m.image` |
| `tls.c.comparison` | `col/i/title`, `col/i/item/j` | 2–3 columns, optional highlight column |
| `tls.c.agenda` | `item/i/index`, `item/i/title`, `item/i/note` | 3–8 items, current item emphasised |
| `tls.c.steps` | `step/i/marker`, `step/i/title`, `step/i/desc`, `connector/i` | horizontal or vertical timeline |

Each ships: schema with writer guidance, `describe` (R7), `motion.parts` with a default stagger,
`capacity()` (returns the item count that fits), an adversarial screenshot row (1 item, max
items, 400-char string, CJK), and parity rows.

**Expected output.** Six new blocks in the digest, six golden fixtures (R7) using them, parity 0
failing, contact sheet looked at.

---

#### R10 · Composite blocks, html kind (Tier B, GSAP showcase) · L · ⬜ — fan out

**Goal.** The blocks whose value is motion, authored as templates on R2's contract with an
`animate` that uses GSAP when present and degrades to the WAAPI preset when not.

| id | Parts | Signature motion |
|---|---|---|
| `tls.c.feature-grid` | `cell/i/icon`, `cell/i/title`, `cell/i/desc` | cells stagger in from below, icons scale |
| `tls.c.testimonial` | `quote`, `avatar`, `name`, `role` | quote types on or fades by word (`prefers-reduced-motion` → instant) |
| `tls.c.big-stat` | `value`, `label`, `context` | count-up with easing, label slides under |
| `tls.c.hero` variants | (R2) | split-title reveal, background gradient sweep |

Every one ships a poster (R2 rule), passes the template-vs-poster text-equality test, and has
the three-frame scenario from R3.

**Expected output.** Four html blocks; the demo deck gains a feature-grid slide; the digest
marks them `kind: html`.

---

#### R11 · Inline text editing on block parts · M · ⬜

**Goal.** Double-click a text part in the editor, type, press Escape or click away, and the
block's `props` update as one undo step. This is `BACKLOG.md` **F3** and the most important
authoring affordance for "quick edit".

**Read.** `state/shapes/ComponentUtil/ComponentUtil.tsx`, how `TextUtil`/`StickyUtil` in this
fork enter edit mode (`isEditing`, `onShapeBlur`), Epic F acceptance in `BACKLOG.md`
(`stopKeyPropagationUnlessEscape`, Tab-clone trap), R2's `data-part` convention.

**Do.**
1. Every text-bearing part carries `data-part` **and** `data-prop-path` (e.g. `text`,
   `items.2.text`, `cells.1.title`) — set by `render-dom.tsx` from a new optional
   `propPath` field on the text node; layouts fill it (one-line change per block).
2. `ComponentUtil` handles double-click: hit-test the `data-prop-path` element under the
   pointer, open a positioned `contentEditable` overlay (portal to `document.body`; the
   `.tl-positioned-div` clip is documented), pre-filled with the plain text of that prop, with
   the same font/size/color so it looks in place.
3. On commit, write the value back through `app.updateShapes` with a `propPath` setter
   (`setAtPath(props, path, value)`), one history entry. Rich text runs: preserve existing marks
   when the plain text is unchanged; otherwise replace with a single run.
4. Keyboard: `stopKeyPropagationUnlessEscape`; Tab moves to the next `data-prop-path` in DOM
   order instead of cloning; Enter inserts a line break in multi-line parts and commits in
   single-line ones.
5. html blocks: the same path works because their templates emit the same attributes; after
   commit the block re-templates.

**Watch out — the hard parts.**

- *tldraw owns the keyboard.* Global shortcut handlers see every keydown; the QA run typed
  " EDITED" and switched to the Draw tool. While the overlay has focus, every keydown must
  `stopPropagation` except Escape, and `Tab` must be handled by the overlay (next
  `data-prop-path`) — the Epic F Tab-clone trap is real in this fork. The scenario asserts the
  selected shape id is unchanged after Tab and the active tool is still Select after typing.
- *Pointer events, too.* A pointer-down inside the overlay reaches tldraw's canvas handler and
  starts a deselect or a drag. `stopPropagation` on pointer-down and pointer-up inside the
  overlay; test by clicking in the middle of the overlay and asserting the selection persisted.
- *The overlay cannot live inside the shape.* `.tl-positioned-div` has `overflow: hidden` and
  `contain: layout style`, and it moves with the camera. Portal the overlay to `document.body`,
  position it from the part element's `getBoundingClientRect()`, and close it on any camera
  change (subscribe to the camera; do not try to track). Scale the overlay's font size by the
  current zoom so it looks in place.
- *Rich text runs.* `tls.t.title`'s `text` is an array of runs with marks. Editing plain text
  must map back: if the joined text is unchanged, keep the runs; if it changed, produce a single
  run carrying the **first** run's marks. Say so in the overlay's doc comment; it is a lossy
  choice made on purpose until F3's rich editor exists. Indexed paths (`items.2.text`) and
  nested composites (`cells.1.title`) go through one `setAtPath` helper with tests for both.
- *Commit on close, one history entry.* Do not write to the shape on every keystroke — that
  makes one undo step per character and re-templates html blocks under the cursor. Preview
  lives in the overlay; `app.updateShapes` runs once on commit, inside a single history entry.
  Undo restores the previous text in one step; the test counts entries.
- *Html blocks re-template on commit.* The `data-prop-path` element the overlay was anchored to
  is destroyed by the re-template; close the overlay **before** committing, then commit. The
  other order leaves a detached anchor and a `getBoundingClientRect` of zeros.

**Expected output.** Scenario `inline-edit.js`: double-click the slide-1 title, type, Escape,
Save, GET shows the new string. Assert selection unchanged after Tab. One undo restores the
old text in one step. Screenshot of the overlay in place.

---

#### R12 · Block inspector generated from the schema · M · ⬜

**Goal.** Select a block, see a right-hand panel with three tabs — **Content** (every slot,
widget by `SlotSpec.type`), **Style** (surface/on/accent as role pickers with a "custom" hex and a
gradient editor with 2–4 stops and an angle), **Motion** (preset picker grouped by family, delay,
duration, stagger, trigger, and the computed `totalMs` from R6, with a Preview button that plays
the reveal). `BACKLOG.md` **F2**.

**Do.** `components/BlockInspector/` fed by `registry.get(shape.props.componentId).schema`;
writes through `app.updateShapes`; slider drags coalesce into one history entry; the gradient
editor writes a `Paint`; preview calls `playBlockReveal` (R5). Mount it in the sample's `/edit`
in place of the findings-only panel (findings move to a collapsible section below).

**Expected output.** Scenario `inspector.js` extended: change surface to a gradient, screenshot
shows it; set `delay = 500`, Motion tab shows the new `totalMs`; Save → GET shows `style` and
`motion` persisted. Undo count test for a slider drag.

---

#### R13 · Block inserter · M · ⬜

`BACKLOG.md` **F1**. A searchable palette (name, keywords, `describe.when`) with previews drawn by
`renderNodeToSvg` of each block's `defaults`, dropping the block into the current slide's
best-fit empty region (or `free[]` when none). Html blocks preview via their poster. Expected
output: scenario inserting a `kpi-row` into a `blank` slide; the round-trip panel shows it in
`regions.body`.

---

### Phase D — Export, transitions, the backend contract

#### R14 · Headless export renders blocks · S · ⬜

Route `ComponentShape` in `renderPageToSvg.ts` through `registry.get(componentId).layout()` and
`renderNodeToSvg` (html blocks through their poster) instead of `renderComponentPlaceholder`; fix
the `parentId: "page"` sentinel so non-migrated documents export. Expected output: `parity-3way`
compares all **three** paths with 0 failing rows; `/api/decks/:id/thumbnail/:n.svg` in the sample.

#### R15 · Slide transitions · S · ⬜

`BACKLOG.md` **B4** — `wipe`, `cover`, `uncover`, `zoom` in `DeckViewer`, driven by the same
driver so a GSAP host gets them too; `slideTimeline` (R6) adds the transition to `totalMs`.

#### R16 · Backend contract — FastAPI endpoints and the mock that mirrors them · S · ⬜

**Goal.** A written contract the FastAPI team implements and the Next.js mock already satisfies,
so the frontend does not change when the real backend arrives.

**Do.** Document (in `guides/blocks-authoring.md` §3, expand as needed) and mirror in
`examples/nextjs-sample/app/api/`:

| Method | Path | Body / returns |
|---|---|---|
| `GET` | `/api/capabilities` | the digest Markdown (R7); `?format=json` returns the block list |
| `GET` | `/api/schema` | `deckSpecJsonSchema()` (R7) |
| `POST` | `/api/decks/generate` | `{ brief, slideCount?, theme?, aspect? }` → `{ deck: DeckSpec, findings }`; the mock returns a golden fixture chosen by keyword |
| `POST` | `/api/decks/:id/revise` | `{ instruction, slideIds? }` → same; the mock applies a canned edit |
| `POST` | `/api/decks/validate` | `DeckSpec` → `DeckFinding[]` (runs `validateDeckSpec` in Node) |
| `GET/PUT` | `/api/decks/:id` | as today |

The backend's own loop is: build the prompt from `/capabilities` + brief → structured output
against `/schema` → `validateDeckSpec` → if errors, one repair round with the findings appended
→ store → the viewer fetches. `slideTimeline` gives the backend per-slide durations for
auto-advance or voice-over alignment.

**Expected output.** The Next.js mock serves all six routes; a jest test in the sample hits
`generate` and gets a deck that validates clean; the guide's §3 matches the table.

---

## 4. What is deliberately not in this slice

- The remaining ~140 blocks of `BACKLOG.md` Epic E — R9/R10 establish the two authoring
  patterns; volume comes after the patterns are proven by screenshots.
- Deck Doctor (G1–G4), masters UI (F4), `packages/blocks` packaging (H1/H2). Each is listed in
  `BACKLOG.md` and none blocks the vision's first release.
- Overflow cascade (D5) — R0's `region/overflow` finding is the honest placeholder; the cascade
  needs the composites from R9 to be worth designing.

## 5. Order, restated as a plan

**Phase A.** R0 first, alone, about one day: the demo stops lying about text layout, and the
`deck-demo.js` no-overlap assertion becomes the guard for everything after. Then R1 → R2 → R3 in
sequence (each builds on the previous). Re-shoot the demo with the hero and GSAP; this is the
earliest point at which "HTML blocks first" is visibly met. Phase exit is checked in a browser,
not from test output.

**Phase B.** R4, R5, R7, R8 in parallel — they touch disjoint files (`layout-child`/`tokens`,
`shape-bridge`/`DeckViewer`/`motion`, `capability-digest`/`validate`, `library/media`). R6
after R5. Phase exit: the four browser checks in the phase table.

**Phase C.** R9 and R10 fan out one agent per block, only once R7's `describe` contract and
R8's image block exist — otherwise each block is written twice. R11 → R12 in sequence (the
inspector reuses the overlay's write path), R13 when a lane frees up.

**Phase D.** R14, R15, R16 independent. R16's document should be written **early** (it needs
no code) so the FastAPI team can start against the mock while Phases B–C run.

**How each task is handed to an agent.** Task id, the **Read** paths, the **Do**, **Watch out**
and **Expected output** sections verbatim, plus the standard line from
[BACKLOG.md](BACKLOG.md#how-to-hand-a-task-to-an-agent). The reviewer re-runs the task's
scenario, looks at the PNG, and checks the **Acceptance** line before marking ✅ — the demo
backlog shipped three tasks whose tests asserted nothing, and the fix for that class of failure
is a reviewer who runs the code.
