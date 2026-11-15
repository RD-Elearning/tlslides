/**
 * Editor E04 — list items inside a block: which item a prop path belongs to, and the list it sits
 * in. An item is an element of a `list` slot (`items.2`) or an authored child of a `blocks` slot
 * (`children.0`, nested: `children.0.props.children.1`).
 */
import type { BlockDefinition, SlotType } from '~blocks/types'
import { getAtPath, parsePropPath } from '~blocks/prop-path'
import { slotAt, type RegistryLike } from './slots'

export interface ItemList {
  listPath: string
  index: number
  count: number
  kind: 'list' | 'blocks'
  /** The type of one element (`list.of`); undefined for `blocks`. */
  of?: SlotType
  min: number
  max: number
  items: unknown[]
}

function listSlot(def: BlockDefinition, props: unknown, listPath: string, registry?: RegistryLike) {
  const at = slotAt(def, props, listPath, registry)
  const t = at.type
  if (!t || (t.kind !== 'list' && t.kind !== 'blocks')) return undefined
  return { type: t, spec: at.spec }
}

/** The deepest item `path` sits in (`items.2.title` → `items.2`), or undefined. */
export function itemOfPath(def: BlockDefinition | undefined, props: unknown, path: string, registry?: RegistryLike): string | undefined {
  if (!def) return undefined
  const keys = parsePropPath(path)
  for (let i = keys.length - 1; i > 0; i--) {
    if (typeof keys[i] !== 'number') continue
    if (listSlot(def, props, keys.slice(0, i).join('.'), registry)) return keys.slice(0, i + 1).join('.')
  }
  return undefined
}

/** Every item path along `path`, outermost first (`children.0`, `children.0.props.children.1`). */
export function itemChain(def: BlockDefinition | undefined, props: unknown, path: string, registry?: RegistryLike): string[] {
  const out: string[] = []
  if (!def) return out
  const keys = parsePropPath(path)
  for (let i = 1; i < keys.length; i++) {
    if (typeof keys[i] !== 'number') continue
    if (listSlot(def, props, keys.slice(0, i).join('.'), registry)) out.push(keys.slice(0, i + 1).join('.'))
  }
  return out
}

/** The item that contains `itemPath` (one level up), or undefined at the top. */
export function parentItem(def: BlockDefinition | undefined, props: unknown, itemPath: string, registry?: RegistryLike): string | undefined {
  const chain = itemChain(def, props, itemPath, registry)
  return chain.length > 1 ? chain[chain.length - 2] : undefined
}

export function listOf(def: BlockDefinition | undefined, props: unknown, itemPath: string, registry?: RegistryLike): ItemList | undefined {
  if (!def) return undefined
  const keys = parsePropPath(itemPath)
  const index = keys[keys.length - 1]
  if (typeof index !== 'number') return undefined
  const listPath = keys.slice(0, -1).join('.')
  const slot = listSlot(def, props, listPath, registry)
  if (!slot) return undefined
  const items = getAtPath(props as Record<string, unknown>, listPath)
  if (!Array.isArray(items)) return undefined
  const t = slot.type
  const min = (t.kind === 'list' || t.kind === 'blocks' ? t.min : undefined) ?? (slot.spec?.required || t.kind === 'blocks' ? 1 : 0)
  const max = (t.kind === 'list' || t.kind === 'blocks' ? t.max : undefined) ?? Infinity
  return { listPath, index, count: items.length, kind: t.kind, of: t.kind === 'list' ? t.of : undefined, min, max, items }
}
