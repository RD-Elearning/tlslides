import type { TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

/**
 * Set (or clear) a page's `skipInPresentation` flag (`TDPage.skipInPresentation`, reserved since
 * Phase 3, unused before this command — Phase 16 is what makes presentation navigation actually
 * honour it). Modeled directly on `Commands.setPageNotes`: a single scalar field, no aliasing
 * concerns, so the before/after patches just carry the boolean.
 * @param app The app instance.
 * @param pageId The id of the page to update.
 * @param skip Whether presentation navigation (`TldrawApp.nextPage`/`previousPage` while
 * `settings.isPresentationMode`) should skip over this slide. `undefined` and `false` are
 * equivalent for navigation purposes, but this command stores exactly what it's given (so a host
 * round-tripping a document doesn't see spurious `false` fields appear where there were none).
 */
export function setPageSkipInPresentation(
  app: TldrawApp,
  pageId: string,
  skip: boolean | undefined
): TldrawCommand {
  const page = app.getPage(pageId)

  return {
    id: 'set_page_skip_in_presentation',
    before: {
      document: {
        pages: {
          [pageId]: { skipInPresentation: page.skipInPresentation },
        },
      },
    },
    after: {
      document: {
        pages: {
          [pageId]: { skipInPresentation: skip },
        },
      },
    },
  }
}
