/**
 * Data & chart block library — charts and metrics (E3/E4, P2).
 */

import type { BlockDefinition } from '../../types'

import { tlsDBar } from './tls-d-bar'
import { tlsDDonut } from './tls-d-donut'
import { tlsDProgressBar } from './tls-d-progress-bar'
import { tlsDProgressRing } from './tls-d-progress-ring'
import { tlsDStatCompare } from './tls-d-stat-compare'
import { tlsDLine } from './tls-d-line'
import { tlsDArea } from './tls-d-area'
import { tlsDGroupedBar } from './tls-d-grouped-bar'
import { tlsDStackedBar } from './tls-d-stacked-bar'
import { tlsDPie } from './tls-d-pie'

/** All built-in data block definitions. */
export const dataBlocks: BlockDefinition[] = [tlsDBar, tlsDDonut, tlsDProgressBar, tlsDProgressRing, tlsDStatCompare, tlsDLine, tlsDArea, tlsDGroupedBar, tlsDStackedBar, tlsDPie]

export { tlsDBar } from './tls-d-bar'
export { tlsDDonut } from './tls-d-donut'
export { tlsDProgressBar } from './tls-d-progress-bar'
export { tlsDProgressRing } from './tls-d-progress-ring'
export { tlsDStatCompare } from './tls-d-stat-compare'
export { tlsDLine } from './tls-d-line'
export { tlsDArea } from './tls-d-area'
export { tlsDGroupedBar } from './tls-d-grouped-bar'
export { tlsDStackedBar } from './tls-d-stacked-bar'
export { tlsDPie } from './tls-d-pie'
