# 1. Block architecture

How a block is defined, stored, laid out, rendered, animated, and turned into a slide.
Read [README.md](README.md) first.

## 1.1 The one-paragraph model

A **block** is a typed unit of slide content. Its *definition* (`BlockDefinition`) is code that
lives in a library package and declares a content schema, a pure layout function, a motion recipe
and metadata. Its *instance* (`BlockSpec`) is plain JSON that lives in the document: a type id, a
props bag, optional style and motion overrides, and optional children. On the canvas, a top-level
block instance is carried by exactly one `ComponentShape` — which already exists, already
round-trips through persistence and multiplayer, and already renders arbitrary React through
`HTMLContainer` (Phase 5). Nothing about the document format changes.

```
BlockDefinition  (code, in packages/blocks)      BlockSpec  (JSON, in the document)
  type: 'tls.kpi'                                  { type: 'tls.kpi',
  schema: { label: text, value: number, ... }        props: { label: 'ARR', value: '$4.2M' },
  layout(props, ctx) -> LayoutNode                   style: { tone: 'filled', surface: 'accent' },
  motion: { preset: 'count-up' }                     motion: { order: 2 } }
  Component?: React.FC   (Tier B only)
```

## 1.2 Why build on `ComponentShape` rather than new shape types

`ComponentShape` is already the right substrate and adding 170 `TDShapeType` enum members would
be the wrong one. Concretely, from the existing code:

| What we need | `ComponentShape` already gives it | Evidence |
|---|---|---|
| Arbitrary rendered content on the canvas | `HTMLContainer` renders any React subtree, camera-transformed | `ComponentUtil.tsx:84-135` |
| JSON-only document | `{ componentId, props }`, no React persisted | `types.ts:587-592` |
| Host-extensible | `<Tldraw components={...}>` registry through context | `Tldraw.tsx:113-120, 354` |
| Non-fatal failure | Unknown id → placeholder; crashing block → error boundary | `MissingBlockPlaceholder.tsx`, `BlockErrorBoundary.tsx` |
| Selection, move, resize, z-order, undo | Inherited from the shape system | `ComponentUtil` extends `TDShapeUtil` |
| Corner radius / opacity from the style system | Already wired | `ComponentUtil.tsx:66-80, 124` |
| Insertion through the host API | `app.deck.addBlock(slideId, block, opts)` | `Deck.ts:330` |

A new shape type per block would mean 170 shape utils, 170 enum members, a migration risk per
block, and no way for a host to add its own. The registry is the extension point; use it.

**The cost, stated plainly:** `ComponentShape` renders as HTML, so it has no SVG twin and
`renderPageToSvg` cannot draw it (`renderPageToSvg.ts:128-140`). §1.6 and P21 are entirely about
paying that cost down.

## 1.3 `BlockSpec` — the instance format

```ts
/** One block instance. Plain JSON: no functions, no class instances, no React.
 *  Round-trips through JSON.parse(JSON.stringify(...)) unchanged — enforced by test. */
interface BlockSpec {
  /** Registry key of the definition, namespaced. Built-ins use `tls.`; a host uses its own. */
  type: string
  /** Stable within its slide. Used to target motion, to let AI cross-reference, and as the
   *  animation part-key prefix. Generated on insert if absent. */
  id?: string
  /** Content + options. Validated against the definition's `schema`. */
  props: Record<string, unknown>
  /** Presentation overrides. Every field optional; the theme + definition defaults fill the rest. */
  style?: BlockStyleSpec
  /** Motion overrides. Absent = the definition's default recipe, which may itself be "none". */
  motion?: BlockMotionSpec
  /** Only meaningful for container blocks (`family: 'layout'`). */
  children?: BlockSpec[]
  /** Bridges to the Phase 13 template slot system — see §1.9. */
  slot?: string
}
```

### `BlockStyleSpec`

Deliberately small. Anything a block needs that is not here belongs in its own `props`, because a
per-block option is discoverable from its schema and a universal style field is not.

