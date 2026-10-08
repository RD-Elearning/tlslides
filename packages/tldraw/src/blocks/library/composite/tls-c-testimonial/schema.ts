/**
 * Schema and defaults for tls.c.testimonial — pull-quote testimonial with attribution.
 *
 * A pull-quote testimonial: the quote text (rich text or plain string), avatar image
 * (asset id or URL), speaker name, and speaker role. This is a `kind: 'html'` block —
 * the template renders as real DOM, and the poster supplies the geometry for SVG export
 * and thumbnails.
 */

import type { BlockSchema } from '../../../types'

export interface TestimonialProps extends Record<string, unknown> {
  /** The testimonial quote. Accepts rich text (runs) or a plain string. */
  quote: string | { runs: Array<{ text: string; bold?: boolean; italic?: boolean; color?: string; size?: number }> }
  /** Speaker name. */
  name: string
  /** Speaker role / title. */
  role: string
  /** Avatar: asset id or URL (https: or data:image/*). Falls back to initials when absent/unresolvable. */
  avatar?: string
}

export const schema: BlockSchema = {
  quote: {
    type: { kind: 'richText', maxChars: 500 },
    role: 'content',
    label: 'Quote',
    required: true,
    guidance: 'The testimonial quote. 1–3 sentences. Bold key phrases for emphasis.',
  },
  name: {
    type: { kind: 'text', maxChars: 60 },
    role: 'content',
    label: 'Name',
    required: true,
    guidance: 'Speaker\'s full name. 2–4 words.',
  },
  role: {
    type: { kind: 'text', maxChars: 80 },
    role: 'content',
    label: 'Role',
    required: true,
    guidance: 'Speaker\'s title or position. 2–8 words.',
  },
  avatar: {
    type: { kind: 'text', maxChars: 200 },
    role: 'content',
    label: 'Avatar',
    guidance: 'Avatar image URL (https:) or asset id. Optional; shows initials when absent.',
  },
}

/**
 * Extract plain text from a rich-text value.
 */
export function richTextToPlain(value: string | { runs: Array<{ text: string }> }): string {
  if (typeof value === 'string') return value
  return value.runs.map((r) => r.text).join('')
}

/**
 * Extract initials from a name (up to 2 characters).
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Check whether an avatar string is a valid, safe URL (https: or data:image/*).
 */
export function isSafeAvatarUrl(avatar: string | undefined): boolean {
  if (!avatar) return false
  const trimmed = avatar.trim()
  return trimmed.startsWith('https:') || /^data:image\/(png|jpeg|gif|webp)/.test(trimmed)
}

export const defaults: TestimonialProps = {
  quote: {
    runs: [
      { text: 'This product ' },
      { text: 'transformed', bold: true },
      { text: ' how our team works. We shipped ' },
      { text: '3× faster', bold: true },
      { text: ' in the first quarter.' },
    ],
  },
  name: 'Jane Doe',
  role: 'VP of Engineering',
  avatar: '',
}
