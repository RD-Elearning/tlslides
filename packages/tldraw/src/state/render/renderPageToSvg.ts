import { Utils, TLBackgroundFill } from '@tlslides/core'
import { Vec } from '@tlslides/vec'
import { DEFAULT_SLIDE_SIZE, EASINGS, LABEL_POINT, LINE_HEIGHT } from '~constants'
import {
  clampCornerRadius,
  computeAutoFitScale,
  getFontSize,
  getLetterSpacingCss,
  getShapeOpacity,
  getShapeStyle,
  getStickyShapeStyle,
  resolveFont,
  unquoteFontFamily,
} from '~state/shapes/shared/shape-styles'
import { activeDeckTheme } from '~state/shapes/shared/deck-theme'
import { resolveSlideBackground } from '~state/shapes/shared/background'
import { getTextAlign } from '~state/shapes/shared/getTextAlign'
import { applyListMarkers } from '~state/shapes/shared/textList'
import {
  getRectangleIndicatorPathTDSnapshot,
  getRectanglePath,
} from '~state/shapes/RectangleUtil/rectangleHelpers'
import { getEllipseIndicatorPath, getEllipsePath } from '~state/shapes/EllipseUtil/ellipseHelpers'
import {
  getTriangleIndicatorPathTDSnapshot,
  getTrianglePath,
  getTrianglePoints,
} from '~state/shapes/TriangleUtil/triangleHelpers'
import {
  getDrawStrokePathTDSnapshot,
  getFillPath,
  getSolidStrokePathTDSnapshot,
} from '~state/shapes/DrawUtil/drawHelpers'
import {
  getArcLength,
  getArcPoints,
  getArrowArcPath,
  getCtp,
  getCurvedArrowHeadPoints,
  getStraightArrowHeadPoints,
  renderCurvedFreehandArrowShaft,
  renderFreehandArrowShaft,
} from '~state/shapes/ArrowUtil/arrowHelpers'
import {
  AlignStyle,
  ArrowShape,
  ComponentShape,
  DashStyle,
  DeckTheme,
  DrawShape,
  EllipseShape,
  FontStyle,
  GroupShape,
  ImageShape,
  LineShape,
  PolygonShape,
  RectangleShape,
  ShapeStyles,
  SpeechBubbleShape,
  StarShape,
  StickyShape,
  TDAssets,
  TDPage,
  TDShape,
  TDShapeType,
  TextShape,
  TriangleShape,
  VideoShape,
} from '~types'
import { getPolygonPoints } from '~state/shapes/PolygonUtil/polygonHelpers'
import { getStarPoints } from '~state/shapes/StarUtil/starHelpers'
import { getSpeechBubblePoints } from '~state/shapes/SpeechBubbleUtil/speechBubbleHelpers'
import { getPolygonPath, getPolygonIndicatorPathTDSnapshot } from '~state/shapes/shared/polygonDrawPath'

// ---------------------------------------------------------------------------------------------
// Phase 15 — headless render. `renderPageToSvg` is a *pure function of the document*: given a
// `TDPage` plus the document-level context a page can't resolve on its own (assets, the active
// theme), it returns a complete `<svg>...</svg>` string with no React, no mounted editor, and no
// DOM at all — it can run in a Node worker exactly as well as a browser tab. A dedicated test
// (`renderPageToSvg.node.spec.ts`, run under a real `@jest-environment node`, not jsdom) proves
// this rather than asserting it in prose.
//
// The reason this module exists at all — and the reason it *isn't* just `TldrawApp.copySvg`
// factored out — is `TDShapeUtil.getSvgElement`'s base implementation: `document.
// getElementById(shape.id + '_svg')?.cloneNode(true)`. Every shape whose export relies on that
// default (Rectangle, Ellipse, Triangle, Line, Draw, Group) requires a *live, currently-mounted*
// DOM node to clone; there is no headless equivalent of "the node that's already on screen." The
// four shape utils that already override `getSvgElement` (Image, Video, Sticky, Text, Component)
// are the tell: they build a fresh element with `document.createElementNS` instead of cloning,
// because for those shape types nothing suitable is ever mounted as `#{id}_svg` in the first
// place (Sticky/Image/Video/Component render as HTML, not SVG, live).
//
// What actually made this tractable: most of a shape's *geometry* was already pure. The hand-
// drawn "Draw" dash style, the corner-radius rectangle path, the ellipse/triangle outlines — all
// of it is computed by plain functions of shape data (`getRectanglePath`, `getEllipsePath`,
// `getTrianglePath`, the `DrawUtil`/`ArrowUtil` helpers) that were already factored out of their
// React components for reuse between the live `Component` and the `Indicator`/selection-outline
// render. None of them touch `document`. Reusing them here (imported directly, not
// reimplemented) is what keeps this module from being a second, drifting copy of the geometry
// Phases 1/8a/8b/11 already got right. Phase 8c's Polygon/Star/SpeechBubble fit the exact same
// mold: `getPolygonPoints`/`getStarPoints`/`getSpeechBubblePoints` and the hand-drawn
// `getPolygonPath`/`getPolygonIndicatorPathTDSnapshot` are the same pure, document-free functions
// their own `PolygonBody.tsx` renders from live, so `renderPolygon`/`renderStar`/
// `renderSpeechBubble` below import and reassemble them exactly like every shape above, rather
// than approximating or skipping them. What's genuinely new here is the *assembly*: turning those
// path strings and `getShapeStyle`'s resolved paint values into raw SVG markup, since there is no
// headless JSX-to-SVG-string bridge in use in this codebase. That makes this a *third* renderer of
// several already-resolved concepts (a shape's paint, a background fill, a gradient) — React
// (live), DOM-imperative (`TldrawApp.copySvg`/`appendBackgroundDefs`), and now plain strings here
// — exactly the same shape Phase 11 already established for backgrounds (`GradientDef` vs.
// `appendBackgroundDefs`); this module just extends that pattern to shape bodies as well.
//
// **Text is the one place this is an honest approximation, not a reproduction.** Every other
// shape's on-canvas size is stored data (`size`/`radius`/handle points) — geometry, not layout.
// A bare `TextShape`, and a `label` centering box on Rectangle/Ellipse/Triangle/Arrow, are the
// exception: the live editor sizes them by *measuring* the text against a mounted, invisible DOM
// element (`getTextLabelSize`/`TextUtil.getBounds`'s `melm`), and that measurement is never
// persisted for a label (it's recomputed from the DOM every render) or, for a bare `TextShape`,
// even cached beyond a `WeakMap` keyed on the live shape reference. There is no headless
// text-metrics table in this codebase to substitute, so `estimateTextSize` below is a hand-tuned
// average-character-width heuristic, not a measurement. It reproduces layout *well enough for a
// thumbnail or a rough export* — line count and rough proportions are right — but a label's
// centering offset, or the wrap width of a long line, will be off by some number of pixels
// compared to what the live editor (or `TldrawApp.copySvg`, which clones the already-measured
// live node) produces. See the function's own comment for the exact fallback numbers and
// `guides/documentation.md` for how this is written up for a host to plan around.
//
// **`ComponentShape` cannot be rendered headlessly, and this module does not try.** It's a host's
// own React component; there is no general way to serialize arbitrary React/DOM to static SVG
// markup here or anywhere else in this codebase (see `ComponentUtil.getSvgElement`'s own comment,
// which this mirrors). `renderComponentPlaceholder` below reproduces that exact same placeholder
// — a dashed box labelled with the block's `componentId` — as a second, necessarily-duplicated
// copy, since the original is built with `document.createElementNS` and can't be called headlessly
// either. Kept pixel-for-pixel identical to `ComponentUtil.getSvgElement` on purpose, so a host
// never sees a different placeholder depending on which export path produced it.
//
// **`VideoShape` is a smaller version of the same problem.** Live SVG export
// (`VideoUtil.getSvgElement`) embeds a still frame captured from the *live, currently-playing*
// `<video>` element (`TldrawApp.serializeVideo`) — there is no poster image stored on the shape
// or its asset to substitute (`TDVideoAsset` has no `poster` field). `renderVideoPlaceholder`
// below renders a neutral placeholder instead of attempting a frame capture that cannot exist
// headlessly.
//
// **Arrows get full fidelity, not an approximation** — a late, deliberate change from this
// module's first draft. `ArrowUtil` never overrides `getSvgElement` (it relies on the same
// live-DOM-clone default Rectangle/Ellipse do), so it looked, at first, like another shape that
// would need to be scoped down. It doesn't: every piece of an arrow's rendering
// (`StraightArrow`/`CurvedArrow`/`Arrowhead`) is already factored into pure functions in
// `ArrowUtil/arrowHelpers.ts` — the same "geometry already pure" pattern as every other shape —
// so both the straight and the circular-arc-bend cases are reproduced exactly, arrowheads
// included, imported directly rather than reimplemented.
// ---------------------------------------------------------------------------------------------

