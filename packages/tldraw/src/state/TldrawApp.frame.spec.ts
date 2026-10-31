import { mockDocument, TldrawTestApp } from '~test'
import { TDExport, TDExportTypes, TDDocument } from '~types'
import { SLIDE_ASPECT_PRESETS, FIT_TO_SCREEN_PADDING, MAX_ZOOM_STEP, WHEEL_ZOOM_SPEED } from '~constants'
import { TLDR } from '~state/TLDR'

// `loadDocument`/`migrate` mutate the document object they're given in place (and `migrate`
// stamps `document.version`, which then short-circuits its own defaulting logic on a second
// pass). Several tests below intentionally null out `size`/`shapes` to test the no-frame
// fallback, which would otherwise permanently corrupt the shared `mockDocument` fixture for
// every other test in this file. Give every test its own deep copy.
function freshDocument(): TDDocument {
  return JSON.parse(JSON.stringify(mockDocument))
}

const VIEWPORT_BOUNDS = {
  minX: 0,
  minY: 0,
  maxX: 1000,
  maxY: 1000,
  width: 1000,
  height: 1000,
}

describe('Frame-aware zoomToFit', () => {
  it('fits the frame, not the content bounding box, when the page has a size', () => {
    const app = new TldrawTestApp()
    app.loadDocument(freshDocument())
    app.setPageSize(app.page.id, [...SLIDE_ASPECT_PRESETS.widescreen])
    // Triggers exactly one auto-fit, via the first real bounds report (see `updateBounds`).
    app.updateBounds(VIEWPORT_BOUNDS)

    const { camera } = app.pageState
    // 1920x1080 into a 1000x1000 viewport is width-bound: the frame's on-screen width should be
    // exactly the viewport width minus the fit padding, centered in the remaining space.
    const screenWidth = 1920 * camera.zoom
    const screenLeft = camera.point[0] * camera.zoom
    expect(screenWidth).toBeCloseTo(1000 - FIT_TO_SCREEN_PADDING, 0)
    expect(screenLeft).toBeCloseTo((1000 - screenWidth) / 2, 0)
  })

  it('falls back to fitting content when the page has no size', () => {
    const app = new TldrawTestApp()
    app.loadDocument(freshDocument())
    app.page.size = undefined
    app.updateBounds(VIEWPORT_BOUNDS)

    // mockDocument's shapes span (0,0) to (200,200), much smaller than the 1920x1080 frame would
    // be, so the content fit should end up zoomed in past 100%.
    expect(app.pageState.camera.zoom).toBeGreaterThan(1)
  })

  it('does nothing on a page with neither a size nor any shapes', () => {
    const app = new TldrawTestApp()
    app.loadDocument(freshDocument())
    app.page.size = undefined
    app.page.shapes = {}
    const before = { ...app.pageState.camera }

    app.zoomToFit()

    expect(app.pageState.camera).toEqual(before)
  })
})

describe('zoomToFit with a docked panel', () => {
  it('centres the frame in the canvas the slide strip leaves free', () => {
    const app = new TldrawTestApp()
    app.loadDocument(freshDocument())
    app.setPageSize(app.page.id, [...SLIDE_ASPECT_PRESETS.widescreen])
    app.updateBounds(VIEWPORT_BOUNDS)
    app.setFitInsets({ right: 216 }).zoomToFit()
    const { camera } = app.pageState
    const screenWidth = 1920 * camera.zoom
    const screenLeft = camera.point[0] * camera.zoom
    expect(screenWidth).toBeCloseTo(1000 - 216 - FIT_TO_SCREEN_PADDING, 0)
    expect(screenLeft).toBeCloseTo((1000 - 216 - screenWidth) / 2, 0)
    expect(screenLeft + screenWidth).toBeLessThanOrEqual(1000 - 216)
  })

  it('ignores a panel that would leave less than half the canvas', () => {
    const app = new TldrawTestApp()
    app.loadDocument(freshDocument())
    app.setPageSize(app.page.id, [...SLIDE_ASPECT_PRESETS.widescreen])
    app.updateBounds(VIEWPORT_BOUNDS)
    app.setFitInsets({ right: 700 }).zoomToFit()
    expect(1920 * app.pageState.camera.zoom).toBeCloseTo(1000 - FIT_TO_SCREEN_PADDING, 0)
  })
})

