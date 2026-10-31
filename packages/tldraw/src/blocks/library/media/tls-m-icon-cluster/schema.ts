/**
 * Schema and defaults for tls.m.icon-cluster — a few topic icons scattered as a decoration.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  icons: {
    type: { kind: 'list', of: { kind: 'icon' }, min: 1, max: 7 },
    role: 'content',
    label: 'Icons',
    required: true,
    guidance: '3-5 icons of the slide topic, from the slide\'s icon list (e.g. atom, flask, microscope). Never generic arrows or checks.',
  },
  tone: { type: { kind: 'enum', values: ['accent', 'accent2', 'mixed', 'line'] }, role: 'option', label: 'Colour', help: 'mixed = accent and accent2 alternate; line = a faint grey.' },
  opacity: { type: { kind: 'enum', values: ['soft', 'medium', 'strong'] }, role: 'option', label: 'Opacity' },
  backing: { type: { kind: 'enum', values: ['none', 'disc'] }, role: 'option', label: 'Backing', help: 'disc = each icon on a soft disc.' },
  seed: { type: { kind: 'number', min: 0, max: 9999 }, role: 'option', label: 'Seed', help: 'Same seed, same arrangement.' },
  ambient: { type: { kind: 'enum', values: ['auto', 'none'] }, role: 'option', label: 'Ambient motion', help: 'auto = the icons bob gently, each in its own time (viewer only).' },
}

export interface IconClusterProps extends Record<string, unknown> {
  icons: string[]
  tone?: 'accent' | 'accent2' | 'mixed' | 'line'
  opacity?: 'soft' | 'medium' | 'strong'
  backing?: 'none' | 'disc'
  seed?: number
  ambient?: 'auto' | 'none'
}

export const defaults: IconClusterProps = {
  icons: ['atom', 'flask', 'microscope', 'dna'],
  tone: 'mixed',
  opacity: 'medium',
  backing: 'disc',
  seed: 3,
  ambient: 'auto',
}
