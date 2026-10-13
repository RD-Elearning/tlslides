/**
 * Schema and defaults for tls.t.takeaway — highlighted insight text.
 */

import type { BlockSchema } from '../../../types'

export interface TakeawayProps extends Record<string, unknown> {
  /** The insight / takeaway text. */
  text: string
  /** Visual tone: controls the accent bar and surface tint. */
  tone: 'accent' | 'positive' | 'warning' | 'muted'
  /** Optional icon id (resolved via ctx.icon). */
  icon: string
  /** Short label above the text, e.g. "Key Insight". */
  label: string
  /** Text tier: `body` (default) or `lead` — bigger, for a takeaway beside a chart or under a KPI row. */
  size?: 'body' | 'lead' | 'column'
  /** enhance L4: how it stands out — `bar` (a left accent bar on a tint, the default), `tint` (the
   *  tint alone), `line` (a short accent rule above, no panel), `note` (a sticky-note panel). */
  variant?: 'bar' | 'tint' | 'line' | 'note'
}

export const schema: BlockSchema = {
  text: {
    type: { kind: 'richText' },
    role: 'content',
    label: 'Text',
    guidance: 'The insight or takeaway. 1–2 sentences, direct and clear.',
  },
  tone: {
    type: { kind: 'enum', values: ['accent', 'positive', 'warning', 'muted'] },
    role: 'option',
    label: 'Tone',
    help: 'Visual tone that controls the accent bar and surface tint.',
  },
  icon: {
    type: { kind: 'icon' },
    role: 'option',
    label: 'Icon',
    help: 'Optional icon shown beside the label.',
  },
  label: {
    type: { kind: 'text' },
    role: 'content',
    label: 'Label',
    guidance: 'Short label, 1–3 words. e.g. "Key Insight", "Remember".',
  },
  variant: {
    type: { kind: 'enum', values: ['bar', 'tint', 'line', 'note'] },
    role: 'option',
    label: 'Look',
    help: 'bar = left accent bar on a tint; tint = the tint alone; line = a short rule above, no panel; note = a sticky note.',
  },
  size: {
    type: { kind: 'enum', values: ['body', 'lead', 'column'] },
    role: 'option',
    label: 'Text size',
    help: '`lead` beside a chart or under a KPI row; `column`: big, centred in a tall column.',
  },
}

export const defaults: TakeawayProps = {
  text: 'Revenue grew 42% year-over-year, driven primarily by enterprise expansion in APAC.',
  tone: 'accent',
  icon: '',
  label: 'Key Insight',
}
