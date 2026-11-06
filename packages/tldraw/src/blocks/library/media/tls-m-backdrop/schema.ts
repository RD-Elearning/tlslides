/**
 * Schema and defaults for tls.m.backdrop — a slide-wide ground drawn by the engine (sprint 2026-11b S13-b).
 */

import type { BlockSchema } from '../../../types'

export const BACKDROP_KINDS = [
  'flat', 'mesh', 'aurora', 'split', 'diagonal', 'arcs', 'topo', 'halftone',
  'blueprint', 'paper', 'ruled', 'slate', 'waves', 'frame', 'spotlight', 'dots',
] as const
export type BackdropKind = (typeof BACKDROP_KINDS)[number]
export const BACKDROP_TONES = ['calm', 'deep', 'accent', 'quiet'] as const
export type BackdropTone = (typeof BACKDROP_TONES)[number]

export const schema: BlockSchema = {
  kind: {
    type: { kind: 'enum', values: [...BACKDROP_KINDS] },
    role: 'option',
    label: 'Kind',
    help: 'The ground under the slide: soft glows (mesh, aurora), fields (split, diagonal), line work (arcs, topo, blueprint, ruled, frame), textures (paper, slate, halftone, dots), waves or a spotlight.',
  },
  tone: { type: { kind: 'enum', values: [...BACKDROP_TONES] }, role: 'option', label: 'Role', help: 'quiet = the plainest version (dense slides).' },
  intensity: { type: { kind: 'enum', values: ['soft', 'medium'] }, role: 'option', label: 'Intensity' },
  seed: { type: { kind: 'number', min: 0, max: 9999 }, role: 'option', label: 'Seed', help: 'Varies the drawn marks (topo, paper fibres, slate smudges).' },
}

export interface BackdropProps extends Record<string, unknown> {
  kind?: BackdropKind
  tone?: BackdropTone
  intensity?: 'soft' | 'medium'
  seed?: number
}

export const defaults: BackdropProps = { kind: 'mesh', tone: 'calm', intensity: 'soft', seed: 1 }
