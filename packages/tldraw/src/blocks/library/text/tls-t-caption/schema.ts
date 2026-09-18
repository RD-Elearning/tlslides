/**
 * Schema and defaults for tls.t.caption — caption text.
 *
 * Small text typically placed under images, charts, or other media.
 * Uses the 'caption' type token for appropriate sizing.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  text: {
    type: { kind: 'text', maxChars: 200, multiline: false },
    role: 'content',
    label: 'Caption',
    help: 'Caption text. Typically 1 sentence describing an image or chart.',
    required: true,
    guidance: 'A brief description, 5–15 words. State what the reader should notice.',
  },
  align: {
    type: { kind: 'enum', values: ['start', 'center', 'end'] },
    role: 'option',
    label: 'Alignment',
    help: 'Text alignment.',
  },
  position: {
    type: { kind: 'enum', values: ['below', 'above', 'overlay'] },
    role: 'option',
    label: 'Position',
    help: 'Where the caption sits relative to its referenced content.',
  },
  color: {
    type: { kind: 'color' },
    role: 'option',
    label: 'Color',
    help: 'Override the default text color role.',
  },
}

export interface CaptionProps extends Record<string, unknown> {
  text: string
  align?: string
  position?: string
  color?: string
}

export const defaults: CaptionProps = {
  text: 'Figure 1: Design system architecture overview',
  align: 'start',
  position: 'below',
}