export interface RenderPageToSvgOptions {
  /** The document's asset table, needed to resolve image shapes and an `image`-type background.
   *  Defaults to `{}` (images/backgrounds referencing a missing asset render nothing for that
   *  element, same as the live editor with a missing asset). */
  assets?: TDAssets
  /** The deck's active theme (`TDDocument.theme`), for resolving `'theme:accent1'`-style tokens
   *  in colours. Defaults via `activeDeckTheme` — the same read-side default (`mono-grid`) every
   *  other render path in this fork uses, so a themeless document renders identically here. */
  theme?: DeckTheme
  /** The document's `defaultPageSize`, consulted when `page.size` itself is unset — the same
   *  fallback chain `Deck`'s own `listSlides()`/`getSlide()` use (see `resolvePageSize` below).
   *  Falls back to `DEFAULT_SLIDE_SIZE` (1920x1080) when neither is set. */
  defaultPageSize?: number[]
  /** Whether to resolve the *enum* colour palette (`ColorStyle`, e.g. a plain "Blue" swatch) in
   *  its dark-mode variant. Does not affect an explicit hex/theme-token colour (Phase 8b's
   *  "an arbitrary hex is not themed" rule — see `getShapeStyle`). Defaults to `false`: a
   *  server-rendered thumbnail has no user-facing UI-theme toggle to reflect, and `false` matches
   *  what `TDShapeUtil.getSvgElement`'s own label-fill resolution already hard-codes for export. */
  isDarkMode?: boolean
}

/** `page.size ?? defaultPageSize ?? DEFAULT_SLIDE_SIZE` — the exact fallback chain `Deck.
 *  toDeckSlide` already implements, pulled out so the two call sites (a host asking "how big is
 *  this slide" and this module actually rendering it) can never drift apart. */
export function resolvePageSize(page: TDPage, defaultPageSize?: number[]): [number, number] {
  const size = page.size ?? defaultPageSize ?? DEFAULT_SLIDE_SIZE
  return [size[0], size[1]]
}

/**
 * Render one slide to a complete, standalone `<svg>` document string — no React, no DOM, no
 * mounted editor (see the module comment above for why that's the hard part, and what it cost).
 * Reproduces Phase 11 backgrounds and shape gradient fills (as real `<defs>`, not CSS), Phase 12
 * theme tokens (via `activeDeckTheme`/`getShapeStyle` — resolution logic is reused, never
 * reimplemented here), and Phase 8a opacity/stroke width/corner radius. See the module comment
 * for the two shapes this cannot do headlessly (`ComponentShape`, `VideoShape`'s live frame) and
 * the one thing it does honestly approximately (text layout).
 */
export function renderPageToSvg(page: TDPage, opts: RenderPageToSvgOptions = {}): string {
  const assets = opts.assets ?? {}
  const theme = activeDeckTheme(opts.theme)
  const isDarkMode = opts.isDarkMode ?? false
  const [width, height] = resolvePageSize(page, opts.defaultPageSize)

  const ctx: RenderCtx = { assets, theme, isDarkMode }

  let defs = ''
  let backgroundRect = ''
  const resolvedBackground = resolveSlideBackground(page.background, page.id, assets, theme)
  if (resolvedBackground) {
    const painted = renderFillDefs(resolvedBackground)
    defs += painted.defs
    backgroundRect = `<rect x="0" y="0" width="${width}" height="${height}" fill="${escapeAttr(
      painted.paint
    )}" />`
  }

  // Top-level shapes only (`parentId === page.id`) — a group's own children are rendered by
  // `renderShapeOrGroup` when it recurses into them, never independently here too. This is a
  // correctness fix over `TldrawApp.copySvg`'s own iteration (which walks *every* shape in
  // `page.shapes`, including group children, and would double-render a grouped shape once as
  // part of its group and once again as a bare top-level entry) rather than a knowingly-copied
  // behaviour — there was no reason to reproduce it here.
  const topLevel = Object.values(page.shapes)
    .filter((shape) => shape.parentId === page.id)
    .sort((a, b) => a.childIndex - b.childIndex)

  const body = topLevel.map((shape) => renderShapeOrGroup(shape, page, ctx)).join('')

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
    `viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" fill="transparent">` +
    (defs ? `<defs>${defs}</defs>` : '') +
    backgroundRect +
    body +
    '</svg>'
  )
}

/* -------------------------------------------------- */
/*                      Internals                     */
/* -------------------------------------------------- */

interface RenderCtx {
  assets: TDAssets
  theme: DeckTheme
  isDarkMode: boolean
}

