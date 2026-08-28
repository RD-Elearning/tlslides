/* eslint-disable no-console */
/**
 * Drags a slide to a new position in the deck panel (T6.2) and asserts the order actually
 * changed. Uses the /develop route for `window.app` (see frame.js), needed here to create extra
 * slides and to read `document.pages` for the before/after order without guessing at DOM text.
 *
 * The drag itself goes through real mouse events (not `app.movePage` directly) so this exercises
 * the actual HTML5 drag-and-drop wiring in Deck.tsx, including dragging over the live
 * `<ReadOnlyEditor>` canvas inside each thumbnail — the concern called out in the task notes.
 */
module.exports = {
  route: '/#/develop',
  async run(page) {
    // The default document already ships with two slides (see `TldrawApp.defaultDocument`);
    // name both, then add a third, so there are three to reorder — proving a real multi-slide
    // move, not just a two-item swap.
    await page.evaluate(() => {
      const existing = Object.values(window.app.document.pages).sort(
        (a, b) => (a.childIndex || 0) - (b.childIndex || 0)
      )
      const names = ['Slide A', 'Slide B', 'Slide C']
      existing.forEach((p, i) => window.app.renamePage(p.id, names[i]))
      for (let i = existing.length; i < names.length; i++) {
        window.app.createPage()
        window.app.renamePage(window.app.currentPageId, names[i])
      }
    })
    await page.waitForTimeout(300)

    const orderOf = () =>
      page.evaluate(() =>
        Object.values(window.app.document.pages)
          .sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))
          .map((p) => p.name)
      )

    const before = await orderOf()

    // Locate the three deck thumbnails by page id, top to bottom.
    const pageIds = await page.evaluate(() =>
      Object.values(window.app.document.pages)
        .sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))
        .map((p) => p.id)
    )

    const boxOf = async (pageId) => {
      const handle = await page.$(`#TD-DeckPanel [data-page-id="${pageId}"]`)
      if (!handle) throw new Error(`no deck thumbnail for page ${pageId}`)
      return handle.boundingBox()
    }

    const firstBox = await boxOf(pageIds[0])
    const lastBox = await boxOf(pageIds[2])

    const start = { x: firstBox.x + firstBox.width / 2, y: firstBox.y + firstBox.height / 2 }
    // Drop in the bottom half of the last slide, which should insert *after* it.
    const end = { x: lastBox.x + lastBox.width / 2, y: lastBox.y + lastBox.height * 0.9 }

    // Plain mouse events, not locator.dragTo(): this is exactly what a real user's drag looks
    // like, and it's what proves the canvas underneath isn't swallowing the gesture (a synthetic
    // DataTransfer-based helper could paper over that).
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x, start.y + 20, { steps: 5 })
    await page.waitForTimeout(100)
    // A mid-drag screenshot, so the drop indicator is visible evidence rather than an inferred
    // detail — shoot.js's own screenshot (reorder.png) is taken after `run` finishes, i.e. after
    // mouse-up, when the indicator is already gone.
    await page.mouse.move(end.x, end.y, { steps: 10 })
    await page.waitForTimeout(150)
    const path = require('path')
    await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'reorder-mid-drag.png') })
    const dropIndicatorVisibleDuringDrag = await page.evaluate(
      () => document.querySelectorAll('#TD-DeckPanel [data-drop-indicator]').length > 0
    )
    await page.mouse.up()
    await page.waitForTimeout(300)

    const after = await orderOf()

    return {
      before,
      after,
      orderChanged: JSON.stringify(before) !== JSON.stringify(after),
      dropIndicatorVisibleDuringDrag,
    }
  },
}
