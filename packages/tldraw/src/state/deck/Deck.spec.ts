import { mockDocument, TldrawTestApp } from '~test'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'
import { BUILT_IN_TEMPLATES } from '~state/templates'
import { AnimationEffect, AnimationTrigger, TDShapeType } from '~types'

function freshApp(): TldrawTestApp {
  const app = new TldrawTestApp()
  app.loadDocument(mockDocument)
  return app
}

describe('Deck facade — slides', () => {
  it('lists the deck as it stands, in order', () => {
    const app = freshApp()
    const slides = app.deck.listSlides()
    expect(slides).toHaveLength(1)
    expect(slides[0]).toMatchObject({ id: 'page1', index: 0, size: [1920, 1080] })
  })

  it('getSlide returns undefined for an unknown id', () => {
    const app = freshApp()
    expect(app.deck.getSlide('not-a-page')).toBeUndefined()
  })

  it('resolves a legacy string background to a solid SlideBackground', () => {
    const app = new TldrawTestApp()
    app.loadDocument({
      ...mockDocument,
      pages: {
        page1: { ...mockDocument.pages.page1, background: '#ff0000' },
      },
    })
    expect(app.deck.getSlide('page1')?.background).toEqual({ type: 'solid', color: '#ff0000' })
  })

  it('addSlide creates a blank slide, switches to it, and returns its id', () => {
    const app = freshApp()
    const before = app.deck.listSlides().length

    const id = app.deck.addSlide()

    expect(app.deck.listSlides()).toHaveLength(before + 1)
    expect(app.currentPageId).toBe(id)
  })

  it('addSlide applies name/size/background when given', () => {
    const app = freshApp()
    const id = app.deck.addSlide({
      name: 'Agenda',
      size: [1280, 720],
      background: { type: 'solid', color: '#00ff00' },
    })

    const slide = app.deck.getSlide(id)
    expect(slide).toMatchObject({
      name: 'Agenda',
      size: [1280, 720],
      background: { type: 'solid', color: '#00ff00' },
    })
  })

  it('addSlide accepts a caller-supplied id', () => {
    const app = freshApp()
    const id = app.deck.addSlide({ id: 'host-row-42' })
    expect(id).toBe('host-row-42')
    expect(app.deck.getSlide('host-row-42')).toBeDefined()
  })

  it('addSlide throws on a colliding caller-supplied id, and does not mutate the deck', () => {
    const app = freshApp()
    const before = app.deck.listSlides().length

    expect(() => app.deck.addSlide({ id: 'page1' })).toThrow()
    expect(app.deck.listSlides()).toHaveLength(before)
  })

  it('duplicateSlide copies a slide, switches to it, and returns undefined for an unknown id', () => {
    const app = freshApp()
    const id = app.deck.duplicateSlide('page1')
    expect(id).toBeDefined()
    expect(app.currentPageId).toBe(id)
    expect(app.deck.listSlides()).toHaveLength(2)

    expect(app.deck.duplicateSlide('not-a-page')).toBeUndefined()
  })

  it('duplicateSlide accepts and validates a caller-supplied id', () => {
    const app = freshApp()
    const id = app.deck.duplicateSlide('page1', { id: 'copy-1' })
    expect(id).toBe('copy-1')

    expect(() => app.deck.duplicateSlide('page1', { id: 'copy-1' })).toThrow()
  })

  it('addSlideFromTemplate adds a slide and returns its id, or undefined for an unknown template', () => {
    const app = freshApp()
    const id = app.deck.addSlideFromTemplate('title')
    expect(id).toBeDefined()
    expect(app.currentPageId).toBe(id)

    expect(app.deck.addSlideFromTemplate('not-a-real-template')).toBeUndefined()
  })

  it('addSlideFromTemplate accepts and validates a caller-supplied id', () => {
    const app = freshApp()
    const id = app.deck.addSlideFromTemplate('title', undefined, { id: 'tmpl-1' })
    expect(id).toBe('tmpl-1')

    expect(() => app.deck.addSlideFromTemplate('title', undefined, { id: 'tmpl-1' })).toThrow()
  })

  it('deleteSlide removes a slide but refuses to empty the deck', () => {
    const app = freshApp()
    const secondId = app.deck.addSlide()

    expect(app.deck.deleteSlide(secondId)).toBe(true)
    expect(app.deck.listSlides()).toHaveLength(1)

    const lastId = app.deck.listSlides()[0].id
    expect(app.deck.deleteSlide(lastId)).toBe(false)
    expect(app.deck.listSlides()).toHaveLength(1)

    expect(app.deck.deleteSlide('not-a-page')).toBe(false)
  })

  it('moveSlide reorders and returns the resulting order', () => {
    const app = freshApp()
    const secondId = app.deck.addSlide()
    const thirdId = app.deck.addSlide()

    const result = app.deck.moveSlide(thirdId, 0)

    expect(result.map((s) => s.id)).toEqual([thirdId, 'page1', secondId])
    expect(result.map((s) => s.index)).toEqual([0, 1, 2])
  })

  it('setSlideBackground/setSlideNotes update and return the slide, or undefined for a bad id', () => {
    const app = freshApp()
    const bg = { type: 'solid', color: '#123456' } as const

    expect(app.deck.setSlideBackground('page1', bg)?.background).toEqual(bg)
    expect(app.deck.setSlideNotes('page1', 'Say hi')?.notes).toBe('Say hi')

    expect(app.deck.setSlideBackground('nope', bg)).toBeUndefined()
    expect(app.deck.setSlideNotes('nope', 'x')).toBeUndefined()
  })

  it('setSlideSkip (T16.4) sets/clears skipInPresentation, or undefined for a bad id', () => {
    const app = freshApp()
    expect(app.deck.getSlide('page1')?.skipInPresentation).toBeUndefined()

    expect(app.deck.setSlideSkip('page1', true)?.skipInPresentation).toBe(true)
    expect(app.deck.setSlideSkip('page1', undefined)?.skipInPresentation).toBeUndefined()
    expect(app.deck.setSlideSkip('nope', true)).toBeUndefined()
  })
})

