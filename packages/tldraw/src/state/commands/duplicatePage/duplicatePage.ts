import type { TldrawCommand } from '~types'
import { Utils } from '@tlslides/core'
import type { TldrawApp } from '../../internal'
import { getNextChildIndex } from '../shared/getNextChildIndex'

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

  const nextPage = {
    ...page,
    id: newId,
    name: page.name + ' Copy',
    childIndex: getNextChildIndex(app.state.document.pages),
    // Copied, not shared: the spread above would alias the source page's size array, so resizing
    // either slide would silently resize the other.
    size: page.size ? [...page.size] : undefined,
    shapes: Object.fromEntries(
      Object.entries(page.shapes).map(([id, shape]) => {
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
