/* eslint-disable no-console */
/**
 * L5 — screenshot every slide of the block-library-tour deck at 1920x1080 with reduced motion.
 *
 * Run:  node tools/visual/shoot.js block-library-tour --width=1920 --height=1080
 *       (needs `next dev -p 5433` in examples/nextjs-sample and a rebuilt packages/tldraw/dist)
 *       TOUR_SLIDES=tl_01,tl_15 node tools/visual/shoot.js block-library-tour ...   (only some slides)
 */
const path = require('path')

const DECK = require(
  path.join(__dirname, '..', '..', '..', 'examples', 'nextjs-sample', 'data', 'decks', 'block-library-tour.json')
)
const SHOTS = path.join(__dirname, '..', 'shots')
const WANT = process.env.TOUR_SLIDES ? process.env.TOUR_SLIDES.split(',') : DECK.slides.map((s) => s.id)

module.exports = {
  base: 'http://localhost:5433',
  known: [/Accessing element\.ref was removed in React 19/],
  route: '/view/block-library-tour',
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
      await page.waitForTimeout(3500)
      const file = path.join(SHOTS, `tour-${id}.png`)
      await page.screenshot({ path: file })
      out[id] = file
    }
    return out
  },
}
