/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { act, render, waitFor } from '@testing-library/react'
import { Tldraw } from './Tldraw'
import type { TldrawApp } from './state'

describe('Tldraw', () => {
  test('mounts component and calls onMount', async () => {
    const onMount = jest.fn()
    render(<Tldraw onMount={onMount} />)
    await waitFor(onMount)
  })

  test('mounts component and calls onMount when id is present', async () => {
    const onMount = jest.fn()
    render(<Tldraw id="someId" onMount={onMount} />)
    await waitFor(onMount)
  })

  describe('fullscreen / presentation mode sync (B-07, T6.3)', () => {
    afterEach(() => {
      delete (document as Partial<Document>).fullscreenElement
    })

    test('leaving fullscreen outside of our own code turns presentation mode back off', async () => {
      let app: TldrawApp | undefined
      render(
        <Tldraw
          onMount={(a) => {
            app = a
          }}
        />
      )
      await waitFor(() => expect(app).toBeDefined())

      act(() => {
        app!.togglePresentationMode()
      })
      expect(app!.settings.isPresentationMode).toBe(true)

      // The user left fullscreen via Esc/F11/a mobile gesture, without going through
      // `togglePresentationMode` — only the browser's own `fullscreenchange` event says so.
      Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true })
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'))
      })

      expect(app!.settings.isPresentationMode).toBe(false)
    })

    test('does nothing on fullscreenchange while not presenting', async () => {
      let app: TldrawApp | undefined
      render(
        <Tldraw
          onMount={(a) => {
            app = a
          }}
        />
      )
      await waitFor(() => expect(app).toBeDefined())

      Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true })
      expect(() => document.dispatchEvent(new Event('fullscreenchange'))).not.toThrow()
      expect(app!.settings.isPresentationMode).toBe(false)
    })
  })
})
