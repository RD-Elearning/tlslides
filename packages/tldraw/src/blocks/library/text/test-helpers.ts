/**
 * Shared test helpers for text block specs.
 *
 * Re-exports layout helpers and adds text-specific utilities.
 */

import type { LayoutContext, LayoutNode, Size } from '../../types'
import {
  TEST_TOKENS,
  TEST_SURFACE,
  SIZES,
  makeCtx as layoutMakeCtx,
  assertValidNode,
} from '../layout/test-helpers'

export { TEST_TOKENS, TEST_SURFACE, SIZES, assertValidNode }
export type { LayoutContext, LayoutNode, Size }

import { BlockRegistry } from '../../registry'
import type { BlockDefinition } from '../../types'

/** A trivial text-like leaf block for use as a child in container tests. */
const textLeafBlock: BlockDefinition = {
  type: 'test.text-leaf',
  name: 'Text Leaf',
  family: 'text',
  tier: 'A',
  summary: 'Text leaf',
  keywords: ['test'],
  schema: {},
  defaults: {},
  size: { preferred: [100, 100], min: [10, 10] },
  layout: (_props: Record<string, unknown>, ctx: LayoutContext): LayoutNode => {
    return {
      k: 'rect',
      box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
      fill: { type: 'solid', color: '#ff0000' },
    }
  },
  motion: {},
}

export function makeCtx(box: Size, registry?: BlockRegistry): LayoutContext {
  return layoutMakeCtx(box, registry)
}

/** Create a registry with the test text leaf block. */
export function makeRegistry(): BlockRegistry {
  const reg = new BlockRegistry()
  reg.register(textLeafBlock)
  return reg
}

/** Collect all part names from a LayoutNode tree (DFS). */
export function collectParts(node: LayoutNode): string[] {
  const result: string[] = []
  function walk(n: LayoutNode) {
    if (n.part) result.push(n.part)
    if (n.k === 'group' && n.children) {
      for (const c of n.children) walk(c)
    }
  }
  walk(node)
  return result
}
