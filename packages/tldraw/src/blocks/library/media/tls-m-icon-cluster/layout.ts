/**
 * Pure layout for tls.m.icon-cluster — 1-7 icons scattered in a seeded constellation, larger and
 * smaller, each optionally on a soft disc, with a few small dots between them.
 *
 * Placement is best-candidate sampling (`mulberry32(seed)`): each icon takes, of 24 seeded
 * candidates, the one farthest from those already placed and from the box edge, so the icons
 * spread over the box without touching and the same seed always gives the same picture. Every
 * icon stays inside the box. Each icon is one part (`icon[i]`) so the entrance pops them one by one
 * and the ambient loop bobs them out of step.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { IconClusterProps } from './schema'
import { enumOf, side, tintOf } from '../_kit'
import { mulberry32 } from '../tls-m-decoration/layout'
import { iconLeaf } from '../../text/_engine/icon'

const OPACITY = { soft: 0.3, medium: 0.55, strong: 0.85 } as const
const f = (v: number) => Math.round(v * 100) / 100

/** Icon names of the list (non-empty strings), at most 7. */
export function clusterIcons(v: unknown): string[] {
  return (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, 7)
}

export interface ClusterSpot {
  x: number
  y: number
  /** Side of the icon's square (with its disc, when backed). */
  s: number
}

/** Seeded spots for `n` icons in a W×H box: centres and sides, every square inside the box. */
export function clusterSpots(n: number, W: number, H: number, seed: number): ClusterSpot[] {
  if (n <= 0 || W <= 1 || H <= 1) return []
  const rnd = mulberry32(seed)
  // the base side: the icons cover about a third of the box
  const base = Math.max(8, Math.min(Math.min(W, H) * 0.62, Math.sqrt((W * H) / n) * 0.5))
  const spots: ClusterSpot[] = []
  for (let i = 0; i < n; i++) {
    // the first icon is the largest; the others between 55 % and 90 % of it
    const s = i === 0 ? base : base * (0.55 + 0.35 * rnd())
    const h = s / 2
    let best: ClusterSpot | undefined
    let bestScore = -Infinity
    for (let k = 0; k < 24; k++) {
      const x = h + rnd() * Math.max(0, W - s)
      const y = h + rnd() * Math.max(0, H - s)
      let d = Infinity
      for (const p of spots) d = Math.min(d, Math.hypot(p.x - x, p.y - y) - (p.s + s) / 2)
      // prefer room around it; the first one sits a little off-centre, not in a corner
      const score = spots.length ? d : -Math.hypot(x - W * 0.42, y - H * 0.45)
      if (score > bestScore) {
        bestScore = score
        best = { x, y, s }
      }
    }
    spots.push(best!)
  }
  return spots
}

export function layout(props: IconClusterProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const icons = clusterIcons(props.icons)
  const tone = enumOf(props.tone, ['accent', 'accent2', 'mixed', 'line'] as const, 'mixed')
  const op = enumOf(props.opacity, ['soft', 'medium', 'strong'] as const, 'medium')
  const disc = props.backing !== 'none'
  const seed = typeof props.seed === 'number' && Number.isFinite(props.seed) ? props.seed : 1
  const surface = ctx.resolveColor('surface').color
  const colorOf = (i: number) =>
    tone === 'line'
      ? tintOf(surface, ctx.resolveColor('text').color, 0.45)
      : ctx.resolveColor(tone === 'mixed' ? (i % 2 === 0 ? 'accent' : 'accent2') : tone).color

  const spots = clusterSpots(icons.length, W, H, seed)
  const children: LayoutNode[] = []
  spots.forEach((p, i) => {
    const color = colorOf(i)
    // the icon's own group (children relative to it), so a pop or a bob moves about its centre
    const own = { x: 0, y: 0, width: p.s, height: p.s }
    const parts: LayoutNode[] = []
    if (disc) {
      parts.push({ k: 'rect', part: `icon[${i}].disc`, box: own, radius: p.s / 2, fill: { type: 'solid', color: tintOf(surface, color, 0.16) } })
      const g = p.s * 0.58
      parts.push(iconLeaf(icons[i], { x: (p.s - g) / 2, y: (p.s - g) / 2, width: g, height: g }, color, `icon[${i}].glyph`))
    } else {
      parts.push(iconLeaf(icons[i], own, color, `icon[${i}].glyph`))
    }
    children.push({ k: 'group', part: `icon[${i}]`, box: { x: p.x - p.s / 2, y: p.y - p.s / 2, width: p.s, height: p.s }, children: parts })
  })

  // a few small dots in the gaps (the constellation's stars), seeded like the icons
  const rnd = mulberry32(seed + 101)
  const r = Math.max(2, Math.min(W, H) * 0.012)
  let d = ''
  for (let k = 0, placed = 0; k < 40 && placed < Math.min(6, icons.length + 2); k++) {
    const x = r + rnd() * Math.max(0, W - 2 * r)
    const y = r + rnd() * Math.max(0, H - 2 * r)
    if (spots.some((p) => Math.hypot(p.x - x, p.y - y) < p.s / 2 + r * 4)) continue
    d += `M${f(x - r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x + r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x - r)} ${f(y)}Z`
    placed++
  }
  if (d) children.push({ k: 'path', part: 'dots', box: { x: 0, y: 0, width: W, height: H }, d, fill: { type: 'solid', color: colorOf(1) } })

  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, opacity: OPACITY[op], children }
}
