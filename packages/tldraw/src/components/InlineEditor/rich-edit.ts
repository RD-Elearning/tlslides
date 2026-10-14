/**
 * Inline editing of a text slot whose value is a plain string or a `RichText` (`{ runs }`).
 *
 * The overlay edits plain text, so a rich value goes through the `**strong**` convention the text
 * blocks already read (`parseStrong`): bold runs become `**…**` and come back as bold runs. A value
 * whose runs carry anything else (italic, colour, size) cannot round-trip through plain text and
 * is not editable inline — the inspector edits it instead, so nothing is silently lost.
 *
 * Pure and DOM-free.
 */

import { parseStrong } from '../../blocks/library/text/_engine/rich'
import type { RichText } from '../../blocks/types'

function isRich(value: unknown): value is RichText {
  return !!value && typeof value === 'object' && Array.isArray((value as RichText).runs)
}

/** The text the overlay starts with, or `null` when the value cannot be edited inline. */
export function toEditable(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value == null) return ''
  if (!isRich(value)) return null
  if (value.runs.some((r) => r.italic || r.color !== undefined || r.size !== undefined)) return null
  return value.runs.map((r) => (r.bold && r.text ? `**${r.text}**` : r.text ?? '')).join('')
}

/** The new slot value: same shape as the old one (string stays string, rich stays rich). */
export function fromEdited(original: unknown, text: string): string | RichText {
  if (!isRich(original)) return text
  return {
    runs: parseStrong(text)
      .filter((s) => s.text !== '')
      .map((s) => (s.strong ? { text: s.text, bold: true } : { text: s.text })),
  }
}
