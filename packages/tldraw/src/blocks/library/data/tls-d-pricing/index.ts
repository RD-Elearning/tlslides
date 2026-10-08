/**
 * tls.d.pricing — plan cards with price, period, feature list and one featured plan.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDPricing: BlockDefinition = {
  type: 'tls.d.pricing',
  name: 'Pricing Plans',
  family: 'data',
  tier: 'A',
  summary: 'Side-by-side plan cards: name, price, features and a button, one plan featured.',
  keywords: ['pricing', 'plans', 'tiers', 'packages', 'subscription', 'offer'],
  category: 'comparison',
  scope: 'group',
  shortDescription: 'Plan cards with price, period, feature list and one featured plan',
  related: ['tls.d.compare-table', 'tls.c.comparison'],
  describe: {
    when: 'Pricing tiers, packages, offer levels.',
    avoid: 'Many features across plans (tls.d.compare-table).',
    example: {
      id: 'b_pricing',
      type: 'tls.d.pricing',
      props: {
        plans: [
          { name: 'Starter', price: 'Free', features: ['1 project', 'Community support'], cta: 'Start' },
          { name: 'Team', price: '$29', period: '/ month', description: 'For teams', features: ['Unlimited projects', 'Priority support'], cta: 'Try', featured: true },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1280, 700], min: [720, 520] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
