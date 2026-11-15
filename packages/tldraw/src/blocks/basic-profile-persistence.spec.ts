/**
 * Editor E10 — every control the basic profile offers survives save → reload (README D1).
 *
 * Fixture: slides of a real review deck (cover, journey, steps, matrix, cards, row of cards) plus a
 * table and an image slide. Each operation runs on a fresh app the way the editor runs it
 * (`app.blockEdit.*`, the strip's page commands); then `documentToDeckSpec` must validate with no
 * error, and after `deckSpecToDocument` → `documentToDeckSpec` again the change must still be there.
 */
import { TldrawTestApp } from '~test'
import { deckSpecToDocument } from './deck-document'
import { documentToDeckSpec } from './slide-decompiler'
import { contextForBlock } from './deck-context'
import { layoutBlock } from './layout/layout-child'
import { defaultBlockRegistry, validateDeckSpec } from './validate-deck-spec'
import { getAtPath } from './prop-path'
import { blockActions } from '../state/block-edit/actions'
import { itemOfPath, listOf } from '../state/block-edit/items'
import { slotAt, textLimits } from '../state/block-edit/slots'
import { BASIC_HOTKEYS } from '../hooks/useKeyboardShortcuts'
import type { BlockSpec, DeckSpec, LayoutNode, SlideSpec } from './types'
import type { ComponentShape, TDDocument } from '~types'
import * as fs from 'fs'
import * as path from 'path'

const registry = defaultBlockRegistry()
const deck = JSON.parse(fs.readFileSync(path.join(__dirname, '__fixtures__', 'basic-editor-deck.json'), 'utf8')) as DeckSpec

const blocksOf = (s: SlideSpec): BlockSpec[] => [...Object.values(s.regions ?? {}).flat(), ...(s.free ?? []).map((f) => f.block)]
const findBlock = (spec: DeckSpec, id: string) => {
  for (const s of spec.slides) for (const b of blocksOf(s)) if (b.id === id) return b
  return undefined
}
const flat = (v: unknown): unknown =>
  v && typeof v === 'object' && Array.isArray((v as { runs?: unknown[] }).runs)
    ? (v as { runs: Array<{ text?: string }> }).runs.map((r) => r.text ?? '').join('')
    : v

function load() {
  const app = new TldrawTestApp()
  app.loadDocument(deckSpecToDocument(deck).document)
  return app
}
const pagesOf = (doc: TDDocument) => Object.values(doc.pages).sort((a, b) => (a.childIndex ?? 0) - (b.childIndex ?? 0))
const shapeOf = (app: TldrawTestApp, blockId: string) => {
  for (const p of Object.values(app.document.pages))
    for (const s of Object.values(p.shapes)) if (((s as ComponentShape).props as { $block?: { id?: string } })?.$block?.id === blockId) return { shape: s as ComponentShape, pageId: p.id }
  throw new Error(`no shape for ${blockId}`)
}

/** The block's shape id, its slide made current (the editor acts on the current slide). */
const on = (app: TldrawTestApp, blockId: string) => {
  const { shape, pageId } = shapeOf(app, blockId)
  if (app.currentPageId !== pageId) app.changePage(pageId)
  return shape.id
}

/** Save (no validation error) → reload → save: the spec a later session sees. */
function saveReload(app: TldrawTestApp): DeckSpec {
  const saved = documentToDeckSpec(app.document).spec
  const errors = validateDeckSpec(saved, registry).filter((f) => f.level === 'error')
  expect(errors).toEqual([])
  return documentToDeckSpec(deckSpecToDocument(saved).document).spec
}

