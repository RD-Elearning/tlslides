/* eslint-disable no-console */
/**
 * Phase 5.3 — Visual verification of icon rendering.
 *
 * Creates a synthetic slide with various icons from the icon set,
 * testing that icons render as SVG paths rather than text labels.
 */

const path = require('path')

module.exports = {
  route: '/#/develop',
  known: [],
  async run(page) {
    const pageId = await page.evaluate(() => window.app.currentPageId')

    // Create a slide with various icons
    await page.evaluate(({ pageId }) => {
      const app = window.app

      // Create title
      app.createShapes({
        id: 'title',
        type: 't.title',
        parentId: pageId,
        point: [100, 100],
        props: {
          text: 'Icon Set Preview',
        },
      })

      // Create subtitle with icon list
      app.createShapes({
        id: 'subtitle',
        type: 't.subtitle',
        parentId: pageId,
        point: [100, 200],
        props: {
          text: 'All icons from the vendored set:',
        },
      })

      // Create icons in a row for visual verification
      // Icons should render as SVG paths, not text labels
      app.createShapes([
        {
          id: 'icon-zap',
          type: 'm.icon',
          parentId: pageId,
          point: [100, 280],
          props: { icon: 'zap', color: 'accent' },
        },
        {
          id: 'icon-shield',
          type: 'm.icon',
          parentId: pageId,
          point: [180, 280],
          props: { icon: 'shield', color: 'accent' },
        },
        {
          id: 'icon-globe',
          type: 'm.icon',
          parentId: pageId,
          point: [260, 280],
          props: { icon: 'globe', color: 'accent' },
        },
        {
          id: 'icon-check',
          type: 'm.icon',
          parentId: pageId,
          point: [340, 280],
          props: { icon: 'check', color: 'positive' },
        },
        {
          id: 'icon-arrow',
          type: 'm.icon',
          parentId: pageId,
          point: [420, 280],
          props: { icon: 'arrow-right', color: 'accent' },
        },
      ])

      // Create second row with different icons
      app.createShapes([
        {
          id: 'icon-trend-up',
          type: 'm.icon',
          parentId: pageId,
          point: [100, 360],
          props: { icon: 'trending-up', color: 'accent' },
        },
        {
          id: 'icon-trend-down',
          type: 'm.icon',
          parentId: pageId,
          point: [180, 360],
          props: { icon: 'trending-down', color: 'negative' },
        },
        {
          id: 'icon-users',
          type: 'm.icon',
          parentId: pageId,
          point: [260, 360],
          props: { icon: 'users', color: 'accent' },
        },
        {
          id: 'icon-clock',
          type: 'm.icon',
          parentId: pageId,
          point: [340, 360],
          props: { icon: 'clock', color: 'accent' },
        },
        {
          id: 'icon-alert',
          type: 'm.icon',
          parentId: pageId,
          point: [420, 360],
          props: { icon: 'alert', color: 'warning' },
        },
      ])

    }, { pageId })

    await page.waitForTimeout(500)

    // Take screenshot
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.screenshot({
      path: path.join(__dirname, '..', 'shots', 'icon-render.png'),
      fullPage: true,
    })

    return {
      layout: 'Media page with icon placements',
      blocks: ['title', 'subtitle', 'icon-zap', 'icon-shield', 'icon-globe', 'icon-check', 'icon-arrow',
               'icon-trend-up', 'icon-trend-down', 'icon-users', 'icon-clock', 'icon-alert'],
      screenshot: 'icon-render.png',
    }
  },
}