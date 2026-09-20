/* eslint-disable no-console */
/**
 * R17 — Page displaying all block types grouped by family for review.
 *
 * Creates a grid layout showing exemplars from each block family:
 * - Layout: tls-l-row, tls-l-stack, tls-l-grid, tls-l-card
 * - Chart: tls-d-bar, tls-d-donut
 * - Diagram: tls-g-steps  
 * - Media: tls-m-icon, tls-m-image
 * - Text: tls-t-title, tls-t-body, tls-t-hero-number
 * - Composite: tls-c.feature-grid (with SVG icons)
 * - Chrome: tls-l-footer, tls-l-section
 */

const path = require('path')

module.exports = {
  route: '/#/develop',
  known: [],
  async run(page) {
    const pageId = await page.evaluate(() => window.app.currentPageId)

    await page.evaluate(({ pageId }) => {
      const app = window.app

      // Title: All Blocks by Family
      app.createShapes({
        id: 'all-blocks-title',
        type: 't.title',
        parentId: pageId,
        point: [50, 50],
        props: { text: 'All Block Types by Family' }
      })

      // Layout family demo
      app.createShapes({
        id: 'layout-section-title',
        type: 't.caption',
        parentId: pageId,
        point: [50, 120],
        props: { text: 'Layout Family' }
      })

      // Row container with 3 children
      app.createShapes([
        {
          id: 'layout-row',
          type: 'l.row',
          parentId: pageId,
          point: [50, 150],
          props: { gap: 'md', columns: 3, children: [] }
        },
        {
          id: 'row-card-1',
          type: 'l.card',
          parentId: pageId,
          point: [50, 150],
          props: { padding: 'md', children: [] }
        },
        {
          id: 'row-card-2',
          type: 'l.card',
          parentId: pageId,
          point: [300, 150],
          props: { padding: 'md', children: [] }
        },
      ])

      // Stack demo
      app.createShapes({
        id: 'stack-section-title',
        type: 't.caption',
        parentId: pageId,
        point: [50, 350],
        props: { text: 'Stack Family' }
      })

      app.createShapes({
        id: 'stack-container',
        type: 'l.stack',
        parentId: pageId,
        point: [50, 380],
        props: { gap: 'md', children: [] }
      })

      // Chart family demo
      app.createShapes({
        id: 'chart-section-title',
        type: 't.caption',
        parentId: pageId,
        point: [50, 550],
        props: { text: 'Chart Family' }
      })

      app.createShapes({
        id: 'bar-chart',
        type: 'd.bar',
        parentId: pageId,
        point: [50, 580],
        props: { categories: ['Q1', 'Q2', 'Q3'], series: [64, 64, 61], title: 'Bar Chart' }
      })

      app.createShapes({
        id: 'donut-chart',
        type: 'd.donut',
        parentId: pageId,
        point: [350, 580],
        props: {
          slices: [
            { value: 40, color: 'accent1' },
            { value: 30, color: 'accent2' },
            { value: 20, color: 'accent3' },
            { value: 10, color: 'accent4' }
          ],
          total: 100
        }
      })

      // Diagram family demo
      app.createShapes({
        id: 'diagram-section-title',
        type: 't.caption',
        parentId: pageId,
        point: [50, 750],
        props: { text: 'Diagram Family' }
      })

      app.createShapes({
        id: 'steps-diagram',
        type: 'g.steps',
        parentId: pageId,
        point: [50, 780],
        props: {
          steps: [
            { title: 'Analyze', description: 'Review data' },
            { title: 'Design', description: 'Create solution' },
            { title: 'Build', description: 'Implement features' }
          ],
          direction: 'horizontal',
          connector: 'arrow'
        }
      })

      // Media family demo
      app.createShapes({
        id: 'media-section-title',
        type: 't.caption',
        parentId: pageId,
        point: [50, 900],
        props: { text: 'Media Family' }
      })

      app.createShapes([
        {
          id: 'icon-1',
          type: 'm.icon',
          parentId: pageId,
          point: [50, 930],
          props: { icon: 'zap', color: 'accent' }
        },
        {
          id: 'icon-2',
          type: 'm.icon',
          parentId: pageId,
          point: [120, 930],
          props: { icon: 'shield', color: 'accent' }
        },
        {
          id: 'icon-3',
          type: 'm.icon',
          parentId: pageId,
          point: [190, 930],
          props: { icon: 'check', color: 'positive' }
        },
        {
          id: 'icon-4',
          type: 'm.icon',
          parentId: pageId,
          point: [260, 930],
          props: { icon: 'globe', color: 'accent' }
        }
      ])

      // Text family demo
      app.createShapes({
        id: 'text-section-title',
        type: 't.caption',
        parentId: pageId,
        point: [50, 1000],
        props: { text: 'Text Family' }
      })

      app.createShapes({
        id: 'hero-number',
        type: 't.hero-number',
        parentId: pageId,
        point: [50, 1030],
        props: { value: '$4.2M', unit: 'Revenue', caption: '+21% QoQ', format: 'currency', emphasis: 'accent' }
      })

      // Composite: Feature Grid with SVG icons
      app.createShapes({
        id: 'feature-grid-section-title',
        type: 't.caption',
        parentId: pageId,
        point: [50, 1100],
        props: { text: 'Composite Family (Feature Grid with SVG Icons)' }
      })

      app.createShapes({
        id: 'feature-grid',
        type: 'c.feature-grid',
        parentId: pageId,
        point: [50, 1130],
        props: {
          cells: [
            { icon: 'zap', title: 'Fast', desc: 'Optimised for speed' },
            { icon: 'shield', title: 'Secure', desc: 'End-to-end encryption' },
            { icon: 'globe', title: 'Global', desc: '30+ regions worldwide' }
          ],
          columns: 3,
          gap: 24
        }
      })

    }, { pageId })

    await page.waitForTimeout(500)

    // Viewport and screenshot
    await page.setViewportSize({ width: 1920, height: 1400 })
    await page.screenshot({
      path: path.join(__dirname, '..', 'shots', 'all-blocks-by-family.png'),
      fullPage: true,
    })

    return {
      message: 'All blocks by family rendered',
      screenshot: 'all-blocks-by-family.png'
    }
  },
}