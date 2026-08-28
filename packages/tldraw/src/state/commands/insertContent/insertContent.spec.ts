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

  it.todo('Creates bindings')
})
