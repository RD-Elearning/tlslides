/**
 * Data & chart block library — charts and metrics (E3/E4, P2).
 */

import type { BlockDefinition } from '../../types'

import { tlsDBar } from './tls-d-bar'
import { tlsDDonut } from './tls-d-donut'
import { tlsDProgressBar } from './tls-d-progress-bar'
import { tlsDProgressRing } from './tls-d-progress-ring'

/** All built-in data block definitions. */
export const dataBlocks: BlockDefinition[] = [tlsDBar, tlsDDonut, tlsDProgressBar, tlsDProgressRing]

export { tlsDBar } from './tls-d-bar'
export { tlsDDonut } from './tls-d-donut'
export { tlsDProgressBar } from './tls-d-progress-bar'
export { tlsDProgressRing } from './tls-d-progress-ring'
