/**
 * tls.m.avatar — round portrait with name and role beside or beneath it.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsMAvatar: BlockDefinition = {
  type: 'tls.m.avatar',
  name: 'Avatar',
  family: 'media',
  tier: 'A',
  summary: 'Portrait in a circle, rounded or square frame with name and role; initials when there is no photo.',
  keywords: ['avatar', 'portrait', 'person', 'speaker', 'author', 'profile', 'headshot'],
  category: 'people',
  scope: 'element',
  shortDescription: 'Round portrait with name and role beside or beneath it',
  related: ['tls.m.image', 'tls.t.quote'],
  describe: {
    when: 'Naming one speaker, author or contact person with a portrait.',
    avoid: 'Several people (use tls.m.avatar-group); a full bio card (use tls.c.profile-card); a landscape photo (use tls.m.image).',
    example: {
      id: 'b_avatar',
      type: 'tls.m.avatar',
      props: { image: 'asset-speaker', name: 'Dr. Tran Thi Lan', role: 'Head of Data Science', size: 'lg', ring: true },
    },
  },
  schema,
  defaults,
  size: { preferred: [420, 240], min: [100, 80] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
