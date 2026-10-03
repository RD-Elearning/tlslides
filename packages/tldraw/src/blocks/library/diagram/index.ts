/**
 * Diagram block library — process and structure diagrams (R14).
 */

import type { BlockDefinition } from '../../types'

import { tlsGSteps } from './tls-g-steps'
import { tlsGChevrons } from './tls-g-chevrons'
import { tlsGCycle } from './tls-g-cycle'
import { tlsGTimeline } from './tls-g-timeline'
import { tlsGRoadmap } from './tls-g-roadmap'
import { tlsGFunnel } from './tls-g-funnel'
import { tlsGMilestones } from './tls-g-milestones'
import { tlsGFlow } from './tls-g-flow'

/** All built-in diagram block definitions. */
export const diagramBlocks: BlockDefinition[] = [tlsGSteps, tlsGChevrons, tlsGCycle, tlsGTimeline, tlsGRoadmap, tlsGFunnel, tlsGMilestones, tlsGFlow]

export { tlsGSteps } from './tls-g-steps'
export { tlsGChevrons } from './tls-g-chevrons'
export { tlsGCycle } from './tls-g-cycle'
export { tlsGTimeline } from './tls-g-timeline'
export { tlsGRoadmap } from './tls-g-roadmap'
export { tlsGFunnel } from './tls-g-funnel'
export { tlsGMilestones } from './tls-g-milestones'
export { tlsGFlow } from './tls-g-flow'