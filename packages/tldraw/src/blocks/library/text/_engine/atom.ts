/**
 * CMP3 (composition README §2, SURVEY A4 / P13) — the paint the small composition atoms share:
 * `tls.t.badge`, `tls.t.marker`, `tls.m.shape` and `tls.m.icon` `iconStyle: disc`.
 *
 * One tone vocabulary (`solid | soft | outline`, the `tls.t.tags` words) and the deck style's own
 * surface rules, so an atom looks native in every style:
 * - corners follow the style's radius scale: a sharp style (`radius.md` ≤ 4: swiss, editorial,
 *   consulting, luxury, memphis) draws square-cornered tags, a soft one a pill;
 * - a style whose filled cards carry a bold border (doodle, memphis) gives a solid atom the same
 *   ink border, and memphis its hard offset shadow;
 * - on glass a soft atom is a frosted chip (translucent white, light edge), never a flat tint;
 * - ink is solved against the fill it sits on (`readableOn`), so an atom on an accent card or a
 *   dark slide still reads (the CMP2 ink guard re-checks it on the real paint).
 *
 * Pure: no DOM.
 */

import type { LayoutContext, Paint, Stroke } from '../../../types'
import { contrastRatio } from '../../../color-math'
import { lumOf, readableOn, tintOf } from './color'

export type AtomTone = 'solid' | 'soft' | 'outline'

export const ATOM_TONES: readonly AtomTone[] = ['solid', 'soft', 'outline']

/** What an atom paints for one tone. */
export interface AtomPaint {
  fill?: Paint
  stroke?: Stroke
  shadow?: 'hard'
  /** Ink for text / icons on the atom. */
  ink: string
  /** The paint the ink sits on (for nested contrast). */
  under: string
}

const GLASS_LIGHT = 'rgba(255,255,255,0.6)'
const GLASS_EDGE_DARK = 'rgba(255,255,255,0.38)'
const GLASS_EDGE_LIGHT = 'rgba(255,255,255,0.95)'
/** CMP4 — a smoked frost for a dark page where white would not read on the light one. */
const GLASS_SMOKE_ALPHA = 0.2
const GLASS_SMOKE = `rgba(0,0,0,${GLASS_SMOKE_ALPHA})`

/** The solid colour an atom sits on: the surface behind it when solid, else the theme surface. */
export function behindColor(ctx: LayoutContext): string {
  const b = ctx.surface?.behind
  if (b && b.type === 'solid' && /^#[0-9a-f]{6}$/i.test(b.color)) return b.color
  if (b && b.type !== 'solid' && b.stops.length > 0) {
    // A gradient page: its middle stop stands for it (the ink guard samples the real paint later).
    const mid = b.stops[Math.floor(b.stops.length / 2)].color
    if (/^#[0-9a-f]{6}$/i.test(mid)) return mid
  }
  return ctx.resolveColor('surface').color
}

/** CMP4 — the lightest colour behind (a gradient page's lightest stop; else `behindColor`). */
function lightestBehind(ctx: LayoutContext, fallback: string): string {
  const b = ctx.surface?.behind
  if (b && b.type !== 'solid' && b.stops.length > 0) {
    const hexes = b.stops.map((st) => st.color).filter((c) => /^#[0-9a-f]{6}$/i.test(c))
    if (hexes.length) return hexes.reduce((a, c) => (lumOf(c) > lumOf(a) ? c : a))
  }
  return fallback
}

/** A sharp style (square tags) or a soft one (pills). */
export function isSharpStyle(ctx: LayoutContext): boolean {
  return (ctx.tokens.radius.md ?? 8) <= 4
}

/** Corner radius of a chip `h` tall: a pill, or the style's small radius in a sharp style. */
export function chipRadius(ctx: LayoutContext, h: number): number {
  return isSharpStyle(ctx) ? Math.min(ctx.tokens.radius.sm ?? 0, h / 2) : h / 2
}

/**
 * The paint of an atom in `tone`, tinted from `color` (a resolved hex; the accent by default), on
 * whatever is behind it.
 */
export function atomPaint(ctx: LayoutContext, tone: AtomTone, color: string): AtomPaint {
  const s = ctx.tokens.surface
  const behind = behindColor(ctx)
  const dark = lumOf(behind) < 0.3
  const border = s?.stroke === 'bold' && s.card === 'filled' ? ctx.resolveColor('text').color : undefined
  if (tone === 'solid') {
    // The ink that reads best on the colour: near-white or the theme's text, solved to 4.5:1.
    const light = '#FFFFFF'
    const darkInk = ctx.resolveColor('text').color
    const l = lumOf(color)
    const pick = contrastRatio(lumOf(light), l) >= contrastRatio(lumOf(darkInk), l) ? light : darkInk
    return {
      fill: { type: 'solid', color },
      ...(border ? { stroke: { color: border, width: 3 } } : {}),
      ...(s?.shadow === 'hard' ? { shadow: 'hard' as const } : {}),
      ink: readableOn(pick, color),
      under: color,
    }
  }
  if (tone === 'soft') {
    if (s?.card === 'glass') {
      // CMP4: on a dark glass page a soft atom is a *smoked* frost (a 20 % black film) under white
      // ink. A light frost over a mid violet card left white at 3.9–4.1:1 wherever the page's real
      // paint (a gradient, a frosted card) is lighter than the colour this layout can see.
      if (dark) {
        const under = tintOf(lightestBehind(ctx, behind), '#000000', GLASS_SMOKE_ALPHA)
        return {
          fill: { type: 'solid', color: GLASS_SMOKE },
          stroke: { color: GLASS_EDGE_DARK, width: 2 },
          ink: readableOn('#FFFFFF', under),
          under,
        }
      }
      const under = tintOf(behind, '#FFFFFF', 0.6)
      return {
        fill: { type: 'solid', color: GLASS_LIGHT },
        stroke: { color: GLASS_EDGE_LIGHT, width: 2 },
        ink: readableOn(color, under),
        under,
      }
    }
    // A tint of the colour; stronger on a dark page, where a 14 % tint would vanish.
    const fill = tintOf(behind, color, dark ? 0.26 : 0.14)
    return {
      fill: { type: 'solid', color: fill },
      ...(border ? { stroke: { color: border, width: 2 } } : {}),
      ink: readableOn(color, fill),
      under: fill,
    }
  }
  // outline
  return {
    stroke: { color: readableOn(color, behind, 3), width: border ? 3 : 2 },
    ink: readableOn(color, behind),
    under: behind,
  }
}
