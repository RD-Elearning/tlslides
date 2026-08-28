import { mockDocument, TldrawTestApp } from '~test'
import type { SlideBackground } from '~types'

describe('Set page background command', () => {
  const app = new TldrawTestApp()

  const gradient: SlideBackground = {
    type: 'linearGradient',
    angle: 135,
    stops: [
      { color: '#ff0000', at: 0 },
      { color: '#0000ff', at: 1 },
    ],
  }

  it('does, undoes and redoes command', () => {
    app.loadDocument(mockDocument)

    const pageId = app.page.id
    expect(app.page.background).toBeUndefined()

    app.setPageBackground(pageId, gradient)
    expect(app.page.background).toEqual(gradient)

    app.undo()
    expect(app.page.background).toBeUndefined()

    app.redo()
    expect(app.page.background).toEqual(gradient)
  })

  it('clears the background back to undefined', () => {
    const app2 = new TldrawTestApp()
    app2.loadDocument(mockDocument)

    app2.setPageBackground(app2.page.id, gradient)
    expect(app2.page.background).toEqual(gradient)

    app2.setPageBackground(app2.page.id, undefined)
    expect(app2.page.background).toBeUndefined()

    app2.undo()
    expect(app2.page.background).toEqual(gradient)
  })

  it('copies the stops array rather than aliasing it', () => {
    const app3 = new TldrawTestApp()
    app3.loadDocument(mockDocument)

    const stops = [
      { color: '#fff', at: 0 },
      { color: '#000', at: 1 },
    ]
    app3.setPageBackground(app3.page.id, { type: 'linearGradient', angle: 0, stops })

    stops[0].color = '#123456'

    const background = app3.page.background as Extract<SlideBackground, { type: 'linearGradient' }>
    expect(background.stops[0].color).toBe('#fff')
  })

  it('does nothing in readOnly mode', () => {
    const app4 = new TldrawTestApp()
    app4.loadDocument(mockDocument)

    app4.readOnly = true
    app4.setPageBackground(app4.page.id, gradient)

    expect(app4.page.background).toBeUndefined()
  })
})
