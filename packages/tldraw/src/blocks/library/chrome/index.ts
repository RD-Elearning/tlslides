/**
 * Chrome block library — page chrome elements like page numbers.
 */

import type { BlockDefinition } from '../../types'

import { tlsXPageNumber } from './tls-x-page-number'

/** All built-in chrome block definitions. */
export const chromeBlocks: BlockDefinition[] = [tlsXPageNumber]

export { tlsXPageNumber } from './tls-x-page-number'