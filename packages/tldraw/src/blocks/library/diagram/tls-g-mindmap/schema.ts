/**
 * Schema and defaults for tls.g.mindmap — a central idea with branches and sub-topics.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const MIND_MIN = 2
export const MIND_MAX = 6
export const MIND_CHILDREN_MAX = 4

export const schema: BlockSchema = {
  center: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Central idea', guidance: '1-4 words.' },
  branches: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 24 }, required: true, role: 'content', label: 'Topic' },
          children: { type: { kind: 'list', of: { kind: 'text', maxChars: 24 }, max: MIND_CHILDREN_MAX }, role: 'content', label: 'Subtopics' },
        },
      },
      min: MIND_MIN,
      max: MIND_MAX,
    },
    role: 'content',
    label: 'Branches',
    required: true,
    guidance: '{label, children?: [text, up to 4]} per topic.',
  },
  balance: enumSlot(['both', 'right'], 'Balance', 'both = branches on both sides, right = all to the right.'),
  curve: { type: { kind: 'boolean' }, role: 'option', label: 'Curved links', help: 'Default on; off draws straight links.' },
}

export interface MindmapProps extends Record<string, unknown> {
  center: string
  branches: Array<{ label: string; children?: string[] }>
  balance?: 'both' | 'right'
  curve?: boolean
}

export const defaults: MindmapProps = {
  center: 'Launch plan',
  branches: [
    { label: 'Product', children: ['Scope', 'Quality'] },
    { label: 'Marketing', children: ['Channels', 'Message'] },
    { label: 'Sales', children: ['Pricing', 'Pipeline'] },
    { label: 'Support', children: ['Docs', 'Training'] },
  ],
  balance: 'both',
  curve: true,
}
