/**
 * Tests for `layoutBlock` — the wrapper that applies instance padding + align
 * to a block's layout output.
 */

import type {
  BlockDefinition,
  LayoutNode,
  LayoutContext,
  ResolvedTokens,
  Size,
  SurfaceContext,
  SpaceToken,
} from '../types'
import { BlockRegistry } from '../registry'
import { resolveTokens } from '../tokens'
import { estimateMetrics } from './measure'
import { createLayoutContext } from './layout-child'
import { layoutBlock } from './layout-child'

// Minimal theme fixture — same shape as tokens.spec.ts.
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

const TEST_TOKENS: ResolvedTokens = resolveTokens(TEST_THEME as never)

const TEST_SURFACE: SurfaceContext = {
  behind: { type: 'solid', color: '#ffffff' },
  luminance: 1,
  overImage: false,
}

const TEST_BOX: Size = { width: 1920, height: 1080 }

function makeCtx(overrides?: Partial<Parameters<typeof createLayoutContext>[0]>): LayoutContext {
  return createLayoutContext({
    box: TEST_BOX,
    tokens: TEST_TOKENS,
    surface: TEST_SURFACE,
    ...overrides,
  })
}

/** A simple leaf block that just returns a rect at the full box size. */
function makeRectBlock(): BlockDefinition {
  return {
    type: 'test.rect',
    name: 'Rect',
    family: 'layout',
    tier: 'A',
    summary: 'Test rect block',
    keywords: ['test'],
    schema: {},
    defaults: {},
    size: { preferred: [200, 200], min: [50, 50] },
    layout: (_props, ctx): LayoutNode => ({
      k: 'rect',
      box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
      fill: { type: 'solid', color: '#ff0000' },
      part: 'root',
    }),
    motion: {},
  }
}

/** A block that reports a small content height, to test align. */
function makeShortBlock(): BlockDefinition {
  return {
    type: 'test.short',
    name: 'Short',
    family: 'layout',
    tier: 'A',
    summary: 'Short content block',
    keywords: ['test'],
    schema: {},
    defaults: {},
    size: { preferred: [200, 200], min: [50, 50] },
    layout: (_props, ctx): LayoutNode => ({
      k: 'rect',
      box: { x: 0, y: 0, width: ctx.box.width, height: 200 },
      fill: { type: 'solid', color: '#00ff00' },
      part: 'root',
    }),
    motion: {},
  }
}

