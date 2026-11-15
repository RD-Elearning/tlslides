/**
 * Editor E03/E04 — the schema slot a prop path points at, through lists, objects and authored
 * child blocks (`children.2.props.title` → the child type's `title` slot).
 */
import type { BlockDefinition, SlotSpec, SlotType } from '~blocks/types'
import { parsePropPath } from '~blocks/prop-path'

export interface RegistryLike {
  get(type: string): BlockDefinition | undefined
}

export interface SlotAt {
  /** The nearest named slot spec on the path (label, required, role). */
  spec?: SlotSpec
  /** The type of the value at the path itself. */
  type?: SlotType
  /** The block definition that owns the slot (a nested child's own, for container children). */
  def?: BlockDefinition
}

export function slotAt(def: BlockDefinition | undefined, props: unknown, path: string, registry?: RegistryLike): SlotAt {
  if (!def) return {}
  const keys = parsePropPath(path)
  let owner: BlockDefinition = def
  let value: unknown = props
  let spec: SlotSpec | undefined
  let type: SlotType | undefined
  let i = 0
  while (i < keys.length) {
    const k = keys[i]
    if (type === undefined) {
      spec = owner.schema[String(k)]
      if (!spec) return { def: owner }
      type = spec.type
    } else if (type.kind === 'list') {
      if (typeof k !== 'number') return {}
      type = type.of
    } else if (type.kind === 'object') {
      const f = type.fields[String(k)]
      if (!f) return {}
      spec = f
      type = f.type
    } else if (type.kind === 'blocks') {
      // `children.2.props.<slot>`: continue in the child block's own schema
      if (typeof k !== 'number' || keys[i + 1] !== 'props') return {}
      const child = (value as unknown[] | undefined)?.[k] as { type?: string; props?: unknown } | undefined
      const childDef = child?.type ? registry?.get(child.type) : undefined
      if (!childDef || !child) return {}
      owner = childDef
      value = child.props
      type = undefined
      spec = undefined
      i += 2
      continue
    } else return {}
    value = value == null ? undefined : (value as Record<string | number, unknown>)[k as never]
    i++
  }
  return { spec, type, def: owner }
}

/** The text limits of a slot: what the inline editor enforces. */
export function textLimits(at: SlotAt): { maxChars?: number; multiline: boolean; required: boolean } {
  const t = at.type
  const maxChars = t && (t.kind === 'text' || t.kind === 'richText') ? t.maxChars : undefined
  const multiline = !!(t && t.kind === 'text' && t.multiline)
  // required only when the path is the required slot (or object field) itself, not inside it
  const required = !!at.spec?.required && at.spec.type === t
  return { maxChars, multiline, required }
}
