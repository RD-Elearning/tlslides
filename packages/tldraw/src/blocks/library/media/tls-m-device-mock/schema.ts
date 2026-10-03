/**
 * Schema and defaults for tls.m.device-mock — a screenshot framed in a device.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  image: { type: { kind: 'image' }, role: 'content', label: 'Screenshot', required: true },
  alt: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Alt text', required: true, guidance: 'What the screen shows.' },
  url: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Address', help: 'Address bar text (browser device only).' },
  device: { type: { kind: 'enum', values: ['browser', 'laptop', 'phone', 'tablet'] }, role: 'option', label: 'Device' },
  tone: { type: { kind: 'enum', values: ['light', 'dark'] }, role: 'option', label: 'Frame tone' },
  shadow: { type: { kind: 'boolean' }, role: 'option', label: 'Shadow' },
}

export interface DeviceMockProps extends Record<string, unknown> {
  image: string
  alt: string
  url?: string
  device?: 'browser' | 'laptop' | 'phone' | 'tablet'
  tone?: 'light' | 'dark'
  shadow?: boolean
}

export const defaults: DeviceMockProps = {
  image: '',
  alt: 'Product dashboard screenshot',
  url: 'app.example.com/dashboard',
  device: 'browser',
  tone: 'light',
  shadow: true,
}
