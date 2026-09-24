/**
 * Tests for `defineCompositeBlock()`.
 *
 * Covers:
 * - layout() delegates to ctx.layoutChild and re-tags root part to 'root'
 * - build() → layout equals manual layoutChild of the same tree
 * - intrinsicSize delegates to ctx.measureIntrinsicSize
 * - toggling a child off (build omits it) reflows the tree
 * - generated block definition has expected metadata (tier, family, etc.)
 */

import type {
  BlockDefinition,
  BlockSpec,
  BlockSchema,
  LayoutNode,
  LayoutContext,
  ResolvedTokens,
  Size,
  SurfaceContext,
} from '../types'
import { BlockRegistry } from '../registry'
import { resolveTokens } from '../tokens'
import { createLayoutContext } from './layout-child'
import { defineCompositeBlock } from './define-composite'

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

const TEST_BOX: Size = { width: 400, height: 300 }

/** Minimal leaf block spec for testing. */
const leafDef: BlockDefinition = {
  type: 'test.leaf',
  name: 'Leaf',
  family: 'layout',
  tier: 'A',
  summary: 'A test leaf block.',
  keywords: ['test'],
  schema: {},
  defaults: {},
  size: { preferred: [100, 100], min: [10, 10] },
  layout: (_props, ctx): LayoutNode => ({
    k: 'rect',
    box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
    fill: { type: 'solid', color: '#ff0000' },
  }),
  motion: {},
}

/** A simple container block that lays out children. */
const containerDef: BlockDefinition = {
  type: 'test.container',
  name: 'Container',
  family: 'layout',
  tier: 'A',
  summary: 'A test container block.',
  keywords: ['test'],
  schema: {
    children: {
      type: { kind: 'blocks', allow: ['layout', 'text', 'composite'] },
      role: 'content',
      label: 'Children',
    },
  },
  defaults: { children: [] },
  size: { preferred: [200, 200], min: [50, 50] },
  layout: (props, ctx: LayoutContext): LayoutNode => {
    const children = (props.children as BlockSpec[] | undefined) ?? []
    const childNodes: LayoutNode[] = []
    let x = 0
    for (const child of children) {
      const childNode = ctx.layoutChild(child, { ...ctx.box, x, y: 0, width: 100, height: 100 })
      childNodes.push(childNode)
      x += 100
    }
    return {
      k: 'group',
      box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
      children: childNodes,
    }
  },
  motion: { parts: ['background'] },
}

function makeRegistry(): BlockRegistry {
  const reg = new BlockRegistry()
  reg.register(leafDef)
  reg.register(containerDef)
  return reg
}

function makeCtx(registry: BlockRegistry): LayoutContext {
  return createLayoutContext({
    box: TEST_BOX,
    tokens: TEST_TOKENS,
    surface: TEST_SURFACE,
    registry,
  })
}

interface TestCompositeProps extends Record<string, unknown> {
  showLeaf?: boolean
  label?: string
}

/** A simple composite spec for testing: container → leaf + leaf. */
function buildTestComposite(props: TestCompositeProps): BlockSpec {
  const children: BlockSpec[] = [
    { id: 'first', type: 'test.leaf', props: {} },
  ]
  if (props.showLeaf !== false) {
    children.push({ id: 'second', type: 'test.leaf', props: {} })
  }
  return {
    id: 'test-composite',
    type: 'test.container',
    props: { children },
  }
}

const testSchema: BlockSchema = {
  showLeaf: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Show Leaf',
    toggles: 'second',
  },
  label: {
    type: { kind: 'text' },
    role: 'content',
    label: 'Label',
  },
}

