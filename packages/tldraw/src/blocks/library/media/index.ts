/**
 * Media block library — images and other media blocks.
 */

import type { BlockDefinition } from '../../types'

import { tlsMImage } from './tls-m-image'
import { tlsMIcon } from './tls-m-icon'
import { tlsMIconLabel } from './tls-m-icon-label'
import { tlsMIconList } from './tls-m-icon-list'
import { tlsMImageGrid } from './tls-m-image-grid'
import { tlsMAvatar } from './tls-m-avatar'
import { tlsMLogo } from './tls-m-logo'
import { tlsMLogoWall } from './tls-m-logo-wall'

/** All built-in media block definitions. */
export const mediaBlocks: BlockDefinition[] = [
  tlsMImage,
  tlsMIcon,
  tlsMIconLabel,
  tlsMIconList,
  tlsMImageGrid,
  tlsMAvatar,
  tlsMLogo,
  tlsMLogoWall,
]

export { tlsMImage } from './tls-m-image'
export { tlsMIcon } from './tls-m-icon'
export { tlsMIconLabel } from './tls-m-icon-label'
export { tlsMIconList } from './tls-m-icon-list'
export { tlsMImageGrid } from './tls-m-image-grid'
export { tlsMAvatar } from './tls-m-avatar'
export { tlsMLogo } from './tls-m-logo'
export { tlsMLogoWall } from './tls-m-logo-wall'
