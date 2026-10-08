/**
 * B7 — useInsertBlock hook tests.
 *
 * Tests:
 * 1. `buildInsertSpec` clones the example props with fresh ids.
 * 2. The cloned spec has no `style` key (stripped so block lands on theme colours).
 * 3. Nested children ids are regenerated (recursive).
 * 4. Falls back to defaults when no describe.example is provided.
 * 5. `useInsertBlock` returns null for unknown block types.
 * 6. `useInsertBlock` creates a shape with the current page as parent.
 */
import * as React from 'react'
import { render, act } from '@testing-library/react'
import '@testing-library/jest-dom'

import { buildInsertSpec, useInsertBlock, type InsertResult } from './useInsertBlock'
import { TldrawContext, BlockRegistryContext } from '~hooks'
import { TldrawApp } from '~state'
import { BlockRegistry } from '~blocks/registry'
import { registerBuiltInBlocks } from '~blocks/library'
import type { BlockSpec, BlockDefinition } from '~blocks/types'

// --- Test registry ---
const registry = new BlockRegistry()
registerBuiltInBlocks(registry)

// --- Helper: a spec with nested children ids ---
const nestedSpec: BlockSpec = {
  id: 'root-id',
  type: 'tls.l.row',
  props: {},
  children: [
    {
      id: 'child-1',
      type: 'tls.t.body',
      props: {},
    },
    {
      id: 'child-2',
      type: 'tls.t.body',
      props: {},
    },
  ],
}

describe('buildInsertSpec (B7 H7)', () => {
  it('deep-clones example props with fresh ids — no id equal to the example\'s', () => {
    const def = registry.get('tls.t.title')
    expect(def).toBeDefined()
    expect(def!.describe?.example).toBeDefined()

    const original = def!.describe!.example
    const cloned = buildInsertSpec(def!)

    // The top-level id must be different (regenerated).
    expect(cloned.id).not.toBe(original.id)
  })

  it('strips the instance `style` key from the cloned spec', () => {
    // Create a definition with a spec that carries a style.
    const defWithStyle: BlockDefinition = {
      type: 'tls.t.title',
      name: 'Title',
      family: 'text',
      tier: 'A',
      summary: '',
      keywords: [],
      schema: {},
      defaults: { text: 'test' },
      size: { preferred: [320, 100], min: [100, 50] },
      describe: {
        when: '',
        avoid: '',
        example: {
          id: 'b_test',
          type: 'tls.t.title',
          props: { text: 'Hello' },
          style: { surface: '#ff0000', on: '#00ff00' },
        },
      },
      layout: () => ({ k: 'rect', box: { x: 0, y: 0, width: 320, height: 100 }, fill: { type: 'solid', color: '#fff' } }),
      motion: {},
    }

    const cloned = buildInsertSpec(defWithStyle)
    expect(cloned.style).toBeUndefined()
  })

  it('regenerates nested children ids recursively', () => {
    const cloned = buildInsertSpec({
      type: 'tls.l.row',
      name: 'Row',
      family: 'layout',
      tier: 'A',
      summary: '',
      keywords: [],
      schema: {},
      defaults: {},
      size: { preferred: [320, 100], min: [100, 50] },
      describe: {
        when: '',
        avoid: '',
        example: nestedSpec,
      },
      layout: () => ({ k: 'rect', box: { x: 0, y: 0, width: 320, height: 100 }, fill: { type: 'solid', color: '#fff' } }),
      motion: {},
    })

    // Top-level id is regenerated
    expect(cloned.id).not.toBe('root-id')

    // Each child id is different from the original
    expect(cloned.children).toHaveLength(2)
    expect(cloned.children![0].id).not.toBe('child-1')
    expect(cloned.children![1].id).not.toBe('child-2')

    // And both children ids are different from each other
    expect(cloned.children![0].id).not.toBe(cloned.children![1].id)
  })

  it('falls back to defaults when no describe.example is provided', () => {
    const cloned = buildInsertSpec({
      type: 'tls.t.title',
      name: 'Title',
      family: 'text',
      tier: 'A',
      summary: '',
      keywords: [],
      schema: {},
      defaults: { text: { runs: [{ text: 'fallback' }] } },
      size: { preferred: [320, 100], min: [100, 50] },
      layout: () => ({ k: 'rect', box: { x: 0, y: 0, width: 320, height: 100 }, fill: { type: 'solid', color: '#fff' } }),
      motion: {},
    })

    expect(cloned.type).toBe('tls.t.title')
    expect(cloned.id).toBeTruthy()
    expect(cloned.props).toEqual({ text: { runs: [{ text: 'fallback' }] } })
  })
})

/** A tiny harness that calls useInsertBlock and exposes the latest return. */
function useInsertBlockHarness(): { current: ReturnType<typeof useInsertBlock> } {
  const ref = React.useRef<ReturnType<typeof useInsertBlock>>(null as any)
  ref.current = useInsertBlock()
  return ref
}

function renderInsertBlock(app: TldrawApp) {
  const harnessRef = { current: null as any }
  const Harness: React.FC = () => {
    harnessRef.current = useInsertBlock()
    return null
  }
  const { unmount } = render(
    <TldrawContext.Provider value={app}>
      <BlockRegistryContext.Provider value={registry}>
        <Harness />
      </BlockRegistryContext.Provider>
    </TldrawContext.Provider>,
  )
  return { harnessRef, unmount }
}

describe('useInsertBlock (B7)', () => {
  it('returns null for an unknown block type', () => {
    const app = new TldrawApp()
    const { harnessRef } = renderInsertBlock(app)

    const result = harnessRef.current('nonexistent-block-type')
    expect(result).toBeNull()
  })

  it('inserts a block and selects it', () => {
    const app = new TldrawApp()
    const originalCurrentPageId = app.currentPageId
    const { harnessRef } = renderInsertBlock(app)

    let insertResult: InsertResult | null = null
    act(() => {
      insertResult = harnessRef.current('tls.t.title')
    })

    expect(insertResult).not.toBeNull()
    expect(insertResult!.shapeId).toBeTruthy()
    expect(insertResult!.spec.type).toBe('tls.t.title')

    // The inserted shape should be selected
    const selectedIds = app.document.pageStates[originalCurrentPageId]?.selectedIds
    expect(selectedIds).toContain(insertResult!.shapeId)
  })

  it('inserts a block at a given page point (DnD path)', () => {
    const app = new TldrawApp()
    const { harnessRef } = renderInsertBlock(app)

    let insertResult: InsertResult | null = null
    act(() => {
      insertResult = harnessRef.current('tls.t.title', [800, 500] as [number, number])
    })

    expect(insertResult).not.toBeNull()
    expect(insertResult!.shapeId).toBeTruthy()
  })

  it('inserted shape has parent = current page', () => {
    const app = new TldrawApp()
    const { harnessRef } = renderInsertBlock(app)

    let insertResult: InsertResult | null = null
    act(() => {
      insertResult = harnessRef.current('tls.t.title')
    })

    expect(insertResult).not.toBeNull()

    // Find the shape in the document and verify its parent
    const page = app.document.pages[app.currentPageId]
    const insertedShape = page.shapes[insertResult!.shapeId]
    expect(insertedShape).toBeDefined()
    expect(insertedShape.parentId).toBe(app.currentPageId)
  })
})