/** One shape's rendered body, in its own *local* coordinate space (top-left at `[0, 0]`) — the
 *  same convention every shape's live `SVGContainer` content already uses, since it's positioned
 *  by a CSS transform rather than by baking the shape's `point` into its own path data.
 *  `renderShapeOrGroup` wraps this in the `translate(point) rotate(deg, width/2, height/2)` group
 *  that puts it in page space, mirroring `TldrawApp.copySvg`'s own per-shape transform exactly. */
interface ShapeRender {
  width: number
  height: number
  inner: string
}

function renderShapeOrGroup(shape: TDShape, page: TDPage, ctx: RenderCtx): string {
  if (shape.type === TDShapeType.Group) {
    const group = shape as GroupShape
    const children = group.children
      .map((id) => page.shapes[id])
      .filter((child): child is TDShape => !!child)
    // No transform here: a group is a selection affordance, not a coordinate frame — every child
    // already carries its own absolute `point`/`rotation`, exactly as `TldrawApp.copySvg` assumes
    // (see its own `shape.children?.length` branch). The group shape's own dashed selection
    // border is UI-only and was never part of any export path either.
    return `<g>${children.map((child) => renderShapeOrGroup(child, page, ctx)).join('')}</g>`
  }
  const render = renderShape(shape, ctx)
  const rotationDeg = ((shape.rotation || 0) * 180) / Math.PI
  return (
    `<g transform="translate(${shape.point[0]}, ${shape.point[1]}) ` +
    `rotate(${rotationDeg}, ${render.width / 2}, ${render.height / 2})">${render.inner}</g>`
  )
}

