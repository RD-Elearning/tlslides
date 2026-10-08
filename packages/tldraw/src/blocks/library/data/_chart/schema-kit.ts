/**
 * Schema fragments shared by the P2 charts, so the same option key always carries the same
 * meaning and the same value set (P0.6 "shared chart options").
 */

import type { SlotSpec } from '../../../types'

const obj = (fields: Record<string, SlotSpec>) => ({ kind: 'object' as const, fields })

export function categoriesSlot(min: number, max: number, help?: string): SlotSpec {
  return {
    type: { kind: 'list', of: { kind: 'text', maxChars: 24 }, min, max },
    role: 'content',
    label: 'Categories',
    required: true,
    help: help ?? 'Axis labels, 1-2 words each.',
  }
}

export function seriesSlot(min: number, max: number, help?: string): SlotSpec {
  return {
    type: {
      kind: 'list',
      of: obj({
        name: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Name', required: true },
        values: {
          type: { kind: 'list', of: { kind: 'number' } },
          role: 'content',
          label: 'Values',
          required: true,
          
        },
      }),
      min,
      max,
    },
    role: 'content',
    label: 'Series',
    required: true,
    help: help ?? 'One entry per series; values match categories.',
  }
}

export const enumSlot = (values: string[], label: string, help?: string): SlotSpec => ({
  type: { kind: 'enum', values },
  role: 'option',
  label,
  ...(help ? { help } : {}),
})

export const formatSlot = (): SlotSpec =>
  enumSlot(['plain', 'compact', 'percent', 'currency'], 'Number format')

export const legendSlot = (): SlotSpec => enumSlot(['top', 'bottom', 'right', 'none'], 'Legend')

export const gridlinesSlot = (): SlotSpec => enumSlot(['major', 'none'], 'Gridlines')

export const valueLabelsSlot = (values: string[]): SlotSpec =>
  enumSlot(values, 'Value labels')

export const highlightSlot = (what: string): SlotSpec => ({
  type: { kind: 'number', min: -1 },
  role: 'option',
  label: 'Highlight index',
  help: `${what} to emphasise; others dim. -1 = none.`,
})

export const numberSlot = (label: string, help?: string, role: 'content' | 'option' = 'option'): SlotSpec => ({
  type: { kind: 'number' },
  role,
  label,
  ...(help ? { help } : {}),
})

export const boolSlot = (label: string, help?: string, toggles?: string): SlotSpec => ({
  type: { kind: 'boolean' },
  role: 'option',
  label,
  ...(help ? { help } : {}),
  ...(toggles ? { toggles } : {}),
})
