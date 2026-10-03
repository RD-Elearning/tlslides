/**
 * Diagram block library — process and structure diagrams (R14).
 */

import type { BlockDefinition } from '../../types'

import { tlsGSteps } from './tls-g-steps'
import { tlsGChevrons } from './tls-g-chevrons'

/** All built-in diagram block definitions. */
export const diagramBlocks: BlockDefinition[] = [tlsGSteps, tlsGChevrons]

export { tlsGSteps } from './tls-g-steps'
export { tlsGChevrons } from './tls-g-chevrons'