/**
 * CMP3 (composition README §2 CMP3, SURVEY B2 / X10) — slide connectors: the data helpers shared
 * by the compiler (`compileSlide` turns each `SlideSpec.connectors` entry into one overlay
 * `tls.g.connector` shape after layout), the decompiler (back to `SlideSpec.connectors`), the
 * validator and the layout report.
 *
 * PPTX (later, CMP5 table): one connector = one `p:cxnSp`; `from` / `to` = `a:stCxn` / `a:endCxn`
 * on the endpoint shapes (side → connection site idx: top 0, left 1, bottom 2, right 3 for a
 * rectangle); route straight / elbow / curved → `straightConnector1` / `bentConnector3` /
 * `curvedConnector3`; head → `a:tailEnd` (and `a:headEnd` for `both`) `type="triangle"`; dash →
 * `a:prstDash val="dash"`; weight → `a:ln w` (units × 9,525 EMU); the label → a small text box at
 * the route's midpoint. The compiled props carry the endpoint boxes the route was drawn from, so an
 * exporter that cannot bind (a nested endpoint has no PPTX shape of its own) draws the same route
 * as a free connector.
 *
 * Pure: no DOM.
 */

import { AnimationTrigger } from '~types'
import type { ShapeAnimation } from '~types'
import type { BlockMotionSpec, BlockSpec, ConnectorSpec, MotionStyle } from './types'
import { MAX_NESTING_DEPTH } from './types'

/** The block type a connector compiles to (`library/diagram/tls-g-connector`). */
export const CONNECTOR_BLOCK_TYPE = 'tls.g.connector'

/** The authored keys of a `ConnectorSpec` besides `id` (the order the decompiler writes them). */
const KEYS = ['from', 'to', 'route', 'head', 'tone', 'weight', 'dash', 'label'] as const

/** The compiled connector block's props for an authored connector (authored keys only; the
 *  compiler adds `fromBox` / `toBox` / `fromRound` / `toRound`). */
export function connectorProps(c: ConnectorSpec): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of KEYS) if (c[k] !== undefined) out[k] = JSON.parse(JSON.stringify(c[k]))
  return out
}

/** The authored connector back from a compiled `tls.g.connector` block (the decompiler). */
export function connectorFromBlock(block: BlockSpec): ConnectorSpec | undefined {
  const p = block.props ?? {}
  const end = (v: unknown) => (v && typeof v === 'object' && typeof (v as { block?: unknown }).block === 'string' ? (v as ConnectorSpec['from']) : undefined)
  const from = end(p.from)
  const to = end(p.to)
  if (!from || !to || typeof block.id !== 'string') return undefined
  const out: ConnectorSpec = { id: block.id, from: JSON.parse(JSON.stringify(from)), to: JSON.parse(JSON.stringify(to)) }
  for (const k of KEYS) {
    if (k === 'from' || k === 'to') continue
    if (p[k] !== undefined) (out as unknown as Record<string, unknown>)[k] = p[k]
  }
  return out
}

/** The spec of the block `id` inside `block` (itself included), or undefined. */
export function findBlockSpec(block: BlockSpec | undefined, id: string, depth = 0): BlockSpec | undefined {
  if (!block || typeof block !== 'object' || depth > MAX_NESTING_DEPTH + 1) return undefined
  if (block.id === id) return block
  const props = block.props
  if (!props || typeof props !== 'object') return undefined
  for (const v of Object.values(props)) {
    if (!Array.isArray(v)) continue
    for (const c of v) {
      if (!c || typeof c !== 'object' || typeof (c as BlockSpec).type !== 'string') continue
      const hit = findBlockSpec(c as BlockSpec, id, depth + 1)
      if (hit) return hit
    }
  }
  return undefined
}

/** Does this block paint a circle filling its box (route to its ellipse, not its corners)? */
export function isRoundBlock(b: BlockSpec | undefined): boolean {
  if (!b) return false
  const p = (b.props ?? {}) as Record<string, unknown>
  switch (b.type) {
    case 'tls.m.shape':
      return p.shape === undefined || p.shape === 'circle'
    case 'tls.t.marker':
      return p.variant !== 'numeral'
    case 'tls.m.icon':
      return p.iconStyle === 'disc'
    case 'tls.m.avatar':
      return p.shape === undefined || p.shape === 'circle'
    default:
      return false
  }
}

/** How long after its endpoint a connector starts, and how long it draws (ms). */
export const CONNECTOR_DRAW_MS = 400

/**
 * The reveal a connector gets: right after the later of its endpoints' reveals (the endpoint shapes'
 * `ShapeAnimation`s; `undefined` = shown from the start). Joins that endpoint's build step
 * (`withPrevious`, order + 0.5) and waits for it to finish (`delay` = its delay + duration), so a
 * following `afterPrevious` block waits for the line too. `subtle` = a calm fade (no draw, J7);
 * no animated endpoint, or `static` → no reveal (the connector is there at rest).
 */
export function connectorMotion(ends: Array<ShapeAnimation | undefined>, style: MotionStyle | undefined): BlockMotionSpec | undefined {
  if (style === 'static') return undefined
  const animated = ends.filter((a): a is ShapeAnimation => !!a)
  if (animated.length === 0) return undefined
  const later = animated.reduce((m, a) => (a.order > m.order || (a.order === m.order && a.delayMs + a.durationMs > m.delayMs + m.durationMs) ? a : m))
  return {
    preset: style === 'subtle' ? 'fade' : 'draw-path',
    trigger: AnimationTrigger.WithPrevious,
    order: later.order + 0.5,
    delay: Math.round(later.delayMs + later.durationMs),
  }
}
