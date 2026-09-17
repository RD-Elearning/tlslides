/**
 * Q19 — the AI capability digest: a markdown (and structured) description of every block type
 * and slide layout available to a model, generated from `BUILT_IN_BLOCKS` and `SLIDE_LAYOUTS`
 * so it can never drift from the library the way a hand-written copy would within a sprint
 * (`06-slide-composition.md` §6.7 point 1 / `BACKLOG-demo.md` §2.5 decision 1).
 *
 * The block list, their slots, and the layout → region-name table are all *read back* from
 * the live registry and from actually calling each layout's `compile()` — nothing here is a
 * hand-maintained copy of what the library contains.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`, no network.
 */

import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import type { BlockRegistry } from './registry'
import { SLIDE_LAYOUTS } from './slide-layouts'
import { resolveTokens } from './tokens'
import { defaultBlockRegistry } from './validate-deck-spec'
import type { ResolvedTokens, SlotSpec, SlotType } from './types'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Public types                                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

export interface CapabilitySlotDigest {
  name: string
  role: 'content' | 'option'
  required: boolean
  /** Human-readable type + budget, e.g. 'richText (max 300 chars)'. */
  type: string
  label: string
  help?: string
  guidance?: string
}

export interface CapabilityBlockDigest {
  type: string
  name: string
  family: string
  summary: string
  keywords: string[]
  slots: CapabilitySlotDigest[]
}

export interface CapabilityLayoutDigest {
  id: string
  name: string
  /** Region names, read back from actually calling `compile()` at a 1920×1080 reference frame. */
  regions: string[]
}

