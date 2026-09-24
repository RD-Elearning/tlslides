/**
 * Schema and defaults for tls.l.overlay — layered children (z-stacked).
 */

import type { BlockSchema, BlockSpec } from '../../../types'

export const schema: BlockSchema = {
  children: {
    type: { kind: 'blocks', allow: ['layout', 'text', 'data', 'composite', 'media'] },
    role: 'content',
    label: 'Children',
    help: 'Child blocks layered z-stack style (last child on top).',
  },
}

// No custom props — all children are z-stacked at the same box.
export interface OverlayProps extends Record<string, unknown> {
  children?: BlockSpec[]
}

export const defaults: OverlayProps = {}
