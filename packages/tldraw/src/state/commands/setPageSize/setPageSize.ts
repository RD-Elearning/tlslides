import type { TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

/**
 * Set a page's slide frame size.
 * @param app The app instance.
 * @param pageId The id of the page to resize.
 * @param size The new [width, height] of the slide frame.
 */
export function setPageSize(app: TldrawApp, pageId: string, size: number[]): TldrawCommand {
  const page = app.getPage(pageId)

  return {
    id: 'set_page_size',
    before: {
      document: {
        pages: {
          // Copy, not share: the command's `before`/`after` patches must not alias the
          // same array, or undoing would leave `page.size` pointing at the redo value.
          [pageId]: { size: page.size ? [...page.size] : undefined },
        },
      },
    },
    after: {
      document: {
        pages: {
          [pageId]: { size: [...size] },
        },
      },
    },
  }
}
