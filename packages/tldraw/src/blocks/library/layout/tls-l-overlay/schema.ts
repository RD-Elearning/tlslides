/**
 * Schema and defaults for tls.l.overlay — layered children (z-stacked).
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {}

export interface OverlayProps {
  // No custom props — all children are z-stacked at the same box.
}

export const defaults: OverlayProps = {}
