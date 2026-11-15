/**
 * Schema and defaults for tls.m.backdrop — a slide-wide ground drawn by the engine (sprint 2026-11b S13-b).
 */

import type { BlockSchema } from '../../../types'

export const BACKDROP_KINDS = [
  'flat', 'mesh', 'aurora', 'split', 'diagonal', 'arcs', 'topo', 'halftone',
  'blueprint', 'paper', 'ruled', 'slate', 'waves', 'frame', 'spotlight', 'dots',
  // S20-f: the deck's motif icons on a jittered grid; chosen in code only when the deck has motifs
  'icon-field',
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
  // S20-f: filled from `DeckSpec.motifs.icons` by `slideBackdrop`, never written by a model
  icons: { type: { kind: 'list', of: { kind: 'text', maxChars: 40 }, max: 4 }, role: 'option', label: 'Icons', help: 'icon-field: 2-4 icon names tiled across the ground.' },
}

export interface BackdropProps extends Record<string, unknown> {
  kind?: BackdropKind
  tone?: BackdropTone
  intensity?: 'soft' | 'medium'
  seed?: number
  /** S20-f — `icon-field`: the icons it tiles (the deck's motif icons). */
  icons?: string[]
}

export const defaults: BackdropProps = { kind: 'mesh', tone: 'calm', intensity: 'soft', seed: 1 }
