/** Editor E11 — the basic editor keeps the slide frame fixed: no pan, scroll or zoom. */
import { TldrawTestApp } from '~test'

const camera = (app: TldrawTestApp) => JSON.stringify(app.pageState.camera)

describe('camera lock (basic profile)', () => {
  test('pan, wheel and zoom commands leave the camera where it is', () => {
    const app = new TldrawTestApp()
    app.profile = 'basic'
    const before = camera(app)
    app.pan([120, 80])
    app.zoomIn()
    app.zoomOut()
    app.zoomTo(2)
    app.resetZoom()
    app.pinchZoom([10, 10], [5, 5], 1.5)
    app.onPan?.({ point: [0, 0], delta: [0, 200] } as never, {} as never)
    expect(app.cameraLocked).toBe(true)
    expect(camera(app)).toBe(before)
  })

  test('the full editor still pans and zooms', () => {
    const app = new TldrawTestApp()
    const before = camera(app)
    app.pan([120, 80])
    expect(camera(app)).not.toBe(before)
    app.zoomTo(2)
    expect(app.pageState.camera.zoom).toBe(2)
  })
})
