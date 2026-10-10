/**
 * CMP2 — the ink guard: role-derived ink is readable on what is actually painted under it.
 *
 * `resolveColor` solves the foreground roles (`text`, `textMuted`, `line`) against the surface a
 * block is told it sits on, but a block also paints its own surfaces (a card, a pill, a band) and
 * paints text in roles nobody solves — `accent` (a kicker, a hero number's unit, an icon), a
 * status colour. On an accent card or a dark band that ink vanishes (composition README, Notes —
 * CMP1 "accent-role parts are not contrast-solved").
 *
 * After a slide-level block is laid out (`layoutBlock`, depth 0), `guardInk` walks its tree with
 * the paint model (`paint-model.ts`): every text and icon leaf whose worst WCAG ratio on the paint
 * under it is below its floor (4.5:1 text, 3:1 large text and icons) is re-solved along its own hue
 * (`solveForContrast`) against the worst background — the same solver the roles use. Derived ink
 * (a role, a tint, a block's own "readable on" pick) is fair game; a literal colour the author
 * pinned (`style.on: '#…'`, a prop colour — `literalInks`, what `resolveColor` was asked for as a
 * literal in this pass) is never touched (the layout report's `contrast/low` names it). Ink over a
 * photo (an image, an opaque host, or a slide whose surface is `overImage`) has no knowable
 * background: the guard leaves it, and the report asks for a scrim. Translucent ink (alpha or group
 * opacity below 1) is decoration and is left alone. Inside an html host's poster a re-solved leaf
 * is marked `solved`, and the template paints the poster's colour for it (`posterText().color`).
 *
 * The change is to node colours only — no geometry moves — and it lives in the tree, so both
 * renderers and any exporter paint the same colour. Pure and DOM-free.
 */

import type { LayoutNode, Pt, SurfaceContext } from '../types'
import { parseColorAlpha, relativeLuminance, solveForContrast } from '../color-math'
import { CONTRAST_FLOOR, collectPaint, floorOf, greyOfLuminance, inkContrast, paintAt, parseInk, type Background } from './paint-model'

/** Below this ratio an ink has vanished on its background (same colour family). */
const VANISHED = 1.5

/** Contrast margin over translucent fills and slide gradients (see `guardInk`). */
export const GLASS_MARGIN = 1.5

/** Normalised opaque hex of a colour string (`undefined` for a translucent or unparsable one). */
export function opaqueHex(color: string | undefined): string | undefined {
  if (typeof color !== 'string') return undefined
  const c = parseColorAlpha(color)
  return c && c.alpha >= 0.999 ? c.hex.toUpperCase() : undefined
}

/** The surface a block sits on, as the paint model's base (`null` over a photo). */
export function surfaceBase(surface: SurfaceContext): Background | ((p: Pt) => Background) {
  if (surface.overImage) return null
  const place = surface.place
  if (place && surface.behind && surface.behind.type !== 'solid') {
    // A slide gradient, and where the block sits on it: sample it under each point.
    const frame = { x: 0, y: 0, width: place.page[0], height: place.page[1] }
    const paint = surface.behind
    return (p: Pt) => {
      const c = paintAt(paint, frame, { x: place.x + p.x, y: place.y + p.y })
      return c ? { rgb: c.rgb } : { rgb: greyOfLuminance(surface.luminance) }
    }
  }
  const behind = surface.behind
  if (behind?.type === 'solid') {
    const c = parseInk(behind.color)
    if (c && c.alpha >= 0.999) return { rgb: c.rgb }
  }
  return { rgb: greyOfLuminance(surface.luminance) }
}

/**
 * Re-solve failing role-derived ink in `root` (in place: a changed leaf gets a new `style` /
 * `lines` / `fill`; shared objects are never mutated). Returns how many leaves changed.
 */
export function guardInk(root: LayoutNode, surface: SurfaceContext, literalInks: ReadonlySet<string>): number {
  const b = surfaceBase(surface)
  const base = typeof b === 'function' ? b : () => b
  const gradientPage = typeof b === 'function'
  const { ops, inks } = collectPaint(root)
  let changed = 0
  for (const ink of inks) {
    if (ink.alpha < 0.999) continue
    const worst = inkContrast(ink, ops, base)
    // Over a bare photo nothing can be solved (the report asks for a scrim); over a scrimmed photo
    // the background is one of two known extremes (the scrim over black, over white).
    if (!worst || (worst.overUnknown && !worst.blended)) continue
    // Over translucent glass, or on a slide gradient, the tree cannot see everything behind it (a
    // style master's glows paint between the page and the block): solve with a margin.
    // (A scrimmed photo's two extremes are exact: no margin there.)
    const floor = floorOf(ink) * (!worst.overUnknown && (worst.blended || gradientPage) ? GLASS_MARGIN : 1)
    if (worst.ratio >= floor - 1e-6) continue
    // Re-solve each failing role colour of the leaf against its own worst background.
    const swap = new Map<string, string>()
    for (const color of ink.colors) {
      const hex = opaqueHex(color)
      if (!hex || literalInks.has(hex)) continue
      const own = inkContrast({ ...ink, colors: [color] }, ops, base)
      if (!own || (own.overUnknown && !own.blended) || own.ratio >= floor - 1e-6) continue
      // Solve against the worst background; when the answer fails somewhere else (a gradient, a
      // scrimmed photo's other extreme), solve again against that — a few rounds, keep the best.
      let best = { color: hex, ratio: own.ratio }
      let against = own.bg
      // ink that vanished outright (an accent icon on an accent card, ~1:1) is set clearly, at the
      // text floor, not barely at the 3:1 graphics floor
      const target = own.ratio < VANISHED ? Math.max(floor, CONTRAST_FLOOR.text) : floor
      for (let round = 0; round < 3; round++) {
        const solved = solveForContrast(hex, relativeLuminance(against), target)
        const check = inkContrast({ ...ink, colors: [solved.color] }, ops, base)
        if (!check) break
        if (check.ratio > best.ratio) best = { color: solved.color, ratio: check.ratio }
        if (check.ratio >= target - 1e-6) break
        against = check.bg
      }
      if (best.color !== hex) swap.set(color, best.color)
    }
    if (!swap.size) continue
    changed++
    const n = ink.node
    // CMP2: an html template paints a solved poster leaf's colour (`posterText().color`).
    if (ink.inHost) (n as { solved?: true }).solved = true
    if (n.k === 'icon') {
      n.fill = swap.get(n.fill) ?? n.fill
      continue
    }
    const style = swap.get(n.style.color)
    if (style) n.style = { ...n.style, color: style }
    n.lines = n.lines.map((l) =>
      l.runs && l.runs.some((r) => r.color && swap.has(r.color))
        ? { ...l, runs: l.runs.map((r) => (r.color && swap.has(r.color) ? { ...r, color: swap.get(r.color) as string } : r)) }
        : l
    )
  }
  return changed
}
