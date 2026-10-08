/**
 * LO2 — paint layers. One lookup shared by the compiler, the layout report and the capability
 * digest, so the three can never disagree about which layer a block is on.
 *
 * Pure and DOM-free.
 */

import type { BlockDefinition, BlockLayer, BlockSpec } from './types'
import { BLOCK_LAYERS } from './types'

/** The definition's layer: explicit `def.layer`, else category `decoration` → `backdrop`, else `content`. */
export function definitionLayer(def: BlockDefinition | undefined): BlockLayer {
  if (!def) return 'content'
  if (def.layer) return def.layer
  return def.category === 'decoration' ? 'backdrop' : 'content'
}

/** The layer of one block instance: `block.layer` wins over the definition's. */
export function blockLayer(block: BlockSpec, def?: BlockDefinition): BlockLayer {
  return isBlockLayer(block.layer) ? block.layer : definitionLayer(def)
}

export function isBlockLayer(v: unknown): v is BlockLayer {
  return typeof v === 'string' && (BLOCK_LAYERS as readonly string[]).includes(v)
}