function renderShape(shape: TDShape, ctx: RenderCtx): ShapeRender {
  switch (shape.type) {
    case TDShapeType.Rectangle:
      return renderRectangle(shape, ctx)
    case TDShapeType.Ellipse:
      return renderEllipse(shape, ctx)
    case TDShapeType.Triangle:
      return renderTriangle(shape, ctx)
    case TDShapeType.Line:
      return renderLine(shape, ctx)
    case TDShapeType.Draw:
      return renderDraw(shape, ctx)
    case TDShapeType.Arrow:
      return renderArrow(shape, ctx)
    case TDShapeType.Text:
      return renderText(shape, ctx)
    case TDShapeType.Sticky:
      return renderSticky(shape, ctx)
    case TDShapeType.Image:
      return renderImage(shape, ctx)
    case TDShapeType.Video:
      return renderVideoPlaceholder(shape)
    case TDShapeType.Component:
      return renderComponentPlaceholder(shape as ComponentShape)
    case TDShapeType.Polygon:
      return renderPolygon(shape, ctx)
    case TDShapeType.Star:
      return renderStar(shape, ctx)
    case TDShapeType.SpeechBubble:
      return renderSpeechBubble(shape, ctx)
    default:
      // GroupShape is handled by the caller; anything else is a shape type this fork doesn't
      // define. Rendering nothing (rather than throwing) matches `getSvgElement`'s own
      // `if (!elm) return` convention for "nothing sane to draw here."
      return { width: 0, height: 0, inner: '' }
  }
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(value: string): string {
  return escapeXml(value).replace(/"/g, '&quot;')
}

/* -------------------------------------------------- */
/*        Backgrounds & gradients (Phase 11)          */
/* -------------------------------------------------- */

/**
 * The string-based sibling of `GradientDef` (React, live) and `appendBackgroundDefs` (DOM-
 * imperative, `TldrawApp.copySvg`) — a third renderer of the same already-*resolved* paint spec
 * (`resolveSlideBackground`/`resolveShapeGradientFill`, both reused unchanged). Never
 * re-implements resolution — only turns an already-resolved `TLBackgroundFill` into markup, the
 * same job the other two do for their own environment.
 */
function renderFillDefs(fill: TLBackgroundFill): { defs: string; paint: string } {
  if (fill.type === 'solid') return { defs: '', paint: fill.color }

  if (fill.type === 'linearGradient' || fill.type === 'radialGradient') {
    const posAttrs =
      fill.type === 'linearGradient'
        ? `x1="${fill.x1}" y1="${fill.y1}" x2="${fill.x2}" y2="${fill.y2}"`
        : `cx="${fill.cx}" cy="${fill.cy}" r="${fill.r}"`
    const stops = fill.stops
      .map((stop) => `<stop offset="${stop.offset}" stop-color="${escapeAttr(stop.color)}" />`)
      .join('')
    return {
      defs: `<${fill.type} id="${fill.id}" ${posAttrs}>${stops}</${fill.type}>`,
      paint: `url(#${fill.id})`,
    }
  }

  // 'image'
  const tileSize = fill.fit === 'tile' ? 0.25 : 1
  const preserveAspectRatio = fill.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'
  const opacityAttr = fill.opacity !== undefined ? ` opacity="${fill.opacity}"` : ''
  return {
    defs:
      `<pattern id="${fill.id}" patternUnits="objectBoundingBox" width="${tileSize}" height="${tileSize}">` +
      `<image href="${escapeAttr(fill.href)}" width="100%" height="100%" ` +
      `preserveAspectRatio="${preserveAspectRatio}"${opacityAttr} /></pattern>`,
    paint: `url(#${fill.id})`,
  }
}

/* -------------------------------------------------- */
/*                Text (the hard case)                */
/* -------------------------------------------------- */

// Hand-tuned average glyph width, in em (fraction of font size), per this fork's four built-in
// faces — used only by `estimateTextSize` below. Not a measurement: see the module comment for
// why there is no headless substitute for the live editor's DOM-measured `getTextLabelSize`.
// Mono is a true fixed-width face, so its number is exact; the other three are eyeballed against
// a handful of representative strings (a title, a sentence of body copy) at each `SizeStyle`,
// erring slightly wide rather than narrow — an oversized label-centering box reads as "text
// slightly left of dead-center," an undersized one clips, and the former is the safer failure.
const AVG_CHAR_WIDTH_EM: Record<FontStyle, number> = {
  [FontStyle.Script]: 0.42,
  [FontStyle.Sans]: 0.55,
  [FontStyle.Serif]: 0.52,
  [FontStyle.Mono]: 0.6,
}

// Phase 17 — an arbitrary `style.fontFamily`/theme `headingFamily`/`bodyFamily` has no entry in
// the table above (this fork never bundled or measured it, and cannot in Node — there is no
// display, no installed fonts, no way to ask an OS or a browser engine how wide a glyph in an
// unknown family actually is). Rather than silently mis-keying into `AVG_CHAR_WIDTH_EM` with
// whatever `style.font` enum happens to also be set (which may have nothing to do with the actual
// override — see `resolveFont`, which keeps the enum only for this metrics fallback), an override
// gets its own neutral, `FontStyle`-independent guess: not the narrowest (Script, 0.42) or widest
// (Mono, 0.6) built-in, just a plain average. This is an approximation of an approximation —
// honestly worse than the four bundled faces' own numbers, documented as such in
// `guides/documentation.md` rather than presented as equally reliable.
const CUSTOM_FONT_AVG_CHAR_WIDTH_EM = 0.55

/**
 * A pure, non-measuring stand-in for `getTextLabelSize`/`TextUtil.getBounds`'s DOM measurement —
 * used for a bare `TextShape`'s own size (it has no persisted `size` field; unlike every other
 * shape, its bounds *are* the measurement) and for centering a `label` on Rectangle/Ellipse/
 * Triangle/Arrow. See the module comment for the honest limitation this represents.
 *
 * Phase 17 — `deckTheme` is optional and only ever passed for a *label* (see `renderShapeLabel`):
 * a bare `TextShape` never resolves `fontToken` here, matching `TextUtil`'s own live/measurement
 * code exactly (see that file's comment on why `getBounds` can't safely do so).
 */
export function estimateTextSize(
  text: string,
  style: Pick<ShapeStyles, 'size' | 'font' | 'scale' | 'fontFamily' | 'fontToken' | 'lineHeight'>,
  deckTheme?: DeckTheme
): number[] {
  // Matches `getTextLabelSize`'s own hard-coded empty-text case exactly, so an empty label's
  // centering box is identical between the live/export path and this one.
  if (!text) return [16, 32]
  const { font, face } = resolveFont(style, deckTheme)
  const fontSize = getFontSize(style.size, font) * (style.scale ?? 1)
  const lines = text.split('\n')
  const longestLine = Math.max(...lines.map((line) => line.length))
  const isOverride = !!style.fontFamily || (!!style.fontToken && !!deckTheme)
  const charWidth = fontSize * (isOverride ? CUSTOM_FONT_AVG_CHAR_WIDTH_EM : AVG_CHAR_WIDTH_EM[font])
  // +10/+2 approximate the couple of pixels `getTextLabelSize`'s own measurement `<pre>` adds via
  // its `border`/`padding` (see `getTextSize.ts`) — cosmetic parity, not exactness.
  const width = Math.max(1, Math.round(longestLine * charWidth) + 10)
  const height = Math.max(1, Math.round(lines.length * fontSize * (style.lineHeight ?? LINE_HEIGHT)) + 2)
  return [width, height]
}

/**
 * The string-based sibling of `getTextSvgElement` (DOM-imperative). Positions each line exactly
 * as that function does — relative to `boundsWidth`, per `style.textAlign` — since that part of
 * text rendering needs no measurement at all (a `<text>` element's own layout is the SVG
 * renderer's job, not ours); only the *bounds* fed in here (from stored `size` for Sticky, from
 * `estimateTextSize` for a bare `TextShape`/a label) are ever approximated.
 */
function renderTextLines(
  text: string,
  style: ShapeStyles,
  boundsWidth: number,
  deckTheme?: DeckTheme
): string {
  // Must match `getTextSvgElement`'s own `scale` fix exactly (see that function's comment for the
  // bug this was — found via this exact module's own screenshot, in the pre-existing shared
  // helper, not introduced here): every bounds this is ever called with (a persisted `size` for
  // Sticky, `estimateTextSize`'s own return value otherwise) already assumes a scaled font size.
  const { font, face } = resolveFont(style, deckTheme)
  const fontSize = getFontSize(style.size, font) * (style.scale ?? 1)
  const fontFamily = unquoteFontFamily(face)
  const lineHeight = style.lineHeight ?? LINE_HEIGHT
  const lines = text.split('\n')
  let anchor: 'start' | 'middle' | 'end' = 'start'
  let x = 0
  let extraAttrs = ''
  switch (style.textAlign) {
    case AlignStyle.Middle:
      anchor = 'middle'
      x = boundsWidth / 2
      break
    case AlignStyle.End:
      anchor = 'end'
      x = boundsWidth
      break
    default:
      anchor = 'start'
      x = 0
      extraAttrs = ' alignment-baseline="central"'
  }
  const lineElms = lines
    .map((line, i) => `<text x="${x}" y="${lineHeight * fontSize * (0.5 + i)}">${escapeXml(line)}</text>`)
    .join('')
  return (
    `<g font-size="${fontSize}" font-family="${escapeAttr(fontFamily)}" ` +
    `letter-spacing="${getLetterSpacingCss(style)}" ` +
    `text-align="${getTextAlign(style.textAlign)}" text-anchor="${anchor}"${extraAttrs}>` +
    `${lineElms}</g>`
  )
}

/**
 * A shape `label` (Rectangle/Ellipse/Triangle/Arrow), rendered exactly the way
 * `TDShapeUtil.getSvgElement`'s base implementation already does for live SVG export: dead-center
 * in the shape's bounds, via `(bounds - labelSize) / 2` — **not** the `labelPoint`-based offset
 * the *live* HTML label uses. That is a pre-existing quirk of the export path (already true of
 * `copySvg`/Deck's old thumbnail today, confirmed by reading `TDShapeUtil.getSvgElement`), not a
 * limitation introduced here — this function reproduces the export path's own convention, not the
 * live canvas's, since export/thumbnail fidelity is this module's job.
 *
 * Phase 17 — `style.verticalAlign` shifts `ty` off dead-center, mirroring the live `TextLabel`'s
 * own explicit pixel offset (see that component's layout-effect comment for why it's a plain
 * translate rather than a CSS `align-items` — the first version of this tried that in `TextLabel`
 * and it put a label wildly out of its box on a real screenshot). `style.autoFit` recomputes an
 * effective `scale` from this label's own *natural* (unscaled) `estimateTextSize` against
 * `boundsWidth`/`boundsHeight` (`computeAutoFitScale` — the same function, the same fit-ratio math,
 * `TextLabel.tsx` uses for its own DOM-measured natural size) and renders/centers against that
 * effective style instead of the raw one — see `ShapeStyles.autoFit`'s comment for why this
 * composes with, rather than ignores, the live/headless "natural size" split Phase 15 established.
 *
 * **Known, honest slop specific to `Start`/`End` (not `Middle`, the pre-existing default):**
 * `renderTextLines`'s per-line `y` (`lineHeight * fontSize * (0.5 + i)`, paired with SVG
 * `alignment-baseline="central"`) was calibrated for a vertically-*centered* `ty` — a symmetric
 * placement, where a few pixels of miscalibration are invisible either way. Anchoring at an edge
 * exposes that same slop directly: measured on a real render (`getBoundingClientRect`, not eyeballed
 * from a screenshot), a `Start`-aligned single-line label's glyph ink starts a handful of pixels
 * *above* `ty`, not flush at it — roughly a quarter of one line's height, for the built-in faces.
 * Not fixed with a hand-tuned constant here: `AVG_CHAR_WIDTH_EM`-style hand-tuning is already this
 * module's least-precise dial, and the exact overshoot is real font-ascent-metric-dependent — data
 * this fork has no access to for an arbitrary `fontFamily` override anyway (see `resolveFont`).
 * Documented rather than papered over; see `guides/documentation.md`.
 */
function renderShapeLabel(
  label: string,
  style: ShapeStyles,
  stroke: string,
  boundsWidth: number,
  boundsHeight: number,
  deckTheme?: DeckTheme
): string {
  if (!label) return ''
  let effectiveStyle = style
  if (style.autoFit) {
    const [naturalWidth, naturalHeight] = estimateTextSize(label, { ...style, scale: 1 }, deckTheme)
    const fitScale = computeAutoFitScale(naturalWidth, naturalHeight, boundsWidth, boundsHeight)
    effectiveStyle = { ...style, scale: fitScale }
  }
  const inner = renderTextLines(label, effectiveStyle, boundsWidth, deckTheme)
  const [labelWidth, labelHeight] = estimateTextSize(label, effectiveStyle, deckTheme)
  const tx = (boundsWidth - labelWidth) / 2
  let ty: number
  switch (style.verticalAlign) {
    case AlignStyle.Start:
    case AlignStyle.Justify:
      ty = 0
      break
    case AlignStyle.End:
      ty = boundsHeight - labelHeight
      break
    default:
      ty = (boundsHeight - labelHeight) / 2
  }
  return `<g fill="${escapeAttr(stroke)}" transform="translate(${tx}, ${ty})">${inner}</g>`
}

/* -------------------------------------------------- */
/*                     Rectangle                      */
/* -------------------------------------------------- */

function renderRectangle(shape: RectangleShape, ctx: RenderCtx): ShapeRender {
  const { id, size, style, label = '', labelPoint: _labelPoint = LABEL_POINT } = shape
  const [w, h] = size
  const styles = getShapeStyle(style, ctx.isDarkMode, id, ctx.theme)
  const isDraw = style.dash === DashStyle.Draw
  const gradientDefs = styles.fillGradientDef ? renderFillDefs(styles.fillGradientDef).defs : ''
  const body = isDraw
    ? drawRectangleBody(id, style, size, styles)
    : dashedRectangleBody(style, size, styles)
  const labelSvg = renderShapeLabel(label, style, styles.stroke, w, h, ctx.theme)
  return {
    width: w,
    height: h,
    inner:
      (gradientDefs ? `<defs>${gradientDefs}</defs>` : '') +
      `<g opacity="${getShapeOpacity(style)}">${body}</g>${labelSvg}`,
  }
}

function dashedRectangleBody(
  style: ShapeStyles,
  size: number[],
  styles: { stroke: string; strokeWidth: number; fill: string }
): string {
  const { stroke, strokeWidth, fill } = styles
  const sw = 1 + strokeWidth * 1.618
  const w = Math.max(0, size[0] - sw / 2)
  const h = Math.max(0, size[1] - sw / 2)
  const cornerRadius =
    style.cornerRadius !== undefined ? clampCornerRadius(style.cornerRadius, [w, h]) : 0

  if (cornerRadius > 0) {
    const perimeter = 2 * (w - sw / 2) + 2 * (h - sw / 2)
    const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
      perimeter,
      strokeWidth * 1.618,
      style.dash
    )
    return (
      (style.isFilled
        ? `<rect x="${sw / 2}" y="${sw / 2}" rx="${cornerRadius}" ry="${cornerRadius}" width="${w}" height="${h}" fill="${fill}" />`
        : '') +
      `<rect x="${sw / 2}" y="${sw / 2}" rx="${cornerRadius}" ry="${cornerRadius}" width="${w}" height="${h}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" />`
    )
  }

  const sides: [number[], number[], number][] = [
    [[sw / 2, sw / 2], [w, sw / 2], w - sw / 2],
    [[w, sw / 2], [w, h], h - sw / 2],
    [[w, h], [sw / 2, h], w - sw / 2],
    [[sw / 2, h], [sw / 2, sw / 2], h - sw / 2],
  ]
  const lines = sides
    .map(([start, end, length]) => {
      const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
        length,
        strokeWidth * 1.618,
        style.dash
      )
      return `<line x1="${start[0]}" y1="${start[1]}" x2="${end[0]}" y2="${end[1]}" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" />`
    })
    .join('')
  return (
    (style.isFilled ? `<rect x="${sw / 2}" y="${sw / 2}" width="${w}" height="${h}" fill="${fill}" />` : '') +
    `<g stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round">${lines}</g>`
  )
}

