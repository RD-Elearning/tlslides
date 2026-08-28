/* eslint-disable no-console */
/**
 * Proves F-02 (custom React component blocks) end to end in the Next.js reference app: clicks
 * the "Add KPI tile" and "Add bar chart" buttons wired up in examples/nextjs-sample/components/
 * Editor.tsx, each of which inserts a ComponentShape whose `componentId` resolves against the
 * `components` registry passed to <Tldraw>. The registered components live in
 * examples/nextjs-sample/components/blocks.tsx and are ordinary React — never referenced from the
 * document itself, which only stores `{ componentId, props }`.
 *
 * This is the scenario that matters most for this phase: it is the only check that actually
 * renders a host-app React component as slide content, rather than just exercising the shape's
 * type-level plumbing (covered by packages/tldraw's jest suite instead).
 */
module.exports = {
  // Served by examples/nextjs-sample, not the tldraw-example harness.
  base: 'http://localhost:5433',
  // See tools/visual/scenarios/nextjs.js for why this warning is tolerated here too.
  known: [/Accessing element\.ref was removed in React 19/],
  route: '/',
  async run(page) {
    await page.click('#add-kpi-tile')
    await page.waitForTimeout(300)
    await page.click('#add-bar-chart')
    await page.waitForTimeout(300)

    // Deselect so neither block renders in its "selected" (bounding-box) state for the
    // screenshot.
    await page.keyboard.press('Escape')
    await page.mouse.move(60, 60)
    await page.waitForTimeout(300)

    const shapeCount = await page.evaluate(
      () => Object.keys(window.tlapp.document.pages[window.tlapp.currentPageId].shapes).length
    )

    // Confirm the actual registered React content rendered, not a placeholder — read the text
    // straight out of the live DOM rather than trusting document state alone.
    const kpiText = await page.evaluate(() => document.body.innerText.includes('128.4K'))
    const chartTitleText = await page.evaluate(() =>
      document.body.innerText.includes('Quarterly revenue')
    )
    const barCount = await page.evaluate(
      () => document.querySelectorAll('[title^="Q1:"], [title^="Q2:"], [title^="Q3:"], [title^="Q4:"]').length
    )
    const placeholderPresent = await page.evaluate(() =>
      document.body.innerText.includes('Unknown block')
    )

    return {
      shapeCount,
      kpiTileRendered: kpiText,
      barChartTitleRendered: chartTitleText,
      barsRendered: barCount,
      unexpectedPlaceholder: placeholderPresent,
    }
  },
}
