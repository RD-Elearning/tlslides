/**
 * Schema and defaults for tls.c.testimonial — pull-quote testimonial with attribution.
 *
 * A pull-quote testimonial: the quote text (rich text or plain string), avatar image
 * (asset id or URL), speaker name, and speaker role. This is a `kind: 'html'` block —
 * the template renders as real DOM, and the poster supplies the geometry for SVG export
 * and thumbnails.
 */

import type { BlockSchema } from '../../../types'
import { tintOf } from '../../text/_engine/color'

export interface TestimonialProps extends Record<string, unknown> {
  /** The testimonial quote. Accepts rich text (runs) or a plain string. */
  quote: string | { runs: Array<{ text: string; bold?: boolean; italic?: boolean; color?: string; size?: number }> }
  /** Speaker name. */
  name: string
  /** Speaker role / title. */
  role: string
  /** Avatar: asset id or URL (https: or data:image/*). Falls back to initials when absent/unresolvable. */
  avatar?: string
  /** AC2: `centered` (default) or `photo` — the avatar as a large photo beside a left-aligned quote. */
  variant?: 'centered' | 'photo'
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
  variant: {
    type: { kind: 'enum', values: ['centered', 'photo'] },
    role: 'option',
    label: 'Variant',
    help: '`photo`: the avatar as a large photo beside the quote.',
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

/** The template's metrics and gaps - the poster lays out with the same numbers (LO7). */
export const TESTIMONIAL = {
  pad: 48,
  quoteLH: 1.5,
  quoteGap: 32,
  avatar: 72,
  avatarGap: 16,
  nameLH: 1.4,
  nameGap: 4,
  roleLH: 1.4,
  /** AC2 `photo` variant: photo share of the inner width, corner radius, minimum block height. */
  photoShare: 0.36,
  photoRadius: 16,
  photoMinH: 480,
} as const

/** AC2 `photo` variant with no safe image URL: a soft accent tint, not a solid accent block. */
export function photoPlaceholder(color: Record<string, string> | undefined): string {
  return tintOf(color?.surface ?? '#ffffff', color?.accent ?? '#2563eb', 0.18)
}

/** AC2 `photo` variant geometry (template and poster): photo width and the text column's x / width. */
export function photoGeometry(width: number): { photoW: number; colX: number; colW: number } {
  const T = TESTIMONIAL
  const inner = Math.max(1, width - 2 * T.pad)
  const photoW = Math.round(inner * T.photoShare)
  return { photoW, colX: T.pad + photoW + T.pad, colW: Math.max(1, inner - photoW - T.pad) }
}
