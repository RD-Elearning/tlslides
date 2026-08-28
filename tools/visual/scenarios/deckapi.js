/* eslint-disable no-console */
/**
 * Drives the examples/nextjs-sample reference app's Phase 14 slide-manager panel
 * (components/SlideManager.tsx) — the acceptance test for `app.deck.*`. Everything this scenario
 * clicks is host-side UI built entirely on the facade (see Editor.tsx): add a blank slide, add
 * one from a template, reorder, set a background (both a swatch and the free-typed hex field),
 * switch theme, and delete a slide. The panel updates via the typed event stream
 * (`app.deck.on(...)` wired up in Editor.tsx's `onMount`), never by polling `onPersist` — this
 * scenario never has to poll for anything either, since each click's own `waitForTimeout` is
 * enough for the (synchronous) event to have already re-rendered the panel.
 *
 * Runs against the Next.js sample on port 5433, not the tldraw-example harness on 5431 — pass
 * `--base=http://localhost:5433` (see the toolchain notes in reviews/roadmap-slides.md).
 */
module.exports = {
  // Served by examples/nextjs-sample, not the tldraw-example harness.
  base: 'http://localhost:5433',
  route: '/',
  // Same pre-existing, unrelated warning `tools/visual/scenarios/nextjs.js` already tolerates —
  // see that scenario's own comment for why.
  known: [/Accessing element\.ref was removed in React 19/],
  async run(page) {
    await page.waitForSelector('[data-testid="slide-row"]', { timeout: 10000 })

    const slideIds = () =>
      page.$$eval('[data-testid="slide-row"]', (rows) => rows.map((r) => r.dataset.slideId))

    const clickLast = async (testId) => {
      const handles = await page.$$(`[data-testid="${testId}"]`)
      await handles[handles.length - 1].click()
    }

    const initialIds = await slideIds()

    // 1. Add a blank slide — app.deck.addSlide().
    await page.click('[data-testid="add-blank-slide"]')
    await page.waitForTimeout(200)
    const afterBlank = await slideIds()
    const blankId = afterBlank[afterBlank.length - 1]

    // 2. Add one from a template — app.deck.addSlideFromTemplate(id).
    await page.selectOption('[data-testid="template-select"]', 'bullets')
    await page.click('[data-testid="add-from-template"]')
    await page.waitForTimeout(200)
    const afterTemplate = await slideIds()
    const templateId = afterTemplate[afterTemplate.length - 1]

    // 3. Reorder — app.deck.moveSlide(id, toIndex). Move the just-added template slide (last)
    // up by one, swapping it with the blank slide before it.
    await clickLast('move-up')
    await page.waitForTimeout(200)
    const afterMove = await slideIds()
    const templateMovedUp =
      afterMove.indexOf(templateId) === afterTemplate.indexOf(templateId) - 1 &&
      afterMove[afterMove.length - 1] === blankId

    // Make the template slide current, so the background/theme steps below apply to it.
    const templateRowIndex = afterMove.indexOf(templateId)
    const rowsForSelect = await page.$$('[data-testid="slide-row"]')
    await rowsForSelect[templateRowIndex].click()
    await page.waitForTimeout(150)

    // 4. Set a background — app.deck.setSlideBackground(id, bg) — first a preset swatch...
    await page.click('[data-testid="swatch-#dbeafe"]')
    await page.waitForTimeout(150)
    const swatchBackground = await page.evaluate(
      () => window.tlapp.deck.getSlide(window.tlapp.currentPageId).background
    )

    // ...then the free-typed hex field + Apply button. The Tab press exercises
    // stopKeyPropagationUnlessEscape: it must move focus within this form, not leak to the
    // canvas as a shortcut (Tab there clones the current selection) — checked via the shape
    // count immediately after, which must be unchanged.
    const shapeCountBeforeHexEntry = await page.evaluate(
      () => Object.keys(window.tlapp.document.pages[window.tlapp.currentPageId].shapes).length
    )
    await page.click('[data-testid="hex-input"]')
    await page.keyboard.press('Control+A')
    await page.keyboard.type('#ff8800')
    await page.keyboard.press('Tab')
    await page.click('[data-testid="apply-hex"]')
    await page.waitForTimeout(150)
    const hexBackground = await page.evaluate(
      () => window.tlapp.deck.getSlide(window.tlapp.currentPageId).background
    )
    const shapeCountAfterHexEntry = await page.evaluate(
      () => Object.keys(window.tlapp.document.pages[window.tlapp.currentPageId].shapes).length
    )

    // 5. Switch theme — app.deck.setTheme(theme).
    await page.selectOption('[data-testid="theme-select"]', 'mono-grid')
    await page.waitForTimeout(150)
    const activeThemeId = await page.evaluate(() => window.tlapp.deck.getTheme()?.id)

    // 6. Delete a slide — app.deck.deleteSlide(id) — the first row, not the current one.
    const beforeDelete = await slideIds()
    await page.$eval('[data-testid="slide-row"]', (row) =>
      row.querySelector('[data-testid="delete-slide"]').click()
    )
    await page.waitForTimeout(200)
    const afterDelete = await slideIds()

    return {
      initialSlideCount: initialIds.length,
      addedBlank: afterBlank.length === initialIds.length + 1,
      addedFromTemplate: afterTemplate.length === afterBlank.length + 1,
      templateMovedUp,
      swatchBackground,
      hexBackground,
      shapeCountUnchangedByTabKeypress: shapeCountAfterHexEntry === shapeCountBeforeHexEntry,
      activeThemeId,
      deletedOne: afterDelete.length === beforeDelete.length - 1,
      finalSlideCount: afterDelete.length,
    }
  },
}
