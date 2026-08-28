import { mockDocument, TldrawTestApp } from '~test'
import { SLIDE_ASPECT_PRESETS } from '~constants'

describe('Set page size command', () => {
  const app = new TldrawTestApp()

  it('does, undoes and redoes command', () => {
    app.loadDocument(mockDocument)

    const pageId = app.page.id
    const initialSize = app.page.size

    app.setPageSize(pageId, [...SLIDE_ASPECT_PRESETS.standard])

    expect(app.page.size).toEqual(SLIDE_ASPECT_PRESETS.standard)

    app.undo()

    expect(app.page.size).toEqual(initialSize)

    app.redo()

    expect(app.page.size).toEqual(SLIDE_ASPECT_PRESETS.standard)
  })

  it('copies the size array rather than aliasing it', () => {
    const app2 = new TldrawTestApp()
    app2.loadDocument(mockDocument)

    const size = [800, 600]
    app2.setPageSize(app2.page.id, size)

    expect(app2.page.size).toEqual([800, 600])
    expect(app2.page.size).not.toBe(size)

    size[0] = 999

    expect(app2.page.size).toEqual([800, 600])
  })

  it('does nothing in readOnly mode', () => {
    const app3 = new TldrawTestApp()
    app3.loadDocument(mockDocument)
    const before = app3.page.size

    app3.readOnly = true
    app3.setPageSize(app3.page.id, [640, 480])

    expect(app3.page.size).toEqual(before)
  })
})
