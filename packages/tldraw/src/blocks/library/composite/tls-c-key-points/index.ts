/**
 * tls.c.key-points — spro sprint 2026-11b S08-1: 2–5 key points, each a bold lead and its explanation;
 * replaces bullets when the reader needs the *why*. Cells: `../_rich.ts`.
 */
import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick } from '../_kit'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'

export interface KeyPointsProps extends Record<string, unknown> {
  points: Array<{ lead: string; text: string; icon?: string }>
  numbering?: 'number' | 'icon' | 'none'
  variant?: 'rail' | 'columns' | 'cards'
}
const VARIANTS = ['rail', 'columns', 'cards'] as const
const NUMBERING = ['number', 'icon', 'none'] as const

export const schema: BlockSchema = {
  points: {
    type: { kind: 'list', of: objectOf({ lead: { kind: 'text', maxChars: 70 }, text: { kind: 'text', maxChars: 260 }, icon: { kind: 'icon' } }), min: 2, max: 5 },
    role: 'content',
    label: 'Points',
    required: true,
    guidance: 'Each point: `lead` = the point in one line (≤ 70 chars), `text` = why it holds or what it means (1–3 sentences, ≤ 260).',
  },
  numbering: enumSlot([...NUMBERING], 'Numbering', 'number (default), icon (each point names an `icon`) or none.'),
  variant: enumSlot([...VARIANTS], 'Variant', 'rail = numbered rows; columns = two columns; cards = one card per point.'),
}

export const defaults: KeyPointsProps = {
  points: [
    { lead: 'Practice beats rereading', text: 'Recalling an idea from memory strengthens it more than reading it again, even when recall feels harder.' },
    { lead: 'Space the sessions', text: 'Short sessions spread over days keep more than one long session the night before.' },
    { lead: 'Mix the problem types', text: 'Switching between kinds of problems teaches you to choose the method, not only to apply it.' },
  ],
  numbering: 'number',
  variant: 'rail',
}

export const tlsCKeyPoints = defineRichBlock<KeyPointsProps>({
  type: 'tls.c.key-points',
  name: 'Key points',
  summary: '2–5 key points, each a bold lead line and its explanation.',
  keywords: ['key points', 'main ideas', 'explanation', 'why', 'reasons', 'ý chính', 'giải thích'],
  category: 'list',
  shortDescription: 'Key points, each with a bold lead and its explanation',
  related: ['tls.t.bullets', 'tls.c.cards', 'tls.c.feature-grid', 'tls.c.recap'],
  schema,
  defaults,
  size: { preferred: [1600, 760], min: [640, 420] },
  describe: {
    when: 'A reading or detailed slide whose 2–5 points each need their explanation: the point in bold, why it holds under it.',
    avoid: 'Short phrases the audience only scans: tls.t.bullets. Icon-led feature tiles: tls.c.feature-grid.',
    example: { id: 'b_key_points', type: 'tls.c.key-points', props: { points: defaults.points.slice(0, 2) } },
  },
  shape: (p) => {
    const v = pick(p.variant, VARIANTS, 'rail')
    const numbering = pick(p.numbering, NUMBERING, 'number')
    const items = rows<{ lead?: unknown; text?: unknown; icon?: unknown }>(p.points, 5).map((x) => ({ lead: txt(x.lead, 70), text: txt(x.text, 260), marker: typeof x.icon === 'string' ? x.icon : undefined }))
    const marker = numbering === 'icon' ? (items.every((i) => i.marker) ? 'icon' : 'number') : numbering
    if (v === 'columns') return { items, opts: { columns: 2, marker, markerSide: 'top' } }
    if (v === 'cards') return { items, opts: { columns: items.length <= 3 ? (items.length as 2 | 3) : 2, marker, markerSide: 'top', card: 'card' } }
    return { items, opts: { columns: 1, marker, markerSide: 'left' } }
  },
})
