/**
 * Schema and defaults for tls.l.spacer — empty space.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {}

// No props — spacer is pure empty space.
export type SpacerProps = Record<string, unknown>

export const defaults: SpacerProps = {}
