/**
 * Schema and defaults for tls.g.before-after — two panels joined by an arrow.
 */

import type { BlockSchema, SlotSpec } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

const panel = (label: string, guidance: string): SlotSpec => ({
  type: {
    kind: 'object',
    fields: {
      label: { type: { kind: 'text', maxChars: 20 }, role: 'content', label: 'Tag', help: 'Small tag above the title, e.g. "Before".' },
      title: { type: { kind: 'text', maxChars: 50 }, required: true, role: 'content', label: 'Title' },
      text: { type: { kind: 'text', maxChars: 200 }, role: 'content', label: 'Text' },
      image: { type: { kind: 'image' }, role: 'content', label: 'Image' },
    },
  },
  role: 'content',
  label,
  required: true,
  guidance,
})

export const schema: BlockSchema = {
  before: panel('Before', '{label?, title, text?, image?} for the starting state.'),
  after: panel('After', '{label?, title, text?, image?} for the result.'),
  arrow: enumSlot(['arrow', 'chevron', 'none'], 'Arrow'),
  emphasis: enumSlot(['after', 'none'], 'Emphasis', 'after = the After panel gets the accent.'),
}

export interface BeforeAfterPanel {
  label?: string
  title: string
  text?: string
  image?: string
}

export interface BeforeAfterProps extends Record<string, unknown> {
  before: BeforeAfterPanel
  after: BeforeAfterPanel
  arrow?: 'arrow' | 'chevron' | 'none'
  emphasis?: 'after' | 'none'
}

export const defaults: BeforeAfterProps = {
  before: { label: 'Before', title: 'Manual reports', text: 'Copy and paste data every Monday, three hours a week.' },
  after: { label: 'After', title: 'Live dashboard', text: 'Always up to date, shared with one link.' },
  arrow: 'arrow',
  emphasis: 'after',
}
