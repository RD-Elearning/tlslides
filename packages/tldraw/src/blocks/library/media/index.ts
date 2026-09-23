/**
 * Media block library — images and other media blocks.
 */

import type { BlockDefinition } from '../../types'

import { tlsMImage } from './tls-m-image'
import { tlsMIcon } from './tls-m-icon'
import { tlsMIconLabel } from './tls-m-icon-label'

/** All built-in media block definitions. */
export const mediaBlocks: BlockDefinition[] = [
  tlsMImage,
  tlsMIcon,
  tlsMIconLabel,
]

export { tlsMImage } from './tls-m-image'
export { tlsMIcon } from './tls-m-icon'
export { tlsMIconLabel } from './tls-m-icon-label'