describe('Deck facade — thumbnails', () => {
  // Phase 15 lifted the original (Phase 14) limitation this describe block used to lock in:
  // `getThumbnail` no longer needs the slide to be `app.currentPageId`, and no longer needs a
  // DOM at all — it's routed through the headless `renderPageToSvg` now. The two tests below
  // replace the old "returns undefined for a non-current slide" / "returns undefined outside a
  // DOM environment" cases, which asserted exactly the limitation this phase exists to remove.

  it('works for a slide that is not the current one, without switching to it', () => {
    const app = freshApp()
    const secondId = app.deck.addSlide()
    app.deck.goToSlide('page1')
    expect(app.currentPageId).toBe('page1')

    const svg = app.deck.getThumbnail(secondId, { format: 'svg' })
    expect(svg).toContain('<svg')
    // Never switched the user's own current slide just to answer a thumbnail request.
    expect(app.currentPageId).toBe('page1')
  })

  it('returns a data URL for the current slide, and raw SVG when asked', () => {
    const app = freshApp()
    expect(app.currentPageId).toBe('page1')

    const dataUrl = app.deck.getThumbnail('page1')
    expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/)

    const svg = app.deck.getThumbnail('page1', { format: 'svg' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('viewBox="0 0 1920 1080"')
  })

  it('returns undefined for an unknown slide id, and works outside a DOM environment', () => {
    const app = freshApp()
    expect(app.deck.getThumbnail('not-a-real-page')).toBeUndefined()

    const realDocument = globalThis.document
    // @ts-expect-error — simulating a server/Node context on purpose for this one assertion.
    delete globalThis.document
    try {
      const svg = app.deck.getThumbnail('page1', { format: 'svg' })
      expect(svg).toContain('<svg')
    } finally {
      globalThis.document = realDocument
    }
  })

  // A5 — headless block rendering via Deck.getThumbnail.
  it('per-call blocks callback overrides the Deck-stored default', () => {
    const app = freshApp()
    // Add a ComponentShape via Deck.addBlock (the proper creation path).
    app.deck.addBlock('page1', { componentId: 'test-block' })
    // Find the shape we just created.
    const shapes = Object.values(app.document.pages.page1.shapes)
    const block = shapes.find((s) => s.type === TDShapeType.Component)!
    expect(block).toBeDefined()

    const customSvg = '<g class="custom-block">Hello</g>'
    const svg = app.deck.getThumbnail('page1', {
      format: 'svg',
      blocks: (s) => (s.componentId === 'test-block' ? customSvg : undefined),
    })
    expect(svg).toContain(customSvg)
    expect(svg).not.toContain('Component: test-block')
  })

  it('Deck.blocks instance property is used as fallback when opts.blocks is absent', () => {
    const app = freshApp()
    app.deck.addBlock('page1', { componentId: 'stored-block' })

    const customSvg = '<g class="stored">Stored</g>'
    app.deck.blocks = (s) => (s.componentId === 'stored-block' ? customSvg : undefined)
    const svg = app.deck.getThumbnail('page1', { format: 'svg' })
    expect(svg).toContain(customSvg)
    expect(svg).not.toContain('Component: stored-block')

    // Cleanup: clear the stored blocks callback.
    app.deck.blocks = undefined
  })
})

describe('Deck facade — content', () => {
  it('insertContent adds shapes to the given slide and returns the ids actually assigned', () => {
    const app = freshApp()
    const ids = app.deck.insertContent(
      'page1',
      { shapes: [{ ...app.getShape('rect1') }] },
      { center: false }
    )

    expect(ids).toHaveLength(1)
    expect(ids[0]).not.toBe('rect1') // insertContent always remaps ids
    expect(app.document.pages.page1.shapes[ids[0]]).toBeDefined()
  })

  it('insertContent targets a non-current slide without switching to it or touching the current one', () => {
    const app = freshApp()
    app.deck.addSlide({ id: 'page2' })
    app.deck.goToSlide('page1')
    expect(app.currentPageId).toBe('page1')

    const shapesOnPage1Before = Object.keys(app.document.pages.page1.shapes).length
    const ids = app.deck.insertContent(
      'page2',
      { shapes: [{ ...app.getShape('rect1') }] },
      { center: false }
    )

    expect(ids).toHaveLength(1)
    expect(app.currentPageId).toBe('page1')
    expect(Object.keys(app.document.pages.page1.shapes)).toHaveLength(shapesOnPage1Before)
    expect(app.document.pages.page2.shapes[ids[0]]).toBeDefined()
  })

  it('insertContent returns [] for an unknown slide, and does not mutate the document', () => {
    const app = freshApp()
    const before = app.document
    const ids = app.deck.insertContent('not-a-page', { shapes: [{ ...app.getShape('rect1') }] })

    expect(ids).toEqual([])
    expect(app.document).toBe(before)
  })

  it('addBlock adds a ComponentShape at the given point/size and returns its id', () => {
    const app = freshApp()
    const id = app.deck.addBlock(
      'page1',
      { componentId: 'kpi-tile', props: { label: 'MAU', value: '128K' } },
      { point: [40, 60], size: [200, 120] }
    )

    expect(id).toBeDefined()
    const shape = app.document.pages.page1.shapes[id!]
    expect(shape).toMatchObject({
      type: TDShapeType.Component,
      point: [40, 60],
      size: [200, 120],
      componentId: 'kpi-tile',
      props: { label: 'MAU', value: '128K' },
    })
  })

  it('addBlock targets a non-current slide without switching to it', () => {
    const app = freshApp()
    app.deck.addSlide({ id: 'page2' })
    app.deck.goToSlide('page1')

    const id = app.deck.addBlock('page2', { componentId: 'bar-chart' })

    expect(app.currentPageId).toBe('page1')
    expect(app.document.pages.page2.shapes[id!]).toBeDefined()
  })

  it('addBlock returns undefined for an unknown slide', () => {
    const app = freshApp()
    expect(app.deck.addBlock('not-a-page', { componentId: 'kpi-tile' })).toBeUndefined()
  })

  it('insertContent/addBlock are undoable in one step', () => {
    const app = freshApp()
    const before = Object.keys(app.document.pages.page1.shapes).length

    app.deck.addBlock('page1', { componentId: 'kpi-tile' })
    expect(Object.keys(app.document.pages.page1.shapes)).toHaveLength(before + 1)

    app.undo()
    expect(Object.keys(app.document.pages.page1.shapes)).toHaveLength(before)

    app.redo()
    expect(Object.keys(app.document.pages.page1.shapes)).toHaveLength(before + 1)
  })
})

describe('Deck facade — navigation & presentation', () => {
  it('goToSlide switches pages and reports whether the id existed', () => {
    const app = freshApp()
    const secondId = app.deck.addSlide()
    expect(app.deck.goToSlide('page1')).toBe(true)
    expect(app.currentPageId).toBe('page1')

    expect(app.deck.goToSlide('not-a-page')).toBe(false)
    expect(app.currentPageId).toBe('page1')

    app.deck.goToSlide(secondId)
    expect(app.currentPageId).toBe(secondId)
  })

  it('present enters and exits presentation mode, optionally jumping slides first', () => {
    const app = freshApp()
    const secondId = app.deck.addSlide()
    app.deck.goToSlide('page1')

    expect(app.deck.present({ slideId: secondId })).toBe(true)
    expect(app.currentPageId).toBe(secondId)
    expect(app.settings.isPresentationMode).toBe(true)

    expect(app.deck.present({ exit: true })).toBe(false)
    expect(app.settings.isPresentationMode).toBe(false)
  })

  it('getPresentationState is undefined outside presentation mode, populated inside it', () => {
    const app = freshApp()
    expect(app.deck.getPresentationState()).toBeUndefined()

    app.deck.present()
    expect(app.deck.getPresentationState()).toEqual({
      slideId: 'page1',
      buildStep: 0,
      totalBuildSteps: 0,
    })
  })

  it('advance/back drive build steps and slide navigation together (T16.1/T16.7)', () => {
    const app = freshApp()
    app.setShapeAnimation(
      { effect: AnimationEffect.FadeIn, trigger: AnimationTrigger.OnClick, order: 0, durationMs: 300, delayMs: 0 },
      ['rect1']
    )
    const secondId = app.deck.addSlide()
    app.deck.goToSlide('page1')
    app.deck.present()

    expect(app.deck.advance()).toEqual({ slideId: 'page1', buildStep: 1, totalBuildSteps: 1 })
    // Every step on page1 is revealed — the next advance moves to the next slide.
    expect(app.deck.advance()).toEqual({ slideId: secondId, buildStep: 0, totalBuildSteps: 0 })

    // Back lands on page1 fully built, not at its own step 0 — see TldrawApp.previousPresentation.
    expect(app.deck.back()).toEqual({ slideId: 'page1', buildStep: 1, totalBuildSteps: 1 })
  })
})

describe('Deck facade — theme & templates', () => {
  it('getTheme/setTheme round-trip, and listThemes/listTemplates expose the built-ins', () => {
    const app = freshApp()
    expect(app.deck.getTheme()).toBeUndefined()

    const theme = BUILT_IN_DECK_THEMES[0]
    app.deck.setTheme(theme)
    // Not `toBe`: the document is deep-copied on every state change, so the stored theme is an
    // equal, not identical, object.
    expect(app.deck.getTheme()).toEqual(theme)

    expect(app.deck.listThemes()).toBe(BUILT_IN_DECK_THEMES)
    expect(app.deck.listTemplates()).toBe(BUILT_IN_TEMPLATES)
  })
})

describe('Deck facade — whole deck', () => {
  it('loadDeck replaces the document and getDeck reads it back', () => {
    const app = freshApp()
    app.deck.addSlide()
    expect(app.deck.listSlides()).toHaveLength(2)

    const fresh = app.deck.loadDeck(mockDocument)

    expect(fresh).toBe(app.deck.getDeck())
    expect(app.deck.listSlides()).toHaveLength(1)
  })

  it('exportDeckJson/importDeckJson round-trip the document as a plain string', () => {
    const app = freshApp()
    app.deck.addSlide({ name: 'Second' })

    const json = app.deck.exportDeckJson()
    expect(typeof json).toBe('string')
    expect(JSON.parse(json)).toEqual(app.deck.getDeck())

    const restored = app.deck.importDeckJson(json)
    expect(restored).toEqual(app.deck.getDeck())
    expect(app.deck.listSlides()).toHaveLength(2)
  })
})

describe('Deck facade — PNG export', () => {
  // `renderSvgToPng` needs a real `<canvas>` 2D context, which jsdom (this suite's test
  // environment) never implements — `getContext('2d')` returns `null` here exactly as it would
  // in Node, so this environment doubles as a stand-in for "no real rasterizer available" without
  // needing a `@jest-environment node` file for it. It still proves the important thing: no
  // throw, just `undefined`, per `renderSvgToPng`'s own documented convention.
  it('exportSlidePng resolves undefined when no real canvas rasterizer is available', async () => {
    const app = freshApp()
    // jsdom logs a "not implemented" console.error for the attempted `getContext('2d')` call —
    // expected (see the note above), silenced so it doesn't read as a real failure in CI output.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await expect(app.deck.exportSlidePng('page1')).resolves.toBeUndefined()
    } finally {
      spy.mockRestore()
    }
  })

  it('exportSlidePng resolves undefined for an unknown slide id', async () => {
    const app = freshApp()
    await expect(app.deck.exportSlidePng('not-a-real-page')).resolves.toBeUndefined()
  })
})

