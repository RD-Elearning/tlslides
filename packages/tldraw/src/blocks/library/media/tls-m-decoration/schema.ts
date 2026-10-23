/**
 * Schema and defaults for tls.m.decoration — a purely decorative shape in a theme colour.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  shape: {
    type: { kind: 'enum', values: ['blob', 'arc', 'ring', 'dots', 'wave', 'corner', 'orb', 'squiggle', 'star', 'sparkle', 'zigzag', 'triangle', 'half-circle', 'frame', 'cube', 'cylinder', 'cone', 'pyramid', 'slab', 'tree', 'graph', 'gear', 'book', 'flask', 'globe', 'bulb', 'chart', 'code', 'icon'] },
    role: 'option',
    label: 'Shape',
    // AC4 motifs: orb (pseudo-3D sphere), squiggle, star, sparkle, zigzag, triangle, half-circle, frame (corner brackets).
    help: 'orb = 3D sphere, frame = corner brackets, cube…slab = isometric solids, tree…code = subject doodles (a drawing of the topic), icon = the `icon` drawn large as a motif. Rotation snaps to quarters for wave, corner, squiggle, zigzag, half-circle.',
    // the subject doodles reach a slide through the art direction's ticket, not the tier-1 index
    indexValues: ['blob', 'arc', 'ring', 'dots', 'wave', 'corner', 'orb', 'squiggle', 'star', 'sparkle', 'zigzag', 'triangle', 'half-circle', 'frame', 'cube', 'cylinder', 'cone', 'pyramid', 'slab'],
  },
  // vivid V3: a topic icon as the motif (any icon name; the slide's icon list)
  icon: { type: { kind: 'icon' }, role: 'option', label: 'Icon', help: 'shape icon: the icon drawn large, e.g. `atom`, `book`, `chart-bar` — a topic icon, never a generic one.' },
  tone: { type: { kind: 'enum', values: ['accent', 'accent2', 'alt', 'line'] }, role: 'option', label: 'Colour' },
  opacity: { type: { kind: 'enum', values: ['soft', 'medium', 'strong'] }, role: 'option', label: 'Opacity', help: 'Ignored for tone alt, which is already quiet.' },
  rotation: { type: { kind: 'number', min: 0, max: 359 }, role: 'option', label: 'Rotation', help: 'Degrees.' },
  seed: { type: { kind: 'number', min: 0, max: 9999 }, role: 'option', label: 'Seed', help: 'Same seed, same shape (blob, wave).' },
  // vivid V2: the loop the decoration plays once the slide is built (presentation only)
  ambient: {
    type: { kind: 'enum', values: ['auto', 'none', 'float', 'drift', 'spin', 'sway', 'pulse', 'twinkle'] },
    role: 'option',
    label: 'Ambient motion',
    help: 'auto = by shape (orbs float, rings turn, sparkles twinkle). Plays only in the viewer, never on a still deck.',
  },
}

/** Every shape: AC4 motifs (orb … frame), S4 isometric solids (cube … slab), S4 subject doodles (tree … code). */
export const DECORATION_SHAPES = ['blob', 'arc', 'ring', 'dots', 'wave', 'corner', 'orb', 'squiggle', 'star', 'sparkle', 'zigzag', 'triangle', 'half-circle', 'frame', 'cube', 'cylinder', 'cone', 'pyramid', 'slab', 'tree', 'graph', 'gear', 'book', 'flask', 'globe', 'bulb', 'chart', 'code', 'icon'] as const
export type DecorationShape = (typeof DECORATION_SHAPES)[number]

export interface DecorationProps extends Record<string, unknown> {
  shape?: DecorationShape
  tone?: 'accent' | 'accent2' | 'alt' | 'line'
  opacity?: 'soft' | 'medium' | 'strong'
  rotation?: number
  seed?: number
  icon?: string
  ambient?: 'auto' | 'none' | 'float' | 'drift' | 'spin' | 'sway' | 'pulse' | 'twinkle'
}

export const defaults: DecorationProps = {
  shape: 'blob',
  tone: 'accent',
  opacity: 'soft',
  rotation: 0,
  seed: 1,
}
