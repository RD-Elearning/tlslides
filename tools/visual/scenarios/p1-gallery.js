/* eslint-disable no-console */
/**
 * L1 — block gallery tabs Text, List and Emphasis (the P1 blocks and their shortDescriptions).
 * Run:  node tools/visual/shoot.js p1-gallery   (needs `next dev -p 5433` and a rebuilt dist)
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
    const shots = path.join(__dirname, '..', 'shots')
    const out = {}
    const names = await page.evaluate(() => Array.from(document.querySelectorAll('.tls-block-inserter button')).map((b) => b.textContent))
    console.log('buttons', JSON.stringify(names))
    for (const tab of ['Text', 'List', 'Emphasis', 'Learning']) {
      await page.click(`.tls-block-inserter button:has-text("${tab}")`)
      await page.waitForTimeout(600)
      await page.screenshot({ path: path.join(shots, `p1-gallery-${tab.toLowerCase()}.png`) })
      out[tab] = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="block-card"]')).map((c) => c.textContent.slice(0, 120)))
    }
    return out
  },
}
