import { Utils, TLBackgroundFill } from '@tlslides/core'
import {
  Theme,
  ColorStyle,
  DashStyle,
  ShapeStyles,
  SizeStyle,
  FontStyle,
  AlignStyle,
  DeckTheme,
} from '~types'
import { GHOSTED_OPACITY } from '~constants'
import { resolveShapeGradientFill } from './background'
import { resolveThemeColor } from './deck-theme'

const canvasLight = '#fafafa'

const canvasDark = '#343d45'

const colors = {
  [ColorStyle.White]: '#f0f1f3',
  [ColorStyle.LightGray]: '#c6cbd1',
  [ColorStyle.Gray]: '#788492',
  [ColorStyle.Black]: '#1d1d1d',
  [ColorStyle.Green]: '#36b24d',
  [ColorStyle.Cyan]: '#0e98ad',
  [ColorStyle.Blue]: '#1c7ed6',
  [ColorStyle.Indigo]: '#4263eb',
  [ColorStyle.Violet]: '#7746f1',
  [ColorStyle.Red]: '#ff2133',
  [ColorStyle.Orange]: '#ff9433',
  [ColorStyle.Yellow]: '#ffc936',
}

export const stickyFills: Record<Theme, Record<ColorStyle, string>> = {
  light: {
    ...(Object.fromEntries(
      Object.entries(colors).map(([k, v]) => [k, Utils.lerpColor(v, canvasLight, 0.45)])
    ) as Record<ColorStyle, string>),
    [ColorStyle.White]: '#ffffff',
    [ColorStyle.Black]: '#3d3d3d',
  },
  dark: {
    ...(Object.fromEntries(
      Object.entries(colors).map(([k, v]) => [
        k,
        Utils.lerpColor(Utils.lerpColor(v, '#999999', 0.3), canvasDark, 0.4),
      ])
    ) as Record<ColorStyle, string>),
    [ColorStyle.White]: '#1d1d1d',
    [ColorStyle.Black]: '#bbbbbb',
  },
}

export const strokes: Record<Theme, Record<ColorStyle, string>> = {
  light: {
    ...colors,
    [ColorStyle.White]: '#1d1d1d',
  },
  dark: {
    ...(Object.fromEntries(
      Object.entries(colors).map(([k, v]) => [k, Utils.lerpColor(v, canvasDark, 0.1)])
    ) as Record<ColorStyle, string>),
    [ColorStyle.White]: '#cecece',
    [ColorStyle.Black]: '#cecece',
  },
}

export const fills: Record<Theme, Record<ColorStyle, string>> = {
  light: {
    ...(Object.fromEntries(
      Object.entries(colors).map(([k, v]) => [k, Utils.lerpColor(v, canvasLight, 0.82)])
    ) as Record<ColorStyle, string>),
    [ColorStyle.White]: '#fefefe',
  },
  dark: {
    ...(Object.fromEntries(
      Object.entries(colors).map(([k, v]) => [k, Utils.lerpColor(v, canvasDark, 0.82)])
    ) as Record<ColorStyle, string>),
    [ColorStyle.White]: 'rgb(30,33,37)',
    [ColorStyle.Black]: '#1e1e1f',
  },
}

const strokeWidths = {
  [SizeStyle.Small]: 2,
  [SizeStyle.Medium]: 3.5,
  [SizeStyle.Large]: 5,
}

const fontSizes = {
  [SizeStyle.Small]: 28,
  [SizeStyle.Medium]: 48,
  [SizeStyle.Large]: 96,
  auto: 'auto',
}

const fontFaces = {
  [FontStyle.Script]: '"Caveat Brush"',
  [FontStyle.Sans]: '"Source Sans Pro"',
  [FontStyle.Serif]: '"Crimson Pro"',
  [FontStyle.Mono]: '"Source Code Pro"',
}

const fontSizeModifiers = {
  [FontStyle.Script]: 1,
  [FontStyle.Sans]: 1,
  [FontStyle.Serif]: 1,
  [FontStyle.Mono]: 1,
}

const stickyFontSizes = {
  [SizeStyle.Small]: 24,
  [SizeStyle.Medium]: 36,
  [SizeStyle.Large]: 48,
  auto: 'auto',
}

export function getStrokeWidth(size: SizeStyle): number {
  return strokeWidths[size]
}

// T8a.2 — arbitrary stroke width. This is the single place `SizeStyle` is turned into a pixel
// stroke width for rendering. Every downstream multiplier (dash spacing, hand-drawn outline
// thickness, arrowhead length, etc.) reads `getShapeStyle(...).strokeWidth`, so overriding it here
// is enough to make all of them follow an arbitrary width — see the Phase 8a report for the full
// list of call sites this affects.
export function getEffectiveStrokeWidth(style: ShapeStyles): number {
  return style.strokeWidth !== undefined
    ? Math.max(0, style.strokeWidth)
    : getStrokeWidth(style.size)
}

// T8a.1 — opacity. `style.opacity` is the persisted, user-set value (undefined = fully opaque,
// matching every shape saved before this field existed). `isGhost` is the pre-existing transient
// drag-preview dim (`GHOSTED_OPACITY`) — the two combine multiplicatively so a translucent shape
// still visibly dims further while being ghosted, rather than one replacing the other.
export function getShapeOpacity(style: ShapeStyles, isGhost?: boolean): number {
  const base = style.opacity === undefined ? 1 : Utils.clamp(style.opacity, 0, 1)
  return isGhost ? base * GHOSTED_OPACITY : base
}

// T8a.3 — corner radius. Shared clamp so a radius request larger than the shape can support
// degenerates gracefully (down to a stadium/circle shape) instead of producing inverted geometry
// (negative rect insets, self-intersecting paths). Used by both RectangleUtil (SVG) and
// ComponentUtil (HTML, via CSS border-radius).
export function clampCornerRadius(radius: number, size: number[]): number {
  return Math.max(0, Math.min(radius, size[0] / 2, size[1] / 2))
}

