/**
 * Schema and defaults for tls.m.icon-list — vertical list of points, each led by an icon.
 */

import type { BlockSchema } from '../../../types'

export const ICON_LIST_MAX_ITEMS = 6

export const schema: BlockSchema = {
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          icon: { type: { kind: 'icon' }, required: true, role: 'content', label: 'Icon' },
          title: { type: { kind: 'text', maxChars: 60 }, required: true, role: 'content', label: 'Title' },
          text: { type: { kind: 'text', maxChars: 140 }, role: 'content', label: 'Description' },
        },
      },
      min: 2,
      max: ICON_LIST_MAX_ITEMS,
    },
    role: 'content',
    label: 'Points',
    required: true,
    guidance: 'Title 2–5 words; description one short sentence. Pick an icon that names the idea.',
  },
  iconStyle: {
    type: { kind: 'enum', values: ['plain', 'circle', 'square'] },
    role: 'option',
    label: 'Icon style',
    help: 'circle and square put the icon on a tinted shape.',
  },
  iconTone: {
    type: { kind: 'enum', values: ['accent', 'accent2', 'text'] },
    role: 'option',
    label: 'Icon colour',
  },
  spacing: {
    type: { kind: 'enum', values: ['default', 'compact', 'roomy'] },
    role: 'option',
    label: 'Spacing',
  },
  showText: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Show descriptions',
    toggles: 'text',
  },
}

export interface IconListItem {
  icon: string
  title: string
  text?: string
}

export interface IconListProps extends Record<string, unknown> {
  items: IconListItem[]
  iconStyle?: 'plain' | 'circle' | 'square'
  iconTone?: 'accent' | 'accent2' | 'text'
  spacing?: 'default' | 'compact' | 'roomy'
  showText?: boolean
}

export const defaults: IconListProps = {
  items: [
    { icon: 'rocket', title: 'Launch faster', text: 'Ship the first version in weeks, not quarters.' },
    { icon: 'shield', title: 'Stay secure', text: 'Encryption and audit trails come built in.' },
    { icon: 'chart-line', title: 'See the impact', text: 'Dashboards update as the data arrives.' },
    { icon: 'people', title: 'Work together', text: 'Share, comment and decide in one place.' },
  ],
  iconStyle: 'circle',
  iconTone: 'accent',
  spacing: 'default',
  showText: true,
}
