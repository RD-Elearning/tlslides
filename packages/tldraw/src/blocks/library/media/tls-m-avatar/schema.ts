/**
 * Schema and defaults for tls.m.avatar — a portrait with name and role.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  image: {
    type: { kind: 'image' },
    role: 'content',
    label: 'Portrait',
    help: 'Asset id or URL. Without one the avatar shows the name initials.',
  },
  name: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Name', required: true },
  role: { type: { kind: 'text', maxChars: 50 }, role: 'content', label: 'Role', guidance: 'Job title or relation, 1-6 words.' },
  shape: { type: { kind: 'enum', values: ['circle', 'rounded', 'square'] }, role: 'option', label: 'Shape' },
  size: { type: { kind: 'enum', values: ['md', 'sm', 'lg', 'xl'] }, role: 'option', label: 'Size' },
  layout: {
    type: { kind: 'enum', values: ['stacked', 'inline'] },
    role: 'option',
    label: 'Layout',
    help: 'stacked = text under the portrait; inline = text beside it.',
  },
  align: { type: { kind: 'enum', values: ['center', 'start'] }, role: 'option', label: 'Alignment', help: 'Stacked layout only.' },
  ring: { type: { kind: 'boolean' }, role: 'option', label: 'Accent ring' },
  showName: { type: { kind: 'boolean' }, role: 'option', label: 'Show name', toggles: 'name' },
  showRole: { type: { kind: 'boolean' }, role: 'option', label: 'Show role', toggles: 'role' },
}

export interface AvatarProps extends Record<string, unknown> {
  image?: string
  name: string
  role?: string
  shape?: 'circle' | 'rounded' | 'square'
  size?: 'md' | 'sm' | 'lg' | 'xl'
  layout?: 'stacked' | 'inline'
  align?: 'center' | 'start'
  ring?: boolean
  showName?: boolean
  showRole?: boolean
}

export const defaults: AvatarProps = {
  image: '',
  name: 'Nguyen Minh Anh',
  role: 'Lecturer, Computer Science',
  shape: 'circle',
  size: 'md',
  layout: 'stacked',
  align: 'center',
  ring: false,
}
