/**
 * Schema and defaults for tls.m.decoration — a purely decorative shape in a theme colour.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  shape: {
    type: { kind: 'enum', values: ['blob', 'arc', 'ring', 'dots', 'wave', 'corner', 'orb', 'squiggle', 'star', 'sparkle', 'zigzag', 'triangle', 'half-circle', 'frame'] },
    role: 'option',
    label: 'Shape',
    // AC4 motifs: orb (pseudo-3D sphere), squiggle, star, sparkle, zigzag, triangle, half-circle, frame (corner brackets).
    help: 'orb = pseudo-3D sphere, frame = corner brackets. Rotation snaps to quarters for wave, corner, squiggle, zigzag, half-circle.',
  },
  tone: { type: { kind: 'enum', values: ['accent', 'accent2', 'alt', 'line'] }, role: 'option', label: 'Colour' },
  opacity: { type: { kind: 'enum', values: ['soft', 'medium', 'strong'] }, role: 'option', label: 'Opacity', help: 'Ignored for tone alt, which is already quiet.' },
  rotation: { type: { kind: 'number', min: 0, max: 359 }, role: 'option', label: 'Rotation', help: 'Degrees.' },
  seed: { type: { kind: 'number', min: 0, max: 9999 }, role: 'option', label: 'Seed', help: 'Same seed, same shape (blob, wave).' },
}

/** Every shape; the last eight are the AC4 motifs (ai-curation §2.3 rank 4). */
export const DECORATION_SHAPES = ['blob', 'arc', 'ring', 'dots', 'wave', 'corner', 'orb', 'squiggle', 'star', 'sparkle', 'zigzag', 'triangle', 'half-circle', 'frame'] as const
export type DecorationShape = (typeof DECORATION_SHAPES)[number]

export interface DecorationProps extends Record<string, unknown> {
  shape?: DecorationShape
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
