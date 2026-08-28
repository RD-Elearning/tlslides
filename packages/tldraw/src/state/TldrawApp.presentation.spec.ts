import { mockDocument, TldrawTestApp } from '~test'

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