/** The inline-editable paths of a block, as the live editor finds them (layout propPaths). */
function inlinePaths(app: TldrawTestApp, blockId: string): string[] {
  const { shape } = shapeOf(app, blockId)
  const def = registry.get(shape.componentId)!
  const ctx = contextForBlock(shape, app.document, { headless: true, registry })
  const props = shape.props as Record<string, unknown>
  const out: string[] = []
  const walk = (n: LayoutNode) => {
    if (n.k === 'text' && n.propPath && !out.includes(n.propPath) && typeof flat(getAtPath(props, n.propPath)) === 'string') out.push(n.propPath)
    for (const c of (n as { children?: LayoutNode[] }).children ?? []) walk(c)
    const poster = (n as { poster?: LayoutNode }).poster
    if (poster) walk(poster)
  }
  walk(layoutBlock(def, props, ctx))
  return out
}

const BLOCKS = deck.slides.flatMap((s) => blocksOf(s).map((b) => b.id)).filter((id) => !/_d(ec)?\d*$/.test(id) && !id.startsWith('deck-'))

describe('editor E10 — basic operations survive save → reload', () => {
  test.each(BLOCKS)('%s: inline text, variant, toggles, fields, icon, image', (id) => {
    const probe = load()
    const { shape } = shapeOf(probe, id)
    const def = registry.get(shape.componentId)!
    const props = shape.props as Record<string, unknown>
    const paths = inlinePaths(probe, id)
    const actions = blockActions(def, props, { inlinePaths: paths, registry })
    let checked = 0
    for (const path of paths.slice(0, 3)) {
      const app = load()
      // the inline editor stops typing at the slot's limit (E03)
      const value = `Sửa ${path}`.slice(0, textLimits(slotAt(def, props, path, registry)).maxChars ?? 200)
      expect(app.blockEdit.setProp(on(app, id), path, value)).toBe(true)
      expect(flat(getAtPath(findBlock(saveReload(app), id)!.props as Record<string, unknown>, path))).toBe(value)
      checked++
    }
    for (const a of actions) {
      const app = load()
      const sid = on(app, id)
      if (a.id === 'variant') {
        const to = a.options.find((o) => o !== a.current)!
        app.blockEdit.setVariant(sid, to)
        expect(findBlock(saveReload(app), id)!.props.variant).toBe(to)
      } else if (a.id === 'toggle') {
        app.blockEdit.toggle(sid, a.slot)
        expect(!!findBlock(saveReload(app), id)!.props[a.slot]).toBe(!a.on)
      } else if (a.id === 'add-field') {
        app.blockEdit.addField(sid, a.path, 'Thêm')
        expect(getAtPath(findBlock(saveReload(app), id)!.props as Record<string, unknown>, a.path)).toBeTruthy()
      } else if (a.id === 'change-icon') {
        app.blockEdit.setProp(sid, a.path, 'star')
        expect(getAtPath(findBlock(saveReload(app), id)!.props as Record<string, unknown>, a.path)).toBe('star')
      } else if (a.id === 'replace-image') {
        app.blockEdit.replaceImage(sid, a.path, 'https://example.com/new.png')
        expect(getAtPath(findBlock(saveReload(app), id)!.props as Record<string, unknown>, a.path)).toBe('https://example.com/new.png')
      } else continue
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  })

  test.each(BLOCKS)('%s: item move / add / duplicate / delete', (id) => {
    const probe = load()
    const { shape } = shapeOf(probe, id)
    const def = registry.get(shape.componentId)!
    const props = shape.props as Record<string, unknown>
    const item = inlinePaths(probe, id)
      .map((p) => itemOfPath(def, props, p, registry))
      .find((ip): ip is string => !!ip && !!listOf(def, props, ip, registry))
    if (!item) return // a block without list items
    const list = listOf(def, props, item, registry)!
    const len = (spec: DeckSpec) => (getAtPath(findBlock(spec, id)!.props as Record<string, unknown>, list.listPath) as unknown[]).length

    let app = load()
    if (app.blockEdit.duplicateItem(on(app, id), item)) expect(len(saveReload(app))).toBe(list.count + 1)
    app = load()
    if (app.blockEdit.addItemAfter(on(app, id), item)) expect(len(saveReload(app))).toBe(list.count + 1)
    app = load()
    if (app.blockEdit.removeItem(on(app, id), item)) expect(len(saveReload(app))).toBe(list.count - 1)
    app = load()
    const first = getAtPath(props, `${list.listPath}.0`)
    const moved = app.blockEdit.moveItem(on(app, id), `${list.listPath}.0`, 1)
    if (moved) expect(JSON.stringify(getAtPath(findBlock(saveReload(app), id)!.props as Record<string, unknown>, `${list.listPath}.1`))).toBe(JSON.stringify(first))
  })

  test('block duplicate / delete / move / resize / insert', () => {
    let app = load()
    const copy = app.blockEdit.duplicateBlock(on(app, 's17_b2'))
    expect(copy).toBeTruthy()
    const blocks = saveReload(app).slides.find((s) => s.id === 's17')!
    expect(blocksOf(blocks).filter((b) => b.type === 'tls.c.cards')).toHaveLength(2)

    app = load()
    app.blockEdit.deleteBlock(on(app, 's09_co'))
    expect(findBlock(saveReload(app), 's09_co')).toBeUndefined()

    app = load()
    on(app, 's02_c')
    let { shape } = shapeOf(app, 's02_c')
    app.updateShapes({ id: shape.id, point: [shape.point[0] + 120, shape.point[1] - 80] })
    let s = saveReload(app).slides.find((x) => x.id === 's02')!
    expect(s.free?.find((f) => f.block.id === 's02_c')?.box).toMatchObject({ x: shape.point[0] + 120, y: shape.point[1] - 80 })

    app = load()
    on(app, 's02_c')
    ;({ shape } = shapeOf(app, 's02_c'))
    app.updateShapes({ id: shape.id, size: [shape.size[0] * 0.6, shape.size[1]] })
    s = saveReload(app).slides.find((x) => x.id === 's02')!
    expect(s.free?.find((f) => f.block.id === 's02_c')?.box.width).toBeCloseTo(shape.size[0] * 0.6)

    app = load()
    app.changePage(pagesOf(app.document)[6].id)
    const inserted = app.blockEdit.insertBlock('tls.t.body', { text: 'Chữ mới' })
    expect(inserted).toBeTruthy()
    s = saveReload(app).slides.find((x) => x.id === 's_tbl')!
    expect(blocksOf(s).some((b) => b.type === 'tls.t.body' && b.props.text === 'Chữ mới')).toBe(true)
  })

  test('slides: duplicate, delete, reorder, background, re-flow', () => {
    let app = load()
    const p2 = pagesOf(app.document)[1].id
    app.duplicatePage(p2)
    let spec = saveReload(app)
    expect(spec.slides).toHaveLength(deck.slides.length + 1)
    expect(spec.slides[2].id).not.toBe(spec.slides[1].id)

    app = load()
    app.deletePage(pagesOf(app.document)[3].id)
    expect(saveReload(app).slides.map((s) => s.id)).not.toContain('s16')

    app = load()
    app.movePage(pagesOf(app.document)[0].id, 1)
    expect(saveReload(app).slides.slice(0, 2).map((s) => s.id)).toEqual(['s02', 's01'])

    app = load()
    app.setPageBackground(pagesOf(app.document)[2].id, { type: 'solid', color: '#fde68a' } as never)
    expect(saveReload(app).slides[2].background).toMatchObject({ color: '#fde68a' })

    app = load()
    app.changePage(pagesOf(app.document)[1].id)
    app.blockEdit.deleteBlock(on(app, 's02_j'))
    if (app.blockEdit.reflowPage()) {
      spec = saveReload(app)
      expect(blocksOf(spec.slides[1]).map((b) => b.id)).toContain('s02_c')
    } else expect(app.blockEdit.lastRefusal).toBe('reflow-drops')
  })

  test('the basic keymap keeps no tool, z-order, group, lock or flip hotkey', () => {
    const banned = ['d,p,2', 'r,4', 'e,3', 't,8', '⌘+g,ctrl+g', 'shift+⌘+l,shift+ctrl+l', ']', '[', 'shift+h']
    for (const k of banned) expect(BASIC_HOTKEYS.has(k)).toBe(false)
  })
})
