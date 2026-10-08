/**
 * Schema and defaults for tls.t.callout — boxed note marked as info, tip, warning, danger or success.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  title: {
    type: { kind: 'text', maxChars: 50 },
    role: 'content',
    label: 'Title',
    guidance: '1–4 words, e.g. "Heads up".',
  },
  text: {
    type: { kind: 'richText', maxChars: 240 },
    role: 'content',
    label: 'Note',
    required: true,
    guidance: 'One or two sentences. **Bold** works.',
  },
  variant: {
    type: { kind: 'enum', values: ['info', 'tip', 'warning', 'danger', 'success'] },
    role: 'option',
    label: 'Variant',
    help: 'Sets the colour role and default icon.',
  },
  fill: {
    type: { kind: 'enum', values: ['tint', 'outline', 'solid'] },
    role: 'option',
    label: 'Fill',
  },
  icon: {
    type: { kind: 'icon' },
    role: 'option',
    label: 'Icon',
    help: 'Overrides the variant icon.',
  },
  showIcon: { type: { kind: 'boolean' }, role: 'option', label: 'Show icon', toggles: 'icon' },
  showTitle: { type: { kind: 'boolean' }, role: 'option', label: 'Show title', toggles: 'title' },
}

export type CalloutVariant = 'info' | 'tip' | 'warning' | 'danger' | 'success'

export interface CalloutProps extends Record<string, unknown> {
  title?: string
  text: string
  variant?: CalloutVariant
  fill?: 'tint' | 'outline' | 'solid'
  icon?: string
  showIcon?: boolean
  showTitle?: boolean
}

export const defaults: CalloutProps = {
  title: 'Heads up',
  text: 'Numbers in this chart are **preliminary** and will be restated after the audit closes.',
  variant: 'warning',
  fill: 'tint',
  icon: '',
  showIcon: true,
  showTitle: true,
}
