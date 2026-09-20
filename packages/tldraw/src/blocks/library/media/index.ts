/**
 * Media block library — images and other media blocks.
 */

import type { BlockDefinition } from '../../types'

import { tlsMImage } from './tls-m-image'
import { tlsMIcon } from './tls-m-icon'

/** All built-in media block definitions. */
export const mediaBlocks: BlockDefinition[] = [
  tlsMImage,
  tlsMIcon,
]

export { tlsMImage } from './tls-m-image'
export { tlsMIcon } from './tls-m-icon'
