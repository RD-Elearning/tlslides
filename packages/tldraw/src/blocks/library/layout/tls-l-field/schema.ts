/**
 * Schema and defaults for tls.l.field — full-bleed background.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {}

// No custom props — field always fills the box with the surface colour.
export type FieldProps = Record<string, unknown>

export const defaults: FieldProps = {}
