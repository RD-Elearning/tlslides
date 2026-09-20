/* eslint-disable no-console */
/**
 * Visual check for colorful blocks demo
 */
module.exports = {
  base: 'http://localhost:5433',
  route: '/view/colorful-blocks-demo',
  waitFor: '[data-testid="deck-viewer"]',
  
  async run(page) {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(1000)
    
    // Navigate through all slides
    const results = []
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(500)
      await page.screenshot({
        path: `/home/bachx/workspace/vinhuni/tlslides/tools/visual/shots/colorful-slide-${i + 1}.png`,
        fullPage: false,
      })
      
      const slideIndex = await page.evaluate(() => {
        const viewer = document.querySelector('[data-testid="deck-viewer"]')
        return viewer?.getAttribute('data-slide-index')
      })
      
      results.push({ slideIndex, slide: i + 1 })
      
      if (i < 11) {
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(300)
      }
    }
    
    return { totalSlides: 12, results }
  },
}
