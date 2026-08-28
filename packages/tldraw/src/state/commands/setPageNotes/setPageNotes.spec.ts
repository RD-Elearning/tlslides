import { mockDocument, TldrawTestApp } from '~test'

describe('Set page notes command', () => {
  it('does, undoes and redoes command', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)

    const pageId = app.page.id
    expect(app.page.notes).toBeUndefined()

    app.setPageNotes(pageId, 'Say hi to the audience.')
    expect(app.page.notes).toBe('Say hi to the audience.')

    app.undo()
    expect(app.page.notes).toBeUndefined()

    app.redo()
    expect(app.page.notes).toBe('Say hi to the audience.')
  })

  it('clears notes back to undefined', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)

    app.setPageNotes(app.page.id, 'Draft notes')
    app.setPageNotes(app.page.id, undefined)

    expect(app.page.notes).toBeUndefined()
  })

  it('does nothing in readOnly mode', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)

    app.readOnly = true
    app.setPageNotes(app.page.id, 'Should not stick')

    expect(app.page.notes).toBeUndefined()
  })
})
