/**
 * Editor E01/E04 — `app.blockEdit`: the headless block-editing API a host (spro) drives its own
 * floating UI with. Every write is one undo step and keeps the deck saveable.
 */
import type { TldrawApp } from '../TldrawApp'
import { TDShapeType } from '~types'
import type { ComponentShape, TDAsset } from '~types'
import type { BlockDefinition } from '~blocks/types'
import { getAtPath, hasPath, parsePropPath, setAtPath } from '~blocks/prop-path'
import { defaultBlockRegistry } from '~blocks/validate-deck-spec'
import { collectDeckIds, remintBlockIds } from '~blocks/remint-ids'
import { runsOf } from '~components/InlineEditor/rich-edit'
import { insertBlockShape } from './insert'
import { itemChain, itemOfPath, listOf, parentItem } from './items'
import { blockActions, itemActions, type BlockAction } from './actions'

export type { BlockAction } from './actions'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** What the host needs to draw its floating bars (editor E04). */
export interface BlockSelection {
  shapeId: string
  blockId?: string
  type: string
  name: string
  /** Viewport pixels of the block. */
  rect: Rect
  item?: { path: string; rect: Rect; axis: 'x' | 'y'; index: number; count: number }
  /** Item actions when `item` is set, else the block's. */
  actions: BlockAction[]
  editingText: boolean
  readOnly: boolean
}

/** Why an operation was refused (the host may say it). */
export type EditRefusal = 'read-only' | 'no-block' | 'min' | 'max' | 'connector' | 'not-a-list'

type TextOpener = (path?: string, opts?: { selectAll?: boolean }) => boolean

export class BlockEdit {
  private openers = new Map<string, TextOpener>()

  constructor(private app: TldrawApp) {}

  /* ---------------- shapes ---------------- */

  /** The single selected component shape, if any. */
  selectedBlock(): ComponentShape | undefined {
    const ids = this.app.selectedIds
    if (ids.length !== 1) return undefined
    const shape = this.app.page.shapes[ids[0]]
    return shape && shape.type === TDShapeType.Component ? (shape as ComponentShape) : undefined
  }

  getBlock(shapeId?: string): ComponentShape | undefined {
    if (!shapeId) return this.selectedBlock()
    const shape = this.app.page.shapes[shapeId]
    return shape && shape.type === TDShapeType.Component ? (shape as ComponentShape) : undefined
  }

  /* ---------------- inspector ---------------- */

  openInspector(shapeId?: string, opts: { tab?: 'content' | 'style' | 'motion'; field?: string } = {}): void {
    const shape = this.getBlock(shapeId)
    if (!shape) return
    if (!this.app.selectedIds.includes(shape.id)) this.app.select(shape.id)
    this.app.patchEditorUi({ inspectorFor: shape.id, inspectorTab: opts.tab, inspectorField: opts.field })
  }

  closeInspector(): void {
    if (this.app.appState.inspectorFor === undefined) return
    this.app.patchEditorUi({ inspectorFor: undefined, inspectorTab: undefined, inspectorField: undefined })
  }

  /* ---------------- inline text ---------------- */

  /** ComponentUtil registers how to open its inline editor (one per mounted block shape). */
  registerTextEditor(shapeId: string, open: TextOpener): () => void {
    this.openers.set(shapeId, open)
    return () => {
      if (this.openers.get(shapeId) === open) this.openers.delete(shapeId)
    }
  }

  canEditText(shapeId?: string): boolean {
    const shape = this.getBlock(shapeId)
    if (!shape || this.app.readOnly) return false
    const el = typeof document !== 'undefined' ? document.getElementById(shape.id) : null
    return !!el?.querySelector('[data-prop-path]')
  }

  /** Open the inline editor on `path` (the block's first editable text when omitted). */
  startTextEdit(shapeId?: string, path?: string, opts?: { selectAll?: boolean }): boolean {
    const shape = this.getBlock(shapeId)
    if (!shape || this.app.readOnly) return false
    if (!this.app.selectedIds.includes(shape.id)) this.app.select(shape.id)
    const open = this.openers.get(shape.id)
    return open ? open(path, opts) : false
  }

  setEditingText(path: string | undefined): void {
    if (this.app.appState.editingText === path) return
    this.app.patchEditorUi({ editingText: path })
  }

  get isEditingText(): boolean {
    return this.app.appState.editingText !== undefined
  }


  /* ---------------- definitions ---------------- */

  registry() {
    return this.app.deck.blockRegistry ?? defaultBlockRegistry()
  }

  defOf(shape: ComponentShape | undefined): BlockDefinition | undefined {
    return shape ? this.registry().get(shape.componentId) : undefined
  }

