# 4. Custom React / Next.js Components as Slide Blocks

Your question: *"can I add custom Next.js block components to show on the UI?"*

**Answer: not today, but the underlying mechanism already exists and is proven. The fix is a
small, contained change to the fork — roughly one new shape type plus one new prop.**

## 4.1 The mechanism is already there

### `HTMLContainer` renders arbitrary React children into canvas space

`packages/core/src/components/HTMLContainer/HTMLContainer.tsx:1-20` is **not** an SVG
`foreignObject`. It is two nested plain divs:

```tsx
<div ref={ref} className={`tl-positioned-div ${className}`} draggable={false} {...rest}>
  <div className="tl-inner-div">{children}</div>
</div>
```

`children: React.ReactNode` — completely unconstrained.

How it lands in the right place:

1. **Camera** — `useCameraCss.tsx:39-42` sets `transform: scale(zoom) translateX() translateY()`
   on the `.tl-layer` div (`Canvas.tsx:110`).
2. **Per shape** — every shape is wrapped in `Container` (`Shape.tsx:25-32`), which uses
   `usePosition` (`usePosition.ts:13-27`) to set `transform: translate(minX, minY) rotate(θ)`
   plus explicit `width`/`height` from the util's `getBounds`.
3. **CSS** — `useStyle.tsx:195-233` defines `.tl-positioned` (absolute, `pointer-events: none`,
   `contain: layout style size`) and `.tl-positioned-div` (`width/height: 100%`,
   `overflow: hidden`).

So a custom shape's React subtree is **real DOM in the document**, absolutely positioned and
CSS-scaled by the camera.

### Existing shapes already do exactly this

| Shape | Renders | Evidence |
|---|---|---|
| Sticky | live `<textarea>` | `StickyUtil.tsx:192-236`, styled `:380` |
| Text | live `<textarea>` | `TextUtil.tsx:144-200`, styled `:411` |
| Image | real `<img>` | `ImageUtil.tsx:62-92` |
| Video | real `<video>` with `controls` | `VideoUtil.tsx:97-134` |

Precedent is solid: interactive DOM with focus handling, media playback, and event plumbing
already works inside the canvas.

### `@tlslides/core` is fully open

`Renderer` takes `shapeUtils` as a **prop**: `Renderer.tsx:22-26`
(`shapeUtils: TLShapeUtilsMap<T>`). The repo's own examples prove arbitrary utils work —
`examples/core-example/src/app.tsx:26-28` passes `{ rect: new RectUtil() }`.

`TLShapeUtil` **is** exported from core (`packages/core/src/index.ts` → `./TLShapeUtil`) and
requires only three members (`TLShapeUtil.tsx:7-71`):

```ts
abstract Component: React.ForwardRefExoticComponent<TLComponentProps<T, E, M>>
abstract Indicator: (props: {...}) => React.ReactElement | null
abstract getBounds: (shape: T) => TLBounds
```

