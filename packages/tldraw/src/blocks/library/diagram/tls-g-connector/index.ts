/**
 * tls.g.connector — one compiled slide connector (CMP3). AI-hidden: the AI writes
 * `SlideSpec.connectors`; `compileSlide` turns each into one of these overlay shapes after layout.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const CONNECTOR_TYPE = 'tls.g.connector'

export const tlsGConnector: BlockDefinition = {
  type: CONNECTOR_TYPE,
  name: 'Connector',
  family: 'diagram',
  tier: 'A',
  summary: 'A line between two blocks of a slide, compiled from `SlideSpec.connectors` (never authored as a block).',
  keywords: ['connector', 'line', 'arrow', 'link', 'flow'],
  category: 'relationship',
  scope: 'element',
  layer: 'overlay',
  shortDescription: 'Line or arrow joining two blocks by id (from slide connectors)',
  related: ['tls.g.arrow'],
  describe: {
    when: 'Never placed directly: write `connectors: [{ id, from: { block }, to: { block } }]` on the slide.',
    avoid: 'Authoring it in a region (use SlideSpec.connectors) or a free-standing arrow (use tls.g.arrow).',
    example: { id: 'b_connector', type: CONNECTOR_TYPE, props: defaults },
  },
  schema,
  defaults,
  size: { preferred: [420, 160], min: [40, 20] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
