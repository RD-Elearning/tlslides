import { TldrawTestApp } from '~test'
import { deckSpecToDocument } from '~blocks/deck-document'
import { documentToDeckSpec } from '~blocks/slide-decompiler'
import { validateDeckSpec, defaultBlockRegistry } from '~blocks/validate-deck-spec'
import type { DeckSpec } from '~blocks/types'
import type { ComponentShape } from '~types'
import { blockActions, itemActions } from './actions'
import { itemOfPath, itemChain, listOf } from './items'
import { slotAt, textLimits } from './slots'

const registry = defaultBlockRegistry()

const card = (n: number) => ({
  id: `c${n}`,
  type: 'tls.l.card',
  props: { children: [{ id: `i${n}`, type: 'tls.m.icon', props: { icon: 'book-open' } }, { id: `t${n}`, type: 'tls.t.title', props: { text: `Card ${n}` } }] },
})

const spec = {
  version: 1,
  id: 'deck',
  title: 'Deck',
  theme: 'default',
  aspect: '16:9',
  style: 'corporate',
  slides: [
    { id: 's1', layout: 'full-bleed', regions: { content: [{ id: 'row', type: 'tls.l.row', props: { children: [card(1), card(2), card(3)] } }] } },
    { id: 's2', layout: 'full-bleed', regions: { content: [{ id: 'list', type: 'tls.t.bullets', props: { items: [{ text: 'A' }, { text: 'B' }] } }] } },
  ],
} as unknown as DeckSpec

function load() {
  const app = new TldrawTestApp()
  app.loadDocument(deckSpecToDocument(spec).document)
  return app
}
const shapeOf = (app: TldrawTestApp, componentId: string) =>
  Object.values(app.document.pages).flatMap((p) => Object.values(p.shapes)).find((s) => (s as ComponentShape).componentId === componentId) as ComponentShape
const errors = (app: TldrawTestApp) =>
  validateDeckSpec(documentToDeckSpec(app.document).spec, registry).filter((f) => f.level === 'error')

describe('editor E04 — items', () => {
  const row = registry.get('tls.l.row')!
  const props = { children: [card(1), card(2)] }
  test('item paths through blocks slots', () => {
    expect(itemOfPath(row, props, 'children.1.props.children.1.props.text', registry)).toBe('children.1.props.children.1')
    expect(itemChain(row, props, 'children.1.props.children.1.props.text', registry)).toEqual(['children.1', 'children.1.props.children.1'])
    expect(listOf(row, props, 'children.1', registry)).toMatchObject({ listPath: 'children', index: 1, count: 2, kind: 'blocks' })
  })
  test('slotAt reaches a child block slot and its limits', () => {
    const at = slotAt(row, props, 'children.1.props.children.1.props.text', registry)
    expect(at.def?.type).toBe('tls.t.title')
    expect(textLimits(at).required).toBe(true)
  })
})

describe('editor E04 — actions', () => {
  test('block actions from the schema', () => {
    const def = registry.get('tls.c.poster-cover')!
    const ids = blockActions(def, { title: 'T', variant: 'stacked' }, { inlinePaths: ['title'], registry }).map((a) => a.id)
    expect(ids).toEqual(expect.arrayContaining(['edit-text', 'variant', 'add-field', 'duplicate', 'delete', 'more']))
  })
  test('item actions respect min and offer the child icon', () => {
    const row = registry.get('tls.l.row')!
    const acts = itemActions(row, { children: [card(1)] }, 'children.0', { registry })
    expect(acts.find((a) => a.id === 'item-delete')).toMatchObject({ enabled: false })
    expect(acts.filter((a) => a.id === 'item-move').every((a) => !(a as { enabled: boolean }).enabled)).toBe(true)
    const inner = itemActions(row, { children: [card(1)] }, 'children.0.props.children.0', { registry })
    expect(inner.find((a) => a.id === 'change-icon')).toMatchObject({ path: 'children.0.props.children.0.props.icon' })
  })
})

describe('editor E04 — operations keep the deck saveable, one undo step each', () => {
  test('move, duplicate and remove a card of a row', () => {
    const app = load()
    app.changePage('s1')
    const row = shapeOf(app, 'tls.l.row')
    const be = app.blockEdit
    const kids = () => ((app.getShape(row.id) as ComponentShape).props as { children: Array<{ id: string }> }).children.map((c) => c.id)

    expect(be.moveItem(row.id, 'children.0', 1)).toBe('children.1')
    expect(kids()).toEqual(['c2', 'c1', 'c3'])
    app.undo()
    expect(kids()).toEqual(['c1', 'c2', 'c3'])

    expect(be.duplicateItem(row.id, 'children.1')).toBe('children.2')
    expect(kids()).toEqual(['c1', 'c2', 'c2_c1', 'c3'])
    expect(errors(app)).toEqual([])

    expect(be.removeItem(row.id, 'children.0')).toBe(true)
    expect(kids()).toEqual(['c2', 'c2_c1', 'c3'])
    expect(errors(app)).toEqual([])
    app.undo()
    expect(kids()).toEqual(['c1', 'c2', 'c2_c1', 'c3'])
  })

  test('a list item: refused at its minimum', () => {
    const app = load()
    app.changePage('s2')
    const list = shapeOf(app, 'tls.t.bullets')
    const min = listOf(registry.get('tls.t.bullets'), list.props, 'items.0', registry)!.min
    let n = (list.props as { items: unknown[] }).items.length
    while (n > min) {
      expect(app.blockEdit.removeItem(list.id, 'items.0')).toBe(true)
      n--
    }
    expect(app.blockEdit.removeItem(list.id, 'items.0')).toBe(false)
    expect(app.blockEdit.lastRefusal).toBe('min')
  })

  test('read-only refuses every write', () => {
    const app = load()
    app.changePage('s1')
    const row = shapeOf(app, 'tls.l.row')
    app.readOnly = true
    expect(app.blockEdit.removeItem(row.id, 'children.0')).toBe(false)
    expect(app.blockEdit.lastRefusal).toBe('read-only')
  })

  test('selectItem / selectParent', () => {
    const app = load()
    app.changePage('s1')
    const row = shapeOf(app, 'tls.l.row')
    app.select(row.id)
    app.blockEdit.selectItem(row.id, 'children.1.props.children.0')
    expect(app.blockEdit.selectedItem?.itemPath).toBe('children.1.props.children.0')
    app.blockEdit.selectParent()
    expect(app.blockEdit.selectedItem?.itemPath).toBe('children.1')
    app.blockEdit.selectParent()
    expect(app.blockEdit.selectedItem).toBeUndefined()
  })
})
