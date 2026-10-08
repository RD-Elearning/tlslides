/* eslint-disable no-console */
/**
 * Visual check for colorful blocks demo.
 *
 * Reads the slide count from the served deck's own fixture (`examples/nextjs-sample/data/
 * decks/colorful-blocks-demo.json`) instead of a hardcoded `12` — the deck has 10 slides, so a
 * hardcoded 12 produced two extra screenshots that were really just repeats of the last slide
 * (BACKLOG-visual-fix-2.md §0.8's "duplicate screenshot committed as evidence" failure). Also
 * resolves the output path against `__dirname` instead of a machine-specific absolute path so the
 * scenario runs from any checkout, per the harness contract (`tools/visual/README.md`).
 */
const path = require('path')

const DECK = require(
  path.join(__dirname, '..', '..', '..', 'examples', 'nextjs-sample', 'data', 'decks', 'colorful-blocks-demo.json')
)
const SLIDE_COUNT = DECK.slides.length
const SHOTS_DIR = path.join(__dirname, '..', 'shots')

module.exports = {
  base: 'http://localhost:5433',
  route: '/view/colorful-blocks-demo',
  waitFor: '[data-testid="deck-viewer"]',

  async run(page) {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(1000)

    // Navigate through all slides
    const results = []
    for (let i = 0; i < SLIDE_COUNT; i++) {
      await page.waitForTimeout(500)
      await page.screenshot({
        path: path.join(SHOTS_DIR, `colorful-slide-${i + 1}.png`),
        fullPage: false,
      })

      const slideIndex = await page.evaluate(() => {
        const viewer = document.querySelector('[data-testid="deck-viewer"]')
        return viewer?.getAttribute('data-slide-index')
      })

      results.push({ slideIndex, slide: i + 1 })

      if (i < SLIDE_COUNT - 1) {
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(300)
      }
    }

    return { totalSlides: SLIDE_COUNT, results }
  },
}
