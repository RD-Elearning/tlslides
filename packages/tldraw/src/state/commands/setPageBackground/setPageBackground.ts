import type { SlideBackground, TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

/**
 * Set (or clear) a page's background.
 * @param app The app instance.
 * @param pageId The id of the page to update.
 * @param background The new background, or `undefined` to clear it back to the default paper
 * color (the same fallback every page without a `background` already renders with).
 */
export function setPageBackground(
  app: TldrawApp,
  pageId: string,
  background: SlideBackground | undefined
): TldrawCommand {
  const page = app.getPage(pageId)

  return {
    id: 'set_page_background',
    before: {
      document: {
        pages: {
          // Copy, not share: a gradient's `stops` array must not alias the live document's array,
          // or an undo could leave `page.background` pointing at the redo value (same reasoning as
          // `setPageSize`'s `size` array copy).
          [pageId]: { background: cloneBackground(page.background) },
        },
      },
    },
    after: {
      document: {
        pages: {
          [pageId]: { background: cloneBackground(background) },
        },
      },
    },
  }
}

function cloneBackground(
  background: SlideBackground | string | undefined
): SlideBackground | string | undefined {
  if (background === undefined || typeof background === 'string') return background
  if ('stops' in background) return { ...background, stops: background.stops.map((s) => ({ ...s })) }
  return { ...background }
}
