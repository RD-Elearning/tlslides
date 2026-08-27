# 2. Visual Fidelity & the Style System

This document answers your first question directly: *"the shape lines are hand-drawn — I want
configurable line types."*

## 2.1 The headline: line styles already exist

`DashStyle` has four members (`packages/tldraw/src/types.ts:433-438`):

```ts
export enum DashStyle {
  Draw = 'draw',      // hand-drawn / sketchy
  Solid = 'solid',
  Dashed = 'dashed',
  Dotted = 'dotted',
}
```

All four are already rendered in the style panel, which iterates
`Object.values(DashStyle)` (`components/TopPanel/StyleMenu/StyleMenu.tsx:229`). Users can switch
today.

**Everything looks sketchy purely because of two default constants**
(`state/shapes/shared/shape-styles.ts:174-186`):

```ts
export const defaultStyle: ShapeStyles = {
  color: ColorStyle.Black,
  size: SizeStyle.Small,
  isFilled: false,
  dash: DashStyle.Draw,        // ← the hand-drawn look
  scale: 1,
}

export const defaultTextStyle: ShapeStyles = {
  ...defaultStyle,
  font: FontStyle.Script,      // ← "Caveat Brush", a handwriting font
  textAlign: AlignStyle.Middle,
}
```

> **Quick win (≈10 minutes):** change `dash` to `DashStyle.Solid` and `font` to `FontStyle.Sans`.
> The editor immediately stops looking like a whiteboard and starts looking like a design tool.
> Note this changes *defaults only* — existing saved documents keep their stored styles, and no
> migration is required.

### How the hand-drawn mode works (worth understanding before you change it)

`DashStyle.Draw` is a global sketchy mode, not just the pencil tool. Every geometric util
branches on it and swaps in a `perfect-freehand` renderer:

- Rectangle — `RectangleUtil.tsx:71` → `DrawRectangle` vs `DashedRectangle`
- Ellipse — `EllipseUtil.tsx:74` (indicator at `:122`)
- Triangle — `TriangleUtil.tsx:76`
- Arrow — `ArrowUtil.tsx:177` passes `isDraw` down
- Draw — `DrawUtil.tsx:63-66, 97`

In draw mode the "stroke" is not an SVG stroke at all — it is a **filled outline polygon**
produced by `getStroke(...)` and rendered as `<path fill={stroke} stroke={stroke}>`
(`RectangleUtil/components/DrawRectangle.tsx:33-39`). Corner jitter is seeded per shape via
`Utils.rng(shape.id)` (`rectangleHelpers.ts:10, 19-21`), so geometry is deterministic per shape
but **recomputed from `strokeWidth` on every render**.

This matters for later work: any change to how stroke width is derived changes the *outline
geometry*, not just thickness. Text, Sticky, Image, Video, and Group ignore `dash` entirely.

### How solid/dashed/dotted work

One primitive: `Utils.getPerfectDashProps(length, strokeWidth, style, snap, outset, lengthRatio)`
at `packages/core/src/utils/utils.ts:1382-1427`.

- `dashed` → `dashLength = strokeWidth * 2`, offset `dashLength/2` (`:1397-1400`)
- `dotted` → `dashLength = strokeWidth/100`, ratio `100` (`:1401-1404`)
- **everything else, including `solid` and `draw`** → `{ strokeDasharray: 'none' }` (`:1405-1410`)

Dash counts are fitted to the measured path length so dashes land evenly (`:1412-1426`), which is
why each shape passes its own perimeter. Rectangles and triangles call it **per side** so corners
align (`DashedRectangle.tsx:36-41`); ellipses call it once with `Utils.perimeterOfEllipse`
(`DashedEllipse.tsx:23-29`); arrows use segment length or arc length.

`DrawUtil` is the exception — it bypasses the helper with its own hardcoded table
(`DrawUtil.tsx:131-143`).

## 2.2 The real gap: style expressiveness

This is where the actual distance to Canva lies. The complete style model is a single flat
struct shared by all ten shape types (`types.ts:461-469`):

```ts
export type ShapeStyles = {
  color: ColorStyle       // 12 fixed named colors
  size: SizeStyle         // 3 fixed sizes
  dash: DashStyle         // 4 line styles
  font?: FontStyle        // 4 fixed fonts
  textAlign?: AlignStyle
  isFilled?: boolean      // a boolean, not a color
  scale?: number          // internal, set on text resize
}
```

