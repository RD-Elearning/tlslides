/**
 * tls.c.agenda — agenda / table-of-contents.
 *
 * A composite block: vertical list of 3–8 numbered items, each with a
 * title and optional note. One item can be highlighted as "current"
 * with the accent colour and slightly larger text.
 *
 * Tier A: pure layout(), no DOM, no React. Parity-tested.
 * Single column layout (see rationale in layout notes).
 */

import type { BlockDefinition, CapacityReport, LayoutContext, Size } from '../../../types'
import { schema, defaults } from './schema'
import { layout, estimateItemCount } from './layout'
import { motion } from './motion'

/** Summary for the AI: what this block is and when to use it. */
const AGENDA_SUMMARY =
  'Agenda or contents slide: numbered items with titles and optional notes. The current topic can be highlighted.'

export const tlsCAgenda: BlockDefinition = {
  type: 'tls.c.agenda',
  name: 'Agenda',
  family: 'composite',
  tier: 'A',
  summary: AGENDA_SUMMARY,
  keywords: ['agenda', 'toc', 'table of contents', 'outline', 'topics', 'schedule', 'items'],
  category: 'agenda',
  scope: 'slide',
  shortDescription: 'Numbered agenda items with notes; current item highlighted',
  related: ['tls.c.divider', 'tls.c.objectives'],
  describe: {
    when: 'Use for a table-of-contents or agenda slide listing 3–8 topics. Set `current` to highlight the active topic.',
    avoid: 'Do not use for more than 8 items (split into two sections), for a dated sequence (use tls.c.steps) or nested in another block: it fills the whole slide.',
    example: {
      id: 'b_agenda',
      type: 'tls.c.agenda',
      props: {
        items: [
          { title: 'Opening', note: 'Welcome and agenda overview' },
          { title: 'Q3 Results', note: 'Revenue and growth metrics' },
          { title: 'Strategy', note: 'Next quarter priorities' },
          { title: 'Q&A', note: 'Questions and discussion' },
        ],
        current: 1,
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 660], min: [620, 440] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity(props: Record<string, unknown>, box: Size, ctx: LayoutContext): CapacityReport {
    const p = props as import('./schema').AgendaProps
    const itemCount = (p.items ?? []).length
    const maxItems = estimateItemCount(ctx, box)
    const fits = itemCount <= maxItems
    return {
      fits,
      budget: {
        items: { max: maxItems, used: itemCount, unit: 'items' },
      },
      remedy: fits ? [] : [{ kind: 'paginate' }],
    }
  },
}
