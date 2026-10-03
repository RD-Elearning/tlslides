/**
 * Chrome block library — page chrome elements like page numbers.
 */

import type { BlockDefinition } from '../../types'

import { tlsXPageNumber } from './tls-x-page-number'
import { tlsXFooterText } from './tls-x-footer-text'
import { tlsXLogoMark } from './tls-x-logo-mark'

/** All built-in chrome block definitions. */
export const chromeBlocks: BlockDefinition[] = [tlsXPageNumber, tlsXFooterText, tlsXLogoMark]

export { tlsXPageNumber } from './tls-x-page-number'
export { tlsXFooterText } from './tls-x-footer-text'
export { tlsXLogoMark } from './tls-x-logo-mark'