describe('Deck facade — events', () => {
  it('fires slideAdded/slideRemoved with an unsubscribe function that actually works', () => {
    const app = freshApp()
    const added: string[] = []
    const off = app.deck.on('slideAdded', (e) => added.push(e.slideId))

    const id = app.deck.addSlide()
    expect(added).toEqual([id])

    off()
    app.deck.addSlide()
    expect(added).toEqual([id]) // no second entry — the listener was removed

    const removed: string[] = []
    app.deck.on('slideRemoved', (e) => removed.push(e.slideId))
    app.deck.deleteSlide(id)
    expect(removed).toEqual([id])
  })

  it('fires slideReordered (and not slideAdded/slideRemoved) for a pure move', () => {
    const app = freshApp()
    const secondId = app.deck.addSlide()
    const events: string[] = []
    app.deck.on('slideAdded', () => events.push('added'))
    app.deck.on('slideRemoved', () => events.push('removed'))
    app.deck.on('slideReordered', () => events.push('reordered'))

    app.deck.moveSlide(secondId, 0)

    expect(events).toEqual(['reordered'])
  })

  it('fires selectionChanged when the selected shapes or current slide change', () => {
    const app = freshApp()
    const events: { slideId: string; shapeIds: string[] }[] = []
    app.deck.on('selectionChanged', (e) => events.push(e))

    app.select('rect1')
    app.selectNone()

    expect(events.map((e) => e.shapeIds)).toEqual([['rect1'], []])
  })

  it('fires deckChanged on every committed change, and onDeckChange is sugar for it', () => {
    const app = freshApp()
    const seen: unknown[] = []
    const off = app.deck.onDeckChange((doc) => seen.push(doc))

    app.deck.addSlide()
    expect(seen).toHaveLength(1)
    expect(seen[0]).toBe(app.document)

    off()
    app.deck.addSlide()
    expect(seen).toHaveLength(1)
  })

  it('fires presentationChanged on entering/leaving presentation mode and on advance/back', () => {
    const app = freshApp()
    const events: { active: boolean; slideId: string; buildStep: number }[] = []
    app.deck.on('presentationChanged', (e) => events.push(e))

    app.deck.present()
    app.deck.advance() // no build steps on page1 -> no-op advance (already at 0/0)
    app.deck.present({ exit: true })

    expect(events[0]).toMatchObject({ active: true, slideId: 'page1', buildStep: 0 })
    expect(events[events.length - 1]).toMatchObject({ active: false, slideId: 'page1' })
  })

  it('loadDeck resyncs the baseline instead of replaying the new document as slideAdded', () => {
    const app = freshApp()
    app.deck.addSlide()
    app.deck.addSlide()

    const added: string[] = []
    const deckChanges: unknown[] = []
    app.deck.on('slideAdded', (e) => added.push(e.slideId))
    app.deck.on('deckChanged', (e) => deckChanges.push(e))

    app.deck.loadDeck(mockDocument)

    expect(added).toEqual([])
    expect(deckChanges).toHaveLength(1)

    // The baseline is really reset, not just silenced for one tick: the next real add is
    // reported as exactly one slideAdded, not a diff against the pre-loadDeck deck.
    app.deck.addSlide()
    expect(added).toHaveLength(1)
  })
})