export function getFontSize(size: SizeStyle, fontStyle: FontStyle = FontStyle.Script): number {
  return fontSizes[size] * fontSizeModifiers[fontStyle]
}

export function getFontFace(font: FontStyle = FontStyle.Script): string {
  return fontFaces[font]
}

export function getStickyFontSize(size: SizeStyle): number {
  return stickyFontSizes[size]
}

export function getFontStyle(style: ShapeStyles): string {
  const fontSize = getFontSize(style.size, style.font)
  const fontFace = getFontFace(style.font)
  const { scale = 1 } = style

  return `${fontSize * scale}px/1 ${fontFace}`
}

export function getStickyFontStyle(style: ShapeStyles): string {
  const fontSize = getStickyFontSize(style.size)
  const fontFace = getFontFace(style.font)
  const { scale = 1 } = style

  return `${fontSize * scale}px/1 ${fontFace}`
}

export function getStickyShapeStyle(style: ShapeStyles, isDarkMode = false) {
  const { color } = style

  const theme: Theme = isDarkMode ? 'dark' : 'light'
  const adjustedColor =
    color === ColorStyle.White || color === ColorStyle.Black ? ColorStyle.Yellow : color

  return {
    fill: stickyFills[theme][adjustedColor],
    stroke: strokes[theme][adjustedColor],
    color: isDarkMode ? '#1d1d1d' : '#0d0d0d',
  }
}

// T8b.2 — arbitrary hex colour. `style.stroke`/`style.fill`, when set, win outright over the
// `color` enum's theme-dependent palette lookup, and — this is the important, easy-to-get-wrong
// part — they do NOT get themed: `theme` is only consulted in the `??` fallback branch, never
// applied to an explicit hex. That is deliberate, not an oversight. The enum palette flips with
// `isDarkMode` because it exists to keep whiteboard *ink* legible against a whiteboard background
// that itself flips; but an arbitrary hex is presented to the user as "this exact colour", the way
// a brand kit or a design import would supply it, and silently shifting it when someone toggles
// the app's own UI theme would be surprising and undermine the whole point of pinning a value.
// Every shape util already renders through this function, so the override is picked up everywhere
// for free — see the Phase 8a report for the full call-site list.
// T11.3 — gradient fill. `shapeId` is optional and only needed to resolve `style.fillGradient`:
// the gradient becomes a `<defs>` element the caller renders (see `GradientDef`), whose id must be
// unique per shape so that two gradient-filled shapes on the same slide (or the same Deck
// thumbnail strip) never collide — see `TLBackgroundFill`'s doc comment for why that matters.
// Without a `shapeId`, a `fillGradient` is silently ignored and `fill` falls back to the flat
// hex/enum, rather than emitting an unresolvable `url(#undefined-...)`. Every call site that can
// render a `<defs>` (RectangleUtil, EllipseUtil) passes `shape.id`; call sites that only need
// `stroke`/`strokeWidth` (most of them — see the Phase 8a/8b reports for the full list) are
// unaffected since they never look at `fill` at all.
//
// Coherence rule, same precedent as size/strokeWidth (Phase 8a) and color/stroke/fill (Phase 8b):
// a gradient is the more specific control, so it wins outright over `fill`/the color enum when
// both are present — see StyleMenu/BackgroundMenu's handlers for where the *other* half of the
// rule (picking a flat fill clears `fillGradient`, and vice versa) is enforced.
//
// T12.1 — `deckTheme`, optional and last, resolves a `'theme:accent1'`-style token in `style.stroke`
// / `style.fill` into a real hex before it reaches the `?? enum` fallback below — see
// `resolveThemeColor` in `deck-theme.ts` for the full design rationale (why a sentinel string, not
// a new field; why an unresolved token falls back to the enum rather than a hardcoded colour).
// This is the ONE place stroke/fill tokens resolve; every shape util already renders through this
// function, so passing `deckTheme` through here is enough for every shape type to pick it up.
export function getShapeStyle(
  style: ShapeStyles,
  isDarkMode?: boolean,
  shapeId?: string,
  deckTheme?: DeckTheme
): {
  stroke: string
  fill: string
  strokeWidth: number
  /** Present only when `style.fillGradient` actually resolved (isFilled and a shapeId were both
   *  given): render this into an SVG `<defs>` in the same subtree as the shape's own `fill`
   *  attribute, or the `url(#id)` reference above will point at nothing. */
  fillGradientDef?: TLBackgroundFill
} {
  const { color, isFilled } = style

  const strokeWidth = getEffectiveStrokeWidth(style)

  const theme: Theme = isDarkMode ? 'dark' : 'light'
  const stroke = resolveThemeColor(style.stroke, deckTheme) ?? strokes[theme][color]

  if (isFilled && style.fillGradient && shapeId) {
    const fillGradientDef = resolveShapeGradientFill(style.fillGradient, shapeId, deckTheme)
    return { stroke, fill: `url(#${fillGradientDef.id})`, strokeWidth, fillGradientDef }
  }

  return {
    stroke,
    fill: isFilled ? resolveThemeColor(style.fill, deckTheme) ?? fills[theme][color] : 'none',
    strokeWidth,
  }
}

export const defaultStyle: ShapeStyles = {
  color: ColorStyle.Black,
  size: SizeStyle.Small,
  isFilled: false,
  dash: DashStyle.Solid,
  scale: 1,
}

export const defaultTextStyle: ShapeStyles = {
  ...defaultStyle,
  font: FontStyle.Sans,
  textAlign: AlignStyle.Middle,
}