```ts
interface BlockStyleSpec {
  surface?: ColorRole | string      // the block's own background
  on?: ColorRole | string           // foreground; derived from `surface` when absent (§02 2.4)
  accent?: ColorRole | string       // the block's one emphasis color
  tone?: 'filled' | 'outline' | 'ghost' | 'inverted' | 'gradient'
  radius?: RadiusToken | number
  padding?: SpaceToken | number | [number, number]   // [block, inline]
  gap?: SpaceToken | number
  elevation?: 0 | 1 | 2             // §02 2.7 — at most 2, and rarely
  align?: 'start' | 'center' | 'end'
  density?: 'compact' | 'default' | 'roomy'
}
```

`ColorRole` is one of a closed set (`surface | surfaceAlt | accent | accent2 | text | textMuted |
positive | negative | warning | neutral`) resolving against the active `DeckTheme` — see
[02-design-language.md](02-design-language.md) §2.2. A raw string is accepted and treated exactly
as Phase 8b/12 already treat `ShapeStyles.stroke`: a literal hex, or a `'theme:accent1'` token.

### `BlockMotionSpec`

```ts
interface BlockMotionSpec {
  preset?: MotionPresetId              // §05 §3 — 'fade-up', 'stagger-lines', 'count-up', ...
  trigger?: AnimationTrigger           // reuses the existing enum (types.ts:445)
  order?: number                       // build order within the slide; same field semantics as ShapeAnimation.order
  duration?: DurationToken | number
  delay?: DurationToken | number
  ease?: EaseToken
  stagger?: DurationToken | number
  /** Per-named-part override. Part names are declared by the definition's motion recipe, so an
   *  author/AI can say "the number counts up, the caption just fades". */
  parts?: Record<string, PartMotionSpec>
  /** Presentation-only ambient loop (shimmer, slow drift). Off unless explicitly set. */
  ambient?: AmbientMotionSpec
}
```

## 1.4 `BlockDefinition` — the authoring contract

```ts
interface BlockDefinition<P extends Record<string, unknown> = Record<string, unknown>> {
  type: string                         // 'tls.kpi'
  name: string                         // 'KPI tile'  (UI label)
  family: BlockFamily                  // 'layout'|'text'|'data'|'diagram'|'media'|'composite'|'chrome'|'live'
  tier: 'A' | 'B'                      // A = pure layout, exports headlessly. B = DOM-only. §1.6
  summary: string                      // one line, shown in the inserter and given to the AI
  keywords: string[]                   // inserter search + AI block selection

  schema: BlockSchema<P>               // §1.5 — the typed content contract
  defaults: P                          // a valid, good-looking instance with no input at all

  /** Sizing. `preferred` is what the inserter drops on the canvas. `min` is enforced on resize.
   *  `aspect` locks the ratio when set. All in slide units (a 1920×1080 frame). */
  size: { preferred: [number, number]; min: [number, number]; aspect?: number }

  /** Pure. No DOM, no React, no `document`, no measurement beyond the injected `ctx.measureText`.
   *  This is the single source of truth for what the block looks like. */
  layout(props: P, ctx: LayoutContext): LayoutNode

  /** Tier B only. When present, it — not `layout` — draws the live block, and `poster` supplies
   *  the export image. A Tier A block leaves both undefined and gets the generic renderers. */
  Component?: React.FC<BlockRenderProps<P>>
  poster?(props: P, ctx: LayoutContext): LayoutNode

  motion: MotionRecipe                 // §05 §4 — named parts + default choreography
  capacity?(props: P, box: Size, ctx: LayoutContext): CapacityReport   // §1.8
  lint?(props: P, ctx: LintContext): LintFinding[]                     // §31 / doc 02 §5
  toShapes?(props: P, box: Box, ctx: LayoutContext): TDShape[]         // §1.10 escape hatch
}
```