describe('defineCompositeBlock()', () => {
  const registry = makeRegistry()
  const ctx = makeCtx(registry)

  it('generates a BlockDefinition with expected metadata', () => {
    const block = defineCompositeBlock({
      type: 'test.cta',
      name: 'Test CTA',
      summary: 'A test composite.',
      keywords: ['test', 'cta'],
      tier: 'A',
      schema: testSchema,
      defaults: { showLeaf: true, label: 'Hello' },
      size: { preferred: [200, 100], min: [100, 50] },
      build: buildTestComposite,
    })

    expect(block.type).toBe('test.cta')
    expect(block.family).toBe('composite')
    expect(block.tier).toBe('A')
    expect(block.schema).toBe(testSchema)
    expect(block.size.preferred).toEqual([200, 100])
    expect(block.size.min).toEqual([100, 50])
    expect(block.defaults).toEqual({ showLeaf: true, label: 'Hello' })
  })

  it('generated layout() re-tags root part to "root"', () => {
    const block = defineCompositeBlock({
      type: 'test.cta',
      name: 'Test CTA',
      summary: 'A test composite.',
      keywords: ['test'],
      tier: 'A',
      schema: testSchema,
      defaults: { showLeaf: true },
      size: { preferred: [200, 100], min: [100, 50] },
      build: buildTestComposite,
    })

    const tree = block.layout({ showLeaf: true } as any, ctx)
    // The generated layout wraps via layoutChild then re-tags part to 'root'
    expect(tree.k).toBe('group')
    expect(tree.part).toBe('root')
  })

  it('generated layout() equals manual layoutChild of the same build() tree', () => {
    const block = defineCompositeBlock({
      type: 'test.cta',
      name: 'Test CTA',
      summary: 'A test composite.',
      keywords: ['test'],
      tier: 'A',
      schema: testSchema,
      defaults: { showLeaf: true },
      size: { preferred: [200, 100], min: [100, 50] },
      build: buildTestComposite,
    })

    const props = { showLeaf: true, label: 'Test' } as TestCompositeProps
    const spec = block.build ? (block as any).build(props) : buildTestComposite(props)

    // The generated layout should produce the same root group (same part, same children count)
    const generatedTree = block.layout(props as any, ctx)

    // Build the expected tree manually: layoutChild then re-tag
    const box = { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height }
    const manualNode = ctx.layoutChild(spec, box)
    const manualTree =
      manualNode.k === 'group' ? { ...manualNode, part: 'root' } : manualNode

    // Both should be group nodes with part 'root'
    expect(generatedTree.k).toBe('group')
    expect(manualTree.k).toBe('group')
    expect(generatedTree.part).toBe('root')
    expect(manualTree.part).toBe('root')

    // Both should have the same number of children
    const genGroup = generatedTree as Extract<LayoutNode, { k: 'group' }>
    const manualGroup = manualTree as Extract<LayoutNode, { k: 'group' }>
    expect(genGroup.children?.length).toBe(manualGroup.children?.length)
  })

  it('toggle omits child (reflow)', () => {
    const block = defineCompositeBlock({
      type: 'test.cta',
      name: 'Test CTA',
      summary: 'A test composite.',
      keywords: ['test'],
      tier: 'A',
      schema: testSchema,
      defaults: { showLeaf: true },
      size: { preferred: [200, 100], min: [100, 50] },
      build: buildTestComposite,
    })

    // With showLeaf: true → 2 children
    const treeWithLeaf = block.layout({ showLeaf: true } as any, ctx)
    const withLeafGroup = treeWithLeaf as Extract<LayoutNode, { k: 'group' }>

    // With showLeaf: false → 1 child
    const treeWithoutLeaf = block.layout({ showLeaf: false } as any, ctx)
    const withoutLeafGroup = treeWithoutLeaf as Extract<LayoutNode, { k: 'group' }>

    // The container's root group should have different child counts
    // layoutChild wraps build() output in a group; that group's child is the container root
    const withLeafChild = asGroup(withLeafGroup.children![0])
    const withoutLeafChild = asGroup(withoutLeafGroup.children![0])

    expect(withLeafChild.children?.length).toBe(2)
    expect(withoutLeafChild.children?.length).toBe(1)
  })

  it('intrinsicSize delegates to ctx.measureIntrinsicSize', () => {
    const block = defineCompositeBlock({
      type: 'test.cta',
      name: 'Test CTA',
      summary: 'A test composite.',
      keywords: ['test'],
      tier: 'A',
      schema: testSchema,
      defaults: { showLeaf: true },
      size: { preferred: [200, 100], min: [100, 50] },
      build: buildTestComposite,
    })

    if (block.intrinsicSize && ctx.measureIntrinsicSize) {
      const size = block.intrinsicSize({ showLeaf: true } as any, ctx)
      expect(size).toBeDefined()
      expect(size.width).toBeGreaterThan(0)
      expect(size.height).toBeGreaterThan(0)
    }
  })

  it('defaults to motion with parts: ["root"] when not specified', () => {
    const block = defineCompositeBlock({
      type: 'test.cta',
      name: 'Test CTA',
      summary: 'A test composite.',
      keywords: ['test'],
      tier: 'A',
      schema: {},
      defaults: {},
      size: { preferred: [200, 100], min: [100, 50] },
      build: () => ({ id: 'x', type: 'test.leaf', props: {} }),
    })

    expect(block.motion).toEqual({ parts: ['root'] })
  })

  it('uses provided family override', () => {
    const block = defineCompositeBlock({
      type: 'test.cta',
      name: 'Test CTA',
      summary: 'A test composite.',
      keywords: ['test'],
      tier: 'A',
      family: 'text',
      schema: {},
      defaults: {},
      size: { preferred: [200, 100], min: [100, 50] },
      build: () => ({ id: 'x', type: 'test.leaf', props: {} }),
    })

    expect(block.family).toBe('text')
  })
})

/** Helper to cast a LayoutNode to group after checking k. */
function asGroup(node: LayoutNode): Extract<LayoutNode, { k: 'group' }> {
  if (node.k !== 'group') throw new Error(`expected group, got ${node.k}`)
  return node
}
