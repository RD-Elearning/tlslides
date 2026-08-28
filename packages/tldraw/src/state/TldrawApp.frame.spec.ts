import { mockDocument, TldrawTestApp } from '~test'
import { TDExport, TDExportTypes, TDDocument } from '~types'
import { SLIDE_ASPECT_PRESETS, FIT_TO_SCREEN_PADDING } from '~constants'

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
