/**
 * Schema and defaults for tls.c.hero — hero / opening slide.
 *
 * An opening slide: one idea in the kicker + title, subtitle gives date/audience,
 * optional CTA button. This is a `kind: 'html'` block — the template renders as
 * real DOM, and the poster supplies the geometry for SVG export and thumbnails.
 *
 * The `variant` field selects a visual style:
 * - `'classic'` (default): standard hero with staggered part reveal
 * - `'split'`: the title is split into two halves that reveal from opposite sides
 * - `'gradient-sweep'`: a background gradient sweeps in behind the title on reveal
 */

import type { BlockSchema } from '../../../types'

export type HeroVariant = 'classic' | 'split' | 'gradient-sweep'

export interface HeroProps extends Record<string, unknown> {
  kicker?: string
  showKicker?: boolean
  title: string | { runs: Array<{ text: string; bold?: boolean; italic?: boolean; color?: string; size?: number }> }
  showTitle?: boolean
  subtitle?: string | { runs: Array<{ text: string; bold?: boolean; italic?: boolean; color?: string; size?: number }> }
  showSubtitle?: boolean
  cta?: string
  showCta?: boolean
  variant?: HeroVariant
}

export const schema: BlockSchema = {
  kicker: {
    type: { kind: 'text', maxChars: 60 },
    role: 'content',
    label: 'Kicker',
    guidance: 'Short label above the title: section name, category, or status. 1–4 words.',
  },
  showKicker: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Show Kicker',
    help: 'Toggle the kicker label on/off.',
    toggles: 'kicker',
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
  showSubtitle: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Show Subtitle',
    help: 'Toggle the subtitle on/off.',
    toggles: 'subtitle',
  },
  cta: {
    type: { kind: 'text', maxChars: 40 },
    role: 'option',
    label: 'Call to action',
    guidance: 'Optional button text. Short imperative, 2–4 words.',
  },
  showCta: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Show CTA',
    help: 'Toggle the call-to-action button on/off.',
    toggles: 'cta',
  },
  variant: {
    type: { kind: 'enum', values: ['classic', 'split', 'gradient-sweep'] },
    role: 'option',
    label: 'Variant',
    guidance:
      'Visual style: "classic" (default) standard hero with staggered part reveal; ' +
      '"split" split-title reveal where halves slide in from opposite sides; ' +
      '"gradient-sweep" a decorative gradient sweeps in behind the title on reveal.',
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
