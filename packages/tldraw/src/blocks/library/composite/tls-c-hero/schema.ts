/**
 * Schema and defaults for tls.c.hero — hero / opening slide.
 *
 * An opening slide: one idea in the kicker + title, subtitle gives date/audience,
 * optional CTA button. This is a `kind: 'html'` block — the template renders as
 * real DOM, and the poster supplies the geometry for SVG export and thumbnails.
 */

import type { BlockSchema } from '../../../types'

export interface HeroProps extends Record<string, unknown> {
  kicker?: string
  title: string | { runs: Array<{ text: string; bold?: boolean; italic?: boolean; color?: string; size?: number }> }
  subtitle?: string | { runs: Array<{ text: string; bold?: boolean; italic?: boolean; color?: string; size?: number }> }
  cta?: string
}

export const schema: BlockSchema = {
  kicker: {
    type: { kind: 'text', maxChars: 60 },
    role: 'content',
    label: 'Kicker',
    guidance: 'Short label above the title: section name, category, or status. 1–4 words.',
  },
  title: {
    type: { kind: 'richText', maxChars: 120 },
    role: 'content',
    label: 'Title',
    required: true,
    guidance: 'A concise slide title. Bold one key word for emphasis. Never a full sentence. Max 120 chars.',
  },
  subtitle: {
    type: { kind: 'richText' },
    role: 'content',
    label: 'Subtitle',
    guidance: 'Supporting line: date, audience, or context. 3–12 words.',
  },
  cta: {
    type: { kind: 'text', maxChars: 40 },
    role: 'option',
    label: 'Call to action',
    guidance: 'Optional button text. Short imperative, 2–4 words.',
  },
}

/**
 * Extract plain text from a rich-text value for poster/template purposes.
 */
export function richTextToPlain(value: string | { runs: Array<{ text: string }> }): string {
  if (typeof value === 'string') return value
  return value.runs.map((r) => r.text).join('')
}

export const defaults: HeroProps = {
  kicker: 'QUARTERLY REVIEW',
  title: { runs: [{ text: 'Margin fell on ' }, { text: 'infrastructure', bold: true }] },
  subtitle: { runs: [{ text: 'Q3 FY2026 · prepared for the ' }, { text: 'board', italic: true }] },
  cta: '',
}
