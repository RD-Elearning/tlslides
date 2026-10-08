/**
 * Schema and defaults for tls.m.logo-wall — an even grid of logos at equal visual weight.
 */

import type { BlockSchema } from '../../../types'

export const WALL_MAX_LOGOS = 16

export const schema: BlockSchema = {
  heading: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Heading', guidance: 'e.g. "Trusted by".' },
  logos: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          image: { type: { kind: 'image' }, role: 'content', label: 'Logo', required: true },
          alt: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Alt text', required: true },
          ratio: { type: { kind: 'number', min: 0.2, max: 8 }, role: 'option', label: 'Aspect ratio' },
        },
      },
      min: 3,
      max: WALL_MAX_LOGOS,
    },
    role: 'content',
    label: 'Logos',
    required: true,
    guidance: '3-16 items {image, alt (brand name), ratio? (width / height, for equal weight)}.',
  },
  cols: { type: { kind: 'enum', values: ['auto', '3', '4', '5', '6'] }, role: 'option', label: 'Columns' },
  uniform: {
    type: { kind: 'enum', values: ['height', 'area'] },
    role: 'option',
    label: 'Equalise',
    help: 'height = same height; area = same visual area (needs ratio).',
  },
  plates: { type: { kind: 'boolean' }, role: 'option', label: 'Plates' },
  dividers: { type: { kind: 'boolean' }, role: 'option', label: 'Dividers' },
  showHeading: { type: { kind: 'boolean' }, role: 'option', label: 'Show heading', toggles: 'heading' },
}

export interface WallLogo {
  image: string
  alt: string
  ratio?: number
}

export interface LogoWallProps extends Record<string, unknown> {
  heading?: string
  logos: WallLogo[]
  cols?: 'auto' | '3' | '4' | '5' | '6'
  uniform?: 'height' | 'area'
  plates?: boolean
  dividers?: boolean
  showHeading?: boolean
}

export const defaults: LogoWallProps = {
  heading: 'Trusted by',
  logos: [
    { image: '', alt: 'Northwind', ratio: 4 },
    { image: '', alt: 'Globex', ratio: 1 },
    { image: '', alt: 'Initech', ratio: 3 },
    { image: '', alt: 'Umbrella', ratio: 2 },
    { image: '', alt: 'Hooli', ratio: 1.5 },
    { image: '', alt: 'Stark', ratio: 3 },
  ],
  cols: 'auto',
  uniform: 'height',
  plates: false,
  dividers: false,
}
