/**
 * Text block library — titles, subtitles, kickers, body copy, bullet lists, captions,
 * hero-number, quote, takeaway.
 */

import type { BlockDefinition } from '../../types'

import { tlsTTitle } from './tls-t-title'
import { tlsTSubtitle } from './tls-t-subtitle'
import { tlsTKicker } from './tls-t-kicker'
import { tlsTBody } from './tls-t-body'
import { tlsTBullets } from './tls-t-bullets'
import { tlsTCaption } from './tls-t-caption'
import { tlsTHeroNumber } from './tls-t-hero-number'
import { tlsTQuote } from './tls-t-quote'
import { tlsTTakeaway } from './tls-t-takeaway'

/** All built-in text block definitions. */
export const textBlocks: BlockDefinition[] = [
  tlsTTitle,
  tlsTSubtitle,
  tlsTKicker,
  tlsTBody,
  tlsTBullets,
  tlsTCaption,
  tlsTHeroNumber,
  tlsTQuote,
  tlsTTakeaway,
]

export { tlsTTitle } from './tls-t-title'
export { tlsTSubtitle } from './tls-t-subtitle'
export { tlsTKicker } from './tls-t-kicker'
export { tlsTBody } from './tls-t-body'
export { tlsTBullets } from './tls-t-bullets'
export { tlsTCaption } from './tls-t-caption'
export { tlsTHeroNumber } from './tls-t-hero-number'
export { tlsTQuote } from './tls-t-quote'
export { tlsTTakeaway } from './tls-t-takeaway'