describe('Auto-fit on page change', () => {
  it('re-fits the camera when changing to a page with a different frame size', () => {
    const app = new TldrawTestApp()
    app.loadDocument(freshDocument())
    app.updateBounds(VIEWPORT_BOUNDS) // auto-fits page1 (1920x1080, from migration)
    const firstPageId = app.page.id
    const widescreenZoom = app.pageState.camera.zoom

    app.createPage('page2')
    app.setPageSize('page2', [...SLIDE_ASPECT_PRESETS.square])
    app.zoomToFit()
    const squareZoom = app.pageState.camera.zoom

    expect(squareZoom).not.toBeCloseTo(widescreenZoom)

    app.changePage(firstPageId)
    expect(app.pageState.camera.zoom).toBeCloseTo(widescreenZoom)

    app.changePage('page2')
    // Landing back on the square page reproduces its own fit-to-frame zoom, not whatever the
    // widescreen page happened to be at.
    expect(app.pageState.camera.zoom).toBeCloseTo(squareZoom)
  })

  it('still auto-fits while presenting (readOnly)', () => {
    const app = new TldrawTestApp()
    app.loadDocument(freshDocument())
    app.updateBounds(VIEWPORT_BOUNDS)
    const firstPageId = app.page.id

    app.createPage('page2')
    app.setPageSize('page2', [...SLIDE_ASPECT_PRESETS.square])
    app.zoomToFit()
    const squareZoom = app.pageState.camera.zoom

    app.changePage(firstPageId)
    app.readOnly = true

    app.changePage('page2')

    expect(app.pageState.camera.zoom).toBeCloseTo(squareZoom)
    // The page's own data must survive the readOnly cleanup too.
    expect(app.page.size).toEqual(SLIDE_ASPECT_PRESETS.square)
  })
})

describe('Frame-aware export', () => {
  it('copySvg uses the frame as the viewport when useFrame is set', () => {
    const app = new TldrawTestApp()
    app.loadDocument(freshDocument())
    app.setPageSize(app.page.id, [...SLIDE_ASPECT_PRESETS.widescreen])

    const svgString = app.copySvg(['rect1'], app.page.id, true)
    expect(svgString).toContain('viewBox="0 0 1920 1080"')
    expect(svgString).toContain('width="1920"')
    expect(svgString).toContain('height="1080"')
  })

  it('copySvg keeps cropping to content when useFrame is not set', () => {
    const app = new TldrawTestApp()
    app.loadDocument(freshDocument())
    app.setPageSize(app.page.id, [...SLIDE_ASPECT_PRESETS.widescreen])

    const svgString = app.copySvg(['rect1'])
    expect(svgString).not.toContain('viewBox="0 0 1920 1080"')
  })

  it('copySvg only writes to the clipboard when asked to (Phase 14 — Deck.getThumbnail relies on this)', () => {
    const app = new TldrawTestApp()
    app.loadDocument(freshDocument())
    const spy = jest.spyOn(TLDR, 'copyStringToClipboard').mockImplementation(() => undefined)

    app.copySvg(['rect1'], app.page.id, true, false)
    expect(spy).not.toHaveBeenCalled()

    app.copySvg(['rect1'], app.page.id, true)
    expect(spy).toHaveBeenCalledTimes(1)

    spy.mockRestore()
  })

  it('exportAllShapesAs sizes the export to the frame', async () => {
    const onExport = jest.fn(async () => void 0)
    const app = new TldrawTestApp(undefined, { onExport })
    app.loadDocument(freshDocument())
    app.setPageSize(app.page.id, [...SLIDE_ASPECT_PRESETS.widescreen])

    await app.exportAllShapesAs(TDExportTypes.SVG)

    expect(onExport).toHaveBeenCalledTimes(1)
    const info: TDExport = onExport.mock.calls[0][0]
    expect(info.size).toEqual([1920, 1080])
    expect(info.serialized).toContain('viewBox="0 0 1920 1080"')
  })

  it('exportAllShapesAs falls back to content bounds when the page has no size', async () => {
    const onExport = jest.fn(async () => void 0)
    const app = new TldrawTestApp(undefined, { onExport })
    app.loadDocument(freshDocument())
    app.page.size = undefined

    await app.exportAllShapesAs(TDExportTypes.SVG)

    expect(onExport).toHaveBeenCalledTimes(1)
    const info: TDExport = onExport.mock.calls[0][0]
    expect(info.size).not.toEqual([1920, 1080])
  })
})

