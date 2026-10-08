/**
 * tls.m.device-mock — a screenshot framed in a browser, laptop, phone or tablet.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, lint } from './layout'
import { motion } from './motion'

export const tlsMDeviceMock: BlockDefinition = {
  type: 'tls.m.device-mock',
  name: 'Device Mock',
  family: 'media',
  tier: 'A',
  summary: 'Screenshot framed in a browser window, laptop, phone or tablet; frame drawn from rects.',
  keywords: ['device', 'mockup', 'screenshot', 'browser', 'phone', 'laptop', 'tablet', 'app'],
  category: 'media',
  scope: 'element',
  shortDescription: 'Screenshot framed in a phone, laptop, tablet or browser window',
  related: ['tls.m.image', 'tls.c.image-text'],
  describe: {
    when: 'Showing an app, website or product UI.',
    avoid: 'Photos (use tls.m.image); a screenshot plus text (use tls.c.image-text).',
    example: {
      id: 'b_device_mock',
      type: 'tls.m.device-mock',
      props: { image: '/demo/photo-4.svg', alt: 'Analytics dashboard', url: 'app.example.com', device: 'browser' },
    },
  },
  schema,
  defaults,
  size: { preferred: [960, 640], min: [160, 120] },
  layout: layout as BlockDefinition['layout'],
  motion,
  lint: lint as BlockDefinition['lint'],
}
