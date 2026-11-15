import { TldrawTestApp } from '~test'
import { deckSpecToDocument } from './deck-document'
import { documentToDeckSpec } from './slide-decompiler'

import { validateDeckSpec, defaultBlockRegistry } from './validate-deck-spec'
import { remintBlockIds, collectDeckIds, shapeBlockIds } from './remint-ids'
import type { DeckSpec } from './types'

const spec = {
  version: 1,
  id: 'deck',
  title: 'Deck',
  theme: 'default',
  aspect: '16:9',
  style: 'corporate',
  slides: [
    { id: 's01', layout: 'full-bleed', regions: { content: [{ id: 's01_t', type: 'tls.t.title', props: { text: 'One' } }] } },
    {
      id: 's02',
      layout: 'full-bleed',
      regions: {
        content: [
          {
            id: 's02_r',
            type: 'tls.l.row',
            props: {
              children: [
                { id: 's02_a', type: 'tls.t.title', props: { text: 'A' } },
                { id: 's02_b', type: 'tls.t.title', props: { text: 'B' } },
              ],
            },
          },
        ],
      },
    },
    { id: 's03', layout: 'full-bleed', regions: { content: [{ id: 's03_t', type: 'tls.t.title', props: { text: 'Three' } }] } },
  ],
} as unknown as DeckSpec

function errors(doc: Parameters<typeof documentToDeckSpec>[0]) {
  const out = documentToDeckSpec(doc).spec
  return validateDeckSpec(out, defaultBlockRegistry()).filter((f) => f.level === 'error')
}

describe('editor E00 — remint block ids', () => {
  it('only colliding ids change, children and connectors follow', () => {
    const taken = new Set(['a', 'kid'])
    const shapes = [
      { id: 'x', props: { $block: { id: 'a' }, children: [{ id: 'kid', type: 't', props: {} }] } },
      { id: 'y', props: { $block: { id: 'fresh' } } },
      { id: 'z', componentId: 'tls.g.connector', props: { $block: { id: 'conn' }, from: { block: 'a' }, to: { block: 'other' } } },
    ]
    const { shapes: out } = remintBlockIds(shapes, taken)
    expect(shapeBlockIds(out[0])).toEqual(['a_c1', 'kid_c1'])
    expect(out[1]).toBe(shapes[1])
    expect((out[2].props as { from: { block: string } }).from.block).toBe('a_c1')
    expect((out[2].props as { to: { block: string } }).to.block).toBe('other')
  })

  it('duplicate slide: new slide id, new block ids, right after its source, saveable', () => {
    const app = new TldrawTestApp()
    app.loadDocument(deckSpecToDocument(spec).document)
    app.changePage('s02')
    app.duplicatePage('s02')
    const doc = app.document
    const ids = collectDeckIds(doc as never)
    expect(ids.has('s02_copy1')).toBe(true)
    expect(ids.has('s02_r_c1')).toBe(true)
    expect(ids.has('s02_a_c1')).toBe(true)
    const order = documentToDeckSpec(doc).spec.slides.map((s) => s.id)
    expect(order).toEqual(['s01', 's02', 's02_copy1', 's03'])
    expect(errors(doc)).toEqual([])
  })

  it('duplicate block: the copy gets its own block id', () => {
    const app = new TldrawTestApp()
    app.loadDocument(deckSpecToDocument(spec).document)
    app.changePage('s01')
    const id = Object.values(app.page.shapes).find((s) => shapeBlockIds(s).includes('s01_t'))!.id
    app.select(id).duplicate()
    expect(errors(app.document)).toEqual([])
  })
})
