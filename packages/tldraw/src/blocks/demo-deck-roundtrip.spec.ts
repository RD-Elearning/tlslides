import * as fs from 'fs'
import * as path from 'path'
import { deckSpecToDocument, documentToDeckSpec, resolveDeckTheme } from './index'
import type { DeckSpec } from './types'

const DECK: DeckSpec = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '__fixtures__/demo-deck.json'), 'utf-8')
)

describe('W1 on the real demo deck', () => {
  it('resolves the theme id to a real theme with real colours, not a fabricated empty one', () => {
    const theme = resolveDeckTheme('mono-grid')
    expect(theme.id).toBe('mono-grid')
    expect(Object.keys(theme.colors).length).toBeGreaterThan(3)
    expect(theme.colors.background).toMatch(/^#|gradient|rgb/)
  })

  it('compiles all 6 slides into pages with shapes and no compile errors', () => {
    const { document, findings } = deckSpecToDocument(DECK)
    const pageIds = Object.keys(document.pages)
    expect(pageIds).toHaveLength(6)
    for (const id of pageIds) {
      expect(Object.keys(document.pages[id].shapes).length).toBeGreaterThan(0)
    }
    expect(findings.filter((f) => f.level === 'error')).toEqual([])
    expect(document.theme).toBeDefined()
    expect(typeof document.theme).toBe('object')
    expect(document.defaultPageSize).toEqual([1920, 1080])
  })

  it('round-trips: DeckSpec -> TDDocument -> DeckSpec keeps ids, layouts, regions, block types', () => {
    const { document } = deckSpecToDocument(DECK)
    const back = documentToDeckSpec(document)
    const out = (back as any).spec ?? back
    expect(out.slides.map((s: any) => s.id)).toEqual(DECK.slides.map((s) => s.id))
    expect(out.slides.map((s: any) => s.layout)).toEqual(DECK.slides.map((s) => s.layout))
    for (let i = 0; i < DECK.slides.length; i++) {
      expect(Object.keys(out.slides[i].regions).sort()).toEqual(
        Object.keys(DECK.slides[i].regions).sort()
      )
    }
    // The free[] block on the closing slide must survive as a free block, not vanish.
    const closing = out.slides[5]
    expect(closing.free).toBeDefined()
    expect(closing.free.length).toBeGreaterThanOrEqual(1)
  })
})