### Colors: 12 named values, no hex

`ColorStyle` (`types.ts:412-425`) is `White, LightGray, Gray, Black, Green, Cyan, Blue, Indigo,
Violet, Red, Orange, Yellow` — mapped to hex literals in a fixed 12-entry table
(`shape-styles.ts:8-21`).

**Arbitrary hex is not supported anywhere.** The enum member *is* the stored value, and every
consumer indexes a `Record<ColorStyle, string>`. Three derived palettes (`stickyFills`,
`strokes`, `fills` — `shape-styles.ts:23-71`) are precomputed at module load with
`Utils.lerpColor`, including special-case White/Black overrides for dark mode.

Fill is a **boolean**, not a color: `fill: isFilled ? fills[theme][color] : 'none'`
(`shape-styles.ts:169`). You cannot pick a fill independent of the stroke — the fill is always an
82%-lightened wash of the stroke color.

### Stroke width: 3 fixed values

```ts
const strokeWidths = { small: 2, medium: 3.5, large: 5 }   // shape-styles.ts:73-77
```

Critically, that number is then **re-scaled differently by every renderer**, so it is not a
single source of visual truth:

- `1 + strokeWidth * 1.618` — DashedRectangle `:24`, DashedEllipse `:20`, DashedTriangle `:22`, StraightArrow `:36`, CurvedArrow `:45`
- `1 + strokeWidth * 1.5` — DrawUtil `:145`
- `strokeWidth / 2` — DrawUtil `:119`, StraightArrow `:63`
- raw `strokeWidth` as perfect-freehand `size` — rectangleHelpers `:71`, triangleHelpers `:74`, arrowHelpers `:57`
- `2 + strokeWidth * 2` / `1 + strokeWidth * 2` — ellipseHelpers `:24-25, :43`

`SizeStyle` also drives text: font sizes `28/48/96` (`:79-84`) and sticky sizes `24/36/48`
(`:100-105`).

### Fonts: 4 fixed families

`FontStyle` → CSS families (`shape-styles.ts:86-91`): Script → `"Caveat Brush"`, Sans →
`"Source Sans Pro"`, Serif → `"Crimson Pro"`, Mono → `"Source Code Pro"`.

Webfonts are loaded from Google Fonts by hardcoded URL in **three separate places** that have
drifted apart:
- `hooks/useStylesheet.ts:5-7` (the editor)
- `TldrawApp.ts:1935` (the SVG export `@import`)
- `StyleMenu.tsx:372-385` (the panel preview swatches — which use a *different* list:
  `Recursive`, `Georgia`, `Recursive Mono`)

A `fontSizeModifiers` map exists but every entry is `1` (`:93-98`) — a currently-dead hook.

Also note bug **B-01**: `FontStyle.Serif = 'erif'` (`types.ts:456`).

### Absent entirely

| Feature | Verification |
|---|---|
| **Opacity** | Only `GHOSTED_OPACITY = 0.3` (`constants.ts:13`), a transient drag state. No user-settable alpha. |
| **Gradients** | `grep -rn "gradient"` across `packages/tldraw/src` + `packages/core/src` → zero hits. |
| **Shadows / blur** | No filter or `<feGaussianBlur>` usage. |
| **Line caps** | `strokeLinecap="round"` hardcoded in 13 render sites. |
| **Corner radius control** | Computed as `min(w/2, sw*2)` in `rectangleHelpers.ts:33-34`. Not user-configurable. |
| **Per-side borders** | Sides are drawn as 4 lines but share one style. |
| **Letter spacing / line height** | `LETTER_SPACING` is a global constant (`constants.ts`), not per-shape. |

## 2.3 Cost of extending the style system

**The good news: there is essentially no validation or schema layer to fight.**

- No zod/superstruct/ajv/yup in `packages/tldraw/package.json`.
- Persistence is structural JSON: `idb.set(this._idbId, this._state)` (`StateManager.ts:135`).
- Migrations are a hand-written imperative function (`state/data/migrate.ts:4-132`) triggered by
  a numeric version compare against `TldrawApp.version = 15.3` (`TldrawApp.ts:3716`).
  **Adding an *optional* style field needs no migration** as long as every reader has a default.
