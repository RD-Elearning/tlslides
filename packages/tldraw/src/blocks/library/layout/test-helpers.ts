/**
 * Shared test helpers for layout container specs.
 */

import type {
  BlockSpec,
  BlockStyleSpec,
  LayoutContext,
  LayoutNode,
  ResolvedTokens,
  Size,
  SurfaceContext,
} from '../../types'
import { resolveTokens } from '../../tokens'
import { createLayoutContext } from '../../layout/layout-child'
import { BlockRegistry } from '../../registry'

const TEST_THEME = {
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    text: '#1a1a1a',
    textMuted: '#6b7280',
    accent1: '#3b82f6',
    accent2: '#8b5cf6',
  },
  fonts: {
    script: 'script' as const,
    sans: 'sans' as const,
    serif: 'serif' as const,
    mono: 'mono' as const,
    heading: 'sans' as const,
    body: 'sans' as const,
  },
}

export const TEST_TOKENS: ResolvedTokens = resolveTokens(TEST_THEME as any)

export const TEST_SURFACE: SurfaceContext = {
  behind: { type: 'solid', color: '#ffffff' },
  luminance: 1,
  overImage: false,
}

export const SIZES: Array<{ label: string; box: Size }> = [
  { label: 'small', box: { width: 480, height: 270 } },
  { label: 'medium', box: { width: 960, height: 540 } },
  { label: 'large', box: { width: 1920, height: 1080 } },
]

/** A trivial leaf block for use as a child in container tests. */
const leafBlock: BlockDefinition = {
  type: 'test.leaf',
  name: 'Leaf',
  family: 'layout',
  tier: 'A',
  summary: 'Leaf',
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

import type { BlockDefinition } from '../../types'

export function makeCtx(
  box: Size,
  registry?: BlockRegistry,
  style?: BlockStyleSpec
): LayoutContext {
  return createLayoutContext({
    box,
    tokens: TEST_TOKENS,
    surface: TEST_SURFACE,
    registry,
    style,
  })
}

/** Create a registry with the test leaf block. */
export function makeRegistry(): BlockRegistry {
  const reg = new BlockRegistry()
  reg.register(leafBlock)
  return reg
}

/** Create N leaf child specs for use in container tests. */
export function makeChildren(n: number): BlockSpec[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `leaf-${i}`,
    type: 'test.leaf',
    props: {},
  }))
}

/** Assert that a LayoutNode is well-formed (has k, box, etc). */
export function assertValidNode(node: LayoutNode): void {
  expect(node).toHaveProperty('k')
  expect(node).toHaveProperty('box')
  expect(node.box).toHaveProperty('x')
  expect(node.box).toHaveProperty('y')
  expect(node.box).toHaveProperty('width')
  expect(node.box).toHaveProperty('height')
  expect(node.box.width).toBeGreaterThanOrEqual(0)
  expect(node.box.height).toBeGreaterThanOrEqual(0)
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