Everything else has a default. `TDShapeUtil` (tldraw's subclass) adds `type` and `getShape`
(`packages/tldraw/src/state/shapes/TDShapeUtil.tsx:23, 37`), and rectangular blocks can reuse
`getBoundsRectangle` / `transformRectangle` from `state/shapes/shared`.

## 4.2 Why it is unreachable from `@tlslides/tldraw`

Five concrete blockers, all in the `tldraw` package:

1. **No registration API.** The registry is a module-level object literal
   (`state/shapes/index.ts:25-36`) built from ten hardcoded singletons. There is no `register`,
   `addShapeUtil`, or mutation anywhere.
2. **No prop.** `TldrawProps` (`Tldraw.tsx:17-95`) has no `shapeUtils`, `components`, or
   `customShapes` field. `shapeUtils` is closed over from the module import (`:7`, `:417`).
3. **`TDShapeUtil` is not exported.** `packages/tldraw/src/index.ts:1-5` re-exports
   `./state/shapes` — which imports the base class as `import type` and never re-exports it.
   **A consumer cannot `extend TDShapeUtil` from the public API.** (There is no `"exports"` map
   in `package.json`, so a deep import would technically resolve — an unsupported hack.)
4. **Closed types.** `TDShapeType` is a fixed enum (`types.ts:279-291`) and `TDShape` a closed
   union (`:398-408`).
5. **Unguarded lookups crash.** `useShapeTree.tsx:124` does `shapeUtils[shape.type].isStateful`
   with no guard — an unregistered type in a document throws. Same for `TLDR.getShapeUtil`.

Also: tools are a **second** hardcoded map (`state/tools/index.ts:13-41`,
`TldrawApp.ts:174-184`).

There is **no existing embed/iframe/component shape** — `grep -rin "iframe|embed"` across
`packages/tldraw/src` + `packages/core/src` returns one unrelated comment
(`TldrawApp.ts:1932 // Embed our custom fonts`).

## 4.3 Recommended design: a `ComponentShape` + a registry prop

**Do not** try to make `shapeUtils` fully generic and consumer-supplied. That pushes closed-union
type surgery onto every consumer and requires guards throughout core. For "chart / quote block /
branded header / KPI tile" slide blocks, a single escape-hatch shape is a better fit.

### The design

Store only a **serializable `componentId` plus props** in the shape record; keep the actual React
component in the Next.js app.

```ts
// packages/tldraw/src/types.ts
export enum TDShapeType {
  /* ...existing... */
  Component = 'component',
}

export interface ComponentShape extends TDBaseShape {
  type: TDShapeType.Component
  size: number[]
  componentId: string                  // e.g. 'kpi-tile', 'bar-chart'
  props: Record<string, unknown>       // JSON-serializable only
}
```

```tsx
// <Tldraw> gains one prop
components?: Record<string, React.ComponentType<any>>
```

`ComponentUtil.Component` reads the registry from React context (there is already a
`TldrawContext` / `useTldrawApp` pair in `packages/tldraw/src/hooks`) and renders:

```tsx
<HTMLContainer>
  {Registered ? <Registered {...shape.props} /> : <MissingBlockPlaceholder id={shape.componentId} />}
</HTMLContainer>
```

### Why `componentId` and not the component itself

- Documents stay **JSON-serializable** → persistence, `.tldr` files, and multiplayer keep working
  unchanged.
- The AI can emit `{ componentId: 'bar-chart', props: {...} }` — it never needs to emit React.
- Your Next.js app owns rendering, styling, and data fetching for the block.
- Version-skew is survivable via the placeholder fallback.

### Work items

| Item | Effort |
|---|---|
| (a) `ComponentShape` type + `ComponentUtil` (reuse `getBoundsRectangle`/`transformRectangle`), registered in `state/shapes/index.ts:25` | S |
| (b) `components` prop on `TldrawProps` → context → consumed by `ComponentUtil` | S |
| (c) `MissingBlockPlaceholder` fallback so old documents never crash | XS |
| (d) `getSvgElement` override for export — the default clones `#{id}_svg` (`TDShapeUtil.tsx:180-201`), which **does not exist for an HTML shape**, so exports would silently drop the block | M |
| (e) An insert affordance (tool button, or purely programmatic) | S |

**Total: a contained change.** Everything the mechanism needs already exists and is proven by
`VideoUtil`.

## 4.4 Gotchas you will hit

These come from how `HTMLContainer` is positioned, and they apply to any custom block:

1. **`pointer-events: none` is inherited.** `.tl-positioned` sets it (`useStyle.tsx:195-206`), so
   interactive children must opt in with `pointerEvents: 'all'` — exactly what `StickyUtil.tsx:312`,
   `ImageUtil.tsx:129`, and `TextUtil.tsx:366` do.
2. **`overflow: hidden` + `contain: layout style size`** on `.tl-positioned-div`
   (`useStyle.tsx:215-223`) clips anything outside bounds. **Dropdowns, tooltips, and popovers
   inside a custom block will be clipped.** Portal them out or design without overlays.
3. **Off-screen shapes are unmounted.** `useShapeTree.tsx:119-128` culls to the viewport unless
   `isStateful = true`. A block holding internal React state must set it — only `VideoUtil.tsx:25`
   does today (commented `// don't unmount`).
4. **Zoom scales via CSS transform**, so text stays crisp but layout does **not** reflow. A block
   designed at one size will scale uniformly, not respond. This is usually what you want for
   slides.
5. **Export is the real cost.** SVG export clones live DOM (`TDShapeUtil.tsx:181`) then strips hit
   areas (`TldrawApp.ts:2002-2004`). HTML blocks have no `#{id}_svg` node. PNG export goes through
   headless Chrome and *will* capture HTML correctly — so **PNG/PDF export works, SVG export does
   not** unless you write a serializer per block type. Budget for this.

## 4.5 What this unlocks for your product

Custom component blocks are arguably the **highest-leverage feature** for an AI slide builder,
because they sidestep the style system's limits entirely:

- **Charts** — render Recharts/D3 in a block instead of building a chart shape type.
- **Rich text blocks** — a React rich-text editor inside a block is a *far* cheaper path to
  bold/italic/bullets than replacing tldraw's plain-string text model (see document 5).
- **Branded elements** — headers, footers, logo lockups, KPI tiles styled with your design system
  and Tailwind, not with `ShapeStyles`.
- **Tables, code blocks, quotes, timelines** — all become React components, not shape types.
- **Live/data-bound blocks** — a block that fetches from your API and re-renders.

**Recommendation: build this early.** It converts a large amount of "extend the canvas engine"
work (XL, risky) into ordinary Next.js component work (well-understood, parallelizable across
your team).
