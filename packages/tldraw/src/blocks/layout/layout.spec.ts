/**
 * Tests for the block layout engine: box-model helpers, text measurement, context
 * construction, child layout with depth capping, and the module-level-object copy rule.
 */

import type {
  BlockDefinition,
  Box,
  LayoutContext,
  LayoutNode,
  ResolvedTokens,
  Size,
  SurfaceContext,
} from '../types'
import { BlockRegistry } from '../registry'
import { resolveTokens } from '../tokens'
import { TYPE_SCALE } from '../scales'
import { insetBox, anchorBox, splitBox } from './box-model'
import { estimateMetrics } from './measure'
import { createLayoutContext } from './layout-child'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test fixtures                                                                   */
/* ─────────────────────────────────────────────────────────────────────────────── */

// A minimal theme to produce ResolvedTokens.  We import the type for the theme shape
// but construct a fixture that resolveTokens can consume.
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

const TEST_TOKENS: ResolvedTokens = resolveTokens(TEST_THEME as any)

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

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Box model tests                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('insetBox', () => {
  const box: Box = { x: 100, y: 50, width: 400, height: 300 }

  it('shrinks uniformly with a single number', () => {
    const result = insetBox(box, 24)
    expect(result).toEqual({ x: 124, y: 74, width: 352, height: 252 })
  })

  it('shrinks with a [block, inline] tuple', () => {
    const result = insetBox(box, [10, 20])
    expect(result).toEqual({ x: 120, y: 60, width: 360, height: 280 })
  })

  it('clamps to non-negative size', () => {
    const small: Box = { x: 0, y: 0, width: 10, height: 10 }
    const result = insetBox(small, 24)
    expect(result.width).toBe(0)
    expect(result.height).toBe(0)
  })

  it('does not mutate the input box', () => {
    const original = { ...box }
    insetBox(box, 24)
    expect(box).toEqual(original)
  })
})

describe('anchorBox', () => {
  const parent: Box = { x: 0, y: 0, width: 1920, height: 1080 }
  const size = { width: 400, height: 200 }

  it('places at top-left', () => {
    expect(anchorBox(parent, 'top-left', size)).toEqual({ x: 0, y: 0, width: 400, height: 200 })
  })

  it('places at top-center', () => {
    expect(anchorBox(parent, 'top-center', size)).toEqual({ x: 760, y: 0, width: 400, height: 200 })
  })

  it('places at top-right', () => {
    expect(anchorBox(parent, 'top-right', size)).toEqual({ x: 1520, y: 0, width: 400, height: 200 })
  })

  it('places at middle-left', () => {
    expect(anchorBox(parent, 'middle-left', size)).toEqual({ x: 0, y: 440, width: 400, height: 200 })
  })

  it('places at middle-center', () => {
    expect(anchorBox(parent, 'middle-center', size)).toEqual({ x: 760, y: 440, width: 400, height: 200 })
  })

  it('places at middle-right', () => {
    expect(anchorBox(parent, 'middle-right', size)).toEqual({ x: 1520, y: 440, width: 400, height: 200 })
  })

  it('places at bottom-left', () => {
    expect(anchorBox(parent, 'bottom-left', size)).toEqual({ x: 0, y: 880, width: 400, height: 200 })
  })

  it('places at bottom-center', () => {
    expect(anchorBox(parent, 'bottom-center', size)).toEqual({ x: 760, y: 880, width: 400, height: 200 })
  })

  it('places at bottom-right', () => {
    expect(anchorBox(parent, 'bottom-right', size)).toEqual({ x: 1520, y: 880, width: 400, height: 200 })
  })
})

