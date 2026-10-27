/**
 * tls.m.illustration — a hand-drawn scene (Open Doodles, CC0) recoloured from the palette.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  scene: {
    type: { kind: 'text', maxChars: 40 },
    role: 'content',
    label: 'Scene',
    help: 'Scene name (reading, sitting-reading, running, sprinting, jumping, coffee, meditating, unboxing, …) or a word it is about (study, success, deadline, đọc, thành công).',
    required: true,
    guidance: 'A person doing what the slide is about; a word finds the closest scene, an unknown one draws the reading scene and lint reports it.',
  },
  accent: {
    type: { kind: 'enum', values: ['accent', 'accent2', 'text'] },
    role: 'option',
    label: 'Accent',
    help: 'Palette role of the scene\'s colour patches (default accent); the lines are the text colour.',
  },
  flip: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Flip',
    help: 'Mirror the scene so the person faces the other way (towards the text).',
  },
}

export interface IllustrationProps extends Record<string, unknown> {
  scene: string
  accent?: 'accent' | 'accent2' | 'text'
  flip?: boolean
}

export const defaults: IllustrationProps = { scene: 'reading' }
