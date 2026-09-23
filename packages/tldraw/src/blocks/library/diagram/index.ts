/**
 * Diagram block library — process and structure diagrams (R14).
 */

import type { BlockDefinition } from '../../types'

import { tlsGSteps } from './tls-g-steps'

/** All built-in diagram block definitions. */
export const diagramBlocks: BlockDefinition[] = [tlsGSteps]

export { tlsGSteps } from './tls-g-steps'