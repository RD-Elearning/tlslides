/**
 * Schema and defaults for tls.m.decoration — a purely decorative shape in a theme colour.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  shape: {
    type: { kind: 'enum', values: ['blob', 'arc', 'ring', 'dots', 'wave', 'corner'] },
    role: 'option',
    label: 'Shape',
    help: 'Rotation turns blob and arc freely; wave and corner snap to quarter turns; ring and dots ignore it.',
  },
  tone: { type: { kind: 'enum', values: ['accent', 'accent2', 'alt', 'line'] }, role: 'option', label: 'Colour' },
  opacity: { type: { kind: 'enum', values: ['soft', 'medium', 'strong'] }, role: 'option', label: 'Opacity', help: 'Ignored for tone alt, which is already quiet.' },
  rotation: { type: { kind: 'number', min: 0, max: 359 }, role: 'option', label: 'Rotation', help: 'Degrees.' },
  seed: { type: { kind: 'number', min: 0, max: 9999 }, role: 'option', label: 'Seed', help: 'Same seed, same shape (blob, wave).' },
}

export interface DecorationProps extends Record<string, unknown> {
  shape?: 'blob' | 'arc' | 'ring' | 'dots' | 'wave' | 'corner'
  tone?: 'accent' | 'accent2' | 'alt' | 'line'
  opacity?: 'soft' | 'medium' | 'strong'
  rotation?: number
  seed?: number
}

export const defaults: DecorationProps = {
  shape: 'blob',
  tone: 'accent',
  opacity: 'soft',
  rotation: 0,
  seed: 1,
}
