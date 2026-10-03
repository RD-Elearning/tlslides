/**
 * Schema and defaults for tls.t.tags — a wrapping row of pill-shaped tags.
 */

import type { BlockSchema } from '../../../types'

export const TAGS_MAX_ITEMS = 12

export const schema: BlockSchema = {
  items: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 30 }, min: 1, max: TAGS_MAX_ITEMS },
    role: 'content',
    label: 'Tags',
    required: true,
    guidance: 'Single words or short noun phrases, 1–3 words each.',
  },
  tone: {
    type: { kind: 'enum', values: ['soft', 'outline', 'solid'] },
    role: 'option',
    label: 'Tone',
  },
  shape: {
    type: { kind: 'enum', values: ['pill', 'rect'] },
    role: 'option',
    label: 'Shape',
  },
  size: {
    type: { kind: 'enum', values: ['md', 'sm', 'lg'] },
    role: 'option',
    label: 'Size',
  },
  align: {
    type: { kind: 'enum', values: ['start', 'center'] },
    role: 'option',
    label: 'Alignment',
  },
  colorBy: {
    type: { kind: 'enum', values: ['single', 'cycle'] },
    role: 'option',
    label: 'Colour',
    help: 'cycle walks the series colours.',
  },
}

export interface TagsProps extends Record<string, unknown> {
  items: string[]
  tone?: 'soft' | 'outline' | 'solid'
  shape?: 'pill' | 'rect'
  size?: 'md' | 'sm' | 'lg'
  align?: 'start' | 'center'
  colorBy?: 'single' | 'cycle'
}

export const defaults: TagsProps = {
  items: ['TypeScript', 'React', 'Design systems', 'Accessibility', 'Motion', 'Data viz', 'Testing', 'Open source'],
  tone: 'soft',
  shape: 'pill',
  size: 'md',
  align: 'start',
  colorBy: 'single',
}
