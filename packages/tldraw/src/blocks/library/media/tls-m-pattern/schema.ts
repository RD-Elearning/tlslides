/**
 * Schema and defaults for tls.m.pattern — a repeating backdrop texture in one path.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  pattern: { type: { kind: 'enum', values: ['dots', 'grid', 'lines', 'diagonal'] }, role: 'option', label: 'Pattern' },
  scale: { type: { kind: 'enum', values: ['md', 'sm', 'lg'] }, role: 'option', label: 'Scale', help: 'Spacing of the marks.' },
  tone: { type: { kind: 'enum', values: ['line', 'accent', 'alt'] }, role: 'option', label: 'Colour' },
  opacity: { type: { kind: 'enum', values: ['soft', 'medium'] }, role: 'option', label: 'Opacity', help: 'Ignored for tone alt.' },
}

export interface PatternProps extends Record<string, unknown> {
  pattern?: 'dots' | 'grid' | 'lines' | 'diagonal'
  scale?: 'md' | 'sm' | 'lg'
  tone?: 'line' | 'accent' | 'alt'
  opacity?: 'soft' | 'medium'
}

export const defaults: PatternProps = {
  pattern: 'dots',
  scale: 'md',
  tone: 'line',
  opacity: 'soft',
}
