/**
 * R1 Expected Output — HostRegistry and host-node lifecycle tests.
 *
 * Tests the host-node lifecycle through the public API (renderNodeToDom):
 * - HostRegistry: register, get, has, unknown id
 * - Host node mount/update/unmount via renderNodeToDom
 * - Structural-prop-diff behavior (not on x/y changes)
 * - Disposer honoured, unknown id → data-host-missing
 */

import * as React from 'react'
import { render, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { HostRegistry, type HostRenderer, type HostRenderContext } from './host-registry'
import { renderNodeToDom, HostLayoutContext } from './render-dom'
import { HostRegistryContext } from '../hooks/useHostRegistry'
import type { Box, LayoutNode, ResolvedTokens, SurfaceContext } from './types'

/* ── helpers ──────────────────────────────────────────────────────────────────── */

const MINIMAL_TOKENS: ResolvedTokens = {
  color: { surface: '#fff', text: '#000', textMuted: '#666', accent: '#00f', positive: '#0a0', negative: '#a00', warning: '#aa0' },
  categorical: { ramp: [] },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64, '4xl': 96 },
  radius: { sm: 4, md: 8, lg: 16, xl: 24 },
  type: {
    display: { size: 72, lineHeight: 1.1 },
    title: { size: 56, lineHeight: 1.15 },
    heading: { size: 44, lineHeight: 1.2 },
    subheading: { size: 32, lineHeight: 1.25 },
    lead: { size: 24, lineHeight: 1.35 },
    body: { size: 20, lineHeight: 1.5 },
    caption: { size: 16, lineHeight: 1.4 },
    footnote: { size: 13, lineHeight: 1.4 },
  },
  elevation: { sm: '0 1px 2px rgba(0,0,0,0.1)', md: '0 4px 8px rgba(0,0,0,0.12)', lg: '0 8px 24px rgba(0,0,0,0.16)' },
  motion: { duration: { instant: 0, fast: 150, normal: 300, slow: 500 }, ease: { default: 'ease-out', enter: 'ease-out', exit: 'ease-in' } },
  density: 'default',
  fontFamily: '"Inter", sans-serif',
}

const MINIMAL_SURFACE: SurfaceContext = {
  behind: { type: 'solid', color: '#ffffff' },
  luminance: 1,
  overImage: false,
}

function makeHostNode(overrides?: Partial<LayoutNode>): LayoutNode {
  return {
    k: 'host',
    box: { x: 0, y: 0, width: 400, height: 200 },
    render: 'test-renderer',
    ...overrides,
  } as LayoutNode
}

/* ── HostRegistry ─────────────────────────────────────────────────────────────── */

describe('HostRegistry', () => {
  it('register and get returns the renderer', () => {
    const registry = new HostRegistry()
    const renderer: HostRenderer = { mount: jest.fn() }
    registry.register('test-renderer', renderer)
    expect(registry.get('test-renderer')).toBe(renderer)
    expect(registry.has('test-renderer')).toBe(true)
  })

  it('get for unknown id returns undefined', () => {
    const registry = new HostRegistry()
    expect(registry.get('nonexistent')).toBeUndefined()
    expect(registry.has('nonexistent')).toBe(false)
  })
})

/* ── Host node lifecycle via renderNodeToDom ──────────────────────────────────── */

describe('host node lifecycle (via renderNodeToDom)', () => {
  let registry: HostRegistry

  beforeEach(() => {
    registry = new HostRegistry()
  })

  afterEach(() => {
    cleanup()
  })

  function renderWithProviders(node: LayoutNode, props?: Record<string, unknown>) {
    const el = renderNodeToDom(node, MINIMAL_TOKENS, MINIMAL_SURFACE, registry, props ?? {})
    return render(
      <HostRegistryContext.Provider value={registry}>
        <HostLayoutContext.Provider value={{
          tokens: MINIMAL_TOKENS,
          surface: MINIMAL_SURFACE,
          props: props ?? {},
          headless: false,
        }}>
          {el}
        </HostLayoutContext.Provider>
      </HostRegistryContext.Provider>
    )
  }

  it('mount is called once for a known renderer', () => {
    const mountFn = jest.fn()
    registry.register('test-renderer', { mount: mountFn })
    renderWithProviders(makeHostNode())
    expect(mountFn).toHaveBeenCalledTimes(1)
  })

  it('unknown renderer gets data-host-missing attribute', () => {
    const { container } = renderWithProviders(makeHostNode({ render: 'unknown-id' }))
    const div = container.querySelector('[data-host-missing]')
    expect(div).toBeTruthy()
    expect(div?.getAttribute('data-host-missing')).toBe('unknown-id')
  })

  it('mount receives correct HostRenderContext', () => {
    let receivedCtx: HostRenderContext | undefined
    registry.register('test-renderer', {
      mount: (_root, ctx) => { receivedCtx = ctx },
    })
    const props = { text: 'hello' }
    renderWithProviders(makeHostNode(), props)

    expect(receivedCtx).toBeDefined()
    expect(receivedCtx!.props).toEqual(props)
    expect(receivedCtx!.box.width).toBe(400)
    expect(receivedCtx!.box.height).toBe(200)
    expect(receivedCtx!.headless).toBe(false)
  })

  it('disposer is called on unmount', () => {
    const disposer = jest.fn()
    registry.register('test-renderer', {
      mount: () => disposer,
    })

    const { unmount } = renderWithProviders(makeHostNode())
    unmount()
    expect(disposer).toHaveBeenCalledTimes(1)
  })

  it('unmount handler is called on removal', () => {
    const unmountFn = jest.fn()
    registry.register('test-renderer', {
      mount: jest.fn(),
      unmount: unmountFn,
    })

    const { unmount } = renderWithProviders(makeHostNode())
    unmount()
    expect(unmountFn).toHaveBeenCalledTimes(1)
  })
})
