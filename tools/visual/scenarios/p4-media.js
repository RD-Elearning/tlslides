/* eslint-disable no-console */
/**
 * L4 — the P4 demo slides (gallery, people, brand, decoration, pattern) of colorful-blocks-demo. Steps to each
 * slide id listed in SLIDES with reduced motion, shoots it at 1x, and a cropped 2x of the same
 * slide so labels can be inspected.
 *
 * Run:  node tools/visual/shoot.js p4-media   (needs `next dev -p 5433` and a rebuilt dist)
 *       P4_SLIDES=sl_14 node tools/visual/shoot.js p4-media   (only some slides)
 */
const path = require('path')

const DECK = require(
  path.join(__dirname, '..', '..', '..', 'examples', 'nextjs-sample', 'data', 'decks', 'colorful-blocks-demo.json')
)
const SHOTS = path.join(__dirname, '..', 'shots')
const WANT = (process.env.P4_SLIDES || 'sl_42,sl_43,sl_44,sl_45,sl_46').split(',')

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
      const file = path.join(SHOTS, `p4-${id}.png`)
      await page.screenshot({ path: file })
      out[id] = file
    }
    return out
  },
}
