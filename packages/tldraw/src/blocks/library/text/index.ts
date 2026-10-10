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
import { tlsTNumbered } from './tls-t-numbered'
import { tlsTChecklist } from './tls-t-checklist'
import { tlsTStatement } from './tls-t-statement'
import { tlsTCallout } from './tls-t-callout'
import { tlsTFootnote } from './tls-t-footnote'
import { tlsTDefinition } from './tls-t-definition'
import { tlsTKvList } from './tls-t-kv-list'
import { tlsTTags } from './tls-t-tags'
import { tlsTQa } from './tls-t-qa'
import { tlsTBadge } from './tls-t-badge'
import { tlsTMarker } from './tls-t-marker'

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
  tlsTNumbered,
  tlsTChecklist,
  tlsTStatement,
  tlsTCallout,
  tlsTFootnote,
  tlsTDefinition,
  tlsTKvList,
  tlsTTags,
  tlsTQa,
  tlsTBadge,
  tlsTMarker,
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
export { tlsTNumbered } from './tls-t-numbered'
export { tlsTChecklist } from './tls-t-checklist'
export { tlsTStatement } from './tls-t-statement'
export { tlsTCallout } from './tls-t-callout'
export { tlsTFootnote } from './tls-t-footnote'
export { tlsTDefinition } from './tls-t-definition'
export { tlsTKvList } from './tls-t-kv-list'
export { tlsTTags } from './tls-t-tags'
export { tlsTQa } from './tls-t-qa'
export { tlsTBadge } from './tls-t-badge'
export { tlsTMarker } from './tls-t-marker'