**The governing rule: a Tier-A block author writes `layout()` and nothing else visual.** They do
not write JSX, CSS, or SVG strings. That is what makes DOM/SVG parity a property of the system
rather than a promise each block has to keep.

## 1.5 `BlockSchema` — the content contract, and the AI's actual interface

The schema is not decoration. It is (a) what validates a document, (b) what generates the
inspector UI in P30, (c) what the AI is shown in P32, and (d) what the linter checks against.

```ts
type SlotType =
  | { kind: 'text';     maxChars?: number; multiline?: boolean }
  | { kind: 'richText'; maxChars?: number }                 // inline runs — §23
  | { kind: 'number';   min?: number; max?: number; format?: 'plain'|'compact'|'percent'|'currency' }
  | { kind: 'enum';     values: string[] }
  | { kind: 'boolean' }
  | { kind: 'color' }                                       // ColorRole | hex | theme token
  | { kind: 'icon' }                                        // icon id, resolved via the icon provider
  | { kind: 'image' }                                       // assetId (reuses TDDocument.assets)
  | { kind: 'list';     of: SlotType; min?: number; max?: number }
  | { kind: 'object';   fields: Record<string, SlotSpec> }
  | { kind: 'series';   value: 'number'; label: 'text'; max?: number }   // charts
  | { kind: 'blocks';   allow?: BlockFamily[]; min?: number; max?: number } // nesting, §1.7

interface SlotSpec {
  type: SlotType
  role: 'content' | 'option'   // content = what the deck says; option = how it looks
  label: string
  help?: string
  required?: boolean
  /** The single most important field for AI output quality: what belongs here, in words. */
  guidance?: string            // e.g. "One metric name, 1–3 words. Never a sentence."
}
```

Two rules that make this worth the effort:

- **`role: 'content'` slots are the only thing an AI fills.** Options are chosen by the template,
  the theme, or the user. This stops a model from "designing" and keeps its job to writing.
- **`maxChars` / `list.max` are real budgets, not hints.** `capacity()` (§1.8) and the linter
  enforce them, and the overflow policy (§06 §4) decides what happens when content exceeds them.

## 1.6 Rendering — one layout, two renderers

```
                       layout(props, ctx)  →  LayoutNode tree
                                    │
                 ┌──────────────────┴───────────────────┐
                 ▼                                      ▼
        renderNodeToDom(node)                   renderNodeToSvg(node)
     live editor + presentation                headless export, thumbnails,
     (animatable, selectable)                  PNG, PDF, server rendering
```

`LayoutNode` is a small, closed set of absolutely-positioned primitives. Layout is already
resolved when a node tree is produced — the renderers do no layout of their own, which is exactly
why they cannot disagree.

```ts
type LayoutNode =
  | { k: 'group';  box: Box; name?: string; part?: string; clip?: boolean; opacity?: number
    ; children: LayoutNode[] }
  | { k: 'rect';   box: Box; part?: string; fill?: Paint; stroke?: Stroke; radius?: number|number[] }
  | { k: 'path';   box: Box; part?: string; d: string; fill?: Paint; stroke?: Stroke }
  | { k: 'text';   box: Box; part?: string; lines: TextLine[]; style: ResolvedTextStyle }
  | { k: 'image';  box: Box; part?: string; assetId: string; fit: 'cover'|'contain'; radius?: number }
  | { k: 'icon';   box: Box; part?: string; icon: string; fill: string; strokeWidth?: number }
  | { k: 'line';   box: Box; part?: string; from: Pt; to: Pt; stroke: Stroke; marker?: MarkerSpec }
  | { k: 'host';   box: Box; part?: string; render: string }   // Tier B only — names a Component
```

`Paint` covers solid, linear gradient and radial gradient and is **the same resolved shape Phase
11's `resolveSlideBackground` already hands `@tlslides/core`'s `Frame`** — reuse that type, do not
invent a second gradient representation.

`part` is the animation hook. A named part in the node tree is what `motion.parts` targets and
what the DOM renderer stamps as `data-part` so the motion driver can select it (§05 §4).

