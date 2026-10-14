/**
 * tls.x.footer-text — a quiet footer line (deck title, event, date, confidentiality note).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsXFooterText: BlockDefinition = {
  type: 'tls.x.footer-text',
  name: 'Footer Text',
  family: 'chrome',
  tier: 'A',
  summary: 'One muted footer line of up to three short items with separators and an optional hairline.',
  keywords: ['footer', 'deck title', 'confidential', 'date', 'running footer', 'chrome'],
  category: 'chrome',
  scope: 'element',
  shortDescription: 'Footer line with deck title, author or date, separated by dots',
  related: ['tls.t.footnote', 'tls.x.page-number', 'tls.l.footer', 'tls.x.header'],
  describe: {
    when: 'Repeating a deck title, event name, date or confidentiality note at the bottom of slides.',
    avoid: 'Sources and notes about the content (use tls.t.footnote).',
    example: {
      id: 'b_footer_text',
      type: 'tls.x.footer-text',
      props: { items: ['Annual review 2026', 'Confidential'], align: 'start', separator: 'dot', showRule: true },
    },
  },
  schema,
  defaults,
  // LO5: min 380 → 400 — with browser-true Inter widths "Annual review 2026" needs a 175-unit share.
  size: { preferred: [1200, 40], min: [400, 40] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
