/**
 * tls.m.avatar-group — overlapping row of small portraits with a +N bubble.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsMAvatarGroup: BlockDefinition = {
  type: 'tls.m.avatar-group',
  name: 'Avatar Group',
  family: 'media',
  tier: 'A',
  summary: 'Overlapping row of small portraits (initials when no photo) with a +N overflow bubble.',
  keywords: ['avatars', 'people', 'team', 'contributors', 'attendees', 'faces', 'stack'],
  category: 'people',
  scope: 'element',
  shortDescription: 'Overlapping row of small portraits with a plus-N overflow bubble',
  related: ['tls.m.avatar', 'tls.c.profile-card'],
  describe: {
    when: 'Who is involved at a glance: contributors, attendees, a project team.',
    avoid: 'Names and roles matter (use tls.m.avatar one by one or a grid of tls.c.profile-card).',
    example: {
      id: 'b_avatar_group',
      type: 'tls.m.avatar-group',
      props: {
        people: [{ image: '/demo/portrait-2.svg', name: 'Linh Tran' }, { image: '/demo/portrait-3.svg', name: 'Minh Anh' }, { name: 'Bao Chau' }, { name: 'Ngoc Han' }],
        max: 3,
        caption: '4 contributors',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [640, 120], min: [120, 40] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
