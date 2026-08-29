import { mockDocument, TldrawTestApp } from '~test'
import { AnimationEffect, AnimationTrigger } from '~types'
import type { ShapeAnimation } from '~types'

const CLICK_FADE: ShapeAnimation = {
  effect: AnimationEffect.FadeIn,
  trigger: AnimationTrigger.OnClick,
  order: 0,
  durationMs: 300,
  delayMs: 0,
}

// Fullscreen isn't implemented in jsdom: `requestFullscreen`/`exitFullscreen` don't exist on the
// prototypes at all, and `fullscreenElement` isn't a real accessor. Stub the pieces
// `TldrawApp` actually touches, mirroring the shape of the real API closely enough to exercise
// the gesture-rejection / already-in-fullscreen / vendor-prefix-fallback paths honestly.
function stubFullscreen({
  requestFullscreen = jest.fn().mockResolvedValue(undefined),
  exitFullscreen = jest.fn().mockResolvedValue(undefined),
  fullscreenElement = null as Element | null,
}: {
  requestFullscreen?: jest.Mock
  exitFullscreen?: jest.Mock
  fullscreenElement?: Element | null
} = {}) {
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    value: requestFullscreen,
    configurable: true,
  })
  Object.defineProperty(document, 'exitFullscreen', {
    value: exitFullscreen,
    configurable: true,
  })
  Object.defineProperty(document, 'fullscreenElement', {
    value: fullscreenElement,
    configurable: true,
  })
  return { requestFullscreen, exitFullscreen }
}

afterEach(() => {
  // Don't leak stubs (and their call counts) across tests.
  delete (document.documentElement as Partial<HTMLElement>).requestFullscreen
  delete (document as Partial<Document>).exitFullscreen
  delete (document as Partial<Document>).fullscreenElement
  jest.restoreAllMocks()
})

describe('readOnly / presentation mode (B-07)', () => {
  it('is true while presentation mode is on, with no explicit readOnly set', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)
    expect(app.readOnly).toBe(false)

    app.togglePresentationMode()

    expect(app.settings.isPresentationMode).toBe(true)
    expect(app.readOnly).toBe(true)
  })

  it('stays true after presentation mode turns off if readOnly was set explicitly', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)
    app.readOnly = true

    app.togglePresentationMode() // on
    app.togglePresentationMode() // off

    expect(app.settings.isPresentationMode).toBe(false)
    expect(app.readOnly).toBe(true)
  })

  it('reflects isPresentationMode even when set directly, as persisted state restores it', () => {
    // Simulates the B-07 scenario: `isPresentationMode` comes back `true` from persisted state
    // (StateManager's restore path patches state directly, not through `togglePresentationMode`)
    // while the freshly-constructed app's `readOnly` field defaults to `false`. Before this fix,
    // `readOnly` had no way to learn about that; now it's derived, so it just works.
    const app = new TldrawTestApp().loadDocument(mockDocument)
    app.setSetting('isPresentationMode', true)

    expect(app.readOnly).toBe(true)
  })

  it('exitPresentationMode is idempotent: a second call is a no-op', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)
    const { exitFullscreen } = stubFullscreen({ fullscreenElement: document.documentElement })

    app.togglePresentationMode()
    app.exitPresentationMode()
    expect(exitFullscreen).toHaveBeenCalledTimes(1)

    app.exitPresentationMode()
    // Already off — must not call exitFullscreen again or toggle anything back on.
    expect(exitFullscreen).toHaveBeenCalledTimes(1)
    expect(app.settings.isPresentationMode).toBe(false)
  })
})

describe('Fullscreen (T6.3)', () => {
  it('requests fullscreen when entering presentation mode', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)
    const { requestFullscreen } = stubFullscreen()

    app.togglePresentationMode()

    expect(requestFullscreen).toHaveBeenCalledTimes(1)
  })

  it('exits fullscreen when leaving presentation mode, only if currently in it', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)
    const { exitFullscreen } = stubFullscreen({ fullscreenElement: document.documentElement })

    app.togglePresentationMode() // on
    app.togglePresentationMode() // off

    expect(exitFullscreen).toHaveBeenCalledTimes(1)
  })

  it('does not call exitFullscreen if the document was never in fullscreen', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)
    const { exitFullscreen } = stubFullscreen({ fullscreenElement: null })

    app.togglePresentationMode() // on (request rejected/no-op in this stub)
    app.togglePresentationMode() // off

    expect(exitFullscreen).not.toHaveBeenCalled()
  })

  it('a rejected requestFullscreen (no user gesture) does not throw or block presentation mode', async () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)
    stubFullscreen({ requestFullscreen: jest.fn().mockRejectedValue(new Error('no gesture')) })

    expect(() => app.togglePresentationMode()).not.toThrow()
    expect(app.settings.isPresentationMode).toBe(true)
    expect(app.readOnly).toBe(true)

    // Let the rejected promise's `.catch` run; an unhandled rejection would fail the test run.
    await Promise.resolve()
    await Promise.resolve()
  })

  it('degrades gracefully when the Fullscreen API is entirely unavailable', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)
    // No requestFullscreen/exitFullscreen defined at all (the jsdom default) — simulates a
    // browser or an iframe without Fullscreen API support.
    expect(() => app.togglePresentationMode()).not.toThrow()
    expect(app.settings.isPresentationMode).toBe(true)
    expect(app.readOnly).toBe(true)

    expect(() => app.togglePresentationMode()).not.toThrow()
    expect(app.settings.isPresentationMode).toBe(false)
  })
})