  propsOf(shape: ComponentShape): Record<string, unknown> {
    const p = shape.props as Record<string, unknown>
    const meta = p.$block as { props?: Record<string, unknown> } | undefined
    return meta?.props ?? p
  }

  /** The texts of a block the inline editor can open, in DOM order (unique paths). */
  inlinePaths(shapeId: string): string[] {
    const shape = this.getBlock(shapeId)
    const el = typeof document !== 'undefined' ? document.getElementById(shapeId) : null
    if (!shape || !el) return []
    const props = this.propsOf(shape)
    const out: string[] = []
    el.querySelectorAll('[data-prop-path]').forEach((n) => {
      const p = n.getAttribute('data-prop-path')
      if (p && !out.includes(p) && hasPath(props, p) && runsOf(getAtPath(props, p)) !== null) out.push(p)
    })
    return out
  }

  /* ---------------- writes (each one = one undo step) ---------------- */

  private refuse(reason: EditRefusal): false {
    this.lastRefusal = reason
    return false
  }

  /** The reason the last operation was refused. */
  lastRefusal: EditRefusal | undefined

  setProp(shapeId: string, path: string, value: unknown): boolean {
    if (this.app.readOnly) return this.refuse('read-only')
    const shape = this.getBlock(shapeId)
    if (!shape) return this.refuse('no-block')
    const props = shape.props as Record<string, unknown>
    this.app.updateShapes({ id: shape.id, props: setAtPath(props, path, value) })
    return true
  }

  setVariant(shapeId: string, value: string): boolean {
    return this.setProp(shapeId, 'variant', value)
  }

  toggle(shapeId: string, slot: string): boolean {
    const shape = this.getBlock(shapeId)
    if (!shape) return this.refuse('no-block')
    return this.setProp(shapeId, slot, (shape.props as Record<string, unknown>)[slot] === false ? undefined : false)
  }

  /** Fill an empty optional text with `placeholder`, then open the inline editor on it. */
  addField(shapeId: string, path: string, placeholder: string): boolean {
    if (!this.setProp(shapeId, path, placeholder)) return false
    this.openWhenRendered(shapeId, path)
    return true
  }

  deleteBlock(shapeId?: string): boolean {
    if (this.app.readOnly) return this.refuse('read-only')
    const shape = this.getBlock(shapeId)
    if (!shape) return this.refuse('no-block')
    this.app.delete([shape.id])
    return true
  }

  /** A copy beside the original (it lands in `free[]`, which survives a save). Returns its id. */
  duplicateBlock(shapeId?: string): string | undefined {
    if (this.app.readOnly) return undefined
    const shape = this.getBlock(shapeId)
    if (!shape) return undefined
    this.app.duplicate([shape.id])
    return this.app.selectedIds[0]
  }

  private writeList(shape: ComponentShape, listPath: string, items: unknown[]): void {
    this.app.updateShapes({ id: shape.id, props: setAtPath(shape.props as Record<string, unknown>, listPath, items) })
  }

  private listFor(shapeId: string | undefined, itemPath: string) {
    const shape = this.getBlock(shapeId)
    if (!shape) return undefined
    const list = listOf(this.defOf(shape), this.propsOf(shape), itemPath, this.registry())
    return list ? { shape, list } : undefined
  }

  /** Move an item one place back (-1) or forward (+1). Returns its new path. */
  moveItem(shapeId: string, itemPath: string, dir: -1 | 1): string | undefined {
    if (this.app.readOnly) return void this.refuse('read-only')
    const at = this.listFor(shapeId, itemPath)
    if (!at) return void this.refuse('not-a-list')
    const { shape, list } = at
    const to = list.index + dir
    if (to < 0 || to >= list.count) return undefined
    const items = [...list.items]
    ;[items[list.index], items[to]] = [items[to], items[list.index]]
    this.writeList(shape, list.listPath, items)
    const next = `${list.listPath}.${to}`
    this.selectItem(shape.id, next)
    return next
  }

  private copyItem(item: unknown, list: { kind: 'list' | 'blocks' }): unknown {
    const copy = JSON.parse(JSON.stringify(item ?? null))
    if (list.kind !== 'blocks' || !copy || typeof copy !== 'object') return copy
    // a child block copy needs fresh ids (deck-wide unique), its own children's too
    const taken = collectDeckIds(this.app.document as never)
    const holder = remintBlockIds([{ id: '_', props: { children: [copy] } }], taken).shapes[0] as { props: { children: unknown[] } }
    return holder.props.children[0]
  }

  duplicateItem(shapeId: string, itemPath: string): string | undefined {
    if (this.app.readOnly) return void this.refuse('read-only')
    const at = this.listFor(shapeId, itemPath)
    if (!at) return void this.refuse('not-a-list')
    const { shape, list } = at
    if (list.count >= list.max) return void this.refuse('max')
    const items = [...list.items]
    items.splice(list.index + 1, 0, this.copyItem(items[list.index], list))
    this.writeList(shape, list.listPath, items)
    const next = `${list.listPath}.${list.index + 1}`
    this.selectItem(shape.id, next)
    return next
  }