**Text is the hard case, and it is solved once, in the layout pass.** `layout()` receives
`ctx.measureText(text, style) → { width, height, lines }`. Both render paths then draw
already-broken lines at already-computed baselines. The default implementation is Phase 15's
`estimateTextSize` (honest, documented as approximate); P23 upgrades it to a real metrics provider
— canvas `measureText` in the browser, a bundled metrics table in Node — behind the same
interface, which simultaneously closes the Phase 15 and Phase 17 approximation follow-ups.

### Tier A vs Tier B

| | Tier A | Tier B |
|---|---|---|
| Author writes | `layout()` | `Component` (JSX) + `poster()` |
| Live render | generic DOM renderer over `LayoutNode` | the author's React |
| Headless render | generic SVG renderer over `LayoutNode` | `poster()` — an honest static stand-in |
| Parity test | mandatory, automated | poster-only snapshot |
| Examples | every text, data, diagram, media block | live chart with hover, iframe embed, video, countdown, poll |
| Share of the catalog | 158 of 170 (93%) | 12 of 170 (7%) |

**Tier B is a deliberate, bounded escape hatch, not a convenience.** A block goes Tier B only when
it needs live interaction or a foreign runtime. Reaching for Tier B because `layout()` felt
awkward is the failure mode; the review question is always "what interaction does this need that a
static picture cannot express?"

## 1.7 Nesting — block inside block

Two distinct mechanisms, at two levels, on purpose.

**Inside a block: real nesting with real layout.** A container block (`family: 'layout'`) declares
a `{ kind: 'blocks' }` slot, and `layout()` recursively lays its children out inside its own box
via `ctx.layoutChild(childSpec, box)`. Because layout is a pure function of a box, a nested tree
*reflows* when the outer block is resized, which absolute coordinates can never do. This is how
you build "a card containing an icon, a heading, a bullet list and a mini-sparkline" as one
resizable, themeable, animatable unit — and how the AI expresses complex content without emitting
a single coordinate.

Containers: `tls.stack`, `tls.row`, `tls.grid`, `tls.split`, `tls.overlay`, `tls.card`,
`tls.section`, `tls.repeater` — see [03-block-catalog.md](03-block-catalog.md) §A.

**On the slide: separate shapes.** Each top-level block is its own `ComponentShape`, so tldraw's
selection, drag, resize, z-order, alignment, grouping and undo all work unchanged. We do not
rebuild any of that inside a block.

Depth is capped at **4** (`ctx.depth`), and the renderer refuses deeper trees with a lint error
rather than recursing. Rationale: every real slide composition in `ppt-master`'s layout systems
resolves in ≤3 levels (page field → zone → device → part); a 5-deep tree is a modelling mistake,
and an uncapped recursion is a denial-of-service on a document an AI generated.

## 1.8 Capacity and overflow — the thing that decides whether AI output looks good

A block must be able to answer, before anything is drawn: *does this content fit this box?*

```ts
interface CapacityReport {
  fits: boolean
  /** How much content this box could hold at the current style, per content slot. */
  budget: Record<string, { max: number; used: number; unit: 'chars'|'items'|'lines' }>
  /** In order, what the block would do about an overflow. */
  remedy: OverflowRemedy[]
}
type OverflowRemedy =
  | { kind: 'shrink'; minScale: number }     // autofit — Phase 17's `autoFit` generalized
  | { kind: 'reflow'; to: string }           // e.g. 2 columns → 1 column, grid 3×2 → 2×3
  | { kind: 'truncate'; slot: string }       // last resort, and it must be visible that it happened
  | { kind: 'paginate' }                     // split into a continuation slide — §06 §4
```

