/**
 * Tests for tls.c.stat-card — composite block built with defineCompositeBlock.
 *
 * Covers:
 * - Layout delegates to tls.l.card → tls.l.stack via ctx.layoutChild
 * - build() produces the correct spec tree
 * - showIcon: false removes the icon child (reflow)
 * - Root part is 'root'
 */

import { tlsCStatCard } from './index'
import { makeCtx, collectParts } from '../../layout/test-helpers'
import { registerBuiltInBlocks, BUILT_IN_BLOCKS } from '../../index'
import { BlockRegistry } from '../../../registry'
import type { LayoutNode, BlockDefinition } from '../../../types'

function asGroup(node: LayoutNode): Extract<LayoutNode, { k: 'group' }> {
  if (node.k !== 'group') throw new Error(`expected group, got ${node.k}`)
  return node
}

/** Registry with all built-in blocks registered (needed for layoutChild to resolve composite children). */
function fullRegistry(): BlockRegistry {
  const reg = new BlockRegistry()
  registerBuiltInBlocks(reg)
  return reg
}

describe('tls.c.stat-card', () => {
  const registry = fullRegistry()

  it('is a Tier A composite block', () => {
    expect(tlsCStatCard.tier).toBe('A')
    expect(tlsCStatCard.family).toBe('composite')
  })

  it('layout() produces a root group with part "root"', () => {
    const ctx = makeCtx({ width: 400, height: 300 }, registry)
    const node = tlsCStatCard.layout(tlsCStatCard.defaults as any, ctx)
    expect(node.k).toBe('group')
    expect(node.part).toBe('root')
  })

  it('build() produces a tls.l.card spec with children', () => {
    const ctx = makeCtx({ width: 400, height: 300 }, registry)
    const node = asGroup(tlsCStatCard.layout(tlsCStatCard.defaults as any, ctx))

    // The stat-card's layout() delegates to ctx.layoutChild which wraps in a group.
    // That group's single child is the card's own root group.
    expect(node.children).toHaveLength(1)
    const cardRoot = asGroup(node.children[0])

    // The card's root group has: background rect + stack wrapper = 2 children
    expect(cardRoot.children).toHaveLength(2)
    expect(cardRoot.children[0].part).toBe('background')
  })

  it('showIcon: false removes the icon child (reflow)', () => {
    const ctx = makeCtx({ width: 400, height: 300 }, registry)
    const props = { ...tlsCStatCard.defaults, showIcon: false } as any
    const node = tlsCStatCard.layout(props, ctx)
    const parts = collectParts(node)

    // When showIcon is false, no 'icon' part should appear in the tree
    expect(parts).not.toContain('icon')
  })

  it('showIcon defaults to true (absent → shown)', () => {
    const ctx = makeCtx({ width: 400, height: 300 }, registry)
    const node = tlsCStatCard.layout(tlsCStatCard.defaults as any, ctx)
    const parts = collectParts(node)

    // With showIcon absent (default true), icon should be in the tree
    expect(parts).toContain('icon')
  })

  it('intrinsicSize delegates to measureIntrinsicSize', () => {
    const ctx = makeCtx({ width: 400, height: 300 }, registry)
    const size = tlsCStatCard.intrinsicSize?.(tlsCStatCard.defaults as any, ctx)
    expect(size).toBeDefined()
    expect(size!.width).toBeGreaterThan(0)
    expect(size!.height).toBeGreaterThan(0)
  })

  it('describe.example is a valid stat-card spec', () => {
    expect(tlsCStatCard.describe?.example).toBeDefined()
    expect(tlsCStatCard.describe!.example.type).toBe('tls.c.stat-card')
  })

  it('toggles slots are declared in schema', () => {
    expect(tlsCStatCard.schema?.showIcon).toBeDefined()
    expect(tlsCStatCard.schema?.showIcon.toggles).toBe('icon')
    expect(tlsCStatCard.schema?.showIcon.type.kind).toBe('boolean')
  })

  it('defaults include showIcon: undefined (absent = shown)', () => {
    // showIcon is absent from defaults — isShown returns true when key is absent
    expect(tlsCStatCard.defaults).not.toHaveProperty('showIcon')
  })
})
