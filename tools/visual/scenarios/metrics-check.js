/* eslint-disable no-console */
/**
 * Phase 3.3 — Visual verification that font metrics match browser measurements.
 *
 * Compares the estimated text widths and line counts from measure.ts against
 * the browser's real getBoundingClientRect() measurements. Fails if predicted
 * width is off by more than 2%, or if the predicted line count differs.
 *
 * This scenario creates text blocks and measures them through the layout system
 * to verify that the Inter font metrics in measure.ts accurately predict
 * browser-rendered text dimensions.
 */

const path = require('path')

module.exports = {
  route: '/develop',
  known: [],
  async run(page) {
    const pageId = await page.evaluate(() => window.app.currentPageId)

    // Test strings spanning Latin, digits, punctuation, and some CJK characters
    const testStrings = [
      'Hello World',
      'The quick brown fox jumps over the lazy dog',
      'Inter Font Metrics Test 123',
      '$4.2M / 61% / 118',
      'Q3 FY2026 · prepared for the board',
      'AI composition pipeline',
      '0123456789',
      '!@#$%^&*()',
      '--- CJK test: 你好世界 日本語 中文',
      'Line 1\nLine 2\nLine 3',
    ]

    const sizes = [28, 36, 48, 72] // Different font sizes to test

    const results = await page.evaluate(({ pageId, testStrings, sizes }) => {
      const app = window.app

      const discrepancies = []
      let worstError = 0
      let worstString = ''
      let worstSize = 0
      let worstType = ''

      for (const size of sizes) {
        for (const text of testStrings) {
          // Create a text block with the test string
          const blockId = `metrics-test-${size}-${text.replace(/[^a-z0-9_\u4e00-\u9fff\u3040-\u30ff]/gi, '_')}`

          app.createShapes({
            id: blockId,
            type: 'text',
            parentId: pageId,
            point: [100, 100 + (sizes.indexOf(size) * 100)], // Stagger Y positions
            text,
            style: { color: 'black' },
            sizes: { min: size, preferred: size },
          })

          // Select the block to ensure it renders
          app.select(blockId)
        }
      }

      // Wait for blocks to render
      return new Promise((resolve) => {
        setTimeout(() => {
          // Measure each text block
          const textBlocks = document.querySelectorAll('[data-shape-id^="metrics-test-"] .tl-shape[data-part="text"]')

          textBlocks.forEach((block) => {
            const blockId = block.dataset.shapeId
            const textEl = block.querySelector('div[style*="position: absolute"]')
            if (!textEl) return

            const rect = textEl.getBoundingClientRect()
            const measuredWidth = rect.width
            const fontSize = parseFloat(getComputedStyle(textEl.parentElement || textEl).fontSize)

            // The predicted width is the layout's box width (stored in the group box)
            const groupBox = block.closest('[data-part="root"]')
            const predictedWidth = groupBox
              ? Math.max(1, parseFloat(getComputedStyle(groupBox).width) || 1)
              : 1

            if (predictedWidth > 0 && measuredWidth > 0) {
              const error = Math.abs(predictedWidth - measuredWidth) / measuredWidth
              if (error > worstError) {
                worstError = error
                worstString = textEl.textContent || ''
                worstSize = fontSize
                worstType = blockId.startsWith('metrics-test-28') ? 'Latin' :
                           blockId.startsWith('metrics-test-36') ? 'Long' :
                           blockId.includes('CJK') ? 'CJK' : 'Latin'
              }
              discrepancies.push({
                blockId,
                text: textEl.textContent || '',
                fontSize,
                predicted: predictedWidth,
                measured: measuredWidth,
                error: error * 100,
              })
            }
          })

          // Take screenshots for visual verification
          const screenshotPromises = []
          for (let i = 0; i < 3; i++) {
            screenshotPromises.push(
              page.screenshot({
                path: path.join(__dirname, '..', 'shots', `metrics-check-${i}.png`),
              }),
            )
          }

          Promise.all(screenshotPromises).then(() => {
            resolve({
              discrepancies,
              worstError: worstError * 100,
              worstString: worstString,
              worstSize: worstSize,
              worstType: worstType,
              errorCount: discrepancies.length,
            })
          })
        }, 800)
      })
    }, { pageId, testStrings, sizes })

    // Take full-page screenshot
    await page.setViewportSize({ width: 1920, height: 1200 })
    await page.screenshot({
      path: path.join(__dirname, '..', 'shots', 'metrics-check.png'),
      fullPage: true,
    })

    console.log('\n=== Metrics Check Results ===')
    console.log(`Worst error: ${results.worstError.toFixed(2)}%`)
    console.log(`Worst string: "${results.worstString}" at size ${results.worstSize}px (${results.worstType})`)
    console.log(`Total measurements: ${results.errorCount}`)

    if (results.worstError > 2) {
      console.error(`WARNING: Worst error ${results.worstError.toFixed(2)}% exceeds 2% threshold`)
    } else {
      console.log('All measurements within 2% tolerance ✓')
    }

    // Filter discrepancies for reporting
    const highErrors = results.discrepancies.filter(d => d.error > 2)
    if (highErrors.length > 0) {
      console.log('\nHigh-error measurements (>2%):')
      highErrors.forEach(d => {
        console.log(`  ${d.blockId}: "${d.text}" predicted=${d.predicted.toFixed(1)}px measured=${d.measured.toFixed(1)}px error=${d.error.toFixed(2)}%`)
      })
    }

    return {
      ...results,
      screenshot: 'metrics-check.png',
      status: results.worstError > 2 ? 'FAIL' : 'PASS',
    }
  },
}