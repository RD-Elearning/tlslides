/**
 * AC4 — style master blocks (mesh, grain, motifs) are painted on the page (ai-curation §3.2
 * masters; AC1 "Found": the DOM path drew only the master background): `deckSpecToDocument` adds
 * them as locked `style:` shapes under the content, the decompiler drops them, the SVG export does
 * not draw the master twice, and `analyzeDeck` reports them as backdrops.
 */
import * as fs from 'fs'
import * as path from 'path'
import { deckSpecToDocument } from '../deck-document'
import { documentToDeckSpec } from '../slide-decompiler'
import { analyzeDeck } from '../layout-report'
import { renderPageToSvg } from '~state/render/renderPageToSvg'
import { BLOCK_PROP_KEY } from '../shape-bridge'
import type { ComponentShape } from '~types'
import type { DeckSpec } from '../types'
import { TldrawTestApp } from '~test'

const load = (n: string): DeckSpec => JSON.parse(fs.readFileSync(path.resolve(__dirname, `../__fixtures__/styles/${n}.json`), 'utf8'))

describe('AC4 style master blocks on the page', () => {
  const deck = load('gradient')
  const { document: doc } = deckSpecToDocument(deck)

  it('gradient pages carry the master blocks as locked style: shapes under the content', () => {
    for (const page of Object.values(doc.pages)) {
      const all = Object.values(page.shapes) as ComponentShape[]
      const style = all.filter((s) => s.id.startsWith('style:'))
      const own = all.filter((s) => !s.id.startsWith('style:'))
      expect(style.length).toBeGreaterThanOrEqual(2)
      for (const s of style) {
        expect(s.isLocked).toBe(true)
        expect(['tls.m.pattern', 'tls.m.decoration']).toContain(s.componentId)
        for (const o of own) expect(s.childIndex).toBeLessThan(o.childIndex)
      }
      const patterns = style.map((s) => (s.props as any).pattern).filter(Boolean)
      expect(patterns).toEqual(expect.arrayContaining(['mesh', 'grain']))
    }
    // the section master adds one orb, no other slide has one
    const orbs = (id: string) => (Object.values(doc.pages[id].shapes) as ComponentShape[]).filter((s) => s.componentId === 'tls.m.decoration' && (s.props as any).shape === 'orb')
    expect(orbs('st_03')).toHaveLength(1)
    expect(orbs('st_01')).toHaveLength(0)
  })

  it('the editor path (Deck.addSlideFromSpec) adds the same master shapes and background', () => {
    const app = new TldrawTestApp()
    app.loadDocument(doc)
    const slide = deck.slides[3]
    const id = app.deck.addSlideFromSpec({ ...slide, id: 'x' }, { id: 'added' })
    const page = app.document.pages[id]
    const all = Object.values(page.shapes) as ComponentShape[]
    const style = all.filter((s) => s.id.startsWith('style:'))
    const own = all.filter((s) => !s.id.startsWith('style:'))
    const compiled = doc.pages[slide.id]
    const want = (Object.values(compiled.shapes) as ComponentShape[]).filter((s) => s.id.startsWith('style:'))
    expect(style.map((s) => s.componentId + ':' + (s.props as any).pattern)).toEqual(
      [...want].sort((a, b) => a.childIndex - b.childIndex).map((s) => s.componentId + ':' + (s.props as any).pattern)
    )
    expect(own.length).toBeGreaterThan(0)
    for (const s of style) {
      expect(s.isLocked).toBe(true)
      for (const o of own) expect(s.childIndex).toBeLessThan(o.childIndex)
    }
    expect(page.background).toEqual(compiled.background)
  })

  it('a deck without master blocks gets none (corporate, minimal)', () => {
    for (const n of ['corporate', 'minimal']) {
      const d = deckSpecToDocument(load(n)).document
      for (const page of Object.values(d.pages)) expect(Object.keys(page.shapes).some((id) => id.startsWith('style:'))).toBe(false)
    }
  })

  it('the decompiler drops them: the spec round-trips byte-identical', () => {
    expect(JSON.stringify(documentToDeckSpec(doc).spec.slides)).toBe(JSON.stringify(deck.slides))
  })

  it('the SVG export draws each master block once', () => {
    const raw = doc.pages['st_04']
    // as compiled (shapes parented to 'page') and as the editor holds it (parented to the page id)
    const adopted = { ...raw, shapes: Object.fromEntries(Object.entries(raw.shapes).map(([k, sh]) => [k, { ...sh, parentId: raw.id }])) }
    for (const page of [raw, adopted]) {
      const seen: string[] = []
      renderPageToSvg(page, {
        theme: doc.theme,
        masters: doc.masters as any,
        blocks: (shape) => {
          seen.push(`${shape.componentId}:${(shape.props as any).pattern ?? ''}`)
          return undefined
        },
      })
      expect(seen.filter((x) => x === 'tls.m.pattern:mesh')).toHaveLength(1)
      expect(seen.filter((x) => x === 'tls.m.pattern:grain')).toHaveLength(1)
    }
  })

  it('analyzeDeck reports them as style-owned free backdrops, the deck still clean', () => {
    const reps = analyzeDeck(deck)
    for (const r of reps) {
      const style = r.blocks.filter((b) => b.id.startsWith('style:'))
      expect(style.length).toBeGreaterThanOrEqual(2)
      for (const b of style) expect(b.layer).toBe('backdrop')
      expect(r.findings).toEqual([])
    }
    expect((reps[2].blocks.find((b) => b.id === 'style:image')!.type)).toBe('tls.m.decoration')
    void BLOCK_PROP_KEY
  })
})
