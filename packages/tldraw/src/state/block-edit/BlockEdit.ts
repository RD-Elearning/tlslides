/**
 * Editor E01/E04 — `app.blockEdit`: the headless block-editing API a host (spro) drives its own
 * floating UI with. Every write is one undo step and keeps the deck saveable.
 */
import type { TldrawApp } from '../TldrawApp'
import { TDShapeType } from '~types'
import type { ComponentShape } from '~types'

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

  /* ---------------- pointer (drill-in, editor E04) ---------------- */

  /** A single press on a block shape (not the second press of a double click). */
  onBlockPointerDown(_shapeId: string, _target: HTMLElement): void {
    // editor E04 fills this in (item selection inside a selected block)
  }
}
