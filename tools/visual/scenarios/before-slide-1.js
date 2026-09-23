/**
 * G0 "before" screenshot — slide 1 of the demo deck as it stands today.
 * This is the baseline for every later before/after comparison in this round.
 *
 * Run:  node tools/visual/shoot.js before-slide-1
 * Requires:  cd examples/nextjs-sample && npx next dev -p 5433
 */
const path = require('path')

module.exports = {
  base: 'http://localhost:5433',
  known: [/Accessing element\.ref was removed in React 19/],
  route: '/view/deck-demo-q3',
  waitFor: '[data-testid="deck-viewer"]',

  async run(page) {
    // Enable reduced motion so auto-steps complete instantly.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(500)

    // Screenshot the first slide.
    await page.screenshot({
      path: path.join(__dirname, '..', '..', 'reviews', 'blocks', 'before-slide-1.png'),
      fullPage: false,
    })

    return { note: 'Before screenshot of slide 1 for G0 baseline' }
  },
}
