import { mockDocument, TldrawTestApp } from '~test'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'

describe('Set deck theme command', () => {
  const theme = BUILT_IN_DECK_THEMES[0]

  it('does, undoes and redoes command', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)

    expect(app.document.theme).toBeUndefined()

    app.setDeckTheme(theme)
    expect(app.document.theme).toEqual(theme)

    app.undo()
    expect(app.document.theme).toBeUndefined()

    app.redo()
    expect(app.document.theme).toEqual(theme)
  })

  it('clears the theme back to undefined', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)

    app.setDeckTheme(theme)
    expect(app.document.theme).toEqual(theme)

    app.setDeckTheme(undefined)
    expect(app.document.theme).toBeUndefined()

    app.undo()
    expect(app.document.theme).toEqual(theme)
  })

  it('is document-scoped, not page-scoped: switching pages does not change it', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)

    app.setDeckTheme(theme)
    app.createPage()
    expect(app.document.theme).toEqual(theme)
  })

  it('does nothing in readOnly mode', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)

    app.readOnly = true
    app.setDeckTheme(theme)

    expect(app.document.theme).toBeUndefined()
  })
})
