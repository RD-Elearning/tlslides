/**
 * Composite block library — html-kind and multi-part composite blocks.
 */

import type { BlockDefinition } from '../../types'

import { tlsCHero } from './tls-c-hero'

/** All built-in composite block definitions. */
export const compositeBlocks: BlockDefinition[] = [
  tlsCHero,
]

export { tlsCHero } from './tls-c-hero'
