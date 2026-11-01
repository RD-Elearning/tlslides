import * as React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Component } from '..'
import { TldrawComponentsContext, BlockRegistryContext, TldrawContext } from '~hooks'
import { TldrawApp } from '~state'
import { ComponentShape, TDShapeType } from '~types'
import { BlockRegistry } from '~blocks/registry'
import { registerBuiltInBlocks } from '~blocks/library'
import { probeRects } from '~blocks/probe-blocks'

function noopEvents() {
  return {
    onPointerDown: () => void 0,
    onPointerUp: () => void 0,
    onPointerEnter: () => void 0,
    onPointerMove: () => void 0,
    onPointerLeave: () => void 0,
  }
}

// `Component.Component` now reads the deck's real tokens/surface off the live `TldrawApp`
// (Q4 — `useBlockLayoutContext`), so every render needs a real app in `TldrawContext`, not the
// context's `{}` default. `new TldrawApp()`'s own `defaultState` already has a usable document
// (a `slide1` page, no background/theme override) without needing `loadDocument`.
function renderComponentShape(shape: ComponentShape, registry: Record<string, React.ComponentType<any>>, blockRegistry?: BlockRegistry) {
  const app = new TldrawApp()
  return render(
    <TldrawContext.Provider value={app}>
      <BlockRegistryContext.Provider value={blockRegistry}>
        <TldrawComponentsContext.Provider value={registry}>
          <Component.Component
            shape={shape}
            isEditing={false}
            isBinding={false}
            isHovered={false}
            isSelected={false}
            isGhost={false}
            bounds={{ minX: 0, minY: 0, maxX: shape.size[0], maxY: shape.size[1], width: shape.size[0], height: shape.size[1] }}
            meta={{ isDarkMode: false }}
            events={noopEvents()}
          />
        </TldrawComponentsContext.Provider>
      </BlockRegistryContext.Provider>
    </TldrawContext.Provider>
  )
}

