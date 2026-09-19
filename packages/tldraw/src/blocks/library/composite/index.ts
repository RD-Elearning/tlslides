/**
 * Composite block library — html-kind and multi-part composite blocks.
 */

import type { BlockDefinition } from '../../types'

import { tlsCHero } from './tls-c-hero'
import { tlsCKpiTile } from './tls-c-kpi-tile'
import { tlsCKpiRow } from './tls-c-kpi-row'
import { tlsCImageText } from './tls-c-image-text'
import { tlsCComparison } from './tls-c-comparison'
import { tlsCAgenda } from './tls-c-agenda'
import { tlsCSteps } from './tls-c-steps'
import { tlsCFeatureGrid } from './tls-c-feature-grid'
import { tlsCTestimonial } from './tls-c-testimonial'
import { tlsCBigStat } from './tls-c-big-stat'

/** All built-in composite block definitions. */
export const compositeBlocks: BlockDefinition[] = [
  tlsCHero,
  tlsCKpiTile,
  tlsCKpiRow,
  tlsCImageText,
  tlsCComparison,
  tlsCAgenda,
  tlsCSteps,
  tlsCFeatureGrid,
  tlsCTestimonial,
  tlsCBigStat,
]

export { tlsCHero } from './tls-c-hero'
export { tlsCKpiTile } from './tls-c-kpi-tile'
export { tlsCKpiRow } from './tls-c-kpi-row'
export { tlsCImageText } from './tls-c-image-text'
export { tlsCComparison } from './tls-c-comparison'
export { tlsCAgenda } from './tls-c-agenda'
export { tlsCSteps } from './tls-c-steps'
export { tlsCFeatureGrid } from './tls-c-feature-grid'
export { tlsCTestimonial } from './tls-c-testimonial'
export { tlsCBigStat } from './tls-c-big-stat'
