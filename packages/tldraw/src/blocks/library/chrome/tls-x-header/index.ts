/**
 * tls.x.header — a thin running header (course code, chapter, client name).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsXHeader: BlockDefinition = {
  type: 'tls.x.header',
  name: 'Header',
  family: 'chrome',
  tier: 'A',
  summary: 'A thin running header: a label at the left, meta at the right, optional hairline below.',
  keywords: ['header', 'running header', 'section label', 'course code', 'chapter', 'chrome'],
  category: 'chrome',
  scope: 'element',
  shortDescription: 'Thin header strip with a section label on the left and meta on the right',
  related: ['tls.x.footer-text', 'tls.x.logo-mark', 'tls.t.title'],
  describe: {
    when: 'A consistent running header on content slides: course code, chapter, client name.',
    avoid: 'The slide title (use tls.t.title).',
    example: {
      id: 'b_header',
      type: 'tls.x.header',
      props: { label: 'Chapter 2: Methods', meta: 'BIO 201', showRule: true, tone: 'accent' },
    },
  },
  schema,
  defaults,
  size: { preferred: [1600, 48], min: [400, 46] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
