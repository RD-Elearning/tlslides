# 4. Block anatomy — the authoring contract

Read this before writing any block. [03-block-catalog.md](03-block-catalog.md) says *what* to
build; this says *how*, and the ten worked examples at the end are the reference implementations
every other block copies.

## 4.1 File layout — one block, one folder

```
packages/blocks/src/<family>/<name>/
  index.ts            # the BlockDefinition — the only export
  layout.ts           # the pure layout() function
  schema.ts           # BlockSchema + defaults
  motion.ts           # MotionRecipe (named parts + default choreography)
  <Name>.tsx          # Tier B only — the live React component
  <name>.spec.ts      # unit: schema validation, layout geometry, capacity, lint
  <name>.parity.spec.ts   # Tier A only — DOM/SVG parity (generated from a helper, ~5 lines)
  __snapshots__/
```

`packages/blocks/src/index.ts` collects every definition into `blockLibrary`. A block not in that
array does not exist as far as the editor is concerned; the registry has no auto-discovery, on
purpose (bundle size, and an accidental export should not become a shipped product surface).

## 4.2 The contexts a block is given

```ts
interface LayoutContext {
  /** The box this block must fill, in slide units. Origin is the block's own top-left (0,0). */
  box: Size
  /** Resolved design tokens for this deck — colors, scales, radii. See doc 02. */
  tokens: ResolvedTokens
  /** What is behind this block. Foreground colors are solved against it. See doc 02 §2.4. */
  surface: SurfaceContext
  /** Role → concrete color, contrast-solved. Returns `{ color, ok }`; `ok:false` is a lint finding. */
  resolveColor(role: ColorRole | string): ResolvedColor
  /** Type token → concrete size/line-height/family, resolved through the theme font pairing. */
  resolveText(token: TypeToken, over?: Partial<TextStyleSpec>): ResolvedTextStyle
  /** The ONLY measurement primitive. Deterministic, available in Node. See §4.6. */
  measureText(text: string | RichText, style: ResolvedTextStyle, maxWidth?: number): TextMetrics
  /** Lay a child block out inside `box`, returning its node. Containers only. Depth-capped at 4. */
  layoutChild(spec: BlockSpec, box: Box): LayoutNode
  /** Asset lookup for images — reuses TDDocument.assets. Returns intrinsic size when known. */
  asset(assetId: string): AssetInfo | undefined
  /** Icon lookup — see §4.7. Returns a path, or undefined (block must degrade, never throw). */
  icon(id: string): IconPath | undefined
  depth: number
  /** True when laying out for export/thumbnail rather than the live editor. Blocks should not
   *  branch on this for *appearance* — only for editor-only affordances (x.safe-area, x.grid-guide). */
  headless: boolean
}
```

**`layout()` must be pure and total.** No `document`, no `window`, no `Date.now()`, no `Math.random()`
(a decorative jitter takes a seed from `spec.id`), no network, no throwing. Given the same props,
box and context it returns the same tree — that is what makes the parity test, the linter,
server-side rendering and golden fixtures all possible at once.

## 4.3 The box model

Coordinates are slide units (a 1920×1080 default frame), origin at the block's own top-left.

```
┌─ box ──────────────────────────────────────┐
│  padding (style.padding, default md=24)     │
│  ┌─ content box ──────────────────────────┐ │
│  │  parts laid out here, gap = style.gap  │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

Rules:
- A block **fills its box**. It never returns a node larger than `ctx.box`; overflow is handled by
  `capacity()`'s remedies (§01 1.8), never by drawing outside.
- A block **may return a node smaller than its box** and must then report its natural size so the
  inserter can offer "fit to content". Containers use that to distribute space.
- Sizes and gaps come from the spacing scale (§02 2.3). A literal `17` in a layout file is a
  review comment.

## 4.4 Parts — the animation and lint contract

Every visually meaningful sub-element gets a `part` name. Parts are:

- the target of `motion.parts` overrides (`{ parts: { value: { preset: 'count-up' } } }`),
- what the DOM renderer stamps as `data-part` for the motion driver to select,
- what the linter names in a finding (`tls.d.kpi#delta: contrast/muted`),
- what a future PPTX exporter maps to a named shape.

