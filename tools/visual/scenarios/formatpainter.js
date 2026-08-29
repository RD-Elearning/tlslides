/* eslint-disable no-console */
/**
 * T8c.2 — the format painter (`FormatPainter.tsx`). Drives the real toolbar button
 * (`#TD-FormatPainter`): select a styled source shape, click the button to "pick up" its style,
 * click a differently-styled target shape to apply it — the actual two-click interaction a user
 * performs, not a direct `app.style(...)` call. `window.app` seeds the two deterministic shapes
 * and reads back state for assertions.
 *
 * Proves the two things the Phase 8c report's scoping decision calls out:
 *  - the copy is a *full* replacement (the target's own pre-existing `stroke`/`strokeWidth`
 *    overrides, absent on the source, are cleared — not left to silently coexist);
 *  - `scale` is excluded (set differently on the two shapes; must survive the paint untouched).
 */
module.exports = {
  route: '/#/develop',
  async run(page) {
    await page.evaluate(() => {
      window.app.createShapes(
        {
          id: 'paint-source',
          type: 'rectangle',
          point: [150, 150],
          size: [220, 140],
          style: {
            color: 'green',
            size: 'large',
            dash: 'dotted',
            isFilled: true,
            fill: '#2ecc71',
            opacity: 0.8,
            scale: 3, // must NOT be copied — see FormatPainter.tsx's module comment
          },
        },
        {
          id: 'paint-target',
          type: 'rectangle',
          point: [500, 150],
          size: [220, 140],
          style: {
            color: 'red',
            size: 'small',
            dash: 'solid',
            // Filled (unlike the pre-existing-override fields below, this isn't the point under
            // test) so the shape's fill-hitarea covers its whole box and a plain center-click
            // selects it — an unfilled shape's only hit area is a thin band around its *stroke*
            // (`tl-stroke-hitarea`), inset from the box edge by half its (here deliberately huge)
            // `strokeWidth`, which a naive center-click would miss entirely.
            isFilled: true,
            fill: '#eeeeee',
            stroke: '#ff0000',
            strokeWidth: 40, // a pre-existing override the source never had — must be cleared
            scale: 1,
          },
        }
      )
    })
    await page.waitForTimeout(200)

    // --- 1. Select the source, click the format painter to arm it --------------------------
    const sourceBox = await page.locator('#develop #paint-source_svg').boundingBox()
    await page.mouse.click(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
    await page.waitForTimeout(150)

    // Click once to arm, then again to cancel (a no-op on the target), then a third time to
    // re-arm for the real paint below — proves the button really toggles rather than only ever
    // committing on click.
    await page.click('#TD-FormatPainter')
    await page.waitForTimeout(80)
    await page.click('#TD-FormatPainter')
    await page.waitForTimeout(80)
    const styleAfterCancelledArm = await page.evaluate(() => window.app.getShape('paint-target').style)
    await page.click('#TD-FormatPainter')
    await page.waitForTimeout(100)

    const selectedBeforeTargetClick = await page.evaluate(() => window.app.selectedIds)

    // --- 2. Click the target shape — the real "paint" gesture ------------------------------
    // `paint-target` is unfilled (`isFilled: false`), so only its *stroke* is a hit area (see
    // `DashedRectangle.tsx`'s `tl-stroke-hitarea` class) — clicking dead-center would miss it
    // entirely and deselect instead. Click just inside its left edge instead.
    const targetBox = await page.locator('#develop #paint-target_svg').boundingBox()
    await page.mouse.click(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2)
    await page.waitForTimeout(200)

    const selectedAfterTargetClick = await page.evaluate(() => window.app.selectedIds)

    await page.screenshot({ path: require('path').join(__dirname, '..', 'shots', 'formatpainter.png') })

    const targetStyle = await page.evaluate(() => window.app.getShape('paint-target').style)
    const sourceStyle = await page.evaluate(() => window.app.getShape('paint-source').style)

    // The real, rendered proof: the target's fill attribute in the live SVG must now match the
    // source's, not merely the document — the same discipline stylepanel.js/background.js use.
    const renderedTargetFill = await page.evaluate(() => {
      const rects = Array.from(document.querySelectorAll('#develop #paint-target_svg rect'))
      const fillRect = rects.find((r) => r.getAttribute('fill') && r.getAttribute('fill') !== 'none')
      return fillRect?.getAttribute('fill') || null
    })

    return {
      selectedBeforeTargetClick,
      selectedAfterTargetClick,
      styleAfterCancelledArmUnchanged: styleAfterCancelledArm.color === 'red',
      targetStyle,
      sourceStyle,
      matches: {
        color: targetStyle.color === sourceStyle.color,
        dash: targetStyle.dash === sourceStyle.dash,
        isFilled: targetStyle.isFilled === sourceStyle.isFilled,
        fill: targetStyle.fill === sourceStyle.fill,
        opacity: targetStyle.opacity === sourceStyle.opacity,
      },
      strokeOverrideCleared: targetStyle.stroke === undefined,
      strokeWidthOverrideCleared: targetStyle.strokeWidth === undefined,
      scaleUntouched: targetStyle.scale === 1, // NOT overwritten with the source's `scale: 3`
      renderedTargetFill,
      renderedFillMatchesSource: renderedTargetFill === '#2ecc71',
    }
  },
}
