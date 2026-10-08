/**
 * B1 — Nested HTML (Tier B) blocks: own props + instance colours.
 *
 * Tests:
 * 1. A Tier B block nested in a container renders its OWN props in the DOM,
 *    not the parent's (via host node's `props` field).
 * 2. Instance `$block.style.accent = '#ff0000'` produces a host root whose
 *    `--tls-accent` var is `#ff0000`, and one without the override sets nothing.
 */

import * as React from 'react'
import { render, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

import { HostRegistry, type HostRenderer, type HostRenderContext } from './host-registry'
import { renderNodeToDom, HostLayoutContext } from './render-dom'
import { HostRegistryContext } from '../hooks/useHostRegistry'
import { BlockRegistryContext } from '../hooks/useBlockRegistry'
import { BlockRegistry } from './registry'
import { registerBuiltInBlocks } from './library'
import { tlsLCard } from './library/layout/tls-l-card'
import { tlsCBigStat } from './library/composite/tls-c-big-stat'
import { createLayoutContext } from './layout/layout-child'
import { resolveTokens } from './tokens'
import type { LayoutContext, LayoutNode, ResolvedTokens, SurfaceContext, BlockStyleSpec } from './types'

/* ── helpers ──────────────────────────────────────────────────────────────────── */

const TEST_TOKENS: ResolvedTokens = resolveTokens({
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    text: '#1a1a1a',
    textMuted: '#6b7280',
    accent1: '#3b82f6',
    accent2: '#8b5cf6',
  },
  fonts: { script: 'script', sans: 'sans', serif: 'serif', mono: 'mono', heading: 'sans', body: 'sans' },
} as any)

const TEST_SURFACE: SurfaceContext = {
  behind: { type: 'solid', color: '#ffffff' },
  luminance: 1,
  overImage: false,
}

/** Build a real LayoutContext with the full builtin registry. */
function makeCtx(box: { width: number; height: number }, style?: BlockStyleSpec, depth = 0): LayoutContext {
  const registry = new BlockRegistry()
  registerBuiltInBlocks(registry)
  return createLayoutContext({
    box,
    tokens: TEST_TOKENS,
    surface: TEST_SURFACE,
    registry,
    style,
    depth,
  })
}

/* ── Tests ──────────────────────────────────────────────────────────────────── */

describe('B1: nested Tier B host renders own props', () => {
  beforeEach(() => {
    // Ensure the block registry is clean for each test
  })

  afterEach(() => {
    cleanup()
  })

  it('a tls.c.big-stat nested in a tls.l.card renders its own props, not the card\'s', () => {
    // The card has padding: 'md' and children: [big-stat]
    // The big-stat has value: 9999999, label: 'Nested Stat'
    const cardProps = {
      padding: 'md',
      children: [{
        id: 'b_nested_stat',
        type: 'tls.c.big-stat',
        props: {
          value: 9999999,
          label: 'Nested Stat',
          format: 'compact',
          prefix: '$',
        } as Record<string, unknown>,
        style: undefined,
      }],
    }

    const ctx = makeCtx({ width: 1920, height: 1080 })

    // Render the card's layout, which will call layoutChild for the big-stat
    const cardNode = tlsLCard.layout(cardProps as any, ctx)

    // Find the host node inside the card's children
    const hostNode = findHostNode(cardNode)
    expect(hostNode).toBeDefined()
    expect(hostNode!.render).toBe('tls.c.big-stat')

    // The host node should carry its own props
    expect(hostNode!.props).toBeDefined()
    expect((hostNode!.props as any).value).toBe(9999999)
    expect((hostNode!.props as any).label).toBe('Nested Stat')
  })

  it('when rendered, the nested big-stat shows its own value text, not empty/placeholder', () => {
    // We need to render the host node with a BlockRegistry-backed renderer
    // The createHtmlBlockRenderer needs the block definition from the registry

    const registry = new BlockRegistry()
    registerBuiltInBlocks(registry)

    // Build the card with nested big-stat
    const ctx = makeCtx({ width: 800, height: 600 })
    const cardProps = {
      padding: 'sm',
      children: [{
        id: 'b_nested_stat',
        type: 'tls.c.big-stat',
        props: {
          value: 4200000,
          label: 'Revenue',
          format: 'compact',
          prefix: '$',
        } as Record<string, unknown>,
      }],
    }

    const cardNode = tlsLCard.layout(cardProps as any, ctx)
    const hostNode = findHostNode(cardNode)
    expect(hostNode).toBeDefined()
    expect(hostNode!.props).toBeDefined()
    expect((hostNode!.props as any).value).toBe(4200000)

    // Now render through renderNodeToDom with providers
    const el = renderNodeToDom(cardNode)
    const blockRegistry = new BlockRegistry()
    registerBuiltInBlocks(blockRegistry)
    const wrapper = render(
      <BlockRegistryContext.Provider value={blockRegistry}>
        <HostLayoutContext.Provider value={{
          tokens: TEST_TOKENS,
          surface: TEST_SURFACE,
          props: cardProps,
          headless: false,
        }}>
          {el}
        </HostLayoutContext.Provider>
      </BlockRegistryContext.Provider>,
    )

    // The DOM should contain the big-stat's value text 'Revenue' and the formatted value '$4.2M'
    const valueEl = wrapper.queryByText('$4.2M')
    expect(valueEl).toBeTruthy()

    const labelEl = wrapper.queryByText('Revenue')
    expect(labelEl).toBeTruthy()
  })
})