  /** A copy of the item right after it, opened for typing (its text selected). */
  addItemAfter(shapeId: string, itemPath: string): string | undefined {
    const next = this.duplicateItem(shapeId, itemPath)
    if (next) this.openWhenRendered(shapeId, undefined, next)
    return next
  }

  removeItem(shapeId: string, itemPath: string): boolean {
    if (this.app.readOnly) return this.refuse('read-only')
    const at = this.listFor(shapeId, itemPath)
    if (!at) return this.refuse('not-a-list')
    const { shape, list } = at
    if (list.count <= list.min) return this.refuse('min')
    const item = list.items[list.index] as { id?: unknown } | undefined
    if (list.kind === 'blocks' && item && typeof item.id === 'string' && this.connectorUses(item.id)) return this.refuse('connector')
    const items = list.items.filter((_, i) => i !== list.index)
    this.writeList(shape, list.listPath, items)
    const parent = parentItem(this.defOf(shape), this.propsOf(shape), itemPath, this.registry())
    this.selectItem(shape.id, parent ?? null)
    return true
  }

  private connectorUses(blockId: string): boolean {
    return Object.values(this.app.page.shapes).some((s) => {
      const p = (s as ComponentShape).props as Record<string, { block?: string }> | undefined
      return (s as ComponentShape).componentId === 'tls.g.connector' && (p?.from?.block === blockId || p?.to?.block === blockId)
    })
  }

  /** Point an image slot at `src` (spro: `fig:<id>` of the deck's document), registering its data. */
  replaceImage(shapeId: string, path: string, src: string, asset?: { key: string; dataUri: string }): boolean {
    if (this.app.readOnly) return this.refuse('read-only')
    if (asset) {
      const a = { id: asset.key, type: 'image', name: asset.key, src: asset.dataUri, size: [0, 0] } as unknown as TDAsset
      this.app.patchAssets({ [asset.key]: a })
    }
    const shape = this.getBlock(shapeId)
    if (!shape) return this.refuse('no-block')
    const current = getAtPath(shape.props as Record<string, unknown>, path)
    // an image slot is either a source string or `{ src, alt, … }`
    const value = current && typeof current === 'object' ? { ...(current as object), src } : src
    return this.setProp(shapeId, path, value)
  }

  /** Insert a block (its example, or `props`) at the slide centre, selected. Returns the shape id. */
  insertBlock(type: string, props?: Record<string, unknown>): string | undefined {
    if (this.app.readOnly) return undefined
    const def = this.registry().get(type)
    if (!def) return undefined
    return insertBlockShape(this.app, def, { props }).shapeId
  }

  /** Open the inline editor once the block has re-rendered the path (or the item's first text). */
  openWhenRendered(shapeId: string, path?: string, itemPath?: string): void {
    let tries = 0
    const attempt = () => {
      const target = path ?? this.inlinePaths(shapeId).find((p) => !itemPath || p.startsWith(`${itemPath}.`))
      if ((target && this.startTextEdit(shapeId, target, { selectAll: true })) || ++tries > 5) return
      requestAnimationFrame(attempt)
    }
    if (typeof requestAnimationFrame === 'undefined') attempt()
    else requestAnimationFrame(attempt)
  }

  /* ---------------- items: selection and drill-in ---------------- */

  get selectedItem(): { shapeId: string; itemPath: string } | undefined {
    const it = this.app.appState.blockItem
    return it && this.app.selectedIds.length === 1 && this.app.selectedIds[0] === it.shapeId ? it : undefined
  }

  selectItem(shapeId: string, itemPath: string | null): void {
    const cur = this.app.appState.blockItem
    if (!itemPath) {
      if (cur) this.app.patchEditorUi({ blockItem: undefined })
      return
    }
    if (cur && cur.shapeId === shapeId && cur.itemPath === itemPath) return
    if (!this.app.selectedIds.includes(shapeId)) this.app.select(shapeId)
    this.app.patchEditorUi({ blockItem: { shapeId, itemPath } })
  }

  /** Esc: item → its parent item → the block. Returns false when nothing was selected inside. */
  selectParent(): boolean {
    const it = this.selectedItem
    if (!it) return false
    const shape = this.getBlock(it.shapeId)
    const parent = shape ? parentItem(this.defOf(shape), this.propsOf(shape), it.itemPath, this.registry()) : undefined
    this.selectItem(it.shapeId, parent ?? null)
    return true
  }