function drawRectangleBody(
  id: string,
  style: ShapeStyles,
  size: number[],
  styles: { stroke: string; strokeWidth: number; fill: string }
): string {
  const { stroke, strokeWidth, fill } = styles
  const innerPath = getRectangleIndicatorPathTDSnapshot(id, style, size)
  const path = getRectanglePath(id, style, size)
  return (
    (style.isFilled ? `<path d="${innerPath}" fill="${fill}" />` : '') +
    `<path d="${path}" fill="${stroke}" stroke="${stroke}" stroke-width="${strokeWidth}" />`
  )
}

/* -------------------------------------------------- */
/*                       Ellipse                      */
/* -------------------------------------------------- */

function renderEllipse(shape: EllipseShape, ctx: RenderCtx): ShapeRender {
  const { id, radius, style, label = '' } = shape
  const width = radius[0] * 2
  const height = radius[1] * 2
  // T11.3 scoped shape-gradient support to Rectangle/Ellipse; Triangle never passes a `shapeId`
  // here either — matching `TriangleUtil.Component`'s own `getShapeStyle(style, isDarkMode,
  // undefined, deckTheme)` call exactly.
  const styles = getShapeStyle(style, ctx.isDarkMode, id, ctx.theme)
  const isDraw = style.dash === DashStyle.Draw
  const gradientDefs = styles.fillGradientDef ? renderFillDefs(styles.fillGradientDef).defs : ''
  const body = isDraw ? drawEllipseBody(id, radius, style, styles) : dashedEllipseBody(radius, style, styles)
  const labelSvg = renderShapeLabel(label, style, styles.stroke, width, height, ctx.theme)
  return {
    width,
    height,
    inner: (gradientDefs ? `<defs>${gradientDefs}</defs>` : '') + `<g opacity="${getShapeOpacity(style)}">${body}</g>${labelSvg}`,
  }
}

function dashedEllipseBody(
  radius: number[],
  style: ShapeStyles,
  styles: { stroke: string; strokeWidth: number; fill: string }
): string {
  const { stroke, strokeWidth, fill } = styles
  const sw = 1 + strokeWidth * 1.618
  const rx = Math.max(0, radius[0] - sw / 2)
  const ry = Math.max(0, radius[1] - sw / 2)
  const perimeter = Utils.perimeterOfEllipse(rx, ry)
  const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
    perimeter < 64 ? perimeter * 2 : perimeter,
    strokeWidth * 1.618,
    style.dash,
    4
  )
  return `<ellipse cx="${radius[0]}" cy="${radius[1]}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" stroke-linejoin="round" />`
}

