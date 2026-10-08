/* eslint-disable no-console */
/**
 * Visual check for `tls.l.row`'s `sizing` prop (F4.2, `RowProps.sizing: 'equal' | 'content'`).
 *
 * The block only implements a per-container toggle today — 'equal' splits the row's width
 * evenly across children, 'content' sizes each child to its own intrinsic width. Per-child
 * fill/auto/weight variants (the original F4.3 ambition) are not implemented; see
 * BACKLOG-visual-fix-2.md §2 G5's "Done when" list. This scenario proves the toggle that
 * actually exists, against the real harness contract:
 *
 *  - `window.tlapp`, not the invented `window.app`.
 *  - `window.tlapp.deck.addSlideFromSpec(spec)` — the real facade method every host uses to add
 *    a slide from a `SlideSpec`, not a fabricated `app.createShapes({ type: 'l.row', ... })`.
 *  - Real block type ids (`tls.l.row`, `tls.t.body`) and the real nested-children shape a row
 *    actually accepts (`props.children: BlockSpec[]`), not a `container: { id, slot }` reference
 *    model that was never implemented.
 *  - `'/#/develop'` (a dead route) replaced with `/edit/<existing-deck-id>` on the Next.js
 *    sample, which is what actually mounts `window.tlapp`.
 *
 * Run:  node tools/visual/shoot.js container-flex
 * Requires: cd examples/nextjs-sample && npx next dev -p 5433 (and packages built).
 */
const path = require('path')

const LONG_TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'

module.exports = {
  base: 'http://localhost:5433',
  route: '/edit/deck-demo-q3',
  known: [/Accessing element\.ref was removed in React 19/],
  async run(page) {
    await page.waitForFunction(() => !!window.tlapp, { timeout: 20000 })

    const slideId = await page.evaluate(
      ({ longText }) => {
        const spec = {
          id: 'container-flex-check',
          layout: 'blank',
          regions: {
            content: [
              {
                id: 'row-equal',
                type: 'tls.l.row',
                props: {
                  gap: 'md',
                  sizing: 'equal',
                  children: [
                    { id: 'row-equal-label', type: 'tls.t.body', props: { text: 'Short' } },
                    { id: 'row-equal-para', type: 'tls.t.body', props: { text: longText } },
                  ],
                },
              },
              {
                id: 'row-content',
                type: 'tls.l.row',
                props: {
                  gap: 'md',
                  sizing: 'content',
                  children: [
                    { id: 'row-content-label', type: 'tls.t.body', props: { text: 'Short' } },
                    { id: 'row-content-para', type: 'tls.t.body', props: { text: longText } },
                  ],
                },
              },
            ],
          },
        }
        return window.tlapp.deck.addSlideFromSpec(spec)
      },
      { longText: LONG_TEXT }
    )

    await page.waitForTimeout(500)

    const shapeInfo = await page.evaluate(() => {
      const page_ = window.tlapp.document.pages[window.tlapp.currentPageId]
      return Object.values(page_.shapes)
        .filter((s) => s.type === 'component')
        .map((s) => ({ id: s.id, componentId: s.componentId, point: s.point, size: s.size }))
    })

    await page.screenshot({
      path: path.join(__dirname, '..', 'shots', 'container-flex.png'),
      fullPage: false,
    })

    return {
      slideId,
      layout: 'tls.l.row with sizing: equal vs sizing: content',
      shapes: shapeInfo,
    }
  },
}
