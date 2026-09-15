'use client'

import * as React from 'react'
import { ColorStyle, TDShapeType, Tldraw, TldrawApp } from '@tlslides/tldraw'
import type { DeckSlide, DeckTheme, TDDocument, Template } from '@tlslides/tldraw'
import { blockToShape, shapeToBlock } from '@tlslides/tldraw'
import { blockComponents } from './blocks'
import { demoSpec, p18Components } from './p18-blocks'
import { SlideManager } from './SlideManager'

// Phase 5's hand-written host blocks and Phase 18's registry-driven ones share one canvas and one
// `components` registry — the block system sits next to the existing mechanism, it does not
// replace it.
const allComponents = { ...blockComponents, ...p18Components }

// No `id` prop is passed to <Tldraw> below, which disables its built-in IndexedDB persistence.
// `onPersist` still fires on every persistable change, so it is the hook a host app uses to save
// to its own backend instead. Here it writes to localStorage, purely to make that contract
// observable — see guides/nextjs-integration.md.
const STORAGE_KEY = 'tlslides-nextjs-sample-document'

// A fresh, uniquely-identified copy of the built-in default document, used to seed the editor
// once in `onMount`. Cloning avoids mutating the shared static `TldrawApp.defaultDocument`.
function createSeedDocument(): TDDocument {
  return JSON.parse(
    JSON.stringify({ ...TldrawApp.defaultDocument, id: 'nextjs-sample-doc' })
  ) as TDDocument
}

