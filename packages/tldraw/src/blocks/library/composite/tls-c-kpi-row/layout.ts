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

/** AC2 `tile: accent-bar`: the bar's width down the card's left edge. */
const TILE_BAR = 8

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

  // AC2 `tile`: `card` / `accent-bar` draw each tile on a card; the tile itself is laid out on the
  // card (right of the bar), its own padding being the card's, so its tiers are unchanged. The
  // cards span the row's full width, so their edges line up with the title and a takeaway.
  const look = props.tile === 'card' || props.tile === 'accent-bar' ? props.tile : 'plain'
  const inset = 0
  const bar = look === 'accent-bar' ? TILE_BAR : 0
  const rowX = look === 'plain' ? inner.x : 0
  const rowW = look === 'plain' ? inner.width : W

  // Equal-split: total available width minus inter-tile gaps.
  const totalGaps = gap * Math.max(0, tileCount - 1)
  const tileWidth = (rowW - totalGaps) / tileCount
  const tileHeight = inner.height

  const place = (h: number): LayoutNode[] =>
    tiles.map((tile, i) => {
      const x = rowX + i * (tileWidth + gap)
      // Delegate to tls.c.kpi-tile via ctx.layoutChild.
      const tileSpec = { id: `kpi-tile-${i}`, type: 'tls.c.kpi-tile', props: { ...tile } }
      const tileNode = ctx.layoutChild(tileSpec, { x: x + inset + bar, y: inner.y + inset, width: tileWidth - 2 * inset - bar, height: h - 2 * inset })
      // Override the wrapper's part name with our indexed name: tile[0], tile[1], …
      // Do NOT re-wrap — layoutChild already returns a wrapper group at the correct coordinates.
      return { ...tileNode, part: `tile[${i}]` }
    })

  /** The card behind each tile (one group per tile, so the card reveals with its tile). */
  const withCards = (nodes: LayoutNode[], h: number): LayoutNode[] =>
    look === 'plain'
      ? nodes
      : nodes.map((n, i) => {
          const card = { x: rowX + i * (tileWidth + gap), y: inner.y, width: tileWidth, height: h }
          const r = ctx.tokens.radius.md
          return {
            k: 'group',
            part: `tile[${i}]`,
            box: card,
            children: [
              { k: 'rect', box: { x: 0, y: 0, width: card.width, height: card.height }, fill: { type: 'solid', color: ctx.resolveColor('surfaceAlt').color }, radius: r },
              ...(bar ? [{ k: 'rect', box: { x: 0, y: 0, width: bar, height: card.height }, fill: { type: 'solid', color: ctx.resolveColor('accent').color }, radius: [r, 0, 0, r] } as LayoutNode] : []),
              { ...n, part: undefined, box: { ...n.box, x: n.box.x - card.x, y: n.box.y - card.y } },
            ],
          } as LayoutNode
        })

  // AC2: content-sized. Tiles paint their content from the top, so a row stretched over a tall
  // region left an empty band between the tiles and the next block (a takeaway). The row is as tall
  // as its tallest tile's painted content; the region then centres the row and its sibling.
  // Tiles run to the row's bottom edge (their own bottom padding is the row's), so the pass at the
  // final content-sized box gives each tile the same inner height as the measuring pass did.
  let h = tileHeight + ctx.tokens.space.md
  let children = place(h)
  const painted = Math.max(0, ...children.map((n) => leafBottom(n, 0) - inner.y))
  const rowH = Math.min(H, Math.ceil(inner.y + painted + ctx.tokens.space.md + inset))
  // Each tile keeps its own bottom padding (tile box = painted + md), so a tile that chose its
  // big tier in the tall first pass still has the height for it in the second.
  if (painted > 0 && rowH < H - 1) children = place((h = Math.max(0, rowH - inner.y)))
  const rootH = painted > 0 ? rowH : H
  children = withCards(children, Math.min(h, rootH - inner.y))

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: rootH },
    part: 'root',
    children,
  }
}

/** Lowest painted edge under `node` (leaf nodes only; group boxes are their allotted box). */
function leafBottom(node: LayoutNode, offY: number): number {
  const y = offY + node.box.y
  if (node.k === 'group') return Math.max(0, ...(node.children ?? []).map((c) => leafBottom(c, y)))
  return y + node.box.height
}
