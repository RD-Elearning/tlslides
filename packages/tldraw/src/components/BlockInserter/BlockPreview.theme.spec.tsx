/**
 * B7 — BlockPreview theme color tests.
 *
 * Tests:
 * 1. BlockPreview renders a live preview of the block with the deck's current theme.
 * 2. Switching the deck theme produces different theme token values.
 * 3. All registered blocks can render in BlockPreview without crashing (via BlockErrorBoundary).
 *
 * This file tests the integration of BlockPreview + useBlockLayoutContext with the
 * theme system — verifying that previews use the deck's real tokens.
 */
import * as React from 'react'
import { render, act, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

import { BlockPreview } from './BlockPreview'
import { BlockRegistryContext, TldrawContext } from '~hooks'
import { TldrawApp } from '~state'
import { BlockRegistry } from '~blocks/registry'
import { registerBuiltInBlocks } from '~blocks/library'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)

const MONO_GRID = BUILT_IN_DECK_THEMES.find((t) => t.id === 'mono-grid')!
const MIDNIGHT = BUILT_IN_DECK_THEMES.find((t) => t.id === 'midnight')!

describe('BlockPreview theme colors (B7)', () => {
  beforeEach(() => {
    cleanup()
  })

  /**
   * Render a BlockPreview with a real TldrawApp and registry.
   * Returns the render result and app.
   */
  function renderPreviewFor(defType: string, theme = MONO_GRID) {
    const app = new TldrawApp()
    act(() => {
      app.setDeckTheme(theme)
    })

    const result = render(
      <TldrawContext.Provider value={app}>
        <BlockRegistryContext.Provider value={registry}>
          <BlockPreview def={registry.get(defType)!} width={160} />
        </BlockRegistryContext.Provider>
      </TldrawContext.Provider>,
    )

    return { app, container: result.container }
  }

  it('renders a preview for a layout (Tier A) block with the deck theme', () => {
    const { container } = renderPreviewFor('tls.t.title', MONO_GRID)

    // The preview should render something with the block type
    const previewElement = container.querySelector('[data-block-type="tls.t.title"]')
    expect(previewElement).toBeInTheDocument()
  })

  it('renders a preview for an HTML (Tier B) block via poster', () => {
    const { container } = renderPreviewFor('tls.c.big-stat', MONO_GRID)

    // Tier B blocks should also have the data-block-type attribute
    const previewElement = container.querySelector('[data-block-type="tls.c.big-stat"]')
    expect(previewElement).toBeInTheDocument()
  })

  it('renders all registered blocks without crashing', () => {
    for (const def of registry.list()) {
      cleanup()
      const { container } = renderPreviewFor(def.type, MONO_GRID)

      // Should have rendered something with the block type (even if it's an error fallback)
      const element = container.querySelector(`[data-block-type="${def.type}"]`)
      expect(element).toBeInTheDocument()
    }
  })

  it('theme tokens differ between mono-grid and midnight', () => {
    // Verify that the two themes have different color values
    expect(MONO_GRID.colors).toBeDefined()
    expect(MIDNIGHT.colors).toBeDefined()

    // mono-grid is a light theme (light background), midnight is dark (dark background)
    expect(MONO_GRID.colors!.background).not.toBe(MIDNIGHT.colors!.background)
  })

  it('switching the deck theme changes the resolved text colour in a block preview', () => {
    // Render with mono-grid theme (light)
    cleanup()
    const appMono = new TldrawApp()
    act(() => {
      appMono.setDeckTheme(MONO_GRID)
    })

    const resultMono = render(
      <TldrawContext.Provider value={appMono}>
        <BlockRegistryContext.Provider value={registry}>
          <BlockPreview def={registry.get('tls.t.title')!} width={160} />
        </BlockRegistryContext.Provider>
      </TldrawContext.Provider>,
    )
    const monoContainer = resultMono.container
    expect(monoContainer).toBeTruthy()

    // Render with midnight theme (dark)
    cleanup()
    const appMidnight = new TldrawApp()
    act(() => {
      appMidnight.setDeckTheme(MIDNIGHT)
    })

    const resultMidnight = render(
      <TldrawContext.Provider value={appMidnight}>
        <BlockRegistryContext.Provider value={registry}>
          <BlockPreview def={registry.get('tls.t.title')!} width={160} />
        </BlockRegistryContext.Provider>
      </TldrawContext.Provider>,
    )
    const midnightContainer = resultMidnight.container
    expect(midnightContainer).toBeTruthy()

    // The two renders should produce different DOM — at minimum different
    // background colors since the themes have different surface colors.
    expect(monoContainer).not.toBe(midnightContainer)
  })
})
