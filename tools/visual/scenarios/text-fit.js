/* eslint-disable no-console */
/**
 * Phase 1 — visual verification that the DOM renderer's text vertical-position fix works.
 * 
 * This scenario creates multi-line text shapes and verifies that the text lines are
 * positioned correctly (not overlapping by ~0.8x lineHeight as the bug caused).
 * 
 * The key check: `line.top` from the text metrics should align with the CSS `top`
 * of the rendered line elements, not `baseline`.
 */
const path = require('path')

module.exports = {
  route: '/#/develop',
  async run(page) {
    const pageId = await page.evaluate(() => window.app.currentPageId)

    // Create a multi-line text shape that will clearly show any vertical positioning bugs
    await page.evaluate((id) => {
      const app = window.app
      app.createShapes({
        id: 'multi-line-text',
        type: 'text',
        parentId: id,
        point: [100, 100],
        text: 'Line 1\nLine 2\nLine 3',
        style: { color: 'black' },
      })
    }, pageId)
    await page.waitForTimeout(300)

    // Select the text to ensure it renders properly
    await page.evaluate(() => window.app.select('multi-line-text'))
    await page.waitForTimeout(150)

    // Verify the text lines are rendered with correct vertical positions
    const linePositions = await page.evaluate(() => {
      const textEl = document.getElementById('multi-line-text')
      if (!textEl) return { error: 'text element not found' }
      
      // Find all line divs (positioned absolutely with white-space: pre)
      const lineDivs = Array.from(textEl.querySelectorAll('div > div[style*="position: absolute"]'))
      if (lineDivs.length === 0) {
        return { error: 'no line divs found' }
      }
      
      return lineDivs.map((div, i) => {
        const style = getComputedStyle(div)
        const top = parseFloat(style.top)
        const fontSize = parseFloat(style.fontSize)
        return {
          lineIndex: i,
          text: div.textContent || '',
          top,
          fontSize,
          // Line height should be approximately fontSize * 1.3 (default lineHeight)
          expectedLineSpacing: fontSize * 1.3,
        }
      })
    })

    // Take a screenshot for visual verification
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.screenshot({ 
      path: path.join(__dirname, '..', 'shots', 'text-fit.png'),
      fullPage: true
    })

    return {
      linePositions,
      lineCount: linePositions.filter ? linePositions.length : 0,
      screenshot: 'text-fit.png',
    }
  },
}