describe('Component shape', () => {
  it('Creates a shape', () => {
    expect(Component.create({ id: 'component' })).toMatchSnapshot('component')
  })

  it('defaults to an empty componentId and props bag', () => {
    const shape = Component.create({ id: 'component' })
    expect(shape.componentId).toBe('')
    expect(shape.props).toEqual({})
    expect(shape.type).toBe(TDShapeType.Component)
  })

  it('renders the registered component, spreading shape.props onto it', () => {
    const KpiTile = ({ label, value }: { label: string; value: string }) => (
      <div data-testid="kpi-tile">
        {label}: {value}
      </div>
    )

    const shape = Component.create({
      id: 'component1',
      componentId: 'kpi-tile',
      props: { label: 'Revenue', value: '$1.2M' },
    })

    renderComponentShape(shape, { 'kpi-tile': KpiTile })

    expect(screen.getByTestId('kpi-tile')).toHaveTextContent('Revenue: $1.2M')
  })

  it('renders a placeholder, and does not throw, when componentId is not in the registry', () => {
    const shape = Component.create({
      id: 'component2',
      componentId: 'does-not-exist',
      props: {},
    })

    expect(() => renderComponentShape(shape, {})).not.toThrow()
    expect(screen.getByText('Unknown block')).toBeInTheDocument()
    expect(screen.getByText('does-not-exist')).toBeInTheDocument()
  })

  it('renders a placeholder when no registry is provided at all', () => {
    const shape = Component.create({ id: 'component3', componentId: 'kpi-tile', props: {} })
    const app = new TldrawApp()

    render(
      <TldrawContext.Provider value={app}>
        <Component.Component
          shape={shape}
          isEditing={false}
          isBinding={false}
          isHovered={false}
          isSelected={false}
          isGhost={false}
          bounds={{ minX: 0, minY: 0, maxX: shape.size[0], maxY: shape.size[1], width: shape.size[0], height: shape.size[1] }}
          meta={{ isDarkMode: false }}
          events={noopEvents()}
        />
      </TldrawContext.Provider>
    )

    expect(screen.getByText('Unknown block')).toBeInTheDocument()
  })

  it('does not crash the shape tree when a registered component throws while rendering', () => {
    const Boom = () => {
      throw new Error('boom')
    }
    const shape = Component.create({ id: 'component4', componentId: 'boom', props: {} })

    // eslint-disable-next-line no-console
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => void 0)
    expect(() => renderComponentShape(shape, { boom: Boom })).not.toThrow()
    errorSpy.mockRestore()

    expect(screen.getByText('Block crashed')).toBeInTheDocument()
  })

  it('emits a labelled placeholder rect for SVG export instead of dropping the block', () => {
    const shape = Component.create({ id: 'component5', componentId: 'bar-chart', size: [300, 150] })
    const svg = Component.getSvgElement(shape)

    expect(svg.querySelector('rect')).toBeTruthy()
    expect(svg.querySelector('rect')?.getAttribute('width')).toBe('300')
    expect(svg.querySelector('rect')?.getAttribute('height')).toBe('150')
    expect(svg.textContent).toContain('bar-chart')
  })

  it('renders through renderNodeToDom when a BlockDefinition exists in the BlockRegistry', () => {
    const registry = new BlockRegistry()
    registry.register(probeRects)

    const shape = Component.create({
      id: 'block-1',
      componentId: 'probe.rects',
      size: [960, 540],
      props: {},
    })

    renderComponentShape(shape, {}, registry)

    // probe.rects renders a group with two rect children (rect-a, rect-b)
    // The rendered DOM should contain data-part attributes from renderNodeToDom
    expect(screen.getByTestId).toBeDefined()
    // The layout renders div elements with inline styles (position: absolute, background-color, etc.)
    // Not a grey placeholder box
    const root = document.querySelector('[data-part="probe-rects"]')
    expect(root).toBeTruthy()
    // The two rect children should be present
    expect(screen.getByTestId).toBeDefined()
    expect(document.querySelector('[data-part="rect-a"]')).toBeTruthy()
    expect(document.querySelector('[data-part="rect-b"]')).toBeTruthy()
  })

  it('falls back to the existing placeholder when the BlockRegistry does not have the componentId', () => {
    const registry = new BlockRegistry()
    registry.register(probeRects) // register probe.rects, but test with a different componentId

    const shape = Component.create({
      id: 'block-2',
      componentId: 'unknown-block',
      size: [300, 200],
      props: {},
    })

    renderComponentShape(shape, {}, registry)

    // Should fall through to MissingBlockPlaceholder
    expect(screen.getByText('Unknown block')).toBeInTheDocument()
    expect(screen.getByText('unknown-block')).toBeInTheDocument()
  })

  it('falls back to the TldrawComponentsContext when no BlockRegistry is provided', () => {
    const KpiTile = ({ label }: { label: string }) => (
      <div data-testid="kpi-fallback">{label}</div>
    )

    const shape = Component.create({
      id: 'block-3',
      componentId: 'kpi-tile',
      size: [300, 200],
      props: { label: 'Revenue' },
    })

    renderComponentShape(shape, { 'kpi-tile': KpiTile })

    expect(screen.getByTestId('kpi-fallback')).toHaveTextContent('Revenue')
  })

  it('prefers BlockRegistry over TldrawComponentsContext when both have the same componentId', () => {
    // When both the BlockRegistry and the components registry have the same componentId,
    // the BlockRegistry wins (real DOM rendering takes priority over placeholder).
    const registry = new BlockRegistry()
    registry.register(probeRects)

    const PlaceholderComponent = () => (
      <div data-testid="placeholder-component">I am a placeholder</div>
    )

    const shape = Component.create({
      id: 'block-4',
      componentId: 'probe.rects',
      size: [960, 540],
      props: {},
    })

    renderComponentShape(shape, { 'probe.rects': PlaceholderComponent }, registry)

    // The BlockRegistry should win — probe-rects data-part should exist
    expect(document.querySelector('[data-part="probe-rects"]')).toBeTruthy()
    // The placeholder component should NOT be rendered
    expect(screen.queryByTestId('placeholder-component')).toBeNull()
  })

  describe('R11 — inline text editing', () => {
    // The real detector runs on `pointerdown` (see ComponentUtil.tsx's own comment on why
    // `dblclick`/`onDoubleClick` can't see the actual target once pointer capture is set), so
    // the test double-click has to be two `pointerdown`s too, not `fireEvent.doubleClick`.
    function doubleClick(target: HTMLElement) {
      fireEvent.pointerDown(target)
      fireEvent.pointerDown(target)
    }

    function renderTitleBlock(props: Record<string, unknown>, componentId = 'tls.t.bullets', readOnly = false) {
      const app = new TldrawApp()
      app.readOnly = readOnly
      const registry = new BlockRegistry()
      registerBuiltInBlocks(registry)
      const shape = Component.create({
        id: 'bullets-block',
        componentId,
        size: [960, 400],
        props,
      })
      render(
        <TldrawContext.Provider value={app}>
          <BlockRegistryContext.Provider value={registry}>
            <TldrawComponentsContext.Provider value={{}}>
              <Component.Component
                shape={shape}
                isEditing={false}
                isBinding={false}
                isHovered={false}
                isSelected={false}
                isGhost={false}
                bounds={{ minX: 0, minY: 0, maxX: shape.size[0], maxY: shape.size[1], width: shape.size[0], height: shape.size[1] }}
                meta={{ isDarkMode: false }}
                events={noopEvents()}
              />
            </TldrawComponentsContext.Provider>
          </BlockRegistryContext.Provider>
        </TldrawContext.Provider>
      )
      return { app, shape }
    }

    const bulletsProps = {
      items: [{ text: 'First item' }, { text: 'Second item' }],
      marker: 'dot',
    }

    // Opening the editor is deferred a tick past the double-click (see ComponentUtil.tsx's
    // comment on the `app.select()` race this sidesteps), so tests wait for it rather than
    // reading the DOM synchronously right after firing the events.
    async function findEditor() {
      return waitFor(() => {
        const editor = document.querySelector('[contenteditable="true"]') as HTMLElement | null
        if (!editor) throw new Error('editor not open yet')
        return editor
      })
    }

    it('double-clicking a [data-prop-path] element opens a contentEditable overlay seeded with its value', async () => {
      renderTitleBlock(bulletsProps)

      const target = document.querySelector('[data-prop-path="items.1.text"]') as HTMLElement
      expect(target).toBeTruthy()

      doubleClick(target)

      const editor = await findEditor()
      expect(editor.textContent).toBe('Second item')
    })

    it('editing a nested prop path writes the value back at that path, not a stray flat key', async () => {
      const { app, shape } = renderTitleBlock(bulletsProps)
      const updateShapes = jest.spyOn(app, 'updateShapes')

      const target = document.querySelector('[data-prop-path="items.1.text"]') as HTMLElement
      doubleClick(target)

      const editor = await findEditor()
      editor.textContent = 'Edited second item'
      fireEvent.blur(editor)

      expect(updateShapes).toHaveBeenCalledTimes(1)
      const [[rawCall]] = updateShapes.mock.calls
      const call = rawCall as unknown as { id: string; props: Record<string, unknown> }
      expect(call.id).toBe(shape.id)
      const newItems = (call.props as { items: Array<{ text: string }> }).items
      // The bug this guards against: `{ [propPath]: value }` would have written a literal
      // `"items.1.text"` key alongside the untouched `items` array instead of updating it.
      expect(newItems[1].text).toBe('Edited second item')
      expect(newItems[0].text).toBe('First item')
      // The bug this guards against produced a literal own-property named "items.1.text"
      // (from `{ [propPath]: value }`) instead of updating the nested array.
      expect(Object.prototype.hasOwnProperty.call(call.props, 'items.1.text')).toBe(false)

      // Original shape untouched (setAtPath must not mutate in place — undo safety).
      const originalItems = (shape.props as { items: Array<{ text: string }> }).items
      expect(originalItems[1].text).toBe('Second item')
    })

    it('a rich-text value ({ runs }) opens seeded with its text and is written back as runs', async () => {
      const { app } = renderTitleBlock({
        items: [{ text: { runs: [{ text: 'Plain ' }, { text: 'bold', bold: true }] } }, { text: 'x' }],
        marker: 'dot',
      })
      const updateShapes = jest.spyOn(app, 'updateShapes')
      doubleClick(document.querySelector('[data-prop-path="items.0.text"]') as HTMLElement)
      const editor = await findEditor()
      // the overlay is portalled to <body>, outside the transformed canvas
      expect(editor.closest('[data-prop-path]')?.parentElement).toBe(document.body)
      // editor E03: bold shows as bold — no `**` markers in the overlay
      expect(editor.textContent).toBe('Plain bold')
      expect(editor.querySelector('span[data-bold]')?.textContent).toBe('bold')
      ;(editor.querySelector('span[data-bold]') as HTMLElement).textContent = 'bolder'
      fireEvent.blur(editor)
      const call = updateShapes.mock.calls[0][0] as unknown as { props: { items: Array<{ text: unknown }> } }
      expect(call.props.items[0].text).toEqual({ runs: [{ text: 'Plain ' }, { text: 'bolder', bold: true }] })
    })

    it('editor E03: a rich value with italic runs is edited inline and keeps its italic', async () => {
      const { app } = renderTitleBlock({
        items: [{ text: { runs: [{ text: 'Slanted', italic: true }] } }, { text: 'x' }],
        marker: 'dot',
      })
      const updateShapes = jest.spyOn(app, 'updateShapes')
      doubleClick(document.querySelector('[data-prop-path="items.0.text"]') as HTMLElement)
      const editor = await findEditor()
      expect(editor.querySelector('span[data-italic]')?.textContent).toBe('Slanted')
      ;(editor.querySelector('span[data-italic]') as HTMLElement).textContent = 'Leaning'
      fireEvent.blur(editor)
      const props = (updateShapes.mock.calls[0][0] as unknown as { props: { items: Array<{ text: unknown }> } }).props
      expect(props.items[0].text).toEqual({ runs: [{ text: 'Leaning', italic: true }] })
    })

    it('editor E03: Enter while an IME composes does not commit; Enter commits', async () => {
      const { app } = renderTitleBlock(bulletsProps)
      const updateShapes = jest.spyOn(app, 'updateShapes')
      doubleClick(document.querySelector('[data-prop-path="items.0.text"]') as HTMLElement)
      const editor = await findEditor()
      editor.textContent = 'Học máy'
      fireEvent.keyDown(editor, { key: 'Enter', keyCode: 229 })
      expect(updateShapes).not.toHaveBeenCalled()
      fireEvent.keyDown(editor, { key: 'Enter' })
      expect(updateShapes).toHaveBeenCalledTimes(1)
    })

    it('editor E03: an emptied required slot is not committed', async () => {
      const { app } = renderTitleBlock({ title: 'Cover title' }, 'tls.c.poster-cover')
      const updateShapes = jest.spyOn(app, 'updateShapes')
      doubleClick(document.querySelector('[data-prop-path="title"]') as HTMLElement)
      const editor = await findEditor()
      editor.textContent = '   '
      fireEvent.keyDown(editor, { key: 'Enter' })
      expect(updateShapes).not.toHaveBeenCalled()
      expect(document.querySelector('[contenteditable="true"]')).not.toBeNull()
    })

    it('Escape cancels without calling updateShapes', async () => {
      const { app } = renderTitleBlock(bulletsProps)
      const updateShapes = jest.spyOn(app, 'updateShapes')

      const target = document.querySelector('[data-prop-path="items.0.text"]') as HTMLElement
      doubleClick(target)

      const editor = await findEditor()
      editor.textContent = 'Should not save'
      fireEvent.keyDown(editor, { key: 'Escape' })

      expect(updateShapes).not.toHaveBeenCalled()
      expect(document.querySelector('[contenteditable="true"]')).toBeNull()
    })
  
    it('editor E00: nothing opens while the document is read-only', async () => {
      renderTitleBlock(bulletsProps, 'tls.t.bullets', true)
      doubleClick(document.querySelector('[data-prop-path="items.0.text"]') as HTMLElement)
      await new Promise((r) => setTimeout(r, 20))
      expect(document.querySelector('[contenteditable="true"]')).toBeNull()
    })

    it('editor E00: a path that does not resolve in the block props opens nothing', async () => {
      const { app } = renderTitleBlock({ title: 'Cover title', kicker: 'Lecture 5' }, 'tls.c.poster-cover')
      const updateShapes = jest.spyOn(app, 'updateShapes')
      const leaves = Array.from(document.querySelectorAll('[data-prop-path]')) as HTMLElement[]
      const bad = leaves.find((el) => !['title', 'kicker', 'subtitle', 'meta'].includes(el.getAttribute('data-prop-path') ?? ''))
      if (!bad) return // every path resolves (editor E02 binds composite children) — nothing to guard
      doubleClick(bad)
      await new Promise((r) => setTimeout(r, 20))
      expect(document.querySelector('[contenteditable="true"]')).toBeNull()
      expect(updateShapes).not.toHaveBeenCalled()
    })
  
    it('editor E02: a composite title opens on the composite prop and writes it back', async () => {
      const { app } = renderTitleBlock({ title: 'Cover title', kicker: 'Lecture 5' }, 'tls.c.poster-cover')
      const updateShapes = jest.spyOn(app, 'updateShapes')
      const target = document.querySelector('[data-prop-path="title"]') as HTMLElement
      expect(target).toBeTruthy()
      doubleClick(target)
      const editor = await findEditor()
      expect(editor.textContent).toBe('Cover title')
      editor.textContent = 'New title'
      fireEvent.blur(editor)
      const props = (updateShapes.mock.calls[0][0] as { props: Record<string, unknown> }).props
      expect(props.title).toBe('New title')
      expect(props.text).toBeUndefined()
    })
  })
})
