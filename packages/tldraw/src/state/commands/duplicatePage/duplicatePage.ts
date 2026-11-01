import type { TldrawCommand } from '~types'
import { Utils } from '@tlslides/core'
import type { TldrawApp } from '../../internal'
import { getNextChildIndex } from '../shared/getNextChildIndex'
import { collectDeckIds, freshId, remintBlockIds } from '~blocks/remint-ids'

/**
 * Duplicate a page.
 * @param app The app instance.
 * @param pageId The id of the page to duplicate.
 * @param newId (optional) The duplicate's id — Phase 14 lets a host mint its own (e.g. to key a
 * database row to the new slide before it exists). Defaults to a fresh generated id, exactly as
 * before this parameter existed. The caller is responsible for uniqueness: nothing here checks
 * whether `newId` already names a page, since a colliding id would mean two different callers'
 * "new" pages silently landing on the same key.
 */
export function duplicatePage(
  app: TldrawApp,
  pageId: string,
  newId = Utils.uniqueId()
): TldrawCommand {
  const { currentPageId } = app

  const page = app.getPage(pageId)
  const pageState = app.getPageState(pageId)
  const { camera } = pageState

  // Editor E00: the copy sits right after its source (not at the end of the deck), and gets its
  // own slide id and block ids — copied ids made the deck fail validation (`slide/duplicate-id`,
  // `block/duplicate-id`) and every save after a duplicate was rejected.
  const pages = app.state.document.pages
  const srcIndex = page.childIndex ?? 0
  const after = Object.values(pages)
    .map((p) => p.childIndex ?? 0)
    .filter((i) => i > srcIndex)
    .sort((a, b) => a - b)[0]
  const childIndex = after === undefined ? getNextChildIndex(pages) : (srcIndex + after) / 2
  const taken = collectDeckIds(app.state.document as never)
  const slideSpecId = freshId(page.slideSpecId ?? page.id, taken, 'copy')
  const reminted = remintBlockIds(Object.values(page.shapes), taken).shapes

  const nextPage = {
    ...page,
    id: newId,
    slideSpecId,
    name: page.name + ' Copy',
    childIndex,
    // Copied, not shared: the spread above would alias the source page's size array, so resizing
    // either slide would silently resize the other.
    size: page.size ? [...page.size] : undefined,
    shapes: Object.fromEntries(
      reminted.map((shape) => {
        const id = shape.id
        return [
          id,
          {
            ...shape,
            parentId: shape.parentId === pageId ? newId : shape.parentId,
          },
        ]
      })
    ),
  }

  return {
    id: 'duplicate_page',
    before: {
      appState: {
        currentPageId,
      },
      document: {
        pages: {
          [newId]: undefined,
        },
        pageStates: {
          [newId]: undefined,
        },
      },
    },
    after: {
      appState: {
        currentPageId: newId,
      },
      document: {
        pages: {
          [newId]: nextPage,
        },
        pageStates: {
          [newId]: {
            ...pageState,
            id: newId,
            selectedIds: [],
            camera: { ...camera },
            editingId: undefined,
            bindingId: undefined,
            hoveredId: undefined,
            pointedId: undefined,
          },
        },
      },
    },
  }
}
