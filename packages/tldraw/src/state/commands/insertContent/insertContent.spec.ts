/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { mockDocument, TldrawTestApp } from '~test'

describe('Insert content command', () => {
  const app = new TldrawTestApp()

  beforeEach(() => {
    app.loadDocument(mockDocument)
  })

  it('does nothing when no shapes are provided', () => {
    const initialState = app.state
    app.insertContent({ shapes: [] })
    expect(app.state).toEqual(initialState)
  })

  it('does, undoes and redoes the command', () => {
    // `insertContent` always remaps ids (see TldrawApp.insertContent), so the inserted shape's id
    // is never the id on the content passed in — find it by diffing against the shapes that
    // existed before the insert instead.
    const idsBefore = new Set(app.shapes.map((s) => s.id))
    app.insertContent({ shapes: [{ ...app.getShape('rect1') }] })

    const insertedId = app.shapes.find((s) => !idsBefore.has(s.id))?.id
    expect(insertedId).toBeTruthy()
    expect(app.getShape(insertedId!)).toBeTruthy()

    app.undo()

    expect(app.shapes.map((s) => s.id).sort()).toEqual([...idsBefore].sort())

    app.redo()

    expect(app.shapes.some((s) => !idsBefore.has(s.id))).toBe(true)
  })

  it('selects the inserted shapes by default', () => {
    const idsBefore = new Set(app.shapes.map((s) => s.id))
    app.insertContent({ shapes: [{ ...app.getShape('rect1') }] })

    const insertedId = app.shapes.find((s) => !idsBefore.has(s.id))!.id
    expect(app.selectedIds).toEqual([insertedId])
  })

  it('does not change the selection when select is false', () => {
    app.select('rect2')
    app.insertContent({ shapes: [{ ...app.getShape('rect1') }] }, { select: false })
    expect(app.selectedIds).toEqual(['rect2'])
  })

  it('inserts into a given pageId, leaving the current page untouched (Phase 14)', () => {
    app.createPage('page2')
    app.changePage('page1')
    expect(app.currentPageId).toBe('page1')

    const idsOnPage2Before = new Set(Object.keys(app.document.pages.page2.shapes))
    app.insertContent(
      { shapes: [{ ...app.getShape('rect1') }] },
      { pageId: 'page2', center: false }
    )

    // The current page never changed, and never received the new shape.
    expect(app.currentPageId).toBe('page1')
    expect(app.document.pages.page1.shapes.rect1).toBeDefined()

    const insertedId = Object.keys(app.document.pages.page2.shapes).find(
      (id) => !idsOnPage2Before.has(id)
    )
    expect(insertedId).toBeTruthy()
  })

  it("selecting into a non-current pageId updates that page's own selection, not the current page's", () => {
    app.createPage('page2')
    app.changePage('page1')
    app.select('rect2')

    app.insertContent({ shapes: [{ ...app.getShape('rect1') }] }, { pageId: 'page2' })

    // The current page's own selection is untouched...
    expect(app.selectedIds).toEqual(['rect2'])
    // ...while the target page's selection was set to the newly inserted shape.
    const insertedId = Object.keys(app.document.pages.page2.shapes)[0]
    expect(app.document.pageStates.page2.selectedIds).toEqual([insertedId])

    app.undo()
    // Undo restores page2's own prior (empty) selection, not page1's.
    expect(app.document.pageStates.page2.selectedIds).toEqual([])
    expect(app.selectedIds).toEqual(['rect2'])
  })

  it('is a no-op for an unknown pageId', () => {
    const before = app.document
    app.insertContent({ shapes: [{ ...app.getShape('rect1') }] }, { pageId: 'not-a-page' })
    expect(app.document).toBe(before)
  })

  it.todo('Creates bindings')
})