The order matters and is a design rule, taken from `ppt-master`'s own instruction
(*"expand a zone with unused space first, then reflow or switch texture before dropping a
qualifier… Never trim wording to satisfy an estimate"*): **reflow → shrink → paginate →
truncate.** Truncation is never silent; the linter reports it.

## 1.9 How a block reaches the canvas

```
BlockSpec ──► blockToShape(spec, box, ctx) ──► ComponentShape ──► Commands.insertContent
                                                   │
   { type: Component,                               │  size: box,  point: box origin,
     componentId: spec.type,                        │  slot: spec.slot,
     props: { ...spec.props,                        │  animation: derived from spec.motion,
              $block: { id, style, motion, children } },   style: { cornerRadius, opacity, … } }
                                                   ▼
```

- `componentId` **is the block type id**. This keeps the existing `MissingBlockPlaceholder` and
  the SVG placeholder honest — they already print the `componentId`, so an unregistered block
  names itself instead of saying "component".
- **The block's own props sit at the top level of `ComponentShape.props`; everything that is not
  content goes under one reserved `$block` key.** No duplication — `spec.props` is stored once, and
  `id`/`style`/`motion`/`children` are stored once. The split is deliberate: a host or a debugger
  reading `shape.props.label` sees the content directly, and `shapeToBlock` reassembles the
  `BlockSpec` by lifting `$block` back out. `ComponentShape.props` is already
  `Record<string, unknown>`, so nesting an object needs no type change. `$block` is reserved: a
  block schema declaring a slot named `$block` fails validation at registration time.
- `spec.slot` is copied to `TDBaseShape.slot`, so a block is fillable by
  `addSlideFromTemplate(templateId, content)` exactly like a Phase 13 template shape. **Blocks and
  templates are the same mechanism at two grain sizes** — a template is a slide-shaped arrangement
  of blocks, and P29 rebuilds the twelve starter templates on top of blocks without changing
  `Template`'s type.
- `spec.motion` compiles to `TDBaseShape.animation` (`ShapeAnimation`) for the *block-level*
  reveal, so the existing `computeBuildSteps` / `PresentationRuntime` machinery drives it with no
  change. Intra-block part motion is additional and handled by the motion driver (§05 §4).

### Registering with the editor

```ts
// host app
import { Tldraw } from '@tlslides/tldraw'
import { blockLibrary, createBlockComponents } from '@tlslides/blocks'

const components = createBlockComponents(blockLibrary)   // Record<componentId, React.FC>
<Tldraw components={components} />
```

`createBlockComponents` is the bridge: it turns a `BlockDefinition[]` into the
`TldrawComponentsRegistry` shape `<Tldraw components>` already expects. **No change to
`Tldraw.tsx` is required for the live path** — that is the point of building on Phase 5.

## 1.10 The one change the fork actually needs: headless block rendering

`renderPageToSvg` is a pure function in `@tlslides/tldraw` and cannot import `@tlslides/blocks`
(that would be a dependency cycle). So it gains an injected renderer, in the same spirit as its
existing `opts.theme` / `opts.assets`:

```ts
interface RenderPageToSvgOptions {
  // ...existing
  /** When supplied, `ComponentShape`s are rendered through it instead of the dashed placeholder. */
  blocks?: (shape: ComponentShape, ctx: LayoutContext) => string | undefined
}
```

`@tlslides/blocks` exports `svgBlockRenderer(library)` producing exactly that function. When it is
absent, or returns `undefined` for a Tier-B block with no poster, the existing placeholder path
runs unchanged — so this is purely additive and every current test keeps passing.

`Deck.getThumbnail` / `Deck.exportSlidePng` gain the same optional pass-through, and `<Tldraw>`
gains an optional `blocks` prop so the editor's own export menu ("Copy as SVG", PNG) can supply it
without the host wiring it twice.

## 1.11 Package layout

```
packages/
  core/                    # untouched
  tldraw/
    src/blocks/            # NEW: runtime primitives only — no concrete block definitions
      types.ts             #   BlockSpec, BlockDefinition, LayoutNode, contexts
      registry.ts          #   BlockRegistry, createBlockComponents
      layout/              #   box model, measureText provider, layoutChild
      render-dom.tsx       #   generic LayoutNode → React
      render-svg.ts        #   generic LayoutNode → SVG string (pure, no DOM)
      motion/              #   driver interface, WAAPI driver, tokens
      tokens.ts            #   color roles, scales, resolution against DeckTheme
  blocks/                  # NEW workspace package `@tlslides/blocks`
    src/
      layout/ text/ data/ diagram/ media/ composite/ chrome/ live/
      index.ts             #   blockLibrary: BlockDefinition[]
```

**Why the split:** the editor must be able to render *some* block without knowing *any* block
(runtime in `tldraw`), and the library must be able to import `TDShape`/`DeckTheme` types
(library depends on `tldraw`). One direction, no cycle. A host can also import
`@tlslides/blocks` alone — to render a block preview in a sidebar, or to validate AI output on a
server — without mounting an editor, which is the same reasoning that made Phase 15's
`renderPageToSvg` and Phase 14's `BUILT_IN_TEMPLATES` root exports worth having.

`@tlslides/blocks` follows the same build/publish rules as `@tlslides/tldraw`: transpiled `dist`
(Phase 9 — no JSX in output, or a consumer gets the `Unexpected token '<'` failure documented in
`CLAUDE.md`), same React peer range, added to the `examples/consumer-smoke/` run.

## 1.12 Known traps, carried forward from earlier phases

Every one of these is a bug this repo already paid for. A block implementer will hit them.

1. **Any free-typed input inside a block must use `stopKeyPropagationUnlessEscape`.**
   `@tlslides/core`'s key handler listens on `window`; without this, typing <kbd>Tab</kbd> in a
   block's text field *clones the shape being edited* and every subsequent edit silently lands on
   the clone. Exported from the package root for exactly this reason (Phase 8b, Phase 14).
2. **`.tl-positioned-div` sets `overflow: hidden` and `contain: layout style size`.** A dropdown,
   tooltip or popover rendered inside a block is clipped. Portal it to `document.body`
   (`ComponentUtil.tsx:110-114`).
3. **A block's own interactive controls must `stopPropagation` on pointer-down**, or the gesture
   also starts a shape drag — the pattern `StickyUtil`/`TextUtil` already use.
4. **`isStateful = true` keeps every block mounted regardless of viewport.** Fine for tens of
   blocks; a block that runs a timer or an animation loop while not presenting is not. Ambient
   motion is presentation-only and must be torn down on unmount (§05 §7).
5. **Opacity/fill set on the outer `<SVGContainer>` looks right live and vanishes from SVG
   export** (Phase 8a). In the SVG renderer, paint goes on the inner node.
6. **A CSS class rule beats an SVG presentation attribute regardless of specificity** (Phase 11).
   Set overrides via inline `style`, not the `fill` attribute.
7. **`DEFAULT_SLIDE_SIZE` and any module-level array must be copied, never assigned by
   reference** (Phase 3). Block defaults are module-level objects; `defaults` must be deep-cloned
   on instantiation.
8. **The build tool does not fail on type errors** (Phase 5/7). `build:packages` must be read, not
   trusted.

## 1.13 Persistence and versioning

No `TldrawApp.version` bump. Every addition is optional, following the exact precedent of Phases
11, 13 and 17:

| Addition | Where | Migration? |
|---|---|---|
| Block spec inside `props` | `ComponentShape.props` (already `Record<string, unknown>`) | No — no type change at all |
| `TDDocument.masters?: Record<string, MasterSpec>` | `types.ts` | No — optional, unread by old code |
| `TDPage.masterId?: string` | `types.ts` | No — optional |
| `TDDocument.tokens?: DeckTokens` | `types.ts` | No — optional; absent = theme-derived defaults |
| `RenderPageToSvgOptions.blocks?` | render options (not persisted) | N/A |

If a later phase believes it needs a *required* field or a type narrowing, it stops and batches
the change the way Phase 3 did — one version bump carrying everything — rather than spending a
migration on one field.
</content>
