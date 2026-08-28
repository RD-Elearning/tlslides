import type { TldrawCommand } from '~types'
import { Utils } from '@tlslides/core'
import type { TldrawApp } from '../../internal'
import { getNextChildIndex } from '../shared/getNextChildIndex'

export function duplicatePage(app: TldrawApp, pageId: string): TldrawCommand {
  const newId = Utils.uniqueId()
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
