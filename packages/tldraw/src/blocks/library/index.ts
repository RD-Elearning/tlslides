/**
 * Aggregate block library export. Provides the full set of built-in block
 * definitions and a helper to register them all in one call.
 *
 * Both F1 (the block inserter) and Q19 (the AI capability digest, generated
 * from the library) consume this module.
 */

import type { BlockDefinition } from '../types'
import type { BlockRegistry } from '../registry'
import { layoutBlocks } from './layout'

import { textBlocks } from './text'

// Data + chart blocks — populated when E3/E4 land.
import { dataBlocks } from './data'

// Diagram blocks — process and structure diagrams (R14).
import { diagramBlocks } from './diagram'

// Composite blocks — html-kind and multi-part composites (R2).
import { compositeBlocks } from './composite'

// Media blocks — image block and future media types (R8).
import { mediaBlocks } from './media'

// Chrome blocks — page chrome elements (R14).
import { chromeBlocks } from './chrome'

/** All built-in block definitions. */
export const BUILT_IN_BLOCKS: BlockDefinition[] = [
  ...layoutBlocks,
  ...textBlocks,
  ...dataBlocks,
  ...diagramBlocks,
  ...compositeBlocks,
  ...mediaBlocks,
  ...chromeBlocks,
]

/**
 * Register every built-in block in the given registry.
 * Throws if any block type is already registered.
 */
export function registerBuiltInBlocks(registry: BlockRegistry): void {
  for (const block of BUILT_IN_BLOCKS) {
    registry.register(block)
  }
}

// Re-export layout blocks for direct access.
export { layoutBlocks } from './layout'

// Re-export text blocks for direct access.
export { textBlocks } from './text'

// Re-export data blocks for direct access. (W1 — `blocks/index.ts` wire-up.)
export { dataBlocks } from './data'

// Re-export diagram blocks for direct access.
export { diagramBlocks } from './diagram'

// Re-export composite blocks for direct access.
export { compositeBlocks } from './composite'

// Re-export media blocks for direct access.
export { mediaBlocks } from './media'

// Re-export chrome blocks for direct access.
export { chromeBlocks } from './chrome'
