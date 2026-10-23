/**
 * tls.m.icon-cluster — a few topic icons scattered as a decoration (vivid V3).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsMIconCluster: BlockDefinition = {
  type: 'tls.m.icon-cluster',
  name: 'Icon Cluster',
  family: 'media',
  tier: 'A',
  summary: 'Decoration: 1-7 topic icons scattered in a seeded constellation, on soft discs, that bob gently in the viewer.',
  keywords: ['icons', 'cluster', 'decoration', 'constellation', 'topic', 'illustration', 'doodle', 'sticker'],
  category: 'decoration',
  scope: 'element',
  shortDescription: 'Decorative scatter of topic icons',
  related: ['tls.m.decoration', 'tls.m.icon'],
  describe: {
    when: 'Decoration that says what the deck is about: beside a cover title, on a section page, on the free side of a statement or a number. Icons of the topic (atom, flask, microscope for chemistry).',
    avoid: 'Icons that belong to items (use tls.m.icon-list or a card\'s icon); behind text; more than one decoration on a slide.',
    example: { id: 'b_cluster', type: 'tls.m.icon-cluster', props: { icons: ['book-2', 'school', 'pencil', 'bulb'], tone: 'mixed' } },
  },
  schema,
  defaults,
  size: { preferred: [420, 360], min: [120, 120] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