function drawEllipseBody(
  id: string,
  radius: number[],
  style: ShapeStyles,
  styles: { stroke: string; strokeWidth: number; fill: string }
): string {
  const { stroke, strokeWidth, fill } = styles
  const innerPath = getEllipseIndicatorPath(id, radius, style)
  const path = getEllipsePath(id, radius, style)
  return (
    (style.isFilled ? `<path d="${innerPath}" fill="${fill}" />` : '') +
    `<path d="${path}" fill="${stroke}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`
  )
}

/* -------------------------------------------------- */
/*                      Triangle                      */
/* -------------------------------------------------- */

function renderTriangle(shape: TriangleShape, ctx: RenderCtx): ShapeRender {
  const { id, size, style, label = '' } = shape
  const [w, h] = size
  const styles = getShapeStyle(style, ctx.isDarkMode, undefined, ctx.theme)
  const isDraw = style.dash === DashStyle.Draw
  const body = isDraw
    ? drawTriangleBody(id, size, style, styles)
    : dashedTriangleBody(size, style, styles)
  const labelSvg = renderShapeLabel(label, style, styles.stroke, w, h, ctx.theme)
  return { width: w, height: h, inner: `<g opacity="${getShapeOpacity(style)}">${body}</g>${labelSvg}` }
}

function dashedTriangleBody(
  size: number[],
  style: ShapeStyles,
  styles: { stroke: string; strokeWidth: number; fill: string }
): string {
  const { stroke, strokeWidth, fill } = styles
  const sw = 1 + strokeWidth * 1.618
  const points = getTrianglePoints(size)
  const sides = Utils.pointsToLineSegments(points, true)
  const lines = sides
    .map(([start, end]) => {
      const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
        Vec.dist(start, end),
        strokeWidth * 1.618,
        style.dash
      )
      return `<line x1="${start[0]}" y1="${start[1]}" x2="${end[0]}" y2="${end[1]}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" />`
    })
    .join('')
  const bgPoints = points.map((pt) => pt.join(',')).join(' ')
  return (
    (style.isFilled ? `<polygon points="${bgPoints}" fill="${fill}" />` : '') +
    lines
  )
}

function drawTriangleBody(
  id: string,
  size: number[],
  style: ShapeStyles,
  styles: { stroke: string; strokeWidth: number; fill: string }
): string {
  const { stroke, strokeWidth, fill } = styles
  const indicatorPath = getTriangleIndicatorPathTDSnapshot(id, size, style)
  const path = getTrianglePath(id, size, style)
  return (
    (style.isFilled ? `<path d="${indicatorPath}" fill="${fill}" />` : '') +
    `<path d="${path}" fill="${stroke}" stroke="${stroke}" stroke-width="${strokeWidth}" />`
  )
}

/* -------------------------------------------------- */
/*      Polygon / Star / SpeechBubble (Phase 8c)      */
/* -------------------------------------------------- */

// One shared body renderer for all three shapes below, mirroring `PolygonBody.tsx` (the live
// React equivalent) — see that component's own comment for why one function against a plain
// `vertices: number[][]` replaces what would otherwise be three near-identical copies of
// `dashedTriangleBody`/`drawTriangleBody` above.
function polygonBody(
  id: string,
  vertices: number[][],
  style: ShapeStyles,
  styles: { stroke: string; strokeWidth: number; fill: string }
): string {
  const { stroke, strokeWidth, fill } = styles
  const pointsAttr = vertices.map((p) => p.join(',')).join(' ')

  if (style.dash === DashStyle.Draw) {
    const indicatorPath = getPolygonIndicatorPathTDSnapshot(id, style, vertices)
    const path = getPolygonPath(id, style, vertices)
    return (
      (style.isFilled ? `<path d="${indicatorPath}" fill="${fill}" />` : '') +
      `<path d="${path}" fill="${stroke}" stroke="${stroke}" stroke-width="${strokeWidth}" />`
    )
  }

  const perimeter = vertices.reduce(
    (sum, p, i) => sum + Vec.dist(p, vertices[(i + 1) % vertices.length]),
    0
  )
  const sw = 1 + strokeWidth * 1.618
  const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
    perimeter,
    strokeWidth * 1.618,
    style.dash
  )
  return (
    (style.isFilled ? `<polygon points="${pointsAttr}" fill="${fill}" />` : '') +
    `<polygon points="${pointsAttr}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" />`
  )
}

function renderPolygon(shape: PolygonShape, ctx: RenderCtx): ShapeRender {
  const { id, size, sides, style, label = '' } = shape
  const [w, h] = size
  const styles = getShapeStyle(style, ctx.isDarkMode, id, ctx.theme)
  const vertices = getPolygonPoints(size, sides)
  const gradientDefs = styles.fillGradientDef ? renderFillDefs(styles.fillGradientDef).defs : ''
  const body = polygonBody(id, vertices, style, styles)
  const labelSvg = renderShapeLabel(label, style, styles.stroke, w, h, ctx.theme)
  return {
    width: w,
    height: h,
    inner:
      (gradientDefs ? `<defs>${gradientDefs}</defs>` : '') +
      `<g opacity="${getShapeOpacity(style)}">${body}</g>${labelSvg}`,
  }
}

function renderStar(shape: StarShape, ctx: RenderCtx): ShapeRender {
  const { id, size, points, innerRadiusRatio, style, label = '' } = shape
  const [w, h] = size
  const styles = getShapeStyle(style, ctx.isDarkMode, id, ctx.theme)
  const vertices = getStarPoints(size, points, innerRadiusRatio)
  const gradientDefs = styles.fillGradientDef ? renderFillDefs(styles.fillGradientDef).defs : ''
  const body = polygonBody(id, vertices, style, styles)
  const labelSvg = renderShapeLabel(label, style, styles.stroke, w, h, ctx.theme)
  return {
    width: w,
    height: h,
    inner:
      (gradientDefs ? `<defs>${gradientDefs}</defs>` : '') +
      `<g opacity="${getShapeOpacity(style)}">${body}</g>${labelSvg}`,
  }
}

function renderSpeechBubble(shape: SpeechBubbleShape, ctx: RenderCtx): ShapeRender {
  const { id, size, style, label = '' } = shape
  const [w, h] = size
  const styles = getShapeStyle(style, ctx.isDarkMode, id, ctx.theme)
  const vertices = getSpeechBubblePoints(size)
  const gradientDefs = styles.fillGradientDef ? renderFillDefs(styles.fillGradientDef).defs : ''
  const body = polygonBody(id, vertices, style, styles)
  const labelSvg = renderShapeLabel(label, style, styles.stroke, w, h, ctx.theme)
  return {
    width: w,
    height: h,
    inner:
      (gradientDefs ? `<defs>${gradientDefs}</defs>` : '') +
      `<g opacity="${getShapeOpacity(style)}">${body}</g>${labelSvg}`,
  }
}

