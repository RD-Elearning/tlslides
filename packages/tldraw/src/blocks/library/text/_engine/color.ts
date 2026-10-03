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
