/* eslint-disable no-console */
/**
 * Phase 12 — the deck theme / brand kit. This is the scenario that proves the roadmap's own
 * acceptance test: "switching a theme must visibly restyle a deck built from templates."
 *
 * Sequence, all through the real UI (see background.js/stylepanel.js for the same model):
 *  1. Add a slide from the "Title" template via the real gallery (`TemplatePicker`) — its shapes
 *     hold theme tokens (`'theme:accent1'`, etc.), not literal hex.
 *  2. Read the rendered colour of a token-filled shape (the accent bar) and the page background
 *     with no theme active — every token should be falling back to the plain colour enum / the
 *     neutral grey fallback (see `deck-theme.ts`/`background.ts`), not a hardcoded brand colour.
 *  3. Apply a theme via the real `ThemeMenu`. Confirm the SAME shape (same id, never recreated)
 *     now renders that theme's `accent1`, and the page background now renders that theme's
 *     `background` — proving resolution is live, not baked in at creation time.
 *  4. Switch to a SECOND theme and confirm the colour changes again, proving this isn't a
 *     one-shot default but genuinely reactive to `document.theme`.
 *
 * Uses the /develop route for `window.app` (see frame.js).
 */
module.exports = {
  route: '/#/develop',
  async run(page) {
    // --- 1. Build a slide from a template via the real gallery --------------------------------
    await page.click('#TD-AddSlide')
    await page.waitForSelector('#TD-AddSlide-Content', { timeout: 5000 })
    const templateCardCount = await page.evaluate(
      () => document.querySelectorAll('[id^="TD-AddSlide-Template-"]').length
    )
    await page.click('#TD-AddSlide-Template-title')
    await page.waitForTimeout(300)

    const { kickerId, titleId } = await page.evaluate(() => {
      const shapes = Object.values(window.app.page.shapes)
      return {
        kickerId: shapes.find((s) => s.type === 'rectangle')?.id,
        titleId: shapes.find((s) => s.slot === 'title')?.id,
      }
    })

    const readState = () =>
      page.evaluate((ids) => {
        const kickerFill = document
          .getElementById(ids.kickerId + '_svg')
          ?.querySelector('rect[fill]:not(.tl-fill-hitarea)')
          ?.getAttribute('fill')
        const paper = document.querySelector('#develop .tl-frame-paper')
        return {
          kickerFill,
          paperBackgroundColor: paper ? getComputedStyle(paper).fill : null,
          titleFont: window.app.getShape(ids.titleId).style.font,
          documentThemeId: window.app.document.theme?.id,
        }
      }, { kickerId, titleId })

    const beforeTheme = await readState()

    // --- 2. Apply a theme via the real ThemeMenu ----------------------------------------------
    await page.click('#TD-Theme')
    await page.waitForSelector('#TD-Theme-Content', { timeout: 5000 })
    await page.click('#TD-Theme-coral-pop')
    await page.waitForTimeout(200)

    const afterCoralPop = await readState()

    // --- 3. Switch to a second theme — proves this is live re-resolution, not a one-shot default
    await page.click('#TD-Theme')
    await page.waitForSelector('#TD-Theme-Content', { timeout: 5000 })
    await page.click('#TD-Theme-midnight')
    await page.waitForTimeout(200)

    const afterMidnight = await readState()

    // Deck thumbnail check (Phase 11's precedent): the current slide's thumbnail is a second,
    // simultaneous render of the same document — confirm it also picked up the new theme. Looked
    // up by the current page id, not "the first thumbnail": the template slide was appended after
    // the deck's original default slide, so it isn't first in the strip.
    const deckThumbnailKickerFill = await page.evaluate((id) => {
      const thumb = document.querySelector(`#TD-DeckPanel [data-page-id="${window.app.currentPageId}"]`)
      // Attribute selector, not `#id`: shape ids are uuids, and a uuid that happens to start with
      // a digit is not a valid CSS id selector, so `#6c7f...` throws. That made this check pass or
      // fail purely on the luck of the generated id.
      return thumb
        ?.querySelector(`[id="${id}_svg"] rect[fill]:not(.tl-fill-hitarea)`)
        ?.getAttribute('fill')
    }, kickerId)

    await page.waitForTimeout(200)
    await page.screenshot({ path: require('path').join(__dirname, '..', 'shots', 'theme.png') })

    return {
      templateCardCount,
      beforeTheme,
      afterCoralPop,
      afterMidnight,
      deckThumbnailKickerFill,
      colourActuallyChanged: {
        onFirstThemeApply: beforeTheme.kickerFill !== afterCoralPop.kickerFill,
        onThemeSwitch: afterCoralPop.kickerFill !== afterMidnight.kickerFill,
        backgroundChangedToo: beforeTheme.paperBackgroundColor !== afterCoralPop.paperBackgroundColor,
      },
    }
  },
}
