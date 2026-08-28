import { mockDocument, TldrawTestApp } from '~test'

describe('Duplicate page command', () => {
  const app = new TldrawTestApp()

  it('does, undoes and redoes command', () => {
    app.loadDocument(mockDocument)

    const initialId = app.page.id

    app.duplicatePage(app.currentPageId)

    const nextId = app.page.id

    app.undo()

    expect(app.page.id).toBe(initialId)

    app.redo()

    expect(app.page.id).toBe(nextId)
  })

  it('gives the duplicated page a new, non-colliding childIndex', () => {
    app.loadDocument(mockDocument)

    const originalChildIndex = app.page.childIndex

    app.duplicatePage(app.currentPageId)

    expect(app.page.childIndex).toBeDefined()
    expect(app.page.childIndex).not.toBe(originalChildIndex)
  })

  it('builds a page state with no shapes/bindings/name keys on it', () => {
    app.loadDocument(mockDocument)

    app.duplicatePage(app.currentPageId)

    const pageState = app.pageState as Record<string, unknown>

    expect(pageState.shapes).toBeUndefined()
    expect(pageState.bindings).toBeUndefined()
    expect(pageState.name).toBeUndefined()
    expect(pageState.id).toBe(app.page.id)
  })

  it('copies the slide size rather than aliasing the source page array', () => {
    app.loadDocument(mockDocument)

    const sourceId = app.currentPageId
    app.duplicatePage(sourceId)

    const source = app.document.pages[sourceId]
    const duplicate = app.page

    expect(duplicate.size).toEqual(source.size)
    expect(duplicate.size).not.toBe(source.size)
  })
})
