/**
 * AC4 — `rect.shadow` (ai-curation §6): the one drop shadow both renderers draw under a rect.
 *
 * Levels 1 and 2 are `ELEVATION_SCALE` (doc 02 §2.3; the renderers have no tokens, so a deck's
 * `DeckTokens.elevation` override does not reach them). `'hard'` is the Memphis offset: a solid,
 * unblurred copy of the box 8 units right and down, in the rect's stroke colour (else near-black).
 * DOM: CSS `box-shadow`; SVG: a `<filter>` with `<feDropShadow>`. A shadow paints outside the box
 * and is not a layout leaf: geometry, the parity probe and the layout oracle never see it.
 *
 * Pure and DOM-free.
 */
import { ELEVATION_SCALE } from './scales'

export type RectShadow = 0 | 1 | 2 | 'hard'

/** Offset of the `'hard'` shadow, slide units. */
export const HARD_SHADOW_OFFSET = 8
const HARD_SHADOW_FALLBACK = '#111111'

export interface ShadowSpec {
  dx: number
  dy: number
  blur: number
  /** Opaque colour (hex or rgb) and its alpha, split for SVG's `flood-color` / `flood-opacity`. */
  color: string
  opacity: number
}

function splitAlpha(color: string): { color: string; opacity: number } {
  const m = /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i.exec(color.trim())
  if (m) return { color: `rgb(${m[1]},${m[2]},${m[3]})`, opacity: Number(m[4]) }
  return { color, opacity: 1 }
}

/** The shadow a rect draws, or `undefined` for none (absent, 0, or an unknown value). */
export function rectShadowSpec(shadow: RectShadow | undefined, strokeColor?: string): ShadowSpec | undefined {
  if (shadow === 'hard') {
    const c = splitAlpha(strokeColor ?? HARD_SHADOW_FALLBACK)
    return { dx: HARD_SHADOW_OFFSET, dy: HARD_SHADOW_OFFSET, blur: 0, ...c }
  }
  if (shadow !== 1 && shadow !== 2) return undefined
  const e = ELEVATION_SCALE[shadow]
  return { dx: e.dx, dy: e.dy, blur: e.blur, ...splitAlpha(e.color) }
}

/** CSS `box-shadow` value. */
export function shadowCss(s: ShadowSpec): string {
  const color = s.opacity >= 1 ? s.color : s.color.replace(/^rgb\((.*)\)$/, `rgba($1,${s.opacity})`)
  return `${s.dx}px ${s.dy}px ${s.blur}px ${color}`
}

/** SVG `<filter>` element (id given). `stdDeviation` = blur / 2, the CSS blur radius convention. */
export function shadowFilterSvg(id: string, s: ShadowSpec): string {
  return (
    `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">` +
    `<feDropShadow dx="${s.dx}" dy="${s.dy}" stdDeviation="${s.blur / 2}" flood-color="${s.color}" flood-opacity="${s.opacity}"/>` +
    `</filter>`
  )
}
