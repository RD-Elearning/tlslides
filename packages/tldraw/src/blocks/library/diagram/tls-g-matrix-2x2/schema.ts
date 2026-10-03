/**
 * Schema and defaults for tls.g.matrix-2x2 — four quadrants, two labelled axes, optional points.
 */

import type { BlockSchema, SlotSpec } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const MATRIX_MAX_ITEMS = 12

const axisSlot = (label: string, guidance: string): SlotSpec => ({
  type: {
    kind: 'object',
    fields: {
      low: { type: { kind: 'text', maxChars: 24 }, required: true, role: 'content', label: 'Low end' },
      high: { type: { kind: 'text', maxChars: 24 }, required: true, role: 'content', label: 'High end' },
      title: { type: { kind: 'text', maxChars: 30 }, role: 'content', label: 'Title' },
    },
  },
  role: 'content',
  label,
  required: true,
  guidance,
})

export const schema: BlockSchema = {
  xAxis: axisSlot('X axis', '{low, high, title?} of the horizontal dimension.'),
  yAxis: axisSlot('Y axis', '{low, high, title?}; high is at the top.'),
  quadrants: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Quadrant' },
          text: { type: { kind: 'text', maxChars: 100 }, role: 'content', label: 'Note' },
        },
      },
      min: 4,
      max: 4,
    },
    role: 'content',
    label: 'Quadrants',
    required: true,
    guidance: 'Exactly 4 {label, text?}: TL, TR, BL, BR.',
  },
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 24 }, required: true, role: 'content', label: 'Label' },
          x: { type: { kind: 'number', min: 0, max: 1 }, required: true, role: 'content', label: 'X' },
          y: { type: { kind: 'number', min: 0, max: 1 }, required: true, role: 'content', label: 'Y' },
        },
      },
      max: MATRIX_MAX_ITEMS,
    },
    role: 'content',
    label: 'Plotted items',
    guidance: 'Points {label, x, y}, x and y in 0..1.',
  },
  highlight: enumSlot(['none', 'TL', 'TR', 'BL', 'BR'], 'Highlight'),
  style: enumSlot(['tinted', 'lines'], 'Style'),
  showItems: { type: { kind: 'boolean' }, role: 'option', label: 'Show items', toggles: 'item' },
  showAxisTitles: { type: { kind: 'boolean' }, role: 'option', label: 'Show axis titles', toggles: 'axis-title' },
}

export interface MatrixAxis {
  low: string
  high: string
  title?: string
}

export interface MatrixProps extends Record<string, unknown> {
  xAxis: MatrixAxis
  yAxis: MatrixAxis
  quadrants: Array<{ label: string; text?: string }>
  items?: Array<{ label: string; x: number; y: number }>
  highlight?: 'none' | 'TL' | 'TR' | 'BL' | 'BR'
  style?: 'tinted' | 'lines'
  showItems?: boolean
  showAxisTitles?: boolean
}

export const defaults: MatrixProps = {
  xAxis: { low: 'Low effort', high: 'High effort', title: 'Effort' },
  yAxis: { low: 'Low impact', high: 'High impact', title: 'Impact' },
  quadrants: [
    { label: 'Quick wins', text: 'Do these first' },
    { label: 'Big bets', text: 'Plan and fund' },
    { label: 'Fill-ins', text: 'Only if time allows' },
    { label: 'Money pits', text: 'Avoid' },
  ],
  items: [
    { label: 'Onboarding', x: 0.22, y: 0.78 },
    { label: 'New pricing', x: 0.72, y: 0.82 },
    { label: 'Dark mode', x: 0.3, y: 0.28 },
  ],
  highlight: 'TL',
  style: 'tinted',
}
