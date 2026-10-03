/**
 * Chrome block library — page chrome elements like page numbers.
 */

import type { BlockDefinition } from '../../types'

import { tlsXPageNumber } from './tls-x-page-number'
import { tlsXFooterText } from './tls-x-footer-text'
import { tlsXLogoMark } from './tls-x-logo-mark'
import { tlsXRule } from './tls-x-rule'
import { tlsXHeader } from './tls-x-header'
import { tlsXWatermark } from './tls-x-watermark'

/** All built-in chrome block definitions. */
export const chromeBlocks: BlockDefinition[] = [tlsXPageNumber, tlsXFooterText, tlsXLogoMark, tlsXRule, tlsXHeader, tlsXWatermark]

export { tlsXPageNumber } from './tls-x-page-number'
export { tlsXFooterText } from './tls-x-footer-text'
export { tlsXLogoMark } from './tls-x-logo-mark'
export { tlsXRule } from './tls-x-rule'
export { tlsXHeader } from './tls-x-header'
export { tlsXWatermark } from './tls-x-watermark'