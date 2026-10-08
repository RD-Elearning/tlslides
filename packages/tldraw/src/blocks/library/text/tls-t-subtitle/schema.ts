/**
 * Schema and defaults for tls.t.subtitle — subtitle / secondary heading.
 *
 * Smaller than the title, supports alignment and optional color override.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  text: {
    type: { kind: 'richText' },
    role: 'content',
    label: 'Subtitle',
    help: 'A secondary heading below the title. Supports inline bold and italic.',
    required: true,
    guidance: 'A brief supporting sentence or phrase. 3–12 words. Never repeat the title.',
  },
  align: {
    type: { kind: 'enum', values: ['start', 'center', 'end'] },
    role: 'option',
    label: 'Alignment',
    help: 'Text alignment.',
  },
  color: {
    type: { kind: 'color' },
    role: 'option',
    label: 'Color',
    help: 'Override the default text color role.',
  },
}

export interface SubtitleProps extends Record<string, unknown> {
  text: string | { runs: Array<{ text: string; bold?: boolean; italic?: boolean; color?: string; size?: number }> }
  align?: string
  color?: string
}

export const defaults: SubtitleProps = {
  text: { runs: [{ text: 'Key insights from the ' }, { text: 'latest quarter', italic: true }] },
  align: 'start',
}
