import type { TldrawCommand, TDPage } from '~types'
import { Utils, TLPageState } from '@tlslides/core'
import type { TldrawApp } from '~state'
import { DEFAULT_SLIDE_SIZE } from '~constants'
import { getNextChildIndex } from '../shared/getNextChildIndex'

export function createPage(
  app: TldrawApp,
  center: number[],
  pageId = Utils.uniqueId()
): TldrawCommand {
  const { currentPageId } = app

  const nextChildIndex = getNextChildIndex(app.state.document.pages)

  // TODO: Iterate the name better
  const nextName = `Slide ${nextChildIndex}`

  const page: TDPage = {
    id: pageId,
    name: nextName,
    childIndex: nextChildIndex,
    size: [...(app.state.document.defaultPageSize ?? DEFAULT_SLIDE_SIZE)],
    shapes: {},
    bindings: {},
  }

  const pageState: TLPageState = {
    id: pageId,
    selectedIds: [],
    camera: { point: center, zoom: 1 },
    editingId: undefined,
    bindingId: undefined,
    hoveredId: undefined,
    pointedId: undefined,
  }

  return {
    id: 'create_page',
    before: {
      appState: {
        currentPageId,
      },
      document: {
        pages: {
          [pageId]: undefined,
        },
        pageStates: {
          [pageId]: undefined,
        },
      },
    },
    after: {
      appState: {
        currentPageId: page.id,
      },
      document: {
        pages: {
          [pageId]: page,
        },
        pageStates: {
          [pageId]: pageState,
        },
      },
    },
  }
}
