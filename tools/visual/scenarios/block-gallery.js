/* eslint-disable no-console */
/**
 * L0 P0.4 — the block gallery (BlockInserter) with category tabs, shortDescription subtitles
 * and scope badges. Shoots the closed editor, the open gallery, and a category-filtered view.
 *
 * Run:  node tools/visual/shoot.js block-gallery
 * Requires:  cd examples/nextjs-sample && pnpm exec next dev -p 5433
 */
const path = require('path')

module.exports = {
  base: 'http://localhost:5433',
  known: [/Accessing element\.ref was removed in React 19/],
  route: '/edit/deck-demo-q3',
  waitFor: '#TD-BlockInserter-Trigger',

  async run(page) {
    await page.click('#TD-BlockInserter-Trigger')
    await page.waitForSelector('.tls-block-inserter')
    await page.waitForTimeout(600)
    const shots = path.join(__dirname, '..', 'shots')
    const tabs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.tls-block-inserter button'))
        .map((b) => b.textContent)
        .slice(0, 40)
    )
    const cardCount = await page.evaluate(() => document.querySelectorAll('[data-testid="block-card"]').length)
    const badges = await page.evaluate(() => document.querySelectorAll('[data-testid="scope-badge"]').length)
    await page.screenshot({ path: path.join(shots, 'block-gallery-all.png') })

    await page.click('.tls-block-inserter button:has-text("Metrics")')
    await page.waitForTimeout(600)
    const metricCards = await page.evaluate(() => document.querySelectorAll('[data-testid="block-card"]').length)
    await page.screenshot({ path: path.join(shots, 'block-gallery-metrics.png') })

    return { tabs, cardCount, badges, metricCards }
  },
}
