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
import { contrastRatio, relativeLuminance, tryHexToRgb } from '../../../color-math'

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
  /** AC8.5 */
  size?: 'md' | 'lg'
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
    guidance: 'Image URL (https:) or asset id; initials when absent.',
  },
  variant: {
    type: { kind: 'enum', values: ['centered', 'photo'] },
    role: 'option',
    label: 'Variant',
    help: '`photo`: big photo beside.',
  },
  size: {
    type: { kind: 'enum', values: ['md', 'lg'] },
    role: 'option',
    label: 'Size',
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

/** AC8.5 — type tokens and avatar of the centred testimonial, per `size` (template and poster). */
export type TestimonialScale = { quote: 'subheading' | 'heading' | 'title'; name: 'body' | 'lead'; role: 'caption' | 'body'; avatar: number }
const MD_SCALE: TestimonialScale = { quote: 'subheading', name: 'body', role: 'caption', avatar: TESTIMONIAL.avatar }
/** `size: lg` rungs, largest first; the poster takes the first whose column fits the box height. */
export const LG_SCALES: TestimonialScale[] = [
  { quote: 'title', name: 'lead', role: 'body', avatar: 112 },
  { quote: 'heading', name: 'lead', role: 'body', avatar: 96 },
]
export function testimonialScale(props: TestimonialProps, rung = 0): TestimonialScale {
  return props.size === 'lg' && props.variant !== 'photo' ? LG_SCALES[Math.min(rung, LG_SCALES.length - 1)] : MD_SCALE
}

/** AC8.5 — the initials' ink on the accent disc: the theme's surface or text colour, whichever
 *  contrasts more with the accent (template and poster). Was the text colour: navy on navy. */
export function initialsInk(color: Record<string, string> | undefined): string | undefined {
  const lum = (h: string | undefined) => {
    const rgb = h ? tryHexToRgb(h) : undefined
    return rgb ? relativeLuminance(rgb) : undefined
  }
  const a = lum(color?.accent)
  const s = lum(color?.surface)
  const t = lum(color?.text)
  if (a === undefined || s === undefined || t === undefined) return undefined
  return contrastRatio(s, a) >= contrastRatio(t, a) ? color!.surface : color!.text
}

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