- The style command is generic: `styleShapes` iterates `Object.keys(changes)`
  (`state/commands/styleShapes/styleShapes.ts:26-30`), so a new field flows through undo/redo and
  `appState.currentStyle` with zero changes.
- The style panel is **partly** generic: `STYLE_KEYS = Object.keys(defaultTextStyle)`
  (`StyleMenu.tsx:42`) and the dash/size/font/align rows iterate `Object.values(Enum)`. **Adding
  a new enum member to an existing style requires no panel code** — only an icon-map entry
  (`DASH_ICONS` `:44-49`, `SIZE_ICONS` `:51-55`, `ALIGN_ICONS` `:57-62`), which are hardcoded
  lookups that would otherwise render `undefined`.

A genuinely *new kind of control* (hex picker, width slider) must be hand-added to one 387-line
file. There is no declarative style-schema-to-UI machinery.

### Effort estimates

| Change | Effort | Notes |
|---|---|---|
| **Switch defaults to solid/sans** | **XS** | Two constants (`shape-styles.ts:174-186`). Highest value-per-minute change in the repo. |
| **Add more `DashStyle` members** (e.g. `dashedLong`, `dashDot`) | **S** | Extend the enum, add a branch in `getPerfectDashProps`, add an icon. Panel updates automatically. |
| **Opacity** | **S** | Add `opacity?: number` to `ShapeStyles`, default it, and set it on the per-shape `<SVGContainer opacity>` wrappers **that already exist for ghosting** (`RectangleUtil.tsx:88`, `EllipseUtil.tsx:91`, `TriangleUtil.tsx:98`, `DrawUtil.tsx:100,149`, `ArrowUtil.tsx:165`) — combine with `GHOSTED_OPACITY`, do not replace it. Optional field ⇒ no migration. Needs a new slider control. |
| **Line caps** | **S** | 13 hardcoded sites. Caveat: `Draw` mode won't respond — its "stroke" is a filled polygon whose caps come from perfect-freehand tapers. |
| **Arbitrary stroke width** | **M** | `getStrokeWidth` (`shape-styles.ts:107-109`) is the only lookup — a 2-line override. The cost is the ~15 ad-hoc multipliers above, plus in `Draw` mode the width **regenerates the outline path**. Large widths visually break corner radii. All 10 shape snapshot files will need regeneration. |
| **Arbitrary hex color** | **L** (~15 files) | `ColorStyle` is a *record key* in four load-time-precomputed maps. You must widen the type, replace every `strokes[theme][color]` lookup with an on-demand lerp, and decide what dark mode means for a user-chosen hex (today darkness is baked in, with special-case White/Black overrides that have no analogue). Also touches the SVG export path (`TDShapeUtil.tsx:188`, `StickyUtil.tsx:285-293`). |
| **Gradient fill** | **XL** | Nothing exists. Needs `<defs><linearGradient>` per shape with unique ids, threaded through both the live renderer *and* export. Export works by `cloneNode`-ing live DOM (`TDShapeUtil.tsx:181`) then stripping hit areas (`TldrawApp.ts:2002-2004`), so gradient `<defs>` must live **inside** each shape's `#{id}_svg` container to survive the clone. |
| **Rich text (bold/italic/lists)** | **XL** | Requires replacing the plain-`string` model and `<textarea>` editing with a rich-text document model and editor. Touches the type, every text renderer, SVG export (`getTextSvgElement.ts`), and migrations. See document 5. |

### Recommended sequence

1. **Now:** switch defaults (XS) — instant visual credibility.
2. **Phase 1:** opacity + more dash styles + line caps (S each) — cheap, visible wins.
3. **Phase 2:** arbitrary stroke width (M) with snapshot regeneration budgeted.
4. **Phase 3:** arbitrary hex + a real color picker (L) — this is what unlocks a brand kit.
5. **Later / evaluate:** gradients, shadows (XL). Consider whether custom component blocks
   (document 4) are a cheaper route to visually rich elements than extending the SVG style model.

Two structural facts make all of this easier than it looks: style is **one flat object shared by
all shape types** (exactly one type to widen), and there is **no serialization schema** (the only
risk is old documents lacking the key — solved with optional fields plus defaults).
