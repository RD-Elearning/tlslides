import type { TLBackgroundFill } from '@tlslides/core'
import type { SlideBackground, ShapeGradientFill, TDGradientStop, TDAssets } from '~types'

// ---------------------------------------------------------------------------------------------
// Angle convention (T11.1)
// ---------------------------------------------------------------------------------------------
// `SlideBackground['linearGradient'].angle` and `ShapeGradientFill['linearGradient'].angle` both
// use the CSS `linear-gradient()` convention: degrees, clockwise, where 0deg points "to top"
// (the gradient starts at the bottom and ends at the top), 90deg points "to right", 180deg "to
// bottom", 270deg "to left". This was picked over a plain math convention (0deg = pointing right,
// counter-clockwise) purely because it's the one every user of this app already has muscle memory
// for from CSS — there's no technical reason to prefer it, just less surprise.
//
// `gradientAngleToVector` converts that angle into a start/end point pair in `objectBoundingBox`
// units (a 0–1 square, independent of the shape/frame's actual pixel aspect ratio) using the same
// construction CSS itself uses for a square gradient box: rotate the "pointing up" unit vector by
// the angle, then scale it out from the center by `|dx|/2 + |dy|/2` so the line reaches a corner
// of the box at 45/135/225/315 degrees exactly, and the midpoints of each edge at 0/90/180/270.
// This is exact for a 1:1 box; for a non-square shape or slide (e.g. 16:9) it's a close, widely
// used approximation rather than CSS's own per-box-aspect-ratio math — judged not worth the extra
// complexity of passing pixel dimensions through just to bend the gradient line to match CSS
// exactly for a cosmetic feature.
export function gradientAngleToVector(angleDeg: number): {
  x1: number
  y1: number
  x2: number
  y2: number
} {
  const rad = (angleDeg * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const length = (Math.abs(dx) + Math.abs(dy)) / 2
  return {
    x1: 0.5 - dx * length,
    y1: 0.5 - dy * length,
    x2: 0.5 + dx * length,
    y2: 0.5 + dy * length,
  }
}

function toSvgStops(stops: TDGradientStop[]): { color: string; offset: number }[] {
  // Clamp defensively: a stop built from free-typed UI input (BackgroundMenu's position field)
  // could otherwise produce an out-of-range `offset`, which SVG accepts but renders confusingly.
  return stops.map((stop) => ({ color: stop.color, offset: Math.max(0, Math.min(1, stop.at)) }))
}

/**
 * Resolve a `SlideBackground` (or the legacy plain-string shape of the old reserved field, or
 * `undefined`) into the generic paint spec `@tlslides/core`'s `Frame` renders.
 *
 * @param background The page's `background` field, as stored.
 * @param id A value that is unique to this render of this page (the page id is enough for the
 * live editor; Deck thumbnails and the main canvas render the *same* page id at the same time, but
 * each is its own `<svg className="tl-frame">` and gradient ids only need to be unique within a
 * document, which `pageId` already is — see `TLBackgroundFill`'s doc comment for why uniqueness
 * matters at all).
 * @param assets The document's asset table, needed to resolve an `image` background's `assetId`
 * into an actual `src` URL.
 */
export function resolveSlideBackground(
  background: SlideBackground | string | undefined,
  id: string,
  assets?: TDAssets
): TLBackgroundFill | undefined {
  if (background === undefined) return undefined

  // Legacy shape of the old reserved field: a bare string was never actually written by any code
  // path (nothing rendered `TDPage.background` before this phase), but the field's old type was
  // a plain `string`, so a hand-authored or externally-produced document could already have one.
  const resolved: SlideBackground =
    typeof background === 'string' ? { type: 'solid', color: background } : background

  switch (resolved.type) {
    case 'solid':
      return { type: 'solid', color: resolved.color }
    case 'linearGradient': {
      const vector = gradientAngleToVector(resolved.angle)
      return {
        type: 'linearGradient',
        id: `${id}-bg-gradient`,
        ...vector,
        stops: toSvgStops(resolved.stops),
      }
    }
    case 'radialGradient':
      return {
        type: 'radialGradient',
        id: `${id}-bg-gradient`,
        cx: resolved.cx,
        cy: resolved.cy,
        r: 0.75,
        stops: toSvgStops(resolved.stops),
      }
    case 'image': {
      const src = assets?.[resolved.assetId]
      const href = src && 'src' in src ? src.src : undefined
      if (!href) return undefined // asset missing/not an image asset — nothing sane to render
      return {
        type: 'image',
        id: `${id}-bg-image`,
        href,
        fit: resolved.fit,
        opacity: resolved.opacity,
      }
    }
  }
}

/**
 * Resolve a shape's `style.fillGradient` into the same generic paint spec, for a `<linearGradient>`
 * / `<radialGradient>` the shape util renders into its own `<defs>` (see RectangleUtil/
 * EllipseUtil and `GradientDef`). `shapeId` must be unique per shape — `shape.id` already is — so
 * two gradient-filled shapes on the same slide never collide.
 */
export function resolveShapeGradientFill(
  gradient: ShapeGradientFill,
  shapeId: string
): Extract<TLBackgroundFill, { type: 'linearGradient' | 'radialGradient' }> {
  const id = `${shapeId}-fill-gradient`
  if (gradient.type === 'linearGradient') {
    const vector = gradientAngleToVector(gradient.angle)
    return { type: 'linearGradient', id, ...vector, stops: toSvgStops(gradient.stops) }
  }
  return {
    type: 'radialGradient',
    id,
    cx: gradient.cx,
    cy: gradient.cy,
    r: 0.75,
    stops: toSvgStops(gradient.stops),
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Build the raw DOM `<linearGradient>`/`<radialGradient>` node for a resolved background/fill and
 * append it to an existing `<defs>` element, for the imperative (non-React) SVG export path —
 * `TldrawApp.copySvg` builds its whole document with `document.createElementNS`, not JSX, so this
 * mirrors `GradientDef`/`Frame`'s React version using the DOM API instead.
 *
 * @returns The `fill` attribute value to put on whatever element should be painted with this
 * background (a literal color for `solid`, else `url(#id)`).
 */
export function appendBackgroundDefs(defs: SVGDefsElement, background: TLBackgroundFill): string {
  if (background.type === 'solid') return background.color

  if (background.type === 'linearGradient' || background.type === 'radialGradient') {
    const tag = background.type
    const el = document.createElementNS(SVG_NS, tag)
    el.setAttribute('id', background.id)
    if (background.type === 'linearGradient') {
      el.setAttribute('x1', String(background.x1))
      el.setAttribute('y1', String(background.y1))
      el.setAttribute('x2', String(background.x2))
      el.setAttribute('y2', String(background.y2))
    } else {
      el.setAttribute('cx', String(background.cx))
      el.setAttribute('cy', String(background.cy))
      el.setAttribute('r', String(background.r))
    }
    background.stops.forEach((stop) => {
      const stopEl = document.createElementNS(SVG_NS, 'stop')
      stopEl.setAttribute('offset', String(stop.offset))
      stopEl.setAttribute('stop-color', stop.color)
      el.appendChild(stopEl)
    })
    defs.appendChild(el)
    return `url(#${background.id})`
  }

  // 'image'
  const pattern = document.createElementNS(SVG_NS, 'pattern')
  pattern.setAttribute('id', background.id)
  pattern.setAttribute('patternUnits', 'objectBoundingBox')
  const tileSize = background.fit === 'tile' ? 0.25 : 1
  pattern.setAttribute('width', String(tileSize))
  pattern.setAttribute('height', String(tileSize))
  const image = document.createElementNS(SVG_NS, 'image')
  image.setAttribute('href', background.href)
  image.setAttribute('width', '100%')
  image.setAttribute('height', '100%')
  image.setAttribute(
    'preserveAspectRatio',
    background.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'
  )
  if (background.opacity !== undefined) image.setAttribute('opacity', String(background.opacity))
  pattern.appendChild(image)
  defs.appendChild(pattern)
  return `url(#${background.id})`
}

// ---------------------------------------------------------------------------------------------
// Curated gradient presets (T11.4)
// ---------------------------------------------------------------------------------------------
// Hand-picked two/three-stop combinations in the tradition of collections like uiGradients —
// chosen for real contrast and a pleasant hue transition, not generated by pairing random hex
// values. Every entry defaults to a 135° (CSS "to bottom right") diagonal, the most broadly
// flattering angle for a full-bleed slide background, with a few varied to show the angle control
// actually does something when a user opens the preset next to a custom one.
export interface GradientPreset {
  id: string
  name: string
  background: Extract<SlideBackground, { type: 'linearGradient' }>
}

const preset = (
  id: string,
  name: string,
  colors: [string, string] | [string, string, string],
  angle = 135
): GradientPreset => ({
  id,
  name,
  background: {
    type: 'linearGradient',
    angle,
    stops: colors.map((color, i) => ({ color, at: i / (colors.length - 1) })),
  },
})

export const GRADIENT_PRESETS: GradientPreset[] = [
  preset('sunset-vibes', 'Sunset Vibes', ['#FF512F', '#F09819']),
  preset('ocean-breeze', 'Ocean Breeze', ['#2193B0', '#6DD5ED']),
  preset('purple-dream', 'Purple Dream', ['#7F00FF', '#E100FF']),
  preset('emerald-water', 'Emerald Water', ['#348F50', '#56B4D3']),
  preset('peach', 'Peach', ['#FFD3A5', '#FD6585'], 120),
  preset('deep-space', 'Deep Space', ['#000428', '#004E92']),
  preset('mango', 'Mango', ['#FFE259', '#FFA751']),
  preset('cherry', 'Cherry', ['#EB3349', '#F45C43']),
  preset('sky', 'Sky', ['#00C6FF', '#0072FF'], 90),
  preset('lush', 'Lush', ['#56AB2F', '#A8E063']),
  preset('royal', 'Royal', ['#141E30', '#243B55']),
  preset('flamingo', 'Flamingo', ['#F857A6', '#FF5858']),
  preset('aqua-marine', 'Aqua Marine', ['#1A2980', '#26D0CE']),
  preset('cotton-candy', 'Cotton Candy', ['#FBC2EB', '#A6C1EE'], 100),
  preset('lava', 'Lava', ['#F12711', '#F5AF19']),
  preset('northern-lights', 'Northern Lights', ['#43CEA2', '#185A9D']),
  preset('grapefruit', 'Grapefruit', ['#E96443', '#904E95']),
  preset('midnight-city', 'Midnight City', ['#232526', '#414345'], 180),
  preset('bloody-mary', 'Bloody Mary', ['#FF512F', '#DD2476']),
  preset('meadow', 'Meadow', ['#3CA55C', '#B5AC49']),
  preset('frost', 'Frost', ['#000046', '#1CB5E0']),
  preset('cocoa', 'Cocoa', ['#654EA3', '#EAAFC8'], 160),
  preset('honeydew', 'Honeydew', ['#D4FC79', '#96E6A1']),
  preset('warm-flame', 'Warm Flame', ['#FF9A9E', '#FECFEF'], 120),
]
