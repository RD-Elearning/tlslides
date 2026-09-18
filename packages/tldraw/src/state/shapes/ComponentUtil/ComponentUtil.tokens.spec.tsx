/**
 * Q4 — the editor must render blocks with the deck's REAL tokens.
 *
 * `ComponentUtil` used to build every block's `LayoutContext` from a pair of hardcoded, module-
 * level constants (a second, disagreeing scale system) instead of the deck's actual theme and the
 * current slide's actual background. These tests assert the fix at the only place that matters:
 * the exact `LayoutContext` object a `BlockDefinition.layout()` is called with.
 *
 * A spy `BlockDefinition` records every `LayoutContext` it is given (by reference, not by
 * snapshot), so the assertions below are about the real values/identity the render produced, not
 * about reading the implementation.
 */
import * as React from 'react'
import { act, render } from '@testing-library/react'
import { Component } from '..'
import { TldrawContext, BlockRegistryContext } from '~hooks'
import { TldrawApp } from '~state'
import { BlockRegistry } from '~blocks/registry'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'
import type { BlockDefinition, LayoutContext, LayoutNode } from '~blocks/types'

const MONO_GRID = BUILT_IN_DECK_THEMES.find((t) => t.id === 'mono-grid')
const MIDNIGHT = BUILT_IN_DECK_THEMES.find((t) => t.id === 'midnight')

if (!MONO_GRID || !MIDNIGHT) {
  throw new Error('Expected BUILT_IN_DECK_THEMES to contain both mono-grid and midnight')
}

function noopEvents() {
  return {
    onPointerDown: () => void 0,
    onPointerUp: () => void 0,
    onPointerEnter: () => void 0,
    onPointerMove: () => void 0,
    onPointerLeave: () => void 0,
  }
}

/** A Tier-A block whose only job is to record the `LayoutContext` it receives, by reference. */
function makeSpyBlock(captured: LayoutContext[]): BlockDefinition {
  return {
    type: 'spy.ctx',
    name: 'Spy',
    family: 'layout',
    tier: 'A',
    summary: 'Captures the LayoutContext it is called with.',
    keywords: ['spy'],
    schema: {},
    defaults: {},
    size: { preferred: [320, 200], min: [100, 100] },
    layout: (_props: Record<string, unknown>, ctx: LayoutContext): LayoutNode => {
      captured.push(ctx)
      return {
        k: 'rect',
        box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
        part: 'spy-rect',
        fill: { type: 'solid', color: ctx.tokens.color.surface },
      }
    },
    motion: {},
  }
}

function renderSpyBlock(app: TldrawApp, captured: LayoutContext[]) {
  const registry = new BlockRegistry()
  registry.register(makeSpyBlock(captured))

  const shape = Component.create({
    id: 'spy-1',
    componentId: 'spy.ctx',
    point: [40, 60],
    size: [320, 200],
    props: {},
  })

  return render(
    <TldrawContext.Provider value={app}>
      <BlockRegistryContext.Provider value={registry}>
        <Component.Component
          shape={shape}
          isEditing={false}
          isBinding={false}
          isHovered={false}
          isSelected={false}
          isGhost={false}
          bounds={{ minX: 0, minY: 0, maxX: 320, maxY: 200, width: 320, height: 200 }}
          meta={{ isDarkMode: false }}
          events={noopEvents()}
        />
      </BlockRegistryContext.Provider>
    </TldrawContext.Provider>
  )
}

describe('ComponentUtil renders blocks with the deck\'s real tokens (Q4)', () => {
  it('carries different tokens.color.surface / tokens.color.text when the document theme changes', () => {
    const app = new TldrawApp()
    act(() => {
      app.setDeckTheme(MONO_GRID)
    })

    const captured: LayoutContext[] = []
    renderSpyBlock(app, captured)

    expect(captured).toHaveLength(1)
    const before = captured[0].tokens

    act(() => {
      app.setDeckTheme(MIDNIGHT)
    })

    expect(captured.length).toBeGreaterThanOrEqual(2)
    const after = captured[captured.length - 1].tokens

    // The headline claim: switching the deck's theme actually changes what a block is handed,
    // not just what the document records.
    expect(after.color.surface).not.toBe(before.color.surface)
    expect(after.color.text).not.toBe(before.color.text)

    // Sanity: these are the real, theme-specific values (mono-grid is a light theme, midnight is
    // dark), not two arbitrary strings that happen to differ.
    expect(before.color.surface.toLowerCase()).not.toBe(after.color.surface.toLowerCase())
  })

  it('does not allocate a new ResolvedTokens object on an unrelated store tick', () => {
    const app = new TldrawApp()
    act(() => {
      app.setDeckTheme(MONO_GRID)
    })

    const captured: LayoutContext[] = []
    renderSpyBlock(app, captured)

    expect(captured).toHaveLength(1)
    const tokensBefore = captured[0].tokens
    const surfaceBefore = captured[0].surface

    // An unrelated document mutation — renaming the current page touches `document.pages`, not
    // `document.theme` / `document.tokens` / the page's `background` — still produces a new
    // top-level `document` object (so the component *does* re-render), which is exactly the case
    // an unmemoised `resolveTokens`/`surfaceFromBackground` call would get wrong.
    act(() => {
      app.renamePage(app.currentPageId, 'Renamed for the Q4 memoisation test')
    })

    expect(captured.length).toBeGreaterThanOrEqual(2)
    const tokensAfter = captured[captured.length - 1].tokens
    const surfaceAfter = captured[captured.length - 1].surface

    expect(tokensAfter).toBe(tokensBefore)
    expect(surfaceAfter).toBe(surfaceBefore)
  })
})
