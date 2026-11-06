/**
 * spro sprint 2026-11b S08 — one definition shape for the wave-A text-rich blocks: a block maps its
 * props to rich cells (`_rich.ts`) plus head / foot sections; the factory gives it the layout, the build
 * tree, capacity, motion (one stagger over the cells) and the S06 fill policy.
 */
import type { BlockCategory, BlockDefinition, BlockSchema, BlockSpec, FillStep, LayoutContext, LayoutNode, PartMotionRecipe, SlotSpec, SlotType } from '../../types'
import { defineCompositeBlock } from '../../layout/define-composite'
import { schemaCapacity } from './_poster'
import { richBuild, richLayout, type RichItem, type RichOptions, type RichSection } from './_rich'

export interface RichShape {
  items: RichItem[]
  opts: RichOptions
  head?: RichSection[]
  foot?: RichSection[]
  /** Lay the block out yourself (a two-column block); the default is `richLayout`. */
  layout?: (ctx: LayoutContext) => LayoutNode
}

export interface RichBlockConfig<P extends Record<string, unknown>> {
  type: string
  name: string
  summary: string
  keywords: string[]
  category: BlockCategory
  shortDescription: string
  related: string[]
  schema: BlockSchema
  defaults: P
  size: { preferred: [number, number]; min: [number, number] }
  describe: { when: string; avoid: string; example: BlockSpec }
  /** The block's cells and sections for these props. */
  shape: (props: P) => RichShape
  /** S06 (default `['type', 'spacing']`; a grid of cells: `['type']`). */
  fillPolicy?: readonly FillStep[]
  /** Motion parts of the head / foot sections (shown before / after the cells). */
  sections?: { head?: string[]; foot?: string[] }
  /** S09: figures (`value[i]` parts) count up as their cells arrive. */
  countUp?: boolean
  /** S10: the viewer-only reveal hook (`BlockDefinition.reveal`). */
  reveal?: BlockDefinition['reveal']
}

const BUILDERS = new WeakMap<BlockDefinition, (props: Record<string, unknown>) => BlockSpec>()

/** The build tree function of a text-rich block (specs and the structure view). */
export function richBuilder(def: BlockDefinition): (props: Record<string, unknown>) => BlockSpec {
  return BUILDERS.get(def)!
}

export function defineRichBlock<P extends Record<string, unknown>>(cfg: RichBlockConfig<P>): BlockDefinition {
  const id = cfg.type.replace(/^tls\.c\./, '').replace(/-/g, '_')
  const build = (props: P): BlockSpec => {
    const s = cfg.shape({ ...cfg.defaults, ...props })
    return richBuild(id, s.items, s.opts, s.head, s.foot)
  }
  const head = cfg.sections?.head ?? []
  const foot = cfg.sections?.foot ?? []
  const partMotion: Record<string, PartMotionRecipe> = {}
  head.forEach((p, i) => (partMotion[p] = { preset: 'fade-up', delay: i * 120, stagger: 60 }))
  partMotion.item = { preset: 'fade-up', delay: head.length * 120, stagger: 110 }
  foot.forEach((p, i) => (partMotion[p] = { preset: 'fade-up', delay: (head.length + 2 + i) * 120, stagger: 60 }))
  const countParts: string[] = cfg.countUp ? ['value'] : []
  if (cfg.countUp) partMotion.value = { preset: 'count-up', delay: head.length * 120 + 80, stagger: 110 }
  const composite = defineCompositeBlock<P>({
    type: cfg.type,
    name: cfg.name,
    family: 'composite',
    tier: 'A',
    summary: cfg.summary,
    keywords: cfg.keywords,
    category: cfg.category,
    scope: 'slide',
    related: cfg.related,
    schema: cfg.schema,
    defaults: cfg.defaults,
    size: cfg.size,
    describe: cfg.describe,
    motion: { parts: [...head, ...countParts, 'item', ...foot], preset: 'fade-up', partMotion },
    build,
  })
  const def: BlockDefinition = {
    ...composite,
    shortDescription: cfg.shortDescription,
    intrinsicSize: undefined,
    fillPolicy: cfg.fillPolicy ?? ['type', 'spacing'],
    layout: ((props: P, ctx: LayoutContext): LayoutNode => {
      const s = cfg.shape({ ...cfg.defaults, ...props })
      return s.layout ? s.layout(ctx) : richLayout(ctx, s.items, s.opts, s.head, s.foot)
    }) as BlockDefinition['layout'],
    capacity: ((props: P) => schemaCapacity(cfg.schema, props)) as BlockDefinition['capacity'],
    ...(cfg.reveal ? { reveal: cfg.reveal } : {}),
  }
  BUILDERS.set(def, build as (props: Record<string, unknown>) => BlockSpec)
  return def
}

/** Text of a prop (string or rich text), '' otherwise. */
export function txt(v: unknown, max = 640): string {
  if (typeof v === 'string') return v.slice(0, max)
  if (v && typeof v === 'object' && Array.isArray((v as { runs?: unknown }).runs)) return (v as { runs: Array<{ text?: string }> }).runs.map((r) => r.text ?? '').join('').slice(0, max)
  return ''
}

/** Objects of a list prop (hostile input: anything else dropped). */
export function rows<T extends Record<string, unknown>>(v: unknown, max: number): T[] {
  return (Array.isArray(v) ? v : []).filter((x): x is T => !!x && typeof x === 'object' && !Array.isArray(x)).slice(0, max)
}

/** Strings of a list prop. */
export function strs(v: unknown, max: number): string[] {
  return (Array.isArray(v) ? v : []).map((x) => txt(x)).filter((x) => x.trim()).slice(0, max)
}

/** An object slot type from compact field types (each field a content slot labelled by its key). */
export function objectOf(fields: Record<string, SlotType>): SlotType {
  return { kind: 'object', fields: Object.fromEntries(Object.entries(fields).map(([k, t]) => [k, { type: t, role: 'content', label: k }])) as Record<string, SlotSpec> }
}
