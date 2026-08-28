import type { TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

/**
 * Set (or clear) a page's speaker notes (`TDPage.notes`, reserved since Phase 3, unused before
 * this command — Phase 16 is what actually builds a presenter view that reads it back). Modeled
 * directly on `Commands.setPageBackground`: a single scalar field, no aliasing concerns (unlike
 * a background's `stops` array), so the before/after patches just carry the string.
 * @param app The app instance.
 * @param pageId The id of the page to update.
 * @param notes The new notes, or `undefined` to clear them.
 */
export function setPageNotes(
  app: TldrawApp,
  pageId: string,
  notes: string | undefined
): TldrawCommand {
  const page = app.getPage(pageId)

  return {
    id: 'set_page_notes',
    before: {
      document: {
        pages: {
          [pageId]: { notes: page.notes },
        },
      },
    },
    after: {
      document: {
        pages: {
          [pageId]: { notes },
        },
      },
    },
  }
}
