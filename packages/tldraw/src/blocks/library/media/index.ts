/**
 * Media block library — images and other media blocks.
 */

import type { BlockDefinition } from '../../types'

import { tlsMImage } from './tls-m-image'

/** All built-in media block definitions. */
export const mediaBlocks: BlockDefinition[] = [
  tlsMImage,
]

export { tlsMImage } from './tls-m-image'
