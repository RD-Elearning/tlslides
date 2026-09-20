/**
 * Pure layout function for tls.c.kpi-row — a row of 2–5 KPI tiles.
 *
 * Parts (data-part):
 *   - `tile[0]`, `tile[1]`, … — one per tile, indexed from 0 in DOM order.
 *     Follows the tls.t.bullets convention: `item[0].marker`, `item[0].text`.
 *
 * Each tile is delegated to tls.c.kpi-tile via ctx.layoutChild. No new
 * LayoutNode kind is introduced.
 *
 * Equal-split the box width across tiles (minus gaps).
 *
 * Pure and DOM-free: no `document`, no `window`, no `Date.now()`, no `Math.random()`.
 */

import type { LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { KpiRowProps } from './schema'
import { insetBox } from '../../../layout/box-model'

export function layout(props: KpiRowProps, ctx: LayoutContext): LayoutNode {
  const W = ctx.box.width
  const H = ctx.box.height
  const outerBox = { x: 0, y: 0, width: W, height: H }
  const inner = insetBox(outerBox, ctx.tokens.space.md)

  const tiles = props.tiles ?? []
  if (tiles.length === 0) {
    return {
      k: 'group',
      box: { x: 0, y: 0, width: W, height: 0 },
      part: 'root',
      children: [],
    }
  }

  const gapToken = (props.gap ?? 'md') as SpaceToken
  const gap = ctx.tokens.space[gapToken] ?? ctx.tokens.space.md
  const tileCount = tiles.length

  // Equal-split: total available width minus inter-tile gaps.
  const totalGaps = gap * Math.max(0, tileCount - 1)
  const tileWidth = (inner.width - totalGaps) / tileCount
  const tileHeight = inner.height

  const children: LayoutNode[] = []

  for (let i = 0; i < tileCount; i++) {
    const tile = tiles[i]
    const x = inner.x + i * (tileWidth + gap)

    // Delegate to tls.c.kpi-tile via ctx.layoutChild.
    const tileSpec = {
      id: `kpi-tile-${i}`,
      type: 'tls.c.kpi-tile',
      props: { ...tile },
    }

    const tileNode = ctx.layoutChild(tileSpec, { x, y: inner.y, width: tileWidth, height: tileHeight })

    // Override the wrapper's part name with our indexed name: tile[0], tile[1], …
    // Do NOT re-wrap — layoutChild already returns a wrapper group at the correct coordinates.
    children.push({ ...tileNode, part: `tile[${i}]` })
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children,
  }
}