/* -------------------------------------------------- */
/*                        Line                        */
/* -------------------------------------------------- */

function renderLine(shape: LineShape, ctx: RenderCtx): ShapeRender {
  const {
    id,
    handles: { start, end },
    style,
  } = shape
  const bounds = Utils.getBoundsFromPoints([start.point, end.point])
  const styles = getShapeStyle(style, ctx.isDarkMode, undefined, ctx.theme)
  const dist = Vec.dist(start.point, end.point)
  let shaft = ''
  if (dist >= 2) {
    const { stroke, strokeWidth } = styles
    const isDraw = style.dash === DashStyle.Draw
    const sw = 1 + strokeWidth * 1.618
    const path = isDraw
      ? renderFreehandArrowShaft(id, style, start.point, end.point, undefined, undefined)
      : 'M' + Vec.toFixed(start.point) + 'L' + Vec.toFixed(end.point)
    const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
      dist,
      strokeWidth * 1.618,
      style.dash,
      2,
      false
    )
    shaft = `<path d="${path}" fill="${stroke}" stroke="${stroke}" stroke-width="${isDraw ? sw / 2 : sw}" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" stroke-linejoin="round" />`
  }
  return {
    width: bounds.width,
    height: bounds.height,
    inner: `<g opacity="${getShapeOpacity(style)}">${shaft}</g>`,
  }
}

/* -------------------------------------------------- */
/*                        Draw                        */
/* -------------------------------------------------- */

function renderDraw(shape: DrawShape, ctx: RenderCtx): ShapeRender {
  const { style, points } = shape
  const bounds = Utils.getBoundsFromPoints(points.length ? points : [[0, 0]])
  const styles = getShapeStyle(style, ctx.isDarkMode, undefined, ctx.theme)
  const { stroke, fill, strokeWidth } = styles
  const opacity = getShapeOpacity(style)

  if (bounds.width <= strokeWidth / 2 && bounds.height <= strokeWidth / 2) {
    // Very short/point-like line: a dot, matching `DrawUtil.Component`'s own special case.
    const sw = 1 + strokeWidth
    return {
      width: bounds.width,
      height: bounds.height,
      inner: `<circle r="${sw}" fill="${stroke}" stroke="${stroke}" opacity="${opacity}" />`,
    }
  }

  const shouldFill =
    !!style.isFilled &&
    points.length > 3 &&
    Vec.dist(points[0], points[points.length - 1]) < strokeWidth * 2

  if (style.dash === DashStyle.Draw) {
    const path = getDrawStrokePathTDSnapshot(shape)
    const fillPath = shouldFill ? getFillPath(shape) : ''
    return {
      width: bounds.width,
      height: bounds.height,
      inner:
        `<g opacity="${opacity}">` +
        (shouldFill
          ? `<path d="${fillPath}" fill="${fill}" stroke-linejoin="round" stroke-linecap="round" />`
          : '') +
        `<path d="${path}" fill="${stroke}" stroke="${stroke}" stroke-width="${strokeWidth / 2}" stroke-linejoin="round" stroke-linecap="round" /></g>`,
    }
  }

  const path = getSolidStrokePathTDSnapshot(shape)
  const dashArrays: Record<DashStyle, string> = {
    [DashStyle.Draw]: 'none',
    [DashStyle.Solid]: 'none',
    [DashStyle.Dotted]: `0.1 ${strokeWidth * 4}`,
    [DashStyle.Dashed]: `${strokeWidth * 4} ${strokeWidth * 4}`,
  }
  const sw = 1 + strokeWidth * 1.5
  return {
    width: bounds.width,
    height: bounds.height,
    inner:
      `<g opacity="${opacity}">` +
      `<path d="${path}" fill="${shouldFill ? fill : 'none'}" stroke="none" stroke-linejoin="round" stroke-linecap="round" />` +
      `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dashArrays[style.dash]}" stroke-linejoin="round" stroke-linecap="round" /></g>`,
  }
}

/* -------------------------------------------------- */
/*                        Arrow                        */
/* -------------------------------------------------- */

function renderArrow(shape: ArrowShape, ctx: RenderCtx): ShapeRender {
  const {
    id,
    handles: { start, bend, end },
    decorations = {},
    style,
    label = '',
    bend: arrowBend,
  } = shape
  const arcPoints = getArcPoints(start.point, bend.point, end.point)
  const bounds = Utils.getBoundsFromPoints(arcPoints)
  const styles = getShapeStyle(style, ctx.isDarkMode, undefined, ctx.theme)
  const { stroke, strokeWidth } = styles
  const isDraw = style.dash === DashStyle.Draw
  const isStraightLine =
    Vec.dist(bend.point, Vec.toFixed(Vec.med(start.point, end.point))) < 1
  const arrowDist = Vec.dist(start.point, end.point)

  let shaft = ''
  if (arrowDist >= 2) {
    const sw = 1 + strokeWidth * 1.618
    const arrowHeadLength = Math.min(arrowDist / 3, strokeWidth * 8)
    const startHead = decorations.start
      ? getStraightArrowHeadPoints(start.point, end.point, arrowHeadLength)
      : null
    const endHead = decorations.end
      ? getStraightArrowHeadPoints(end.point, start.point, arrowHeadLength)
      : null

    if (isStraightLine) {
      const path = isDraw
        ? renderFreehandArrowShaft(id, style, start.point, end.point, decorations.start, decorations.end)
        : 'M' + Vec.toFixed(start.point) + 'L' + Vec.toFixed(end.point)
      const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
        arrowDist,
        strokeWidth * 1.618,
        style.dash,
        2,
        false
      )
      shaft =
        `<path d="${path}" fill="${stroke}" stroke="${stroke}" stroke-width="${isDraw ? sw / 2 : sw}" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" stroke-linejoin="round" />` +
        renderArrowhead(startHead, start.point, stroke, sw) +
        renderArrowhead(endHead, end.point, stroke, sw)
    } else {
      const circle = getCtp(start.point, bend.point, end.point)
      const center = [circle[0], circle[1]]
      const radius = circle[2]
      const length = getArcLength(center, radius, start.point, end.point)
      const getRandom = Utils.rng(id)
      const easing = getRandom() > 0 ? 'easeInOutSine' : 'easeInOutCubic'
      const path = isDraw
        ? renderCurvedFreehandArrowShaft(
            id,
            style,
            start.point,
            end.point,
            decorations.start,
            decorations.end,
            center,
            radius,
            length,
            EASINGS[easing]
          )
        : getArrowArcPath(start.point, end.point, circle, arrowBend)
      const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
        Math.abs(length),
        sw,
        style.dash,
        2,
        false
      )
      const curvedStartHead = decorations.start
        ? getCurvedArrowHeadPoints(start.point, arrowHeadLength, center, radius, length < 0)
        : null
      const curvedEndHead = decorations.end
        ? getCurvedArrowHeadPoints(end.point, arrowHeadLength, center, radius, length >= 0)
        : null
      shaft =
        `<path d="${path}" fill="${isDraw ? stroke : 'none'}" stroke="${stroke}" stroke-width="${isDraw ? 0 : sw}" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" stroke-linejoin="round" />` +
        renderArrowhead(curvedStartHead, start.point, stroke, sw) +
        renderArrowhead(curvedEndHead, end.point, stroke, sw)
    }
  }

  const labelSvg = renderShapeLabel(label, style, stroke, bounds.width, bounds.height, ctx.theme)
  return {
    width: bounds.width,
    height: bounds.height,
    inner: `<g opacity="${getShapeOpacity(style)}">${shaft}</g>${labelSvg}`,
  }
}

