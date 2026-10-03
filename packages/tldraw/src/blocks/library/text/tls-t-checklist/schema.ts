/**
 * Schema and defaults for tls.t.checklist — items that are done, open or blocked.
 */

import type { BlockSchema } from '../../../types'

export const CHECKLIST_MAX_ITEMS = 10

export const schema: BlockSchema = {
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          text: { type: { kind: 'text', maxChars: 140 }, required: true, role: 'content', label: 'Item' },
          state: {
            type: { kind: 'enum', values: ['done', 'open', 'blocked'] },
            role: 'content',
            label: 'State',
            help: 'done = ticked, open = empty box, blocked = crossed.',
          },
        },
      },
      min: 2,
      max: CHECKLIST_MAX_ITEMS,
    },
    role: 'content',
    label: 'Items',
    required: true,
    guidance: 'Short imperative or noun phrases. Set state on each; open is the default.',
  },
  doneStyle: {
    type: { kind: 'enum', values: ['check', 'strike', 'dim'] },
    role: 'option',
    label: 'Done style',
    help: 'strike crosses out done items, dim greys them.',
  },
  spacing: {
    type: { kind: 'enum', values: ['default', 'compact', 'roomy'] },
    role: 'option',
    label: 'Spacing',
  },
  columns: {
    type: { kind: 'enum', values: ['1', '2'] },
    role: 'option',
    label: 'Columns',
  },
}

export type ChecklistState = 'done' | 'open' | 'blocked'

export interface ChecklistItem {
  text: string
  state?: ChecklistState
}

export interface ChecklistProps extends Record<string, unknown> {
  items: ChecklistItem[]
  doneStyle?: 'check' | 'strike' | 'dim'
  spacing?: 'default' | 'compact' | 'roomy'
  columns?: '1' | '2'
}

export const defaults: ChecklistProps = {
  items: [
    { text: 'Define the learning objectives', state: 'done' },
    { text: 'Prepare the demo environment', state: 'done' },
    { text: 'Record the walkthrough', state: 'open' },
    { text: 'Get legal sign-off', state: 'blocked' },
  ],
  doneStyle: 'check',
  spacing: 'default',
  columns: '1',
}