describe('setShapeAnimation (T16.2)', () => {
  it('sets and clears a shape animation through the command layer (undo/redo)', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)
    expect(app.getShape('rect1').animation).toBeUndefined()

    app.setShapeAnimation(CLICK_FADE, ['rect1'])
    expect(app.getShape('rect1').animation).toEqual(CLICK_FADE)

    app.undo()
    expect(app.getShape('rect1').animation).toBeUndefined()
    app.redo()
    expect(app.getShape('rect1').animation).toEqual(CLICK_FADE)

    app.setShapeAnimation(undefined, ['rect1'])
    expect(app.getShape('rect1').animation).toBeUndefined()
  })

  it('is a no-op with no ids and no selection', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)
    app.selectNone()
    expect(() => app.setShapeAnimation(CLICK_FADE)).not.toThrow()
    expect(app.getShape('rect1').animation).toBeUndefined()
  })
})

describe('Build-order animation playback (T16.1)', () => {
  // page1: rect1 (onClick), rect2 (withPrevious -> joins rect1's step), rect3 (afterPrevious ->
  // its own auto step). Two build steps total.
  function twoStepDeck() {
    const app = new TldrawTestApp().loadDocument(mockDocument)
    app.setShapeAnimation(CLICK_FADE, ['rect1'])
    app.setShapeAnimation(
      { effect: AnimationEffect.FadeIn, trigger: AnimationTrigger.WithPrevious, order: 1, durationMs: 300, delayMs: 0 },
      ['rect2']
    )
    app.setShapeAnimation(
      { effect: AnimationEffect.SlideIn, trigger: AnimationTrigger.AfterPrevious, order: 2, durationMs: 300, delayMs: 0 },
      ['rect3']
    )
    return app
  }

  it('buildSteps groups withPrevious and separates afterPrevious', () => {
    const app = twoStepDeck()
    expect(app.buildSteps).toEqual([
      { shapeIds: ['rect1', 'rect2'], auto: false },
      { shapeIds: ['rect3'], auto: true },
    ])
  })

  it('advancePresentation/previousPresentation are no-ops outside presentation mode', () => {
    const app = twoStepDeck()
    app.advancePresentation()
    expect(app.appState.presentationBuildStep).toBe(0)
    app.previousPresentation()
    expect(app.appState.presentationBuildStep).toBe(0)
  })

  it('advancePresentation reveals one step at a time, then moves to the next slide', () => {
    const app = twoStepDeck()
    app.createPage('slide2')
    app.changePage('page1')
    app.togglePresentationMode()

    expect(app.appState.presentationBuildStep).toBe(0)
    app.advancePresentation()
    expect(app.appState.presentationBuildStep).toBe(1)
    expect(app.currentPageId).toBe('page1')
    app.advancePresentation()
    expect(app.appState.presentationBuildStep).toBe(2)
    expect(app.currentPageId).toBe('page1')

    // Every step revealed — the next "next" moves the slide, not the build.
    app.advancePresentation()
    expect(app.currentPageId).toBe('slide2')
    expect(app.appState.presentationBuildStep).toBe(0)
  })

  it('previousPresentation un-reveals a step before moving slides, and lands on the previous slide fully built', () => {
    const app = twoStepDeck()
    app.createPage('slide2')
    app.changePage('page1')
    app.togglePresentationMode()
    app.advancePresentation()
    app.advancePresentation()
    app.advancePresentation() // -> slide2

    app.previousPresentation()
    expect(app.currentPageId).toBe('page1')
    expect(app.appState.presentationBuildStep).toBe(2) // fully built, not reset to 0

    app.previousPresentation()
    expect(app.appState.presentationBuildStep).toBe(1)
    expect(app.currentPageId).toBe('page1') // un-revealing a step does not change slides
  })

  it('changing slides through ordinary navigation resets the build step', () => {
    const app = twoStepDeck()
    app.createPage('slide2')
    app.changePage('page1')
    app.togglePresentationMode()
    app.advancePresentation()
    expect(app.appState.presentationBuildStep).toBe(1)

    app.changePage('slide2')
    expect(app.appState.presentationBuildStep).toBe(0)
  })
})

describe('skipInPresentation navigation (T16.4)', () => {
  it('nextPage/previousPage skip a flagged slide only while presenting', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)
    app.createPage('slide2')
    app.createPage('slide3')
    app.setPageSkipInPresentation('slide2', true)
    app.changePage('page1')

    // Editing navigation still visits every slide.
    app.nextPage()
    expect(app.currentPageId).toBe('slide2')
    app.changePage('page1')

    app.togglePresentationMode()
    app.nextPage()
    expect(app.currentPageId).toBe('slide3') // slide2 skipped

    app.previousPage()
    expect(app.currentPageId).toBe('page1')
  })

  it('stops at the end of the deck even when every remaining slide is skipped', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)
    app.createPage('slide2')
    app.setPageSkipInPresentation('slide2', true)
    app.changePage('page1')
    app.togglePresentationMode()

    app.nextPage()
    expect(app.currentPageId).toBe('page1') // nowhere presentable to go
  })
})