describe('layoutBlock', () => {
  it('identity invariant: no style → returns def.layout() output unchanged', () => {
    const def = makeRectBlock()
    const ctx = makeCtx()
    const direct = def.layout({}, ctx)
    const wrapped = layoutBlock(def, {}, ctx)

    // When there's no style, layoutBlock should return the exact same node.
    expect(wrapped).toEqual(direct)
  })

  it('identity invariant: style without padding or align → returns def.layout() output unchanged', () => {
    const def = makeRectBlock()
    const ctx = makeCtx({ style: { accent: '#123456' } })
    const direct = def.layout({}, ctx)
    const wrapped = layoutBlock(def, {}, ctx)

    // accent alone doesn't trigger padding/align wrapper.
    expect(wrapped).toEqual(direct)
  })

  it('padding token: insets box and wraps in group with reported height', () => {
    const def = makeRectBlock()
    const pad = TEST_TOKENS.space.md // 24
    const ctx = makeCtx({ style: { padding: 'md' as SpaceToken } })
    const node = layoutBlock(def, {}, ctx)

    // Should be wrapped in a group.
    expect(node.k).toBe('group')
    // Outer group height = inner content height + padV * 2.
    // The rect block fills its inner box: innerHeight = 1080 - 2*24 = 1032, total = 1032 + 48 = 1080.
    expect(node.box.height).toBe(TEST_BOX.height)
    // Width unchanged.
    expect(node.box.width).toBe(TEST_BOX.width)

    // The inner group should be inset by the padding.
    expect(node.children[0].box.x).toBe(pad)
    expect(node.children[0].box.y).toBe(pad)
  })

  it('padding number: applies uniformly', () => {
    const def = makeRectBlock()
    const ctx = makeCtx({ style: { padding: 48 } })
    const node = layoutBlock(def, {}, ctx)

    expect(node.k).toBe('group')
    expect(node.children[0].box.x).toBe(48)
    expect(node.children[0].box.y).toBe(48)
    // Rect fills inner box: 1080 - 96 = 984, total = 984 + 96 = 1080.
    expect(node.box.height).toBe(TEST_BOX.height)
  })

  it('padding tuple [block, inline]: vertical and horizontal differ', () => {
    const def = makeRectBlock()
    const ctx = makeCtx({ style: { padding: [16, 32] } })
    const node = layoutBlock(def, {}, ctx)

    expect(node.k).toBe('group')
    // Vertical padding = 16, horizontal = 32.
    expect(node.children[0].box.x).toBe(32)
    expect(node.children[0].box.y).toBe(16)
    // Rect fills inner box: 1080 - 32 = 1048, total = 1048 + 32 = 1080.
    expect(node.box.height).toBe(TEST_BOX.height)
  })

  it('align center: offset is 0 when content fills inner box (fill-type block)', () => {
    const def = makeRectBlock() // returns full box height
    const ctx = makeCtx({ style: { padding: 'md' as SpaceToken, align: 'center' } })
    const node = layoutBlock(def, {}, ctx)

    expect(node.k).toBe('group')
    // Inner group's y offset = padV (no extra align offset because content fills the box).
    expect(node.children[0].box.y).toBe(TEST_TOKENS.space.md)
  })

  it('align center: offsets content when it is shorter than inner box', () => {
    const def = makeShortBlock() // reports height 200, much less than ctx.box.height
    const pad = TEST_TOKENS.space.md // 24
    const ctx = makeCtx({ style: { padding: 'md' as SpaceToken, align: 'center' } })
    const node = layoutBlock(def, {}, ctx)

    expect(node.k).toBe('group')
    // Inner box height = ctx.box.height - 2*pad = 1080 - 48 = 1032
    // Content height = 200, free space = 1032 - 200 = 832
    // Align offset = 832 / 2 = 416
    // Inner group y = pad + alignOffset = 24 + 416 = 440
    const expectedInnerY = pad + (1080 - pad * 2 - 200) / 2
    expect(node.children[0].box.y).toBeCloseTo(expectedInnerY, 0)
  })

  it('moves part from inner node to outer group (H3)', () => {
    const def = makeRectBlock()
    const ctx = makeCtx({ style: { padding: 'md' as SpaceToken } })
    const node = layoutBlock(def, {}, ctx)

    // Outer group carries the 'root' part.
    expect(node.part).toBe('root')
    // Inner group's children should have cleared part.
    const innerNode = node.children[0].children[0]
    expect(innerNode.part).toBeUndefined()
  })

  it('works with Tier B host node (padding on host node)', () => {
    // Simulate a host node layout that returns a 'host' node.
    const hostDef: BlockDefinition = {
      type: 'test.host',
      name: 'Host',
      family: 'composite',
      tier: 'B',
      summary: 'Host block',
      keywords: ['test'],
      schema: {},
      defaults: {},
      size: { preferred: [200, 200], min: [50, 50] },
      layout: (_props, ctx): LayoutNode => ({
        k: 'host',
        box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
        part: 'root',
        render: 'test-host',
      }),
      motion: {},
    }

    const pad = TEST_TOKENS.space.md
    const ctx = makeCtx({ style: { padding: 'md' as SpaceToken } })
    const node = layoutBlock(hostDef, {}, ctx)

    expect(node.k).toBe('group')
    expect(node.part).toBe('root')
    // Inner group is inset by padding.
    expect(node.children[0].box.x).toBe(pad)
    expect(node.children[0].box.y).toBe(pad)
    // Host node fills inner box.
    // The host node itself is nested inside the inner group.
    const hostNode = node.children[0].children[0]
    expect(hostNode.k).toBe('host')
    expect(hostNode.part).toBeUndefined()
  })

  it('does not mutate the original ctx', () => {
    const def = makeRectBlock()
    const ctx = makeCtx({ style: { padding: 'md' as SpaceToken } })
    const originalBox = { ...ctx.box }
    layoutBlock(def, {}, ctx)

    // ctx.box should not have changed.
    expect(ctx.box).toEqual(originalBox)
  })
})
