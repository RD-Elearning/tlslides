import { mockDocument, TldrawTestApp } from '~test'

describe('Set page skip-in-presentation command', () => {
  it('does, undoes and redoes command', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)

    const pageId = app.page.id
    expect(app.page.skipInPresentation).toBeUndefined()

    app.setPageSkipInPresentation(pageId, true)
    expect(app.page.skipInPresentation).toBe(true)

    app.undo()
    expect(app.page.skipInPresentation).toBeUndefined()

    app.redo()
    expect(app.page.skipInPresentation).toBe(true)
  })

  it('clears the flag back to undefined', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)

    app.setPageSkipInPresentation(app.page.id, true)
    app.setPageSkipInPresentation(app.page.id, undefined)

    expect(app.page.skipInPresentation).toBeUndefined()
  })

  it('does nothing in readOnly mode', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)

    app.readOnly = true
    app.setPageSkipInPresentation(app.page.id, true)

    expect(app.page.skipInPresentation).toBeUndefined()
  })
})
