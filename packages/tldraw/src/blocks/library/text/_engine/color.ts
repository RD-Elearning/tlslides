/**
 * Colour helpers for the P1 blocks. Colours always come from roles; this only chooses between
 * roles and mixes them, so a theme swap still recolours everything.
 */

import type { LayoutContext } from '../../../types'
import { contrastRatio, mixHex, relativeLuminance, solveForContrast, tryHexToRgb } from '../../../color-math'

/** Luminance of a hex colour, or 0.5 when it cannot be parsed. */
export function lumOf(hex: string): number {
  const rgb = tryHexToRgb(hex)
  return rgb ? relativeLuminance(rgb) : 0.5
}

/** Whichever of the `surface` / `text` roles reads better on `bgHex`. */
export function onColor(ctx: LayoutContext, bgHex: string): string {
  const light = ctx.resolveColor('surface').color
  const dark = ctx.resolveColor('text').color
  const l = lumOf(bgHex)
  return contrastRatio(lumOf(light), l) >= contrastRatio(lumOf(dark), l) ? light : dark
}

/** `role` mixed into `base` at `t` (0..1): a flat tint with no alpha channel. */
export function tintOf(base: string, role: string, t: number): string {
  if (!tryHexToRgb(base) || !tryHexToRgb(role)) return base
  return mixHex(base, role, t)
}

/** `fg` nudged along its own hue until it reads at `floor` contrast on `bgHex`. */
export function readableOn(fg: string, bgHex: string, floor = 4.5): string {
  if (!tryHexToRgb(fg) || !tryHexToRgb(bgHex)) return fg
  return solveForContrast(fg, lumOf(bgHex), floor).color
}

/**
 * spro sprint 2026-11c S21-j: an item's `tone: 'category:<n>'` — the colour the document gives one of
 * its named groups ("túi xanh lá"), which the deck puts first in `tokens.categorical`. Undefined for
 * any other tone or an index past the ramp.
 */
export function categoryColor(ctx: LayoutContext, tone: unknown): string | undefined {
  const m = typeof tone === 'string' ? /^category:(\d{1,2})$/.exec(tone) : null
  const hex = m ? ctx.tokens.categorical[Number(m[1])] : undefined
  return hex && tryHexToRgb(hex) ? hex : undefined
}

/**
 * spro sprint 2026-11c C6 — the one rule every list-like block follows for an item of a named group:
 * its MARK (icon, number, box, step, rim) takes the group's colour, nudged along its hue to read at
 * 3 : 1 on `bgHex`; words keep the text colour, and state colours (a checklist's done / blocked)
 * keep their meaning. Undefined when the item has no group tone.
 */
export function categoryInk(ctx: LayoutContext, tone: unknown, bgHex: string): string | undefined {
  const cat = categoryColor(ctx, tone)
  if (!cat) return undefined
  return contrastRatio(lumOf(cat), lumOf(bgHex)) >= 3 ? cat : readableOn(cat, bgHex, 3)
}

/** C6: the light tint of a group's colour a container item (a card, a tile, a node) is filled with. */
export function categoryTint(ctx: LayoutContext, tone: unknown, baseHex: string): string | undefined {
  const cat = categoryColor(ctx, tone)
  return cat ? tintOf(baseHex, cat, 0.14) : undefined
}
