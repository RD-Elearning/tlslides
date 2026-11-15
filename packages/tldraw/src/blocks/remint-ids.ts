/**
 * Editor E00 — block ids stay unique across the deck when shapes are copied.
 *
 * A component shape carries its block id in `props.$block.id`, and a container's authored children
 * carry theirs in `props.children[*].id` (recursively). Duplicating a slide, duplicating a block or
 * pasting one used to copy those ids verbatim; the engine then rejects the deck
 * (`block/duplicate-id`). `remintBlockIds` gives every copied id that is already taken a fresh,
 * readable one (`s02_t` → `s02_t_c1`), and re-points connectors copied in the same batch.
 *
 * Only ids that collide change: a freshly inserted block keeps the id its author gave it.
 * Pure: never mutates its input.
 */

import { BLOCK_PROP_KEY } from './shape-bridge'
import { CONNECTOR_BLOCK_TYPE } from './connectors'

type AnyShape = { id: string }
type ShapeView = { id: string; componentId?: string; props?: Record<string, unknown> }
type AnyDoc = { pages: Record<string, { id: string; slideSpecId?: string; shapes: Record<string, unknown> }> }

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Every id of authored child specs under `props.children` (recursively). */
function childIds(props: unknown, out: Set<string>): void {
  if (!isObj(props)) return
  const kids = props.children
  if (!Array.isArray(kids)) return
  for (const k of kids) {
    if (!isObj(k)) continue
    if (typeof k.id === 'string') out.add(k.id)
    childIds(k.props, out)
  }
}

/** The block ids a shape holds: its own (`$block.id`) and its authored children's. */
export function shapeBlockIds(shape: unknown): string[] {
  const out = new Set<string>()
  const props = isObj(shape) ? (shape.props as Record<string, unknown> | undefined) : undefined
  if (!isObj(props)) return []
  const meta = props[BLOCK_PROP_KEY]
  if (isObj(meta) && typeof meta.id === 'string') out.add(meta.id)
  childIds(props, out)
  if (isObj(meta)) childIds(meta, out)
  return [...out]
}

/** Every block id and slide id in the document. */
export function collectDeckIds(doc: AnyDoc): Set<string> {
  const out = new Set<string>()
  for (const page of Object.values(doc.pages)) {
    out.add(page.slideSpecId ?? page.id)
    for (const shape of Object.values(page.shapes)) for (const id of shapeBlockIds(shape)) out.add(id)
  }
  return out
}

/** A free id derived from `base`: `base_c1`, `base_c2`, … (taken grows). */
export function freshId(base: string, taken: Set<string>, tag = 'c'): string {
  const stem = base.replace(new RegExp(`_${tag}\\d+$`), '')
  for (let n = 1; ; n++) {
    const id = `${stem}_${tag}${n}`
    if (!taken.has(id)) {
      taken.add(id)
      return id
    }
  }
}

function remintChildren(props: Record<string, unknown>, taken: Set<string>, map: Map<string, string>): Record<string, unknown> {
  const kids = props.children
  if (!Array.isArray(kids)) return props
  let changed = false
  const next = kids.map((k) => {
    if (!isObj(k)) return k
    let out = k
    if (typeof k.id === 'string' && taken.has(k.id)) {
      const id = freshId(k.id, taken)
      map.set(k.id, id)
      out = { ...out, id }
      changed = true
    } else if (typeof k.id === 'string') taken.add(k.id)
    if (isObj(k.props)) {
      const p = remintChildren(k.props, taken, map)
      if (p !== k.props) {
        out = { ...out, props: p }
        changed = true
      }
    }
    return out
  })
  return changed ? { ...props, children: next } : props
}

/**
 * Copies of `shapes` whose block ids do not collide with `taken` (nor with each other). `taken` is
 * updated with every id the result uses. Connectors in the batch follow the blocks they point to.
 */
export function remintBlockIds<T extends AnyShape>(shapes: T[], taken: Set<string>): { shapes: T[]; map: Map<string, string> } {
  const map = new Map<string, string>()
  const out = shapes.map((shape) => {
    const props = (shape as ShapeView).props
    if (!isObj(props)) return shape
    let nextProps = props
    const meta = props[BLOCK_PROP_KEY]
    if (isObj(meta) && typeof meta.id === 'string') {
      if (taken.has(meta.id)) {
        const id = freshId(meta.id, taken)
        map.set(meta.id, id)
        nextProps = { ...nextProps, [BLOCK_PROP_KEY]: { ...meta, id } }
      } else taken.add(meta.id)
    }
    nextProps = remintChildren(nextProps, taken, map)
    return nextProps === props ? shape : ({ ...shape, props: nextProps } as T)
  })
  if (map.size === 0) return { shapes: out, map }
  // connectors copied with their blocks point at the copies
  const fixed = out.map((shape) => {
    const view = shape as ShapeView
    if (view.componentId !== CONNECTOR_BLOCK_TYPE || !isObj(view.props)) return shape
    let props = view.props
    for (const end of ['from', 'to'] as const) {
      const e = props[end]
      if (isObj(e) && typeof e.block === 'string' && map.has(e.block)) props = { ...props, [end]: { ...e, block: map.get(e.block) } }
    }
    return props === view.props ? shape : ({ ...shape, props } as T)
  })
  return { shapes: fixed, map }
}