Part names are **declared in the motion recipe** and must match what `layout()` emits — a mismatch
is caught by a unit test that walks the node tree and diffs the two sets. Use stable, semantic
names (`title`, `value`, `delta`, `bar[3]`, `row[2].cell[0]`), never indices alone.

## 4.5 The definition, field by field

```ts
export const kpi: BlockDefinition<KpiProps> = {
  type: 'tls.d.kpi',
  name: 'KPI tile',
  family: 'data',
  tier: 'A',
  summary: 'One metric: a label, a headline number, and an optional change indicator.',
  keywords: ['kpi', 'metric', 'stat', 'number', 'tile', 'card'],
  schema, defaults,
  size: { preferred: [520, 300], min: [280, 160] },
  layout,
  motion,
  capacity,
  lint,
}
```

- **`summary` and each slot's `guidance` are the AI's prompt.** They are product surface, not
  comments. Write them as instructions to a writer: *"One metric name, 1–3 words. Never a
  sentence. Never repeat the unit here."*
- **`defaults` must look finished.** Dropping a block from the inserter with zero input should
  produce something screenshot-able, not `[object Object]` or empty boxes. Deep-clone on
  instantiation (Phase 3's array-aliasing bug).
- **`size.preferred` should match a real slot in the layout structures table** (§02 2.7) — a KPI
  tile at 520×300 is a quarter of a 4-up row inside a 1728-wide content field with `lg` gaps.

## 4.6 Text measurement — the one shared dependency

`ctx.measureText` is the only way a block learns how big text is, and both render paths use the
*same* result, which is why they cannot disagree.

Three implementations behind one interface:

| Provider | Where | Accuracy |
|---|---|---|
| `estimateMetrics` | default, Node + browser | Phase 15's `estimateTextSize` heuristic — documented as approximate |
| `canvasMetrics` | browser | real `CanvasRenderingContext2D.measureText`, cached per (font, size) |
| `tableMetrics` | Node | bundled per-face advance-width tables for the four built-in `FontStyle` faces |

**P23 must make the provider a deck-level decision, not a per-call one.** If the editor measures
with canvas and the server measures with estimates, a slide reflows between edit and export —
worse than both being approximate. Default: `tableMetrics` where available for the built-in faces,
`estimateMetrics` for an arbitrary `fontFamily` (whose real metrics nobody has), *in both
environments*. `canvasMetrics` is opt-in for a host that accepts the drift in exchange for
precision.

This is also the concrete fix for two named follow-ups: Phase 15's `estimateTextSize`
approximation and Phase 17's "pixel-exact `verticalAlign` at an edge, headlessly".

## 4.7 Icons

`ctx.icon(id)` resolves an id to a path, from an injected `IconProvider`. The package ships **no
icon set** — same reasoning as Phase 15's refusal to bundle a rasterizer: a host's icon library is
a host decision, and bundling one bloats every consumer. The provider interface takes an id like
`'tabler/trending-up'` and returns `{ d, viewBox, kind: 'stroke'|'fill' }`.

A missing icon renders a neutral placeholder square and emits a lint finding. It never throws and
never falls back to a different icon — a silently substituted icon is a wrong slide.

## 4.8 The shared chart engine

Thirty-two data blocks, one engine. `packages/blocks/src/data/_engine/`:

```
scales.ts      linear/band/log scale, nice-tick generation, domain padding
axes.ts        axis geometry + label layout + collision-aware tick thinning
legend.ts      legend layout; direct-labelling helper (preferred over a legend)
series.ts      normalize({series, categories}) -> typed, validated, NaN-free series
marks.ts       bar/column/point/line-path/area-path/arc/sector geometry
labels.ts      value-label placement with collision avoidance (inside/outside/skip)
palette.ts     series color assignment from tokens.categorical, stable across a deck
```

Rules the engine enforces so 32 blocks cannot drift:

- **Single series uses `accent`, not `categorical[0]`** — so every one-series chart in a deck
  agrees.
- **Direct labels beat a legend** whenever labels fit; the legend is a fallback, and the engine
  decides, not the block.
- **At most one recessive gridline set**, at `line` role, and never both x and y unless the chart
  is a scatter.
- **Bar/column baselines start at zero**, always. Truncating an axis is a `warn` lint finding, and
  it must be explicitly opted into (`baseline: 'auto'`), never a default.
- **No 3D, no shadowed bars, no gradient-per-bar.** Weight comes from a highlighted bar
  (`highlightIndex`), which recolors one mark to `accent` and pushes the rest to `neutral`.
- **≤6 encoded hues** (§02 2.2); past that the engine groups the tail as "Other" and reports it.
- **NaN/null handling is explicit per chart**: skip the point (line/area), skip the bar (bar), or
  render a gap marker. Never silently zero, which lies about the data.

## 4.9 Definition of done for one block

A block is done when **all** of these hold. P24–P28 acceptance is this checklist per block, not a
vibe check.

1. `schema.ts` validates good input and rejects bad input, with tests for both.
2. `defaults` render as a finished-looking block with zero input (screenshot inspected).
3. `layout()` is pure — enforced by a test that runs it in a Node environment with `document`,
   `window`, `Date` and `Math.random` stubbed to throw.
4. Geometry tests: the node tree has the expected parts, at the expected boxes, at three box
   sizes (min, preferred, 2× preferred).
5. **Parity test passes** — DOM-measured geometry equals SVG geometry within 1 slide unit (§09 §3).
6. `capacity()` returns `fits: false` for overlong content and the declared remedies actually fire.
7. Motion: parts declared in the recipe match parts emitted by layout; the default recipe plays in
   the visual scenario; `prefers-reduced-motion` produces a static reveal.
8. Lint: the block produces no findings on its own defaults, under all five built-in themes, on
   both a light and a dark slide background.
9. The block appears in the inserter with its `summary` and keywords (P30).
10. Added to the family's visual scenario; the screenshot is looked at, not just asserted on.

---

## Worked examples

Ten definitions covering every mechanism another block will need. Abbreviated to the parts that
teach something — full imports, exhaustive prop types and error paths omitted.

### E1 — `tls.l.stack` — the simplest container

Teaches: child layout, gap distribution, natural size.

```ts
function layout(p: StackProps, ctx: LayoutContext): LayoutNode {
  const pad = ctx.tokens.space[p.padding ?? 'none']
  const gap = ctx.tokens.space[p.gap ?? 'md']
  const inner = insetBox(ctx.box, pad)

  // Two passes: measure natural heights, then distribute remaining space to `grow` children.
  const natural = p.children.map((c) => ctx.layoutChild(c, { ...inner, height: Infinity }))
  const used = sum(natural.map((n) => n.box.height)) + gap * (p.children.length - 1)
  const slack = Math.max(0, inner.height - used)
  const growers = p.children.filter(isGrow).length

  let y = inner.y + alignOffset(p.distribute, slack, growers)
  const children = p.children.map((spec, i) => {
    const h = natural[i].box.height + (isGrow(spec) && growers ? slack / growers : 0)
    const node = ctx.layoutChild(spec, { x: inner.x, y, width: inner.width, height: h })
    y += h + gap
    return node
  })

  return { k: 'group', box: ctx.box, part: 'root', children }
}
```

**Note what is absent:** no fill, no padding default, no text. A container that draws is a `card`.

### E2 — `tls.l.split` — ratio, gutter, and the composition table

Teaches: turning `ppt-master`'s layout-structure ratios into an option enum rather than a number.

```ts
// The enum, not a free number: an AI picking `'3:7'` picks a *composition*, and every deck that
// uses 3:7 uses the same 3:7. A free ratio invites 0.317.
const RATIOS = { '1:1': 0.5, '2:3': 0.4, '3:7': 0.3, '2:8': 0.2, '7:3': 0.7, '8:2': 0.8 } as const

function layout(p: SplitProps, ctx: LayoutContext): LayoutNode {
  const gutter = ctx.tokens.space[p.gutter ?? 'xl']
  const r = RATIOS[p.ratio ?? '1:1']
  const horizontal = (p.axis ?? 'x') === 'x'
  const total = horizontal ? ctx.box.width : ctx.box.height
  const a = Math.round((total - gutter) * (p.swap ? 1 - r : r))
  const b = total - gutter - a
  // ...two child boxes, two layoutChild calls, optional divider line at the gutter centre
}
```

### E3 — `tls.t.title` — text, autofit, rich runs

Teaches: the text pipeline every text block shares.

```ts
function layout(p: TitleProps, ctx: LayoutContext): LayoutNode {
  const style = ctx.resolveText(p.size ?? 'title', { fontToken: 'heading', align: p.align })
  const inner = insetBox(ctx.box, ctx.tokens.space[p.padding ?? 'none'])

  // Autofit: shrink in 4% steps to a 0.75 floor, then let capacity() report an overflow.
  let scale = 1
  let m = ctx.measureText(p.text, style, inner.width)
  while (m.height > inner.height && scale > 0.75) {
    scale -= 0.04
    m = ctx.measureText(p.text, scaleText(style, scale), inner.width)
  }

  const nodes: LayoutNode[] = [{
    k: 'text', part: 'text', box: { ...inner, height: m.height },
    lines: m.lines,                       // already broken, with baselines and inline runs
    style: { ...scaleText(style, scale), fill: ctx.resolveColor(p.color ?? 'text').color },
  }]

  if (p.rule) nodes.push({
    k: 'rect', part: 'rule',
    box: { x: inner.x, y: inner.y + m.height + ctx.tokens.space.sm, width: 120, height: 6 },
    fill: solid(ctx.resolveColor('accent').color), radius: 3,
  })

  return { k: 'group', box: ctx.box, part: 'root', children: nodes }
}
```

`m.lines` carries `TextLine[] = { runs: { text, style }[]; baseline: number; width: number }` —
inline emphasis survives into both renderers, as `<tspan>`s in SVG (exactly `ppt-master`'s pattern)
and as `<span>`s in DOM.

### E4 — `tls.t.bullets` — lists, markers, stagger

Teaches: per-item parts, which is what makes staggered reveal work.

```ts
function layout(p: BulletsProps, ctx: LayoutContext): LayoutNode {
  const style = ctx.resolveText('body', { fontToken: 'body' })
  const gap = ctx.tokens.space[p.spacing ?? 'sm']
  const markerW = style.size * 0.9
  let y = inner.y

  const children = p.items.flatMap((item, i) => {
    const indent = (item.level ?? 0) * ctx.tokens.space.lg
    const textBox = { x: inner.x + indent + markerW, y, width: inner.width - indent - markerW }
    const m = ctx.measureText(item.text, style, textBox.width)
    const nodes = [
      marker(p.marker ?? 'dot', { x: inner.x + indent, y, size: markerW }, ctx, `item[${i}].marker`),
      { k: 'text', part: `item[${i}].text`, box: { ...textBox, height: m.height },
        lines: m.lines, style: withFill(style, ctx.resolveColor('text').color) },
    ]
    y += m.height + gap
    return nodes
  })
  return { k: 'group', box: ctx.box, part: 'root', children }
}
```

Motion recipe declares `item[*]` as a staggerable part family → `stagger-lines` at
`--duration-stagger` (40ms), capped so total stagger stays under ~300ms (§05 §5).

### E5 — `tls.d.kpi` — roles, polarity, derived color

Teaches: semantic color, and why a delta is not just a number.

```ts
function layout(p: KpiProps, ctx: LayoutContext): LayoutNode {
  const up = (p.delta ?? 0) >= 0
  // Polarity, not direction: for churn or cost, "up" is bad. The block asks the content.
  const good = p.polarity === 'inverse' ? !up : up
  const deltaColor = ctx.resolveColor(p.delta == null ? 'neutral' : good ? 'positive' : 'negative')

  return { k: 'group', box: ctx.box, part: 'root', children: [
    surfaceRect(ctx, p),                                             // part: 'surface'
    text(ctx, 'label',  p.label, 'caption', 'textMuted'),            // part: 'label'
    text(ctx, 'value',  format(p.value, p.format), 'display', p.accentValue ? 'accent' : 'text'),
    p.delta != null && deltaRow(ctx, p, deltaColor),                 // parts: 'delta', 'delta.icon'
    p.sparkline && miniSparkline(ctx, p.sparkline),                  // part: 'spark'
  ].filter(Boolean) }
}
```

Three rules this example exists to fix, all violated by the current demo block in
`examples/nextjs-sample/components/blocks.tsx`: colors come from roles not literals; direction is
carried by an **icon and a sign**, never by color alone (color-blind readers); and `polarity`
exists because "revenue up" and "churn up" are opposite news.

### E6 — `tls.d.column` — the chart engine in use

Teaches: how thin a chart block is once the engine exists.

```ts
function layout(p: ColumnProps, ctx: LayoutContext): LayoutNode {
  const data = normalizeSeries(p)                                  // engine: validate, drop NaN
  const plot = reservePlotArea(ctx.box, { title: p.title, axes: true }, ctx)
  const x = bandScale(data.categories, plot.width, { padding: 0.25 })
  const y = linearScale([0, niceMax(data.max)], plot.height)       // baseline always 0

  const bars = data.values.map((v, i) => ({
    k: 'rect' as const, part: `bar[${i}]`,
    box: { x: plot.x + x.at(i), y: plot.y + y.of(v), width: x.bandwidth, height: y.of(0) - y.of(v) },
    fill: solid(barColor(i, p, ctx)),                              // accent, or highlight+neutral
    radius: [ctx.tokens.radius.sm, ctx.tokens.radius.sm, 0, 0],
  }))

  return { k: 'group', box: ctx.box, part: 'root', children: [
    ...gridlines(y, plot, ctx),      // one recessive set, `line` role
    ...bars,
    ...valueLabels(data, x, y, plot, ctx),   // engine decides inside/outside/skip
    ...categoryAxis(data.categories, x, plot, ctx),
  ] }
}
```

Motion: `grow-bars-y` scales each `bar[i]` from `scaleY(0)` at its own baseline, staggered 40ms,
which is the one animation that actually reads as *data arriving* rather than decoration.

### E7 — `tls.g.timeline-h` — geometry, connectors, and a real past bug

Teaches: drawing an axis with nodes, and the coordinate trap Phase 13 hit.

```ts
function layout(p: TimelineProps, ctx: LayoutContext): LayoutNode {
  const axisY = ctx.box.height * (p.alternate ? 0.5 : 0.62)
  const step = inner.width / Math.max(1, p.events.length - 1 || 1)

  const axis = { k: 'line' as const, part: 'axis',
    from: { x: inner.x, y: axisY }, to: { x: inner.x + inner.width, y: axisY },
    stroke: { color: ctx.resolveColor('line').color, width: 3 } }

  const nodes = p.events.flatMap((e, i) => {
    const cx = inner.x + step * i
    const above = p.alternate ? i % 2 === 0 : true
    return [
      dot(cx, axisY, 14, ctx, `event[${i}].dot`),
      labelStack(ctx, e, { x: cx, y: axisY, above }, `event[${i}]`),
    ]
  })
  return { k: 'group', box: ctx.box, part: 'root', children: [axis, ...nodes] }
}
```

> **Do not build the axis as a `LineShape`.** Phase 13 shipped three templates whose dividers were
> invisible because `LineShape.handles` are shape-*local* while the code passed page-absolute
> coordinates — the bounds computed correctly and the line rendered clipped by its own container.
> A block's `{ k: 'line' }` node is in the block's own coordinate space; there is no handle
> indirection, and that is deliberate.

### E8 — `tls.m.image-text` — images, scrims, and text on photos

Teaches: the scrim rule, and focal-point cropping.

```ts
function layout(p: ImageTextProps, ctx: LayoutContext): LayoutNode {
  const dir = p.scrimDirection ?? (p.textAnchor?.startsWith('bottom') ? 'up' : 'right')
  // Never a flat plate: a directional gradient, darkest beside the text (doc 02 §2.6).
  const scrim: Paint = linearGradient(dir, [
    { at: 0,    color: rgba(scrimBase(ctx), 0.88) },
    { at: 0.55, color: rgba(scrimBase(ctx), 0.30) },
    { at: 1,    color: rgba(scrimBase(ctx), 0) },
  ])

  const textBox = anchorBox(ctx.box, p.textAnchor ?? 'bottom-left', ctx.tokens.space['3xl'])
  // The text is laid out against a surface whose luminance comes from the scrim, not the theme —
  // which is exactly the contrast bug doc 02 §2.4 exists to fix.
  const over = withSurface(ctx, { behind: scrim, luminance: scrimLuminance(dir, textBox), overImage: true })

  return { k: 'group', box: ctx.box, part: 'root', clip: true, children: [
    { k: 'image', part: 'image', box: ctx.box, assetId: p.image, fit: 'cover' /* focalPoint → crop offset */ },
    { k: 'rect',  part: 'scrim', box: ctx.box, fill: scrim },
    over.layoutChild(titleSpec(p), textBox),
  ] }
}
```

### E9 — `tls.c.two-column` — a composite is just a tree

Teaches: composites add zero rendering code.

```ts
function layout(p: TwoColProps, ctx: LayoutContext): LayoutNode {
  return ctx.layoutChild({
    type: 'tls.l.stack',
    props: { gap: 'xl', children: [
      { type: 'tls.t.title', props: { text: p.title, rule: p.rule } },
      { type: 'tls.l.split', props: {
          ratio: p.ratio ?? '1:1', gutter: 'xl', divider: p.divider,
          start: { type: 'tls.l.stack', props: { gap: 'md', children: p.left } },
          end:   { type: 'tls.l.stack', props: { gap: 'md', children: p.right } },
      } },
    ] },
  }, ctx.box)
}
```

Every composite in family F is this shape. Their value is the *named slots* (`title`, `left`,
`right`) that a template, the inserter and the AI all target — not new drawing code.

### E10 — `tls.v.tabs` — a Tier B block

Teaches: the escape hatch, and its obligations.

```tsx
export const Tabs: React.FC<BlockRenderProps<TabsProps>> = ({ props, ctx, presenting }) => {
  const [i, setI] = React.useState(props.initialIndex ?? 0)
  return (
    <div style={fill} onPointerDown={stopPropagation}>          {/* or the shape starts dragging */}
      <div role="tablist">
        {props.tabs.map((t, n) => (
          <button key={t.label} role="tab" aria-selected={n === i}
            onKeyDown={stopKeyPropagationUnlessEscape}          {/* or Tab clones the shape */}
            onKeyUp={stopKeyPropagationUnlessEscape}
            onClick={() => setI(n)}>{t.label}</button>
        ))}
      </div>
      <BlockTree spec={props.tabs[i].content} ctx={ctx} />      {/* children still go through layout */}
    </div>
  )
}

// Export/thumbnail path — honest, static, and it must exist.
function poster(p: TabsProps, ctx: LayoutContext): LayoutNode { /* tab bar + active panel only */ }
```

Obligations, restated because they are the ones people forget: `stopPropagation` on pointer-down,
`stopKeyPropagationUnlessEscape` on every key handler, portal any overlay to `document.body`
(`.tl-positioned-div` clips), and tear down every timer/subscription on unmount **and** when
`presenting` goes false — `isStateful = true` means this component never unmounts on its own.
</content>
