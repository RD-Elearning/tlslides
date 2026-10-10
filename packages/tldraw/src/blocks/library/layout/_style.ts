/**
 * CMP1 — the instance style fields a container honours (composition README §2 CMP1 "Style fields
 * honest"): `gap` for every container that spaces children, and `tone` / `radius` / `elevation`
 * for the card-like containers (`tls.l.card`, `tls.l.section`), painted through `cardNodes`.
 *
 * Precedence: an instance `style` field wins over the block's own prop (a style is the
 * presentation override); with no style field a container paints exactly as before.
 *
 * Pure: no DOM.
 */

import type { LayoutContext, LayoutNode, Paint, RadiusToken, SpaceToken, Box } from '../../types'
import { cardNodes, cardPaint, type CardPaint } from '../composite/_kit'

/** The gap between children: `style.gap` (token or units) when set, else `fallback`. */
export function styleGap(ctx: LayoutContext, fallback: number): number {
  const g = ctx.style?.gap
  if (typeof g === 'number' && Number.isFinite(g) && g >= 0) return g
  if (typeof g === 'string') {
    const v = ctx.tokens.space[g as SpaceToken]
    if (typeof v === 'number') return v
  }
  return fallback
}

/** The corner radius: `style.radius` (token or units) when set, else `fallback`. */
export function styleRadius(ctx: LayoutContext, fallback: number): number {
  const r = ctx.style?.radius
  if (typeof r === 'number' && Number.isFinite(r) && r >= 0) return r
  if (typeof r === 'string') {
    const v = ctx.tokens.radius[r as RadiusToken]
    if (typeof v === 'number') return v
  }
  return fallback
}

/** Does the instance set any card-look field? (Absent = the block's own look, byte-identical.) */
export function hasCardStyle(ctx: LayoutContext): boolean {
  const s = ctx.style
  return !!s && (s.tone !== undefined || s.radius !== undefined || s.elevation !== undefined)
}

/**
 * The paint of a card-like container whose instance sets `tone` / `radius` / `elevation`.
 * `base` is the container's own look (what it paints without a style: its surface fill, or the
 * deck card surface through `cardPaint`).
 *
 * - `filled` — `base` fill (an explicit `style.surface` paint, else the surface role); no border.
 * - `outline` — no fill; a 2-unit border in the `line` role. Children sit on what is behind.
 * - `ghost` — no fill, no border.
 * - `inverted` — filled with the theme's `text` colour; children solve light ink against it.
 * - `gradient` — a 135° linear gradient `accent` → `accent2`; children solve against it.
 * - no tone — `base` (the deck surface look), with radius / elevation applied.
 *
 * `elevation` 1 / 2 is a drop shadow (`rect.shadow`), 0 none; an unfilled card casts none.
 */
export function styledCardPaint(ctx: LayoutContext, base: CardPaint): CardPaint {
  const s = ctx.style ?? {}
  const behind: Paint = ctx.surface?.behind ?? { type: 'solid', color: ctx.resolveColor('surface').color }
  const shadowOf = (filled: boolean, fallback: CardPaint['shadow']): CardPaint['shadow'] => {
    if (!filled) return undefined
    if (s.elevation === 0) return undefined
    if (s.elevation === 1 || s.elevation === 2) return s.elevation
    return fallback
  }
  let cp: CardPaint
  switch (s.tone) {
    case 'filled': {
      const fill: Paint = base.fill ?? { type: 'solid', color: ctx.resolveColor('surface').color }
      // A translucent fill (glass) shows what is behind it: the children sit on that.
      const opaque = !(fill.type === 'solid' && /^rgba|transparent/i.test(fill.color))
      cp = { fill, surface: opaque ? fill : behind, styled: true }
      break
    }
    case 'outline':
      cp = { stroke: { color: ctx.resolveColor('line').color, width: 2 }, surface: behind, styled: true }
      break
    case 'ghost':
      cp = { surface: behind, styled: true }
      break
    case 'inverted': {
      const fill: Paint = { type: 'solid', color: ctx.tokens.color.text }
      cp = { fill, surface: fill, styled: true }
      break
    }
    case 'gradient': {
      const fill: Paint = {
        type: 'linearGradient',
        angle: 135,
        stops: [
          { color: ctx.tokens.color.accent, at: 0 },
          { color: ctx.tokens.color.accent2, at: 1 },
        ],
      }
      cp = { fill, surface: fill, styled: true }
      break
    }
    default:
      cp = { ...base }
  }
  const shadow = shadowOf(!!cp.fill, cp.shadow ?? base.shadow)
  if (shadow) cp.shadow = shadow
  else delete cp.shadow
  return cp
}

/**
 * The background of a card-like container and the surface its children sit on.
 * `fill` is what the container paints with no deck surface and no style (its own default look);
 * `deckSurface` false skips the deck card surface (an explicit `style.surface` paint or role).
 */
export function containerSurface(
  ctx: LayoutContext,
  box: Box,
  fill: Paint,
  part: string,
  deckSurface: boolean,
  defaultRadius?: number
): { nodes: LayoutNode[]; surface: Paint } {
  const base: CardPaint = deckSurface ? cardPaint(ctx, { fill }) : { fill, surface: fill, styled: false }
  if (!hasCardStyle(ctx)) {
    if (base.styled) return { nodes: cardNodes(base, box, defaultRadius ?? ctx.tokens.radius.md, part), surface: base.surface }
    return { nodes: [{ k: 'rect', box, part, fill }], surface: fill }
  }
  const cp = styledCardPaint(ctx, { ...base, fill: base.fill ?? (base.styled ? undefined : fill) })
  const radius = styleRadius(ctx, base.styled ? defaultRadius ?? ctx.tokens.radius.md : 0)
  return { nodes: cardNodes(cp, box, radius || undefined, part), surface: cp.surface }
}
