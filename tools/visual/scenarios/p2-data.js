/* eslint-disable no-console */
/**
 * L2 — the P2 demo slides (metrics, charts, charts 2, ...) of colorful-blocks-demo. Steps to each
 * slide id listed in SLIDES with reduced motion, shoots it at 1x, and a cropped 2x of the same
 * slide so labels can be inspected.
 *
 * Run:  node tools/visual/shoot.js p2-data   (needs `next dev -p 5433` and a rebuilt dist)
 *       P2_SLIDES=sl_14 node tools/visual/shoot.js p2-data   (only some slides)
 */
const path = require('path')

const DECK = require(
  path.join(__dirname, '..', '..', '..', 'examples', 'nextjs-sample', 'data', 'decks', 'colorful-blocks-demo.json')
)
const SHOTS = path.join(__dirname, '..', 'shots')
const WANT = (process.env.P2_SLIDES || 'sl_13,sl_14,sl_15,sl_16').split(',')

module.exports = {
  base: 'http://localhost:5433',
  known: [/Accessing element\.ref was removed in React 19/],
  route: '/view/colorful-blocks-demo',
  waitFor: '[data-testid="deck-viewer"]',

  async run(page) {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(800)
    const out = {}
    let at = 0
    for (const id of WANT) {
      const target = DECK.slides.findIndex((s) => s.id === id)
      if (target < 0) continue
      while (at < target) {
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(120)
        at++
      }
      await page.waitForTimeout(4500)
      const file = path.join(SHOTS, `p2-${id}.png`)
      await page.screenshot({ path: file })
      out[id] = file
    }
    return out
  },
}
