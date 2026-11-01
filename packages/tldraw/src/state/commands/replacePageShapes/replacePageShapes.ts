import type { TDShape, TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

/**
 * Editor E09 — replace some shapes of a page in one undoable step: each entry of `next` is the new
 * shape for that id, or `undefined` to remove it. Used by "Căn lại bố cục" (re-flow a slide).
 */
export function replacePageShapes(app: TldrawApp, pageId: string, next: Record<string, TDShape | undefined>): TldrawCommand {
  const page = app.document.pages[pageId]
  const before: Record<string, TDShape | undefined> = {}
  for (const id of Object.keys(next)) before[id] = page?.shapes[id]
  return {
    id: 'replace_page_shapes',
    before: { document: { pages: { [pageId]: { shapes: before } } } },
    after: { document: { pages: { [pageId]: { shapes: next } } } },
  }
}
