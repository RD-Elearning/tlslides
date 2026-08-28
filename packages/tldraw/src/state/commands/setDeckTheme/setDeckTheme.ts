import type { DeckTheme, TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

/**
 * Set (or clear) the document's active `DeckTheme`. Document-scoped, not page-scoped — unlike
 * `setPageBackground`, this patches `document.theme` directly rather than `document.pages[id]`,
 * since a brand kit applies to the whole deck, not one slide (see the Phase 12 report for why:
 * the acceptance test is "one theme switch restyles the whole deck").
 *
 * A theme is a full object here (not an id into `BUILT_IN_DECK_THEMES`), so a host app can supply
 * its own custom brand kit without it needing to exist in that list — see `DeckTheme` in `~types`.
 * Modeled directly on `setPageBackground`: a plain before/after document patch, undoable exactly
 * like every other document-level change.
 */
export function setDeckTheme(app: TldrawApp, theme: DeckTheme | undefined): TldrawCommand {
  return {
    id: 'set_deck_theme',
    before: {
      document: {
        theme: app.document.theme,
      },
    },
    after: {
      document: {
        theme: theme,
      },
    },
  }
}
