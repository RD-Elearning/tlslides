/* eslint-disable no-console */
/**
 * Phase 8b — the style panel UI for the fields Phase 8a wired into data/render only. Unlike
 * styles.js (which drove `window.app.createShapes` directly because no UI existed yet), this
 * scenario drives the *actual* panel: select a shape on the canvas, open the "Styles" dropdown
 * (`#TD-Styles`), and move its controls with real mouse/keyboard input — a slider drag for
 * opacity, typing into the stroke-width/corner-radius number fields, and typing into the new
 * custom-colour hex fields. `window.app` (see frame.js) is only used to seed one deterministic
 * rectangle and to read back document/render state for assertions; every *style change* goes
 * through the panel, exactly the thing this phase had to prove works.
 *
 * Two things this exercises beyond "the controls exist":
 *  - The size-enum-vs-arbitrary-stroke-width coherence rule (StyleMenu's handleSizeChange) and
 *    the color-enum-vs-custom-hex rule (handleColorChange): both are driven here through real
 *    clicks on the S/M/L buttons and the color swatches, not just unit-tested at the command
 *    layer.
 *  - The corner-radius row's conditional visibility (only for Rectangle/Component shapes).
 *
 * Uses the /develop route for `window.app` (see frame.js).
 */
const clickCenter = async (page, box) =>
  page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

module.exports = {
  route: '/#/develop',
  async run(page) {
    // One deterministic rectangle: filled (so the Fill custom-colour row is visible too) and
    // large enough that the corner-radius values below stay well inside clampCornerRadius's
    // ceiling of half the shape's smaller dimension.
    await page.evaluate(() => {
      window.app.createShapes({
        id: 'panel-rect',
        type: 'rectangle',
        point: [300, 200],
        size: [600, 360],
        style: { color: 'blue', size: 'small', dash: 'solid', isFilled: true },
      })
    })
    await page.waitForTimeout(300)

    // Select it the way a user would: click on the canvas, not `app.select(...)`.
    await page.mouse.click(600, 380)
    await page.waitForTimeout(200)

    const selectedIds = await page.evaluate(() => window.app.selectedIds)

    // Open the style panel via its real trigger.
    await page.click('#TD-Styles')
    await page.waitForSelector('#TD-Styles-Opacity-Slider', { timeout: 5000 })

    const cornerRadiusRowVisible = (await page.$('#TD-Styles-CornerRadius-Container')) !== null

    // --- Coherence check 1: stroke width vs. the size enum -------------------------------
    // Set an arbitrary stroke width through the panel, then click a size swatch, and confirm the
    // click wins — the two must not silently fight (see StyleMenu's handleSizeChange comment).
    await page.fill('#TD-Styles-StrokeWidth-Input', '30')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    const strokeWidthBeforeSizeClick = await page.evaluate(
      () => window.app.getShape('panel-rect').style.strokeWidth
    )
    await page.click('#TD-Styles-Dash-large')
    await page.waitForTimeout(200)
    const afterSizeClick = await page.evaluate(() => window.app.getShape('panel-rect').style)

    // --- Coherence check 2: custom colour vs. the color enum ------------------------------
    await page.fill('#TD-Styles-CustomStroke-Hex', '#123456')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    const strokeBeforeSwatchClick = await page.evaluate(
      () => window.app.getShape('panel-rect').style.stroke
    )
    await page.click('#TD-Styles-Color-Swatch-red')
    await page.waitForTimeout(200)
    const afterSwatchClick = await page.evaluate(() => window.app.getShape('panel-rect').style)

    // --- The real, visible pass: build the look this screenshot is meant to prove --------
    // Opacity: a real mouse click along the slider's track (native <input type="range"> jumps
    // its value to the clicked position), not a synthetic value assignment.
    const sliderBox = await page.locator('#TD-Styles-Opacity-Slider').boundingBox()
    await page.mouse.click(sliderBox.x + sliderBox.width * 0.35, sliderBox.y + sliderBox.height / 2)
    await page.waitForTimeout(200)

    await page.fill('#TD-Styles-StrokeWidth-Input', '20')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(150)

    await page.fill('#TD-Styles-CornerRadius-Input', '90')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(150)

    await page.fill('#TD-Styles-CustomStroke-Hex', '#3a7bd5')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(150)

    await page.fill('#TD-Styles-CustomFill-Hex', '#f5a623')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(300)

    // Leave the panel open in the screenshot — the whole point of this phase is that these
    // controls exist and show live values, so hiding them behind a closed menu would defeat it.

    const finalStyle = await page.evaluate(() => window.app.getShape('panel-rect').style)
    const sliderValue = await page.evaluate(
      () => Number(document.querySelector('#TD-Styles-Opacity-Slider').value)
    )

    // Render checks: read the actual SVG attributes, same discipline as styles.js — a bug that
    // stores the field but fails to draw it would still show up here. A rounded, filled, solid
    // rectangle (DashedRectangle.tsx's cornerRadius>0 branch) draws three <rect>s — an invisible
    // hit-area, a fill rect, and a stroke rect — so pick each one out by which attribute it
    // actually carries rather than assuming a fixed index.
    const rendered = await page.evaluate(() => {
      const svg = document.querySelector('#panel-rect_svg')
      const group = svg?.querySelector('g')
      const rects = Array.from(svg?.querySelectorAll('rect') || [])
      const fillRect = rects.find((r) => r.getAttribute('fill') && r.getAttribute('fill') !== 'none')
      const strokeRect = rects.find((r) => r.getAttribute('stroke') && r.getAttribute('stroke') !== 'none')
      return {
        groupOpacity: group?.getAttribute('opacity'),
        rectCount: rects.length,
        rectRx: strokeRect?.getAttribute('rx'),
        strokeWidth: strokeRect?.getAttribute('stroke-width'),
        stroke: strokeRect?.getAttribute('stroke'),
        fill: fillRect?.getAttribute('fill'),
      }
    })

    return {
      selectedIds,
      cornerRadiusRowVisible,
      coherence: {
        strokeWidthBeforeSizeClick,
        sizeAfterClick: afterSizeClick.size,
        strokeWidthAfterSizeClick: afterSizeClick.strokeWidth,
        strokeBeforeSwatchClick,
        colorAfterSwatchClick: afterSwatchClick.color,
        strokeAfterSwatchClick: afterSwatchClick.stroke,
        fillAfterSwatchClick: afterSwatchClick.fill,
      },
      finalStyle,
      sliderValue,
      rendered,
    }
  },
}