describe('splitBox', () => {
  const box: Box = { x: 0, y: 0, width: 1000, height: 500 }

  it('splits horizontally at 50/50 with no gutter', () => {
    const [a, b] = splitBox(box, 0.5, 0, 'x')
    expect(a).toEqual({ x: 0, y: 0, width: 500, height: 500 })
    expect(b).toEqual({ x: 500, y: 0, width: 500, height: 500 })
  })

  it('splits horizontally at 30/70 with gutter', () => {
    const [a, b] = splitBox(box, 0.3, 48, 'x')
    expect(a.width).toBe(286) // round((1000 - 48) * 0.3) = 286
    expect(b.width).toBe(1000 - 48 - 286)
    expect(b.x).toBe(a.x + a.width + 48)
  })

  it('splits vertically at 50/50 with gutter', () => {
    const [a, b] = splitBox(box, 0.5, 32, 'y')
    expect(a.height).toBe(234) // round((500 - 32) * 0.5) = 234
    expect(b.height).toBe(500 - 32 - 234)
    expect(b.y).toBe(a.y + a.height + 32)
  })

  it('clamps ratio to [0, 1]', () => {
    const [a] = splitBox(box, 1.5, 0, 'x')
    expect(a.width).toBe(1000)
  })

  it('does not mutate the input box', () => {
    const original = { ...box }
    splitBox(box, 0.5, 0, 'x')
    expect(box).toEqual(original)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* estimateMetrics tests                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('estimateMetrics', () => {
  const sansStyle = { family: '"Source Sans Pro"', size: 28, lineHeight: 1.45, letterSpacing: -0.03, color: '#1a1a1a' }

  it('returns TextMetrics with lines array', () => {
    const m = estimateMetrics('Hello world', sansStyle)
    expect(m).toHaveProperty('width')
    expect(m).toHaveProperty('height')
    expect(m).toHaveProperty('lines')
    expect(Array.isArray(m.lines)).toBe(true)
    expect(m.lines.length).toBeGreaterThanOrEqual(1)
  })

  it('measures empty string', () => {
    const m = estimateMetrics('', sansStyle)
    expect(m.lines).toHaveLength(1)
    expect(m.lines[0].text).toBe('')
  })

  it('single line has one entry in lines', () => {
    const m = estimateMetrics('Hello', sansStyle)
    expect(m.lines).toHaveLength(1)
    expect(m.lines[0].text).toBe('Hello')
  })

  it('respects explicit newlines', () => {
    const m = estimateMetrics('Hello\nWorld', sansStyle)
    expect(m.lines).toHaveLength(2)
  })

  it('breaks lines when maxWidth is provided', () => {
    const m = estimateMetrics('The quick brown fox jumps over the lazy dog', sansStyle, 200)
    expect(m.lines.length).toBeGreaterThan(1)
    // All lines should fit within maxWidth (approximately).
    for (const line of m.lines) {
      expect(line.width).toBeLessThanOrEqual(200 + 10) // + tolerance for rounding
    }
  })

  it('returns consistent results in any environment (deterministic)', () => {
    // estimateMetrics is pure and DOM-free, so running it twice should give the same result.
    const text = 'Test text for determinism'
    const m1 = estimateMetrics(text, sansStyle)
    const m2 = estimateMetrics(text, sansStyle)
    expect(m1).toEqual(m2)
  })

  it('handles RichText input', () => {
    const rich = { runs: [{ text: 'Hello ' }, { text: 'world', bold: true }] }
    const m = estimateMetrics(rich, sansStyle)
    expect(m.lines.length).toBeGreaterThanOrEqual(1)
    expect(m.lines[0].text).toContain('Hello')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* createLayoutContext tests                                                       */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('createLayoutContext', () => {
  it('builds a valid LayoutContext from tokens + box', () => {
    const ctx = makeCtx()
    expect(ctx.box).toEqual(TEST_BOX)
    expect(ctx.tokens).toBeDefined()
    expect(ctx.surface).toEqual(TEST_SURFACE)
    expect(ctx.depth).toBe(0)
    expect(ctx.headless).toBe(false)
    expect(typeof ctx.resolveColor).toBe('function')
    expect(typeof ctx.resolveText).toBe('function')
    expect(typeof ctx.measureText).toBe('function')
    expect(typeof ctx.layoutChild).toBe('function')
  })

  it('copies tokens deeply — not aliased', () => {
    const ctx = makeCtx()
    // The tokens object itself is a new reference.
    expect(ctx.tokens).not.toBe(TEST_TOKENS)
    // The color record is a new reference.
    expect(ctx.tokens.color).not.toBe(TEST_TOKENS.color)
    // But the values are equal.
    expect(ctx.tokens.color).toEqual(TEST_TOKENS.color)
    // Mutating the context's tokens must not affect the original.
    ctx.tokens.color.text = '#000000'
    expect(TEST_TOKENS.color.text).not.toBe('#000000')
  })

  it('copies surface — not aliased', () => {
    const ctx = makeCtx()
    expect(ctx.surface).not.toBe(TEST_SURFACE)
    expect(ctx.surface).toEqual(TEST_SURFACE)
    ctx.surface.luminance = 0
    expect(TEST_SURFACE.luminance).toBe(1)
  })

  it('copies the box', () => {
    const original = { ...TEST_BOX }
    const ctx = makeCtx()
    expect(ctx.box).not.toBe(TEST_BOX as any)
    expect(ctx.box).toEqual(original)
  })

  it('resolveText looks up the type scale', () => {
    const ctx = makeCtx()
    const style = ctx.resolveText('body')
    expect(style.size).toBe(TYPE_SCALE.body.size)
    expect(style.lineHeight).toBe(TYPE_SCALE.body.lineHeight)
    expect(style.family).toBeDefined()
  })

  it('resolveText applies overrides', () => {
    const ctx = makeCtx()
    const style = ctx.resolveText('heading', { size: 100, family: '"Custom Font"' })
    expect(style.size).toBe(100)
    expect(style.family).toBe('"Custom Font"')
    // lineHeight is from the type scale, not overridden.
    expect(style.lineHeight).toBe(TYPE_SCALE.heading.lineHeight)
  })

  it('resolveColor returns a ResolvedColor', () => {
    const ctx = makeCtx()
    const c = ctx.resolveColor('text')
    expect(c).toHaveProperty('color')
    expect(c).toHaveProperty('ok')
  })

  it('measureText returns TextMetrics', () => {
    const ctx = makeCtx()
    const style = ctx.resolveText('body')
    const m = ctx.measureText('Hello', style)
    expect(m).toHaveProperty('width')
    expect(m).toHaveProperty('height')
    expect(m).toHaveProperty('lines')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* layoutChild depth capping tests                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** A trivial container block definition for testing nesting. */
function makeContainerBlock(): BlockDefinition {
  return {
    type: 'test.container',
    name: 'Test Container',
    family: 'layout',
    tier: 'A',
    summary: 'Test container',
    keywords: ['test'],
    schema: {},
    defaults: {},
    size: { preferred: [800, 600], min: [200, 200] },
    layout: (_props: Record<string, unknown>, ctx: LayoutContext): LayoutNode => {
      const box: Box = { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height }
      const child: LayoutNode = ctx.layoutChild(
        { id: 'c1', type: 'test.child', props: {} },
        box
      )
      return { k: 'group', box: ctx.box, part: 'root', children: [child] }
    },
    motion: {},
  }
}

/** A leaf block that just returns a rect. */
function makeChildBlock(): BlockDefinition {
  return {
    type: 'test.child',
    name: 'Test Child',
    family: 'layout',
    tier: 'A',
    summary: 'Test child',
    keywords: ['test'],
    schema: {},
    defaults: {},
    size: { preferred: [100, 100], min: [50, 50] },
    layout: (_props: Record<string, unknown>, ctx: LayoutContext): LayoutNode => {
      return { k: 'rect', box: ctx.box, fill: { type: 'solid', color: '#ff0000' } }
    },
    motion: {},
  }
}

describe('layoutChild depth capping', () => {
  let registry: BlockRegistry

  beforeEach(() => {
    registry = new BlockRegistry()
    registry.register(makeContainerBlock())
    registry.register(makeChildBlock())
  })

  it('nests 3 deep correctly', () => {
    // Root context at depth 0. The container block calls layoutChild,
    // which creates a child context at depth 1. That child (test.child)
    // is a leaf — it does not recurse further.
    //
    // To get 3 levels, we need a container → container → child chain.
    // The test.container block always calls layoutChild with test.child,
    // so nesting 3 deep means: root(0) → container(1) → container(2) → child(3).
    // We'll build this manually by nesting createLayoutContext.
    const root = makeCtx({ registry })
    const box1: Box = { x: 0, y: 0, width: 1920, height: 1080 }
    const node1 = root.layoutChild({ id: 'ct1', type: 'test.container', props: {} }, box1)
    // node1 is a group containing a child (test.child at depth 1).
    expect(node1.k).toBe('group')

    // Now build a context at depth 1 and try again.
    const ctx1 = makeCtx({ registry, depth: 1 })
    const box2: Box = { x: 0, y: 0, width: 800, height: 600 }
    const node2 = ctx1.layoutChild({ id: 'ct2', type: 'test.container', props: {} }, box2)
    expect(node2.k).toBe('group')

    // At depth 2, layoutChild should still work.
    const ctx2 = makeCtx({ registry, depth: 2 })
    const box3: Box = { x: 0, y: 0, width: 400, height: 300 }
    const node3 = ctx2.layoutChild({ id: 'ct3', type: 'test.container', props: {} }, box3)
    expect(node3.k).toBe('group')

    // At depth 3, layoutChild should still work (newDepth = 4 <= MAX_DEPTH).
    // layoutChild now wraps in a group, so the result is a group containing a rect.
    const ctx3 = makeCtx({ registry, depth: 3 })
    const box4: Box = { x: 0, y: 0, width: 200, height: 200 }
    const node4 = ctx3.layoutChild({ id: 'c2', type: 'test.child', props: {} }, box4)
    expect(node4.k).toBe('group')
    expect(node4.children[0].k).toBe('rect')
  })

  it('rejects depth 5 with a lint error node, not a throw', () => {
    // At depth 4, layoutChild with a newDepth of 5 should be rejected.
    const ctx4 = makeCtx({ registry, depth: 4 })
    const box: Box = { x: 0, y: 0, width: 200, height: 200 }
    let node: LayoutNode | undefined
    expect(() => {
      node = ctx4.layoutChild({ id: 'c3', type: 'test.child', props: {} }, box)
    }).not.toThrow()
    expect(node).toBeDefined()
    expect(node!.k).toBe('group')
    expect((node as any).part).toBe('lint/depth-overflow')
    expect((node as any).children).toEqual([])
  })

  it('does not recurse infinitely — returns immediately at overflow', () => {
    // Even at an absurd depth, it should return a node without stack overflow.
    const ctx = makeCtx({ registry, depth: 100 })
    const box: Box = { x: 0, y: 0, width: 100, height: 100 }
    const node = ctx.layoutChild({ id: 'c4', type: 'test.child', props: {} }, box)
    expect(node.k).toBe('group')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* measureText environment parity test                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('measureText environment parity', () => {
  it('returns the same result regardless of environment', () => {
    // estimateMetrics is pure — no DOM, no window, no Date.now, no Math.random.
    // Running it in the same process twice with the same input must yield identical output.
    const style = {
      family: '"Source Sans Pro", sans-serif',
      size: 36,
      lineHeight: 1.35,
      letterSpacing: -0.03,
      color: '#1a1a1a',
    }
    const text = 'Environment parity test with unicode: 你好世界'
    const result = estimateMetrics(text, style, 400)
    const result2 = estimateMetrics(text, style, 400)
    expect(result).toEqual(result2)
    // And with maxWidth (line breaking).
    const result3 = estimateMetrics(text, style, 400)
    expect(result3.lines.length).toBeGreaterThanOrEqual(1)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Module-level object copy assertions                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('module-level objects are copied, not aliased', () => {
  it('tokens are deeply copied into LayoutContext', () => {
    const ctx = makeCtx()
    expect(ctx.tokens).not.toBe(TEST_TOKENS)
    expect(ctx.tokens).toEqual(TEST_TOKENS)
  })

  it('tokens.type entries are copied', () => {
    const ctx = makeCtx()
    for (const key of Object.keys(ctx.tokens.type) as Array<keyof typeof ctx.tokens.type>) {
      expect(ctx.tokens.type[key]).not.toBe(TEST_TOKENS.type[key])
      expect(ctx.tokens.type[key]).toEqual(TEST_TOKENS.type[key])
    }
  })

  it('tokens.elevation entries are copied', () => {
    const ctx = makeCtx()
    for (const key of [0, 1, 2] as const) {
      expect(ctx.tokens.elevation[key]).not.toBe(TEST_TOKENS.elevation[key])
      expect(ctx.tokens.elevation[key]).toEqual(TEST_TOKENS.elevation[key])
    }
  })

  it('tokens.color is copied', () => {
    const ctx = makeCtx()
    expect(ctx.tokens.color).not.toBe(TEST_TOKENS.color)
    expect(ctx.tokens.color).toEqual(TEST_TOKENS.color)
  })

  it('tokens.space is copied', () => {
    const ctx = makeCtx()
    expect(ctx.tokens.space).not.toBe(TEST_TOKENS.space)
    expect(ctx.tokens.space).toEqual(TEST_TOKENS.space)
  })

  it('tokens.radius is copied', () => {
    const ctx = makeCtx()
    expect(ctx.tokens.radius).not.toBe(TEST_TOKENS.radius)
    expect(ctx.tokens.radius).toEqual(TEST_TOKENS.radius)
  })

  it('tokens.motion is copied', () => {
    const ctx = makeCtx()
    expect(ctx.tokens.motion).not.toBe(TEST_TOKENS.motion)
    expect(ctx.tokens.motion).toEqual(TEST_TOKENS.motion)
  })

  it('surface is copied', () => {
    const ctx = makeCtx()
    expect(ctx.surface).not.toBe(TEST_SURFACE)
    expect(ctx.surface).toEqual(TEST_SURFACE)
  })
})