describe('Zoom-out floor on a slide frame', () => {
  function fitted() {
    const app = new TldrawTestApp()
    app.loadDocument(freshDocument())
    app.setPageSize(app.page.id, [...SLIDE_ASPECT_PRESETS.widescreen])
    app.updateBounds(VIEWPORT_BOUNDS)
    return app
  }

  it('is the fit-to-frame zoom', () => {
    const app = fitted()
    expect(app.minZoom).toBeCloseTo((1000 - FIT_TO_SCREEN_PADDING) / 1920)
    expect(app.minZoom).toBeCloseTo(app.pageState.camera.zoom)
  })

  it('stops zoomOut, zoomTo and pinches there, with the slide centred', () => {
    const app = fitted()
    const fit = { ...app.pageState.camera }
    app.zoomIn().zoomIn().pan([200, 50])
    app.zoomOut().zoomOut().zoomOut().zoomOut()
    expect(app.pageState.camera.zoom).toBeCloseTo(fit.zoom)
    expect(app.pageState.camera.point[0]).toBeCloseTo(fit.point[0])
    expect(app.pageState.camera.point[1]).toBeCloseTo(fit.point[1])

    app.zoomTo(0.1)
    expect(app.pageState.camera.zoom).toBeCloseTo(fit.zoom)
    app.pinchZoom([500, 500], [0, 0], 0.05)
    expect(app.pageState.camera.zoom).toBeCloseTo(fit.zoom)
  })

  it('still zooms in past the fit', () => {
    const app = fitted()
    const fitZoom = app.pageState.camera.zoom
    app.zoomTo(2)
    expect(app.pageState.camera.zoom).toBeCloseTo(2)
    expect(fitZoom).toBeLessThan(2)
  })

  it('keeps the editor-wide minimum on a page without a frame', () => {
    const app = new TldrawTestApp()
    app.loadDocument(freshDocument())
    app.updateBounds(VIEWPORT_BOUNDS)
    app.page.size = undefined
    app.zoomTo(0.2)
    expect(app.pageState.camera.zoom).toBeCloseTo(0.2)
  })
})

describe('Wheel zoom step', () => {
  it('caps one mouse-wheel notch, and zooms a trackpad tick in proportion', () => {
    const app = new TldrawTestApp()
    app.loadDocument(freshDocument())
    app.updateBounds(VIEWPORT_BOUNDS)
    app.zoomTo(1)
    // zoomBy is throttled (16 ms): fake timers let the second call through
    jest.useFakeTimers()
    app.zoomBy(-100 / WHEEL_ZOOM_SPEED, [500, 500]) // one notch in, ctrl+wheel deltaY -100
    expect(app.pageState.camera.zoom).toBeCloseTo(Math.exp(MAX_ZOOM_STEP), 2)
    jest.advanceTimersByTime(20)
    app.zoomBy(-4 / WHEEL_ZOOM_SPEED, [500, 500]) // a trackpad pinch tick
    expect(app.pageState.camera.zoom).toBeCloseTo(Math.exp(MAX_ZOOM_STEP + 4 / WHEEL_ZOOM_SPEED), 2)
    jest.useRealTimers()
  })
})
