'use client'

import * as React from 'react'
import { ColorStyle, TDShapeType, Tldraw, TldrawApp } from '@tlslides/tldraw'
import type { TDDocument } from '@tlslides/tldraw'

// No `id` prop is passed to <Tldraw> below, which disables its built-in IndexedDB persistence.
// `onPersist` still fires on every persistable change, so it is the hook a host app uses to save
// to its own backend instead. Here it writes to localStorage, purely to make that contract
// observable — see reviews/03-nextjs-control-api.md section 3.4.
const STORAGE_KEY = 'tlslides-nextjs-sample-document'

// A fresh, uniquely-identified copy of the built-in default document, used to seed the editor
// once in `onMount`. Cloning avoids mutating the shared static `TldrawApp.defaultDocument`.
function createSeedDocument(): TDDocument {
  return JSON.parse(
    JSON.stringify({ ...TldrawApp.defaultDocument, id: 'nextjs-sample-doc' })
  ) as TDDocument
}

export default function Editor() {
  const appRef = React.useRef<TldrawApp | null>(null)

  const onMount = React.useCallback((app: TldrawApp) => {
    appRef.current = app

    // Exposed for the tools/visual Playwright harness (tools/visual/scenarios/nextjs.js) to
    // drive the editor imperatively from a headless browser, mirroring how a host app would.
    ;(window as unknown as { tlapp: TldrawApp }).tlapp = app

    app.loadDocument(createSeedDocument())
  }, [])

  const onPersist = React.useCallback((app: TldrawApp) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(app.document))
    } catch {
      // Best-effort only: localStorage may be unavailable (private browsing, quota exceeded).
    }
  }, [])

  const addRectangle = React.useCallback(() => {
    const app = appRef.current
    if (!app) return
    app.createShapes({
      id: `rect-${Date.now()}`,
      type: TDShapeType.Rectangle,
      point: [100 + Math.random() * 400, 100 + Math.random() * 300],
      size: [200, 150],
      style: { ...app.appState.currentStyle, color: ColorStyle.Blue },
    })
  }, [])

  const addSlide = React.useCallback(() => {
    appRef.current?.createPage()
  }, [])

  const previousSlide = React.useCallback(() => {
    appRef.current?.previousPage()
  }, [])

  const nextSlide = React.useCallback(() => {
    appRef.current?.nextPage()
  }, [])

  const toggleDarkMode = React.useCallback(() => {
    appRef.current?.toggleDarkMode()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: 8,
          borderBottom: '1px solid #ddd',
          flexShrink: 0,
        }}
      >
        <button id="add-rectangle" data-testid="add-rectangle" onClick={addRectangle}>
          Add rectangle
        </button>
        <button id="add-slide" data-testid="add-slide" onClick={addSlide}>
          Add slide
        </button>
        <button id="previous-slide" data-testid="previous-slide" onClick={previousSlide}>
          Previous slide
        </button>
        <button id="next-slide" data-testid="next-slide" onClick={nextSlide}>
          Next slide
        </button>
        <button id="toggle-dark-mode" data-testid="toggle-dark-mode" onClick={toggleDarkMode}>
          Toggle dark mode
        </button>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <Tldraw onMount={onMount} onPersist={onPersist} />
      </div>
    </div>
  )
}