describe('B1: instance colour overrides on Tier B blocks via vars', () => {
  afterEach(() => {
    cleanup()
  })

  it('Tier B layout produces vars with --tls-accent when $block.style.accent is set', () => {
    const style: BlockStyleSpec = { accent: '#ff0000' }
    const ctx = makeCtx({ width: 1920, height: 1080 }, style, 0)

    const node = tlsCBigStat.layout(
      { value: 42, label: 'Test' } as any,
      ctx,
    )

    expect(node.k).toBe('host')
    expect((node as any).vars).toBeDefined()
    expect((node as any).vars['--tls-accent']).toBe('#ff0000')
  })

  it('Tier B layout produces no vars when no style override and top-level (depth 0)', () => {
    const ctx = makeCtx({ width: 1920, height: 1080 }, undefined, 0)

    const node = tlsCBigStat.layout(
      { value: 42, label: 'Test' } as any,
      ctx,
    )

    expect(node.k).toBe('host')
    // No style override, top-level: vars should be undefined
    expect((node as any).vars).toBeUndefined()
  })

  it('nested Tier B layout produces vars (depth > 0)', () => {
    // Build a context that simulates being nested (depth = 1)
    const nestedCtx = makeCtx({ width: 1920, height: 1080 }, undefined, 1)

    const node = tlsCBigStat.layout(
      { value: 42, label: 'Test' } as any,
      nestedCtx,
    )

    expect(node.k).toBe('host')
    expect((node as any).vars).toBeDefined()
    // Should have at least --tls-text-muted from the nested rule
    expect((node as any).vars).toHaveProperty('--tls-text-muted')
  })

  it('HostMount applies node.vars as inline CSS custom properties', () => {
    const registry = new HostRegistry()
    const blockRegistry = new BlockRegistry()
    registerBuiltInBlocks(blockRegistry)
    const mountFn = jest.fn()
    registry.register('tls.c.big-stat', { mount: mountFn })

    const testVars = { '--tls-accent': '#00ff00' }

    const hostNode: LayoutNode = {
      k: 'host',
      box: { x: 0, y: 0, width: 400, height: 200 },
      render: 'tls.c.big-stat',
      part: 'root',
      vars: testVars,
      props: { value: 42 },
    }

    const el = renderNodeToDom(hostNode)
    const result = render(
      <BlockRegistryContext.Provider value={blockRegistry}>
        <HostRegistryContext.Provider value={registry}>
          <HostLayoutContext.Provider value={{
            tokens: TEST_TOKENS,
            surface: TEST_SURFACE,
            props: {},
            headless: false,
          }}>
            {el}
          </HostLayoutContext.Provider>
        </HostRegistryContext.Provider>
      </BlockRegistryContext.Provider>,
    )

    // Wait for mount effect
    const hostDiv = result.container.querySelector('[data-render="tls.c.big-stat"]')
    expect(hostDiv).toBeTruthy()

    // The inline style should contain the CSS var
    const style = hostDiv?.getAttribute('style') ?? ''
    expect(style).toContain('--tls-accent: #00ff00')

    cleanup()
  })

  it('HostMount merges node.vars AFTER deck tokens (vars win)', () => {
    const registry = new HostRegistry()
    const blockRegistry = new BlockRegistry()
    registerBuiltInBlocks(blockRegistry)
    const mountFn = jest.fn()
    registry.register('tls.c.big-stat', { mount: mountFn })

    const testVars = { '--tls-accent': '#customacccent' }

    const hostNode: LayoutNode = {
      k: 'host',
      box: { x: 0, y: 0, width: 400, height: 200 },
      render: 'tls.c.big-stat',
      part: 'root',
      vars: testVars,
      props: { value: 42 },
    }

    const el = renderNodeToDom(hostNode)
    const result = render(
      <BlockRegistryContext.Provider value={blockRegistry}>
        <HostRegistryContext.Provider value={registry}>
          <HostLayoutContext.Provider value={{
            tokens: TEST_TOKENS,
            surface: TEST_SURFACE,
            props: {},
            headless: false,
          }}>
            {el}
          </HostLayoutContext.Provider>
        </HostRegistryContext.Provider>
      </BlockRegistryContext.Provider>,
    )

    const hostDiv = result.container.querySelector('[data-render="tls.c.big-stat"]')
    expect(hostDiv).toBeTruthy()

    const style = hostDiv?.getAttribute('style') ?? ''
    // The custom var should win over the deck token value
    expect(style).toContain('--tls-accent: #customacccent')

    cleanup()
  })
})

/* ── helpers ──────────────────────────────────────────────────────────────────── */

/** Recursively find the first `k: 'host'` node in a LayoutNode tree. */
function findHostNode(node: LayoutNode): LayoutNode | undefined {
  if (node.k === 'host') return node
  if (node.k === 'group' && 'children' in node) {
    for (const child of node.children) {
      const found = findHostNode(child)
      if (found) return found
    }
  }
  return undefined
}
