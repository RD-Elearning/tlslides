/* eslint-disable no-console */
/**
 * L1 — the "P1 lists" demo slide (last slide of colorful-blocks-demo): numbered, checklist,
 * icon-list, statement, definition, callout + footnote. Opens the deck viewer, steps to the last
 * slide with reduced motion, and shoots it at 1x and a cropped 2x.
 *
 * Run:  node tools/visual/shoot.js p1-lists   (needs `next dev -p 5433` and a rebuilt dist)
 */
const path = require('path')

const DECK = require(
  path.join(__dirname, '..', '..', '..', 'examples', 'nextjs-sample', 'data', 'decks', 'colorful-blocks-demo.json')
)
const LAST = DECK.slides.length - 1
const SHOTS = path.join(__dirname, '..', 'shots')

module.exports = {
  base: 'http://localhost:5433',
  known: [/Accessing element\.ref was removed in React 19/],
  route: '/view/colorful-blocks-demo',
  waitFor: '[data-testid="deck-viewer"]',

  async run(page) {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(800)
    for (let i = 0; i < LAST; i++) {
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(150)
    }
    await page.waitForTimeout(1200)
    const file = path.join(SHOTS, 'p1-lists.png')
    await page.screenshot({ path: file })
    const index = await page.evaluate(() => document.querySelector('[data-testid="deck-viewer"]')?.getAttribute('data-slide-index'))
    return { file, slideIndex: index, expected: LAST }
  },
}