// Phase 14 — every action in this file that mutates the document goes through `app.deck.*`,
// including shape authoring: `addRectangle` uses `app.deck.insertContent` (the general escape
// hatch for a host's own shape JSON) and `addKpiTile`/`addBarChart` use `app.deck.addBlock` (the
// `ComponentShape` convenience) — see the review that closed this gap in reviews/README.md's
// Phase 14 notes. What's left touching `TldrawApp` directly is read-only property access
// (`app.currentPageId`, `app.appState.currentStyle`, `app.document` for the `onPersist` save) and
// `toggleDarkMode()`, which is UI chrome, not slide/content management, and so was never in this
// facade's scope to begin with.
export default function Editor() {
  const appRef = React.useRef<TldrawApp | null>(null)
  const unsubscribeRef = React.useRef<(() => void) | null>(null)

  const [slides, setSlides] = React.useState<DeckSlide[]>([])
  const [currentSlideId, setCurrentSlideId] = React.useState<string | undefined>()
  const [theme, setThemeState] = React.useState<DeckTheme | undefined>()
  const [thumbnail, setThumbnail] = React.useState<string | undefined>()
  const [themes, setThemes] = React.useState<DeckTheme[]>([])
  const [templates, setTemplates] = React.useState<Template[]>([])

  // The slide-manager panel's entire sync story: re-read the facade's own read methods whenever
  // one of its typed events fires (wired up in onMount below). No polling `onPersist` here — see
  // guides/nextjs-integration.md's "Keeping a host panel in sync" section.
  const refresh = React.useCallback(() => {
    const app = appRef.current
    if (!app) return
    setSlides(app.deck.listSlides())
    setCurrentSlideId(app.currentPageId)
    setThemeState(app.deck.getTheme())
    setThumbnail(app.deck.getThumbnail(app.currentPageId))
  }, [])

  const onMount = React.useCallback(
    (app: TldrawApp) => {
      appRef.current = app

      // Exposed for the tools/visual Playwright harness (tools/visual/scenarios/nextjs.js and
      // deckapi.js) to drive the editor imperatively from a headless browser, mirroring how a
      // host app would.
      ;(window as unknown as { tlapp: TldrawApp }).tlapp = app

      app.deck.loadDeck(createSeedDocument())
      setThemes(app.deck.listThemes())
      setTemplates(app.deck.listTemplates())

      const offAdded = app.deck.on('slideAdded', refresh)
      const offRemoved = app.deck.on('slideRemoved', refresh)
      const offReordered = app.deck.on('slideReordered', refresh)
      const offSelection = app.deck.on('selectionChanged', refresh)
      // Catches everything else a slide-manager panel cares about that isn't a page add/remove/
      // reorder/selection change — a background or theme update, in this app's case.
      const offDeckChange = app.deck.onDeckChange(refresh)
      unsubscribeRef.current = () => {
        offAdded()
        offRemoved()
        offReordered()
        offSelection()
        offDeckChange()
      }

      refresh()
    },
    [refresh]
  )

  React.useEffect(() => {
    return () => unsubscribeRef.current?.()
  }, [])

  const onPersist = React.useCallback((app: TldrawApp) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(app.document))
    } catch {
      // Best-effort only: localStorage may be unavailable (private browsing, quota exceeded).
    }
  }, [])

  // The general `insertContent` escape hatch (Phase 14): a host with its own full shape JSON,
  // not just a ComponentShape block. `id`/`name`/`parentId`/`childIndex` below are placeholders —
  // `insertContent` always remaps the id (collision-safety, see `Deck.insertContent`'s own doc
  // comment) and overwrites `parentId`/`childIndex` to land on the target slide — only `type`,
  // `point`, `size`, and `style` are actually honored. `center: false` keeps the explicit
  // `point` instead of recentering against the current viewport.
  const addRectangle = React.useCallback(() => {
    const app = appRef.current
    if (!app) return
    app.deck.insertContent(
      app.currentPageId,
      {
        shapes: [
          {
            id: `rect-${Date.now()}`,
            type: TDShapeType.Rectangle,
            name: 'Rectangle',
            parentId: app.currentPageId,
            childIndex: 1,
            point: [100 + Math.random() * 400, 100 + Math.random() * 300],
            size: [200, 150],
            style: { ...app.appState.currentStyle, color: ColorStyle.Blue },
          },
        ],
      },
      { center: false }
    )
  }, [])

  // Both buttons below insert a ComponentShape (F-02) via `app.deck.addBlock` — the document only
  // ever stores `{ componentId, props }`, never React itself. `blockComponents`
  // (components/blocks.tsx) is this host app's registry, passed to <Tldraw components={...}>
  // below. This is the facade's headline "render your own React as a slide element" capability —
  // see `Deck.addBlock`'s own doc comment.
  const addKpiTile = React.useCallback(() => {
    const app = appRef.current
    if (!app) return
    app.deck.addBlock(
      app.currentPageId,
      {
        componentId: 'kpi-tile',
        props: { label: 'Monthly active users', value: '128.4K', delta: 12, deltaLabel: 'vs last month' },
      },
      // Fixed, non-overlapping placement (rather than addRectangle's random point above) so two
      // blocks added back to back land side by side instead of stacking on top of each other.
      { point: [80, 120], size: [260, 160] }
    )
  }, [])

  const addBarChart = React.useCallback(() => {
    const app = appRef.current
    if (!app) return
    app.deck.addBlock(
      app.currentPageId,
      {
        componentId: 'bar-chart',
        props: {
          title: 'Quarterly revenue ($K)',
          categories: ['Q1', 'Q2', 'Q3', 'Q4'],
          values: [42, 58, 51, 73],
        },
      },
      { point: [400, 120], size: [360, 240] }
    )
  }, [])

  // Phase 18 — the block foundations, end to end in a real host. A `BlockSpec` (plain JSON:
  // nested children, style and motion, and not a single coordinate) becomes a `ComponentShape`
  // through `blockToShape`, is inserted through the same `deck.insertContent` escape hatch any
  // host shape JSON uses, and is read straight back out with `shapeToBlock` to prove the round
  // trip survived the document. It renders as a labelled placeholder because P20's renderer does
  // not exist yet — that is the honest state of the system, not a broken block.
  const addP18Block = React.useCallback(() => {
    const app = appRef.current
    if (!app) return

    const shape = blockToShape(demoSpec, { x: 80, y: 340, width: 620, height: 220 })
    app.deck.insertContent(app.currentPageId, { shapes: [shape] }, { center: false })

    const recovered = shapeToBlock(shape)
    // eslint-disable-next-line no-console
    console.log('[P18] spec -> shape -> spec round trip:', {
      componentId: shape.componentId,
      shapeId: shape.id,
      children: recovered?.children?.length,
      lossless: JSON.stringify(recovered) === JSON.stringify(demoSpec),
    })
  }, [])

  const addSlide = React.useCallback(() => {
    appRef.current?.deck.addSlide()
  }, [])

  // `app.deck` has no `previousSlide`/`nextSlide` of its own (the roadmap's method list doesn't
  // ask for one) — `listSlides` + `goToSlide` already compose into it, so this stays host-side
  // rather than becoming two more facade methods for a one-line convenience.
  const goRelative = React.useCallback((delta: number) => {
    const app = appRef.current
    if (!app) return
    const list = app.deck.listSlides()
    const index = list.findIndex((s) => s.id === app.currentPageId)
    const target = list[index + delta]
    if (target) app.deck.goToSlide(target.id)
  }, [])
  const previousSlide = React.useCallback(() => goRelative(-1), [goRelative])
  const nextSlide = React.useCallback(() => goRelative(1), [goRelative])

  const toggleDarkMode = React.useCallback(() => {
    appRef.current?.toggleDarkMode()
  }, [])

  const handleAddFromTemplate = React.useCallback((templateId: string) => {
    if (templateId) appRef.current?.deck.addSlideFromTemplate(templateId)
  }, [])

  const handleSetTheme = React.useCallback((themeId: string) => {
    const app = appRef.current
    if (!app) return
    app.deck.setTheme(themeId ? app.deck.listThemes().find((t) => t.id === themeId) : undefined)
  }, [])

  const handleSetBackgroundColor = React.useCallback(
    (color: string) => {
      if (currentSlideId) appRef.current?.deck.setSlideBackground(currentSlideId, { type: 'solid', color })
    },
    [currentSlideId]
  )

  const handleClearBackground = React.useCallback(() => {
    if (currentSlideId) appRef.current?.deck.setSlideBackground(currentSlideId, undefined)
  }, [currentSlideId])

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
        <button id="add-p18-block" data-testid="add-p18-block" onClick={addP18Block}>
          Add P18 block
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
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
        <SlideManager
          slides={slides}
          currentSlideId={currentSlideId}
          thumbnail={thumbnail}
          themes={themes}
          activeThemeId={theme?.id}
          templates={templates}
          onSelectSlide={(id) => appRef.current?.deck.goToSlide(id)}
          onAddSlide={addSlide}
          onAddFromTemplate={handleAddFromTemplate}
          onMoveSlide={(id, toIndex) => appRef.current?.deck.moveSlide(id, toIndex)}
          onDeleteSlide={(id) => appRef.current?.deck.deleteSlide(id)}
          onSetTheme={handleSetTheme}
          onSetBackgroundColor={handleSetBackgroundColor}
          onClearBackground={handleClearBackground}
        />
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <Tldraw onMount={onMount} onPersist={onPersist} components={allComponents} />
        </div>
      </div>
    </div>
  )
}
