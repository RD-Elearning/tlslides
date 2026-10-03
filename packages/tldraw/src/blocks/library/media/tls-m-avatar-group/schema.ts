/**
 * Schema and defaults for tls.m.avatar-group — overlapping portraits with a +N bubble.
 */

import type { BlockSchema } from '../../../types'

export const GROUP_MAX_PEOPLE = 20

export const schema: BlockSchema = {
  people: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          image: { type: { kind: 'image' }, role: 'content', label: 'Portrait' },
          name: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Name', required: true },
        },
      },
      min: 2,
      max: GROUP_MAX_PEOPLE,
    },
    role: 'content',
    label: 'People',
    required: true,
    guidance: '2-20 items {image?, name}. No image shows initials of the name.',
  },
  max: { type: { kind: 'number', min: 1, max: 12 }, role: 'option', label: 'Shown', help: 'Avatars shown before the +N bubble (default 5).' },
  size: { type: { kind: 'enum', values: ['md', 'sm', 'lg'] }, role: 'option', label: 'Size' },
  overlap: { type: { kind: 'enum', values: ['md', 'none', 'lg'] }, role: 'option', label: 'Overlap' },
  caption: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Caption', guidance: 'e.g. "12 contributors".' },
}

export interface GroupPerson {
  image?: string
  name: string
}

export interface AvatarGroupProps extends Record<string, unknown> {
  people: GroupPerson[]
  max?: number
  size?: 'md' | 'sm' | 'lg'
  overlap?: 'md' | 'none' | 'lg'
  caption?: string
}

export const defaults: AvatarGroupProps = {
  people: [
    { name: 'Linh Tran' },
    { name: 'Minh Anh Nguyen' },
    { name: 'Đặng Ánh' },
    { name: 'Bao Chau' },
    { name: 'Ngoc Han' },
    { name: 'Quang Huy' },
    { name: 'Thu Ha' },
  ],
  max: 5,
  size: 'md',
  overlap: 'md',
  caption: '7 contributors',
}
