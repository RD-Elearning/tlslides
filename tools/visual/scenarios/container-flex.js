/* eslint-disable no-console */
/**
 * Phase 4.3 — Visual verification of container flex-like sizing.
 *
 * Creates a synthetic slide with a stack containing a 1-line label and
 * a 6-line paragraph, in both 'fill' and 'auto' modes, screenshotted side by side.
 */

const path = require('path')

module.exports = {
  route: '/#/develop',
  known: [],
  async run(page) {
    const pageId = await page.evaluate(() => window.app.currentPageId')

    // Create a composite slide with containers in fill and auto modes
    await page.evaluate(({ pageId }) => {
      const app = window.app

      // Create a horizontal split with fill and auto mode columns
      const splitId = 'container-flex-test'

      app.createShapes({
        id: splitId,
        type: 'l.row',
        parentId: pageId,
        point: [100, 100],
        props: {
          columns: 2,
          gap: 12,
        },
      })

      // Left column: fill mode (default - equal share)
      app.createShapes({
        id: 'label-fill',
        type: 't.body',
        parentId: pageId,
        point: [120, 120],
        text: 'Short',
        style: { color: 'black' },
        props: {
          container: { id: splitId, slot: 0 },
          sizing: 'fill',
        },
      })

      app.createShapes({
        id: 'para-fill',
        type: 't.body',
        parentId: pageId,
        point: [120, 160],
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        style: { color: 'black' },
        props: {
          container: { id: splitId, slot: 0 },
          sizing: 'fill',
        },
      })

      // Right column: auto mode (intrinsic size)
      app.createShapes({
        id: 'label-auto',
        type: 't.body',
        parentId: pageId,
        point: [400, 120],
        text: 'Short',
        style: { color: 'black' },
        props: {
          container: { id: splitId, slot: 1 },
          sizing: 'auto',
        },
      })

      app.createShapes({
        id: 'para-auto',
        type: 't.body',
        parentId: pageId,
        point: [400, 160],
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        style: { color: 'black' },
        props: {
          container: { id: splitId, slot: 1 },
          sizing: 'auto',
        },
      })

    }, { pageId })

    await page.waitForTimeout(500)

    // Take side-by-side screenshot
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.screenshot({
      path: path.join(__dirname, '..', 'shots', 'container-flex.png'),
      fullPage: true,
    })

    return {
      layout: 'l.row with fill and auto sized children',
      blocks: ['label-fill', 'para-fill', 'label-auto', 'para-auto'],
      screenshot: 'container-flex.png',
    }
  },
}