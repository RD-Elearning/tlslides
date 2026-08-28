'use client'

import * as React from 'react'
import { ColorStyle, TDShapeType, Tldraw, TldrawApp } from '@tlslides/tldraw'
import type { TDDocument } from '@tlslides/tldraw'
import { blockComponents } from './blocks'

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

  // Both buttons below insert a ComponentShape (F-02): the document only ever stores
  // `{ componentId, props }`, never React itself. `blockComponents` (components/blocks.tsx) is
  // this host app's registry, passed to <Tldraw components={...}> below.
  const addKpiTile = React.useCallback(() => {
    const app = appRef.current
    if (!app) return
    app.createShapes({
      id: `kpi-${Date.now()}`,
      type: TDShapeType.Component,
      // Fixed, non-overlapping placement (rather than addRectangle's random point above) so two
      // blocks added back to back land side by side instead of stacking on top of each other.
      point: [80, 120],
      size: [260, 160],
      componentId: 'kpi-tile',
      props: { label: 'Monthly active users', value: '128.4K', delta: 12, deltaLabel: 'vs last month' },
    })
  }, [])

  const addBarChart = React.useCallback(() => {
    const app = appRef.current
    if (!app) return
    app.createShapes({
      id: `chart-${Date.now()}`,
      type: TDShapeType.Component,
      point: [400, 120],
      size: [360, 240],
      componentId: 'bar-chart',
      props: {
        title: 'Quarterly revenue ($K)',
        categories: ['Q1', 'Q2', 'Q3', 'Q4'],
        values: [42, 58, 51, 73],
      },
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
        <button id="add-kpi-tile" data-testid="add-kpi-tile" onClick={addKpiTile}>
          Add KPI tile
        </button>
        <button id="add-bar-chart" data-testid="add-bar-chart" onClick={addBarChart}>
          Add bar chart
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
        <Tldraw onMount={onMount} onPersist={onPersist} components={blockComponents} />
      </div>
    </div>
  )
}
