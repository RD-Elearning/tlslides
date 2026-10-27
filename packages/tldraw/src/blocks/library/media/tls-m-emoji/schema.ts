/**
 * tls.m.emoji — one colour emoji (Fluent Emoji, MIT) as a sticker for playful slides.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  emoji: {
    type: { kind: 'text', maxChars: 40 },
    role: 'content',
    label: 'Emoji',
    help: 'Emoji name (rocket, light-bulb, party-popper, thinking-face, books, trophy, …) or an icon name that has an emoji (bulb, school, target).',
    required: true,
    guidance: 'An emoji the slide is about; unknown names draw a placeholder and lint reports them.',
  },
  size: {
    type: { kind: 'enum', values: ['sm', 'md', 'lg', 'xl'] },
    role: 'option',
    label: 'Size',
    help: 'sm = 48, md = 96 (default), lg = 160, xl = 240 slide units, never larger than the box.',
  },
  backing: {
    type: { kind: 'enum', values: ['none', 'sticker', 'disc'] },
    role: 'option',
    label: 'Backing',
    help: 'sticker: a white die-cut disc with a soft shadow; disc: a tinted disc. Default none.',
  },
}

export interface EmojiProps extends Record<string, unknown> {
  emoji: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  backing?: 'none' | 'sticker' | 'disc'
}

export const defaults: EmojiProps = { emoji: 'rocket', size: 'md' }
