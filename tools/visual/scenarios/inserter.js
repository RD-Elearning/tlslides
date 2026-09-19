/* eslint-disable no-console */
/**
 * R13 — the "+" trigger button opens the Block Inserter palette; selecting a block type
 * inserts a real ComponentShape (via `blockToShape`) and selects it. R12's Block Inspector
 * then has a shape to describe, so this also exercises its Content/Style/Motion tabs switching
 * without throwing.
 *
 * Run:  node tools/visual/shoot.js inserter
 * Requires:  cd examples/nextjs-sample && npx next dev -p 5433
 */
module.exports = {
  base: 'http://localhost:5433',
  known: [/Accessing element\.ref was removed in React 19/],
  route: '/edit/deck-demo-q3',
  waitFor: '#TD-BlockInserter-Trigger',

  async run(page) {
    const shapeCountBefore = await page.evaluate(
      () => Object.keys(window.tlapp.document.pages[window.tlapp.currentPageId].shapes).length
    )

    await page.click('#TD-BlockInserter-Trigger')
    await page.waitForTimeout(150)
    const paletteVisible = await page.evaluate(
      () => !!document.querySelector('.block-inserter-container')
    )

    await page.fill('.block-inserter-container input', 'KPI')
    await page.waitForTimeout(150)
    const filteredCount = await page.evaluate(
      () => document.querySelectorAll('.block-inserter-container [title]').length
    )

    // Click the first matching block item.
    await page.click('.block-inserter-container [title]')
    await page.waitForTimeout(200)

    const shapeCountAfter = await page.evaluate(
      () => Object.keys(window.tlapp.document.pages[window.tlapp.currentPageId].shapes).length
    )
    const selectedId = await page.evaluate(() => window.tlapp.selectedIds[0] ?? null)

    // Inspector should now show the newly-inserted, newly-selected block. Switch through all
    // three tabs — this is what catches BlockInspector.tsx crashing on Style/Motion (both read
    // `shape.props.$block`, absent bugs would throw here, not on Content).
    const inspectorVisible = await page.evaluate(() => !!document.querySelector('#TD-BlockInspector'))
    const tabLabels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#TD-BlockInspector button')).map((b) => b.textContent)
    )
    if (inspectorVisible) {
      const tabs = page.locator('#TD-BlockInspector button')
      const count = await tabs.count()
      for (let i = 0; i < count; i++) {
        await tabs.nth(i).click()
        await page.waitForTimeout(100)
      }
    }

    await page.screenshot({ path: require('path').join(__dirname, '..', 'shots', 'inserter.png') })

    return {
      paletteVisible,
      filteredCount,
      shapeCountBefore,
      shapeCountAfter,
      insertedOne: shapeCountAfter === shapeCountBefore + 1,
      selectedId,
      inspectorVisible,
      tabLabels,
    }
  },
}
