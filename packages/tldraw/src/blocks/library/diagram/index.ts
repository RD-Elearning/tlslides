/**
 * Diagram block library — process and structure diagrams (R14).
 */

import type { BlockDefinition } from '../../types'

import { tlsGSteps } from './tls-g-steps'
import { tlsGChevrons } from './tls-g-chevrons'
import { tlsGCycle } from './tls-g-cycle'
import { tlsGTimeline } from './tls-g-timeline'

/** All built-in diagram block definitions. */
export const diagramBlocks: BlockDefinition[] = [tlsGSteps, tlsGChevrons, tlsGCycle, tlsGTimeline]

export { tlsGSteps } from './tls-g-steps'
export { tlsGChevrons } from './tls-g-chevrons'
export { tlsGCycle } from './tls-g-cycle'
export { tlsGTimeline } from './tls-g-timeline'