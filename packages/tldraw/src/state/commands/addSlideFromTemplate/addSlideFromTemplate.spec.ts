import { mockDocument, TldrawTestApp } from '~test'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'
import { getTemplate } from '~state/templates'

describe('Add slide from template command', () => {
  it('adds a new page built from the template and makes it current', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)

    const pageCountBefore = Object.keys(app.document.pages).length
    const initialPageId = app.currentPageId

    app.addSlideFromTemplate('bullets')

    expect(Object.keys(app.document.pages).length).toBe(pageCountBefore + 1)
    expect(app.currentPageId).not.toBe(initialPageId)
    expect(app.page.name).toBe('Bullets')
    expect(app.page.size).toEqual([1920, 1080])
    expect(Object.keys(app.page.shapes).length).toBe(getTemplate('bullets')!.shapes.length)
  })

  it('does, undoes and redoes the command', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)

    const initialPageId = app.currentPageId
    app.addSlideFromTemplate('title')
    const newPageId = app.currentPageId
    expect(app.document.pages[newPageId]).toBeDefined()

    app.undo()
    expect(app.document.pages[newPageId]).toBeUndefined()
    expect(app.currentPageId).toBe(initialPageId)

    app.redo()
    expect(app.document.pages[newPageId]).toBeDefined()
    expect(app.currentPageId).toBe(newPageId)
  })

  it('fills matching slot content', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)

    app.addSlideFromTemplate('title', { title: 'My Custom Title' })

    const titleShape = Object.values(app.page.shapes).find((s) => s.slot === 'title')
    expect(titleShape && 'text' in titleShape ? titleShape.text : undefined).toBe(
      'My Custom Title'
    )
  })

  it('resolves theme-token colours against the active deck theme at creation time', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)
    const theme = BUILT_IN_DECK_THEMES[0]

    app.setDeckTheme(theme)
    app.addSlideFromTemplate('title')

    const titleShape = Object.values(app.page.shapes).find((s) => s.slot === 'title')
    expect(titleShape?.style.font).toBe(theme.fonts.heading)
  })

  it('does nothing for an unknown template id', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)
    const pageCountBefore = Object.keys(app.document.pages).length

    app.addSlideFromTemplate('not-a-real-template')

    expect(Object.keys(app.document.pages).length).toBe(pageCountBefore)
  })

  it('accepts a full Template object as well as a built-in id', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)
    const template = getTemplate('closing')!

    app.addSlideFromTemplate(template)

    expect(app.page.name).toBe('Closing')
  })

  it('does nothing in readOnly mode', () => {
    const app = new TldrawTestApp()
    app.loadDocument(mockDocument)
    const pageCountBefore = Object.keys(app.document.pages).length

    app.readOnly = true
    app.addSlideFromTemplate('title')

    expect(Object.keys(app.document.pages).length).toBe(pageCountBefore)
  })
})
