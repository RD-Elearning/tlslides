import { mockDocument, TldrawTestApp } from '~test'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'
import { BUILT_IN_TEMPLATES } from '~state/templates'
import { TDShapeType } from '~types'

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
})

describe('Deck facade — thumbnails', () => {
  it('returns undefined for a slide that is not the current one', () => {
    const app = freshApp()
    const secondId = app.deck.addSlide()
    app.deck.goToSlide('page1')

    expect(app.deck.getThumbnail(secondId)).toBeUndefined()
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

  it('returns undefined outside a DOM environment rather than throwing', () => {
    const app = freshApp()
    const realDocument = globalThis.document
    // @ts-expect-error — simulating a server/Node context on purpose for this one assertion.
    delete globalThis.document
    try {
      expect(app.deck.getThumbnail('page1')).toBeUndefined()
    } finally {
      globalThis.document = realDocument
    }
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
