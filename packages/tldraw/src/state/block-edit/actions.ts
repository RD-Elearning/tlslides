/**
 * Editor E04 — the actions the basic editor offers for a block or one of its items, derived from
 * the block's schema (not hand-written per block). Labels are the host's: an action carries ids and
 * the schema's own label, the host translates.
 */
import type { BlockDefinition, SlotSpec } from '~blocks/types'
import { getAtPath } from '~blocks/prop-path'
import type { RegistryLike } from './slots'
import { listOf } from './items'

export type BlockAction =
  | { id: 'edit-text'; path: string }
  | { id: 'variant'; current: string; options: string[] }
  | { id: 'replace-image'; path: string }
  | { id: 'change-icon'; path: string; current?: string }
  | { id: 'toggle'; slot: string; on: boolean; label: string }
  | { id: 'add-field'; path: string; label: string }
  | { id: 'edit-data'; field: string; label: string }
  | { id: 'duplicate' }
  | { id: 'delete' }
  | { id: 'more' }
  | { id: 'item-move'; dir: -1 | 1; enabled: boolean }
  | { id: 'item-add'; enabled: boolean }
  | { id: 'item-duplicate'; enabled: boolean }
  | { id: 'item-delete'; enabled: boolean }

export type BlockActionId = BlockAction['id']

const empty = (v: unknown) =>
  v == null || (typeof v === 'string' && v.trim() === '') || (typeof v === 'object' && Array.isArray((v as { runs?: unknown[] }).runs) && (v as { runs: Array<{ text?: string }> }).runs.every((r) => !r.text?.trim()))

function isDataSlot(spec: SlotSpec): boolean {
  const t = spec.type
  if (t.kind === 'series' || t.kind === 'number') return true
  if (t.kind === 'list') return t.of.kind === 'number' || t.of.kind === 'list' || t.of.kind === 'object' || t.of.kind === 'text' || t.of.kind === 'richText'
  return t.kind === 'object' || t.kind === 'text' || t.kind === 'richText'
}

export function blockActions(def: BlockDefinition, props: Record<string, unknown>, ctx: { inlinePaths: string[]; registry?: RegistryLike }): BlockAction[] {
  const hide = new Set(def.editor?.hide ?? [])
  const out: BlockAction[] = []
  const schema = def.schema
  const inline = ctx.inlinePaths
  const primary = def.editor?.primaryText && inline.includes(def.editor.primaryText) ? def.editor.primaryText : inline[0]
  if (primary) out.push({ id: 'edit-text', path: primary })

  const variant = schema.variant
  if (variant && variant.type.kind === 'enum' && variant.type.values.length > 1) {
    const current = String(props.variant ?? (def.defaults as Record<string, unknown> | undefined)?.variant ?? variant.type.values[0])
    out.push({ id: 'variant', current, options: [...variant.type.values] })
  }

  for (const [key, spec] of Object.entries(schema)) if (spec.type.kind === 'image') out.push({ id: 'replace-image', path: key })
  for (const [key, spec] of Object.entries(schema)) if (spec.type.kind === 'icon' && spec.role === 'content') out.push({ id: 'change-icon', path: key, current: typeof props[key] === 'string' ? (props[key] as string) : undefined })

  // optional texts left empty draw nothing — they can only be added from the bar
  let added = 0
  for (const [key, spec] of Object.entries(schema)) {
    if (added >= 2) break
    if (spec.role !== 'content' || spec.required || spec.toggles) continue
    if (spec.type.kind !== 'text' && spec.type.kind !== 'richText') continue
    if (!empty(props[key])) continue
    out.push({ id: 'add-field', path: key, label: spec.label })
    added++
  }

  // content the inline editor cannot reach (chart series, table cells, numbers) → the inspector
  for (const [key, spec] of Object.entries(schema)) {
    if (spec.role !== 'content' || !isDataSlot(spec)) continue
    if (props[key] === undefined) continue
    if (inline.some((p) => p === key || p.startsWith(`${key}.`))) continue
    out.push({ id: 'edit-data', field: key, label: spec.label })
    break
  }

  let toggles = 0
  for (const [key, spec] of Object.entries(schema)) {
    if (!spec.toggles || toggles >= 3) continue
    out.push({ id: 'toggle', slot: key, on: props[key] !== false, label: spec.label })
    toggles++
  }

  out.push({ id: 'duplicate' }, { id: 'delete' }, { id: 'more' })
  return out.filter((a) => !hide.has(a.id))
}

/** Actions for the item `itemPath` of a block (a list element or an authored child block). */
export function itemActions(def: BlockDefinition, props: Record<string, unknown>, itemPath: string, ctx: { registry?: RegistryLike }): BlockAction[] {
  const hide = new Set(def.editor?.hide ?? [])
  const list = listOf(def, props, itemPath, ctx.registry)
  if (!list) return []
  const out: BlockAction[] = [
    { id: 'item-move', dir: -1, enabled: list.index > 0 },
    { id: 'item-move', dir: 1, enabled: list.index < list.count - 1 },
    { id: 'item-add', enabled: list.count < list.max },
    { id: 'item-duplicate', enabled: list.count < list.max },
  ]
  const item = list.items[list.index]
  if (list.kind === 'list' && list.of?.kind === 'object') {
    for (const [k, f] of Object.entries(list.of.fields)) {
      if (f.type.kind === 'icon') out.push({ id: 'change-icon', path: `${itemPath}.${k}`, current: typeof getAtPath({ v: item }, `v.${k}`) === 'string' ? (getAtPath({ v: item }, `v.${k}`) as string) : undefined })
      if (f.type.kind === 'image') out.push({ id: 'replace-image', path: `${itemPath}.${k}` })
    }
  } else if (list.kind === 'list' && list.of?.kind === 'icon') {
    out.push({ id: 'change-icon', path: itemPath, current: typeof item === 'string' ? item : undefined })
  } else if (list.kind === 'blocks' && item && typeof item === 'object') {
    const child = item as { type?: string; props?: Record<string, unknown> }
    const childDef = child.type ? ctx.registry?.get(child.type) : undefined
    for (const [k, f] of Object.entries(childDef?.schema ?? {})) {
      if (f.type.kind === 'icon') out.push({ id: 'change-icon', path: `${itemPath}.props.${k}`, current: typeof child.props?.[k] === 'string' ? (child.props[k] as string) : undefined })
      if (f.type.kind === 'image') out.push({ id: 'replace-image', path: `${itemPath}.props.${k}` })
    }
  }
  out.push({ id: 'item-delete', enabled: list.count > list.min })
  return out.filter((a) => !hide.has(a.id))
}
