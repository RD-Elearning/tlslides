import { mockDocument, TldrawTestApp } from '~test'

describe('Move page command', () => {
  const app = new TldrawTestApp()

  function sortedPageIds() {
    return Object.values(app.document.pages)
      .sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))
      .map((page) => page.id)
  }

  beforeEach(() => {
    app.loadDocument(mockDocument) // page1
    app.createPage() // page2
    app.createPage() // page3
    app.createPage() // page4
  })

  it('moves a page to a later index', () => {
    const [a, b, c, d] = sortedPageIds()
    app.movePage(a, 2)
    expect(sortedPageIds()).toEqual([b, c, a, d])
  })

  it('moves a page to an earlier index', () => {
    const [a, b, c, d] = sortedPageIds()
    app.movePage(d, 0)
    expect(sortedPageIds()).toEqual([d, a, b, c])
  })

  it('clamps an out-of-range target index to the end', () => {
    const [a, b, c, d] = sortedPageIds()
    app.movePage(a, 99)
    expect(sortedPageIds()).toEqual([b, c, d, a])
  })

  it('clamps a negative target index to the start', () => {
    const [a, b, c, d] = sortedPageIds()
    app.movePage(d, -5)
    expect(sortedPageIds()).toEqual([d, a, b, c])
  })

  it('renumbers childIndex to a gap-free 1..N sequence', () => {
    const [a] = sortedPageIds()
    app.movePage(a, 3)

    const childIndices = Object.values(app.document.pages)
      .sort((x, y) => (x.childIndex || 0) - (y.childIndex || 0))
      .map((page) => page.childIndex)

    expect(childIndices).toEqual([1, 2, 3, 4])
  })

  it('does, undoes and redoes command', () => {
    const before = sortedPageIds()
    app.movePage(before[0], 2)
    const after = sortedPageIds()

    expect(after).not.toEqual(before)

    app.undo()
    expect(sortedPageIds()).toEqual(before)

    app.redo()
    expect(sortedPageIds()).toEqual(after)
  })

  it('does nothing for an unknown page id', () => {
    const initialState = app.state
    app.movePage('does-not-exist', 0)
    expect(app.state).toEqual(initialState)
  })
})
