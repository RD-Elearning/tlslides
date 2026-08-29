import { TDShapeType } from '~types'
import { TldrawTestApp } from '~test'

// Mirrors `movePage.spec.ts`'s coverage exactly (same command shape, same design) — see
// `moveShapeToIndex.ts`'s doc comment for why the two commands share this design.
describe('Move shape to index command', () => {
  function freshApp() {
    return new TldrawTestApp().createShapes(
      { type: TDShapeType.Rectangle, id: 'a', childIndex: 1 },
      { type: TDShapeType.Rectangle, id: 'b', childIndex: 2 },
      { type: TDShapeType.Rectangle, id: 'c', childIndex: 3 },
      { type: TDShapeType.Rectangle, id: 'd', childIndex: 4 }
    )
  }

  function sortedIds(app: TldrawTestApp) {
    return Object.values(app.page.shapes)
      .filter((shape) => shape.parentId === app.currentPageId)
      .sort((x, y) => (x.childIndex || 0) - (y.childIndex || 0))
      .map((shape) => shape.id)
  }

  it('moves a shape to a later index', () => {
    const app = freshApp()
    app.moveShapeToIndex('a', 2)
    expect(sortedIds(app)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves a shape to an earlier index', () => {
    const app = freshApp()
    app.moveShapeToIndex('d', 0)
    expect(sortedIds(app)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('clamps an out-of-range target index to the end', () => {
    const app = freshApp()
    app.moveShapeToIndex('a', 99)
    expect(sortedIds(app)).toEqual(['b', 'c', 'd', 'a'])
  })

  it('renumbers childIndex to a gap-free 1..N sequence', () => {
    const app = freshApp()
    app.moveShapeToIndex('a', 3)
    const indices = Object.values(app.page.shapes)
      .sort((x, y) => (x.childIndex || 0) - (y.childIndex || 0))
      .map((shape) => shape.childIndex)
    expect(indices).toEqual([1, 2, 3, 4])
  })

  it('does, undoes and redoes the command', () => {
    const app = freshApp()
    const before = sortedIds(app)
    app.moveShapeToIndex('a', 2)
    const after = sortedIds(app)
    expect(after).not.toEqual(before)
    app.undo()
    expect(sortedIds(app)).toEqual(before)
    app.redo()
    expect(sortedIds(app)).toEqual(after)
  })

  it('is a no-op for a shape id that does not exist', () => {
    const app = freshApp()
    const before = sortedIds(app)
    app.moveShapeToIndex('does-not-exist', 0)
    expect(sortedIds(app)).toEqual(before)
  })
})