function renderArrowhead(
  head: { left: number[]; right: number[] } | null,
  middle: number[],
  stroke: string,
  strokeWidth: number
): string {
  if (!head) return ''
  return `<path d="M ${head.left} L ${middle} ${head.right}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`
}

/* -------------------------------------------------- */
/*                        Text                        */
/* -------------------------------------------------- */

function renderText(shape: TextShape, ctx: RenderCtx): ShapeRender {
  const { style, text } = shape
  // Phase 17 — list markers, applied once and reused for both sizing and rendering, exactly as
  // `TextUtil`'s own live component/`getBounds`/`getSvgElement` all do (see `applyListMarkers`).
  const displayText = applyListMarkers(text, style.list)
  // No `deckTheme` passed to either text-layout call below — a bare `TextShape` never resolves
  // `fontToken`, matching `TextUtil`'s live Component and `getBounds` exactly (see that file's
  // comment for why: this module's `deckTheme` is the *active* theme, not necessarily the one the
  // live editor measured this text with, and `estimateTextSize` has no live DOM to fall back on).
  const [width, height] = estimateTextSize(displayText, style)
  // Matches `TextUtil.getSvgElement`: `isDarkMode` is hard-coded `false` for the label/text fill
  // in the export path regardless of the render context's own `isDarkMode` — see that method's
  // own call to `getShapeStyle(shape.style, false, undefined, deckTheme)`.
  const stroke = getShapeStyle(style, false, undefined, ctx.theme).stroke
  const inner = renderTextLines(displayText, style, width)
  return { width, height, inner: `<g fill="${escapeAttr(stroke)}">${inner}</g>` }
}

/* -------------------------------------------------- */
/*                       Sticky                        */
/* -------------------------------------------------- */

// `StickyUtil`'s own inset between its border and its text — not exported by that module (it's a
// private layout constant, not a public API), so it's reproduced here rather than imported. Kept
// in sync by eye; a mismatch here would only ever affect this module's sticky-note text inset by
// a few pixels, not any resolution logic.
const STICKY_PADDING = 16

function renderSticky(shape: StickyShape, ctx: RenderCtx): ShapeRender {
  const { style, text, size } = shape
  const [width, height] = size
  const { fill, color } = getStickyShapeStyle(style, ctx.isDarkMode)
  const textWidth = Math.max(0, width - STICKY_PADDING * 2)
  // Mirrors `StickyUtil.getSvgElement` exactly: the text is laid out via the *generic*
  // `getTextSvgElement`/`getFontSize` table, not `getStickyFontSize` — a pre-existing difference
  // between Sticky's live (smaller) font and its SVG-export font, not something introduced here.
  // Unlike a bare `TextShape`, a sticky's box comes from its persisted `size`, never from measured
  // text (see `StickyUtil.getBounds`), so `fontToken` is safe to resolve here.
  const textSvg = renderTextLines(text, style, textWidth, ctx.theme)
  return {
    width,
    height,
    inner:
      `<rect width="${width}" height="${height}" fill="${escapeAttr(fill)}" rx="3" ry="3" />` +
      `<g fill="${escapeAttr(color)}" transform="translate(${STICKY_PADDING}, ${STICKY_PADDING})">${textSvg}</g>`,
  }
}

/* -------------------------------------------------- */
/*                    Image / Video                    */
/* -------------------------------------------------- */

function renderImage(shape: ImageShape, ctx: RenderCtx): ShapeRender {
  const [width, height] = shape.size
  const asset = ctx.assets[shape.assetId]
  const href = asset && 'src' in asset ? asset.src : undefined
  const opacity = getShapeOpacity(shape.style)
  if (!href) return { width, height, inner: '' }
  return {
    width,
    height,
    inner: `<image width="${width}" height="${height}" xlink:href="${escapeAttr(href)}" opacity="${opacity}" />`,
  }
}

/**
 * `VideoShape` has no poster frame stored anywhere (`TDVideoAsset` carries only `src`, the video
 * itself) — the live SVG export path captures one from the currently-*playing* `<video>` element
 * (`TldrawApp.serializeVideo`), which cannot exist headlessly. This renders a neutral placeholder
 * (a filled rect plus a play-triangle glyph) instead of a fabricated frame, the same "honest
 * placeholder over a wrong-looking image" choice `ComponentUtil.getSvgElement` already made.
 */
function renderVideoPlaceholder(shape: VideoShape): ShapeRender {
  const [width, height] = shape.size
  const opacity = getShapeOpacity(shape.style)
  const cx = width / 2
  const cy = height / 2
  const triSize = Math.min(width, height) * 0.18
  const points = [
    [cx - triSize * 0.5, cy - triSize],
    [cx - triSize * 0.5, cy + triSize],
    [cx + triSize, cy],
  ]
    .map((pt) => pt.join(','))
    .join(' ')
  return {
    width,
    height,
    inner:
      `<g opacity="${opacity}">` +
      `<rect width="${width}" height="${height}" rx="2" ry="2" fill="#d4d4d8" />` +
      `<polygon points="${points}" fill="#71717a" />` +
      '</g>',
  }
}

/**
 * Pixel-for-pixel the same placeholder `ComponentUtil.getSvgElement` builds with `document.
 * createElementNS` — necessarily duplicated (that method can't be called headlessly either), kept
 * visually identical on purpose so a host never sees two different placeholders for the same
 * unrenderable block depending on which export path produced them. See the module comment for why
 * a `ComponentShape` can't be rendered any more faithfully than this from either path.
 */
function renderComponentPlaceholder(shape: ComponentShape): ShapeRender {
  const [width, height] = shape.size
  const w = Math.max(1, width)
  const h = Math.max(1, height)
  return {
    width,
    height,
    inner:
      `<rect width="${w}" height="${h}" rx="4" ry="4" fill="none" stroke="#a1a1aa" stroke-width="2" stroke-dasharray="8 6" />` +
      `<text x="12" y="24" font-family="sans-serif" font-size="14" fill="#71717a">Component: ${escapeXml(
        shape.componentId || '(none)'
      )}</text>`,
  }
}