  /** The item paths under a DOM node of a block, outermost first. */
  itemsAt(shapeId: string, target: HTMLElement): string[] {
    const shape = this.getBlock(shapeId)
    const el = typeof document !== 'undefined' ? document.getElementById(shapeId) : null
    if (!shape || !el) return []
    const def = this.defOf(shape)
    const props = this.propsOf(shape)
    const found = new Set<string>()
    for (let n: HTMLElement | null = target; n && n !== el; n = n.parentElement) {
      const ip = n.getAttribute('data-item-path')
      if (ip) for (const p of itemChain(def, props, ip, this.registry())) found.add(p)
      const pp = n.getAttribute('data-prop-path')
      if (pp) for (const p of itemChain(def, props, pp, this.registry())) found.add(p)
    }
    return [...found].sort((a, b) => a.length - b.length)
  }

  /** A single press on a block shape (not the second press of a double click), before the select
   *  tool sees it: on an already selected block it selects the item under the pointer, one level
   *  deeper per press. */
  onBlockPointerDown(shapeId: string, target: HTMLElement): void {
    if (this.app.readOnly) return
    const selected = this.app.selectedIds.length === 1 && this.app.selectedIds[0] === shapeId
    if (!selected) {
      if (this.app.appState.blockItem) this.selectItem(shapeId, null)
      return
    }
    const chain = this.itemsAt(shapeId, target)
    if (!chain.length) {
      this.selectItem(shapeId, null)
      return
    }
    const cur = this.selectedItem?.itemPath
    const at = cur ? chain.indexOf(cur) : -1
    // the next level under the current one; a press outside the current item starts over
    const next = at >= 0 ? chain[Math.min(at + 1, chain.length - 1)] : chain[0]
    this.selectItem(shapeId, next)
  }

  /* ---------------- selection report for the host ---------------- */

  private unionRect(nodes: Element[]): Rect | undefined {
    const rects = nodes.map((n) => n.getBoundingClientRect()).filter((r) => r.width > 0 || r.height > 0)
    if (!rects.length) return undefined
    const x = Math.min(...rects.map((r) => r.left))
    const y = Math.min(...rects.map((r) => r.top))
    const x2 = Math.max(...rects.map((r) => r.right))
    const y2 = Math.max(...rects.map((r) => r.bottom))
    return { x, y, width: x2 - x, height: y2 - y }
  }

  /** Screen rect of an item: its wrapper group, else the union of its texts. */
  itemRect(shapeId: string, itemPath: string): Rect | undefined {
    const el = typeof document !== 'undefined' ? document.getElementById(shapeId) : null
    if (!el) return undefined
    const group = el.querySelector(`[data-item-path="${CSS.escape(itemPath)}"]`)
    if (group) {
      const r = group.getBoundingClientRect()
      if (r.width > 0 || r.height > 0) return { x: r.left, y: r.top, width: r.width, height: r.height }
    }
    const leaves = Array.from(el.querySelectorAll('[data-prop-path]')).filter((n) => {
      const p = n.getAttribute('data-prop-path') ?? ''
      return p === itemPath || p.startsWith(`${itemPath}.`)
    })
    return this.unionRect(leaves)
  }

  /** The current selection as the host's floating bars need it, or null. */
  selection(): BlockSelection | null {
    const app = this.app
    if (app.session || app.settings.isPresentationMode) return null
    const shape = this.selectedBlock()
    const el = shape && typeof document !== 'undefined' ? document.getElementById(shape.id) : null
    if (!shape || !el) return null
    const def = this.defOf(shape)
    if (!def) return null
    const r = el.getBoundingClientRect()
    const props = this.propsOf(shape)
    const meta = (shape.props as Record<string, unknown>).$block as { id?: string } | undefined
    const base = {
      shapeId: shape.id,
      blockId: meta?.id,
      type: shape.componentId,
      name: def.name,
      rect: { x: r.left, y: r.top, width: r.width, height: r.height },
      editingText: this.isEditingText,
      readOnly: app.readOnly,
    }
    const it = this.selectedItem
    const list = it ? listOf(def, props, it.itemPath, this.registry()) : undefined
    const itemRect = it && list ? this.itemRect(shape.id, it.itemPath) : undefined
    if (it && list && itemRect) {
      const near = this.itemRect(shape.id, `${list.listPath}.${list.index > 0 ? list.index - 1 : list.index + 1}`)
      const axis: 'x' | 'y' = near && Math.abs(near.x - itemRect.x) > Math.abs(near.y - itemRect.y) ? 'x' : 'y'
      return {
        ...base,
        item: { path: it.itemPath, rect: itemRect, axis, index: list.index, count: list.count },
        actions: itemActions(def, props, it.itemPath, { registry: this.registry() }),
      }
    }
    return { ...base, actions: blockActions(def, props, { inlinePaths: this.inlinePaths(shape.id), registry: this.registry() }) }
  }
}

export { itemOfPath }
