/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { Tldraw } from './Tldraw'
import type { TldrawApp } from './state'
import { deckSpecToDocument } from './blocks/deck-document'
import { defaultBlockRegistry } from './blocks/validate-deck-spec'
import { TDShapeType } from './types'
import type { DeckSpec } from './blocks/types'

const spec = {
  version: 1,
  id: 'deck',
  title: 'Deck',
  theme: 'default',
  aspect: '16:9',
  style: 'corporate',
  slides: [{ id: 's01', layout: 'full-bleed', regions: { content: [{ id: 's01_t', type: 'tls.t.title', props: { text: 'One' } }] } }],
} as unknown as DeckSpec

async function mount(profile: 'full' | 'basic', extra: Partial<React.ComponentProps<typeof Tldraw>> = {}) {
  let app: TldrawApp | undefined
  const document = deckSpecToDocument(spec).document
  const registry = defaultBlockRegistry()
  render(
    <Tldraw
      document={document}
      blockRegistry={registry}
      editorProfile={profile}
      showMenu={false}
      onMount={(a) => {
        app = a
      }}
      {...extra}
    />
  )
  await waitFor(() => expect(app).toBeDefined())
  const block = Object.values(app!.page.shapes).find((s) => s.type === TDShapeType.Component)!
  return { app: app!, block }
}

describe('editor E01 — editorProfile', () => {
  test('full keeps the toolbars; basic renders neither', async () => {
    const { unmount } = render(<Tldraw editorProfile="full" />)
    await waitFor(() => expect(document.getElementById('TD-Tools')).not.toBeNull())
    unmount()
    await mount('basic')
    expect(document.getElementById('TD-Tools')).toBeNull()
    expect(document.getElementById('TD-PrimaryTools')).toBeNull()
  })

  test('basic: selecting a block does not open the inspector; openInspector does', async () => {
    const { app, block } = await mount('basic')
    act(() => {
      app.select(block.id)
    })
    expect(document.getElementById('TD-BlockInspector')).toBeNull()
    act(() => {
      app.blockEdit.openInspector(block.id)
    })
    await waitFor(() => expect(document.getElementById('TD-BlockInspector')).not.toBeNull())
    act(() => {
      app.selectNone()
    })
    await waitFor(() => expect(document.getElementById('TD-BlockInspector')).toBeNull())
    expect(app.appState.inspectorFor).toBeUndefined()
  })

  test('full: selecting a block opens the inspector as before', async () => {
    const { app, block } = await mount('full')
    act(() => {
      app.select(block.id)
    })
    await waitFor(() => expect(document.getElementById('TD-BlockInspector')).not.toBeNull())
  })

  test('basic: drawing tools are refused (tool call and hotkey) and reported', async () => {
    const onBlocked = jest.fn()
    const { app } = await mount('basic', { onBlocked })
    act(() => {
      app.selectTool(TDShapeType.Rectangle)
    })
    expect(app.appState.activeTool).toBe('select')
    expect(onBlocked).toHaveBeenCalledWith(app, 'tool')
    const wrapper = document.querySelector('[tabindex="0"], [tabindex="-0"]') as HTMLElement
    wrapper?.focus()
    fireEvent.keyDown(wrapper ?? document.body, { key: 'r', code: 'KeyR' })
    fireEvent.keyDown(wrapper ?? document.body, { key: 'd', code: 'KeyD' })
    expect(app.appState.activeTool).toBe('select')
  })

  test('basic: pasted plain text becomes a body-text block', async () => {
    const { app } = await mount('basic')
    const before = Object.keys(app.page.shapes).length
    act(() => {
      ;(app as unknown as { pastePlainText: (t: string) => void }).pastePlainText('Hello pasted')
    })
    const shapes = Object.values(app.page.shapes)
    expect(shapes.length).toBe(before + 1)
    const added = shapes.find((s) => s.type === TDShapeType.Component && (s as { componentId?: string }).componentId === 'tls.t.body')
    expect((added as unknown as { props: { text: string } }).props.text).toBe('Hello pasted')
  })

  test('basic: no rotate handle is rendered for a selected block', async () => {
    const { app, block } = await mount('basic')
    act(() => {
      app.select(block.id)
    })
    expect(document.querySelector('.tl-rotate-handle, [aria-label="rotate handle"]')).toBeNull()
  })
})
