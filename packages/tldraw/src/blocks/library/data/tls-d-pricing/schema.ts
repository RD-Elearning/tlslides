/**
 * Schema and defaults for tls.d.pricing — plan cards with price and feature list.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../_chart/schema-kit'

export const PRICING_MAX_PLANS = 4
export const PRICING_MAX_FEATURES = 8

export const schema: BlockSchema = {
  plans: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          name: { type: { kind: 'text', maxChars: 24 }, required: true, role: 'content', label: 'Plan name' },
          price: { type: { kind: 'text', maxChars: 14 }, required: true, role: 'content', label: 'Price', help: 'With symbol: "$29", "Free", "Custom"' },
          period: { type: { kind: 'text', maxChars: 16 }, role: 'content', label: 'Period', help: '"/ month"' },
          description: { type: { kind: 'text', maxChars: 90 }, role: 'content', label: 'Description' },
          features: { type: { kind: 'list', of: { kind: 'text', maxChars: 50 }, max: PRICING_MAX_FEATURES }, required: true, role: 'content', label: 'Features' },
          cta: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Button text' },
          featured: { type: { kind: 'boolean' }, role: 'content', label: 'Featured' },
        },
      },
      min: 2,
      max: PRICING_MAX_PLANS,
    },
    role: 'content',
    label: 'Plans',
    required: true,
    guidance: 'Mark one plan featured. Keep feature lists to a similar length.',
  },
  featuredStyle: enumSlot(['raised', 'outline', 'filled'], 'Featured style'),
  checkIcon: { type: { kind: 'icon' }, role: 'option', label: 'Feature icon' },
  align: enumSlot(['top', 'stretch'], 'Card heights', 'stretch = equal height'),
  showCta: { type: { kind: 'boolean' }, role: 'option', label: 'Show button', toggles: 'cta' },
  showDescription: { type: { kind: 'boolean' }, role: 'option', label: 'Show description', toggles: 'description' },
}

export interface PricingPlan {
  name: string
  price: string
  period?: string
  description?: string
  features: string[]
  cta?: string
  featured?: boolean
}

export interface PricingProps extends Record<string, unknown> {
  plans: PricingPlan[]
  featuredStyle?: 'raised' | 'outline' | 'filled'
  checkIcon?: string
  align?: 'top' | 'stretch'
  showCta?: boolean
  showDescription?: boolean
}

export const defaults: PricingProps = {
  plans: [
    { name: 'Starter', price: 'Free', description: 'For trying things out', features: ['1 project', 'Community support', 'Basic analytics'], cta: 'Start free' },
    { name: 'Team', price: '$29', period: '/ month', description: 'For growing teams', features: ['Unlimited projects', 'Priority support', 'Advanced analytics', 'Shared workspaces'], cta: 'Start trial', featured: true },
    { name: 'Business', price: '$99', period: '/ month', description: 'For whole organisations', features: ['SSO and audit log', 'Dedicated manager', 'Custom integrations'], cta: 'Contact sales' },
  ],
  featuredStyle: 'raised',
  checkIcon: 'check',
  align: 'stretch',
  showCta: true,
  showDescription: true,
}
