/**
 * Data & chart block library — bar chart (E3/E4).
 *
 * Additional data blocks will be added as E4 progresses.
 */

import type { BlockDefinition } from '../../types'

import { tlsDBar } from './tls-d-bar'
import { tlsDDonut } from './tls-d-donut'

/** All built-in data block definitions. */
export const dataBlocks: BlockDefinition[] = [tlsDBar, tlsDDonut]

export { tlsDBar } from './tls-d-bar'
export { tlsDDonut } from './tls-d-donut'
