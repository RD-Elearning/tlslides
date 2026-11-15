/**
 * The type ladder a block's text steps along when it grows into room (`promoteType`, `growText`,
 * `promoteToFit`): sizes stay on the scale, and promoted text never passes `heading`.
 */
import type { TypeToken } from '../types'

export const TYPE_LADDER: readonly TypeToken[] = ['footnote', 'caption', 'body', 'lead', 'subheading', 'heading']

/** `t` moved `n` steps up the ladder (tokens off the ladder — title, display — stay). */
export function stepType(t: TypeToken, n: number): TypeToken {
  if (n <= 0) return t
  const i = TYPE_LADDER.indexOf(t)
  return i < 0 ? t : TYPE_LADDER[Math.min(TYPE_LADDER.length - 1, i + n)]
}
