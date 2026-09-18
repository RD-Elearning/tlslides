/**
 * Layout container block library — 14 pure, DOM-free containers.
 */

import type { BlockDefinition } from '../../types'

import { tlsLStack } from './tls-l-stack'
import { tlsLRow } from './tls-l-row'
import { tlsLGrid } from './tls-l-grid'
import { tlsLSplit } from './tls-l-split'
import { tlsLOverlay } from './tls-l-overlay'
import { tlsLCard } from './tls-l-card'
import { tlsLSection } from './tls-l-section'
import { tlsLRepeater } from './tls-l-repeater'
import { tlsLSpacer } from './tls-l-spacer'
import { tlsLField } from './tls-l-field'
import { tlsLSafeArea } from './tls-l-safe-area'
import { tlsLGridGuide } from './tls-l-grid-guide'
import { tlsLSidebar } from './tls-l-sidebar'
import { tlsLFooter } from './tls-l-footer'

export { tlsLStack } from './tls-l-stack'
export { tlsLRow } from './tls-l-row'
export { tlsLGrid } from './tls-l-grid'
export { tlsLSplit } from './tls-l-split'
export { tlsLOverlay } from './tls-l-overlay'
export { tlsLCard } from './tls-l-card'
export { tlsLSection } from './tls-l-section'
export { tlsLRepeater } from './tls-l-repeater'
export { tlsLSpacer } from './tls-l-spacer'
export { tlsLField } from './tls-l-field'
export { tlsLSafeArea } from './tls-l-safe-area'
export { tlsLGridGuide } from './tls-l-grid-guide'
export { tlsLSidebar } from './tls-l-sidebar'
export { tlsLFooter } from './tls-l-footer'

export const layoutBlocks: BlockDefinition[] = [
  tlsLStack,
  tlsLRow,
  tlsLGrid,
  tlsLSplit,
  tlsLOverlay,
  tlsLCard,
  tlsLSection,
  tlsLRepeater,
  tlsLSpacer,
  tlsLField,
  tlsLSafeArea,
  tlsLGridGuide,
  tlsLSidebar,
  tlsLFooter,
]