export interface CapabilityDigest {
  blocks: CapabilityBlockDigest[]
  layouts: CapabilityLayoutDigest[]
  /** A compact, valid worked example slide (`BACKLOG-demo.md` §2.4). */
  example: unknown
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Reference frame for deriving layout region tables                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

const REFERENCE_FRAME = { width: 1920, height: 1080 }

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Data                                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Structured capability data, derived from `registry` (default: `BUILT_IN_BLOCKS`) and from
 * `SLIDE_LAYOUTS`. Never hand-written — see this module's header comment.
 */
export function capabilityDigestData(registry?: BlockRegistry): CapabilityDigest {
  const reg = registry ?? defaultBlockRegistry()

  // Only the *shape* of the resolved tokens matters here (which region keys a layout
  // produces), not their values, so the default theme with no overrides is sufficient and
  // keeps this function independent of any particular deck.
  let tokens: ResolvedTokens | undefined
  try {
    tokens = resolveTokens(DEFAULT_DECK_THEME)
  } catch {
    tokens = undefined
  }

  const blocks: CapabilityBlockDigest[] = reg
    .list()
    .slice()
    .sort((a, b) => a.type.localeCompare(b.type))
    .map((def) => ({
      type: def.type,
      name: def.name,
      family: def.family,
      summary: def.summary,
      keywords: [...def.keywords],
      slots: Object.entries(def.schema ?? {}).map(([name, slot]) => describeSlot(name, slot)),
    }))

  const layouts: CapabilityLayoutDigest[] = SLIDE_LAYOUTS.map((layout) => {
    let regions: string[] = []
    if (tokens) {
      try {
        regions = Object.keys(layout.compile(REFERENCE_FRAME, tokens))
      } catch {
        regions = []
      }
    }
    return { id: layout.id, name: layout.name, regions }
  })

  return { blocks, layouts, example: WORKED_EXAMPLE_SLIDE }
}

/**
 * Markdown rendering of `capabilityDigestData`, meant to be embedded directly into an LLM
 * prompt: every block type, its slots (required ones marked), their budgets, the layout →
 * region name table, and a worked example of a valid slide.
 */
export function capabilityDigest(registry?: BlockRegistry): string {
  const data = capabilityDigestData(registry)
  const lines: string[] = []

  lines.push('# Slide block capabilities')
  lines.push('')
  lines.push(
    'Generated from the live block library and slide layouts — do not hand-author a copy of ' +
      'this document, it will drift. Every block below is a closed vocabulary entry: pick a ' +
      '`type`, fill its declared slots, and never invent a region name, a slot, or a coordinate.'
  )
  lines.push('')

  lines.push('## Layouts')
  lines.push('')
  lines.push('Region names belong to the layout — pick a `layout`, then only use the regions it lists.')
  lines.push('')
  lines.push('| Layout | Regions |')
  lines.push('|---|---|')
  for (const l of data.layouts) {
    const regionList = l.regions.length ? l.regions.map((r) => `\`${r}\``).join(', ') : '_(none)_'
    lines.push(`| \`${l.id}\` (${l.name}) | ${regionList} |`)
  }
  lines.push('')

  lines.push('## Blocks')
  lines.push('')
  for (const b of data.blocks) {
    lines.push(`### \`${b.type}\` — ${b.name}`)
    lines.push('')
    lines.push(`${b.summary} _(family: ${b.family}; keywords: ${b.keywords.join(', ') || '—'})_`)
    lines.push('')
    if (b.slots.length) {
      lines.push('| Slot | Required | Type | Guidance |')
      lines.push('|---|---|---|---|')
      for (const slot of b.slots) {
        const guidance = (slot.guidance ?? slot.help ?? '').replace(/\|/g, '\\|')
        lines.push(`| \`${slot.name}\` | ${slot.required ? 'yes' : 'no'} | ${slot.type} | ${guidance} |`)
      }
    } else {
      lines.push('_No slots._')
    }
    lines.push('')
  }

  lines.push('## Worked example — a valid slide')
  lines.push('')
  lines.push(
    'Zero coordinates, zero colour values, zero font sizes. Region names come from the layout ' +
      '(`two-column` → `title`, `left`, `right`); block types and slots come from the tables above.'
  )
  lines.push('')
  lines.push('```json')
  lines.push(JSON.stringify(data.example, null, 2))
  lines.push('```')
  lines.push('')

  return lines.join('\n')
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Slot description                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

function describeSlot(name: string, slot: SlotSpec): CapabilitySlotDigest {
  return {
    name,
    role: slot.role,
    required: !!slot.required,
    type: describeSlotType(slot.type),
    label: slot.label,
    help: slot.help,
    guidance: slot.guidance,
  }
}

function describeSlotType(type: SlotType): string {
  switch (type.kind) {
    case 'text':
      return `text${type.maxChars !== undefined ? ` (max ${type.maxChars} chars)` : ''}`
    case 'richText':
      return `richText${type.maxChars !== undefined ? ` (max ${type.maxChars} chars)` : ''}`
    case 'number': {
      const bounds = [
        type.min !== undefined ? `min ${type.min}` : undefined,
        type.max !== undefined ? `max ${type.max}` : undefined,
      ].filter((v): v is string => v !== undefined)
      return `number${bounds.length ? ` (${bounds.join(', ')})` : ''}`
    }
    case 'enum':
      return `enum: ${type.values.join(' \\| ')}`
    case 'boolean':
      return 'boolean'
    case 'color':
      return 'color (role or theme token — never hex)'
    case 'icon':
      return 'icon'
    case 'image':
      return 'image'
    case 'list': {
      const bounds = boundsLabel(type.min, type.max, 'items')
      return `list of ${describeSlotType(type.of)}${bounds}`
    }
    case 'object':
      return `object (${Object.keys(type.fields).join(', ')})`
    case 'series':
      return `series of ${type.value}${type.max !== undefined ? ` (max ${type.max})` : ''}`
    case 'blocks': {
      const bounds = boundsLabel(type.min, type.max, 'blocks')
      return `blocks${type.allow ? ` (allow: ${type.allow.join(', ')})` : ''}${bounds}`
    }
    default:
      return 'unknown'
  }
}

function boundsLabel(min: number | undefined, max: number | undefined, unit: string): string {
  if (min === undefined && max === undefined) return ''
  return ` (${min ?? 0}–${max ?? '∞'} ${unit})`
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Worked example (BACKLOG-demo.md §2.4)                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

const WORKED_EXAMPLE_SLIDE = {
  id: 'sl_03',
  layout: 'two-column',
  role: 'content',
  rhythm: 'dense',
  regions: {
    title: [
      {
        id: 'b1',
        type: 'tls.t.title',
        props: {
          text: {
            runs: [{ text: 'Margin fell on ' }, { text: 'infrastructure', bold: true }],
          },
        },
      },
    ],
    left: [
      {
        id: 'b2',
        type: 'tls.d.bar',
        props: { categories: ['Q1', 'Q2', 'Q3'], series: [64, 64, 61], highlightIndex: 2 },
        motion: { preset: 'bars-grow', order: 2, trigger: 'onClick' },
      },
    ],
    right: [
      {
        id: 'b3',
        type: 'tls.t.takeaway',
        props: { text: 'Compute spend grew 2.4× while revenue grew 1.2×.' },
        motion: { preset: 'fade-up', order: 3 },
      },
      {
        id: 'b4',
        type: 'tls.t.caption',
        props: { text: 'Source: internal Q3 financials' },
      },
    ],
  },
  notes: 'Land on the 61 — this is the hinge slide.',
}
