/* eslint-disable no-console */
/**
 * B-05: draws a line with the line tool and asserts the resulting shape is a real `line` shape
 * (LineUtil), not the old workaround of an Arrow with both decorations set to undefined.
 *
 * Uses the /develop route for `window.app` (see frame.js), needed here to read the created
 * shape's data directly rather than guessing at it from the DOM.
 */
const drag = async (page, x1, y1, x2, y2) => {
  await page.mouse.move(x1, y1)
  await page.mouse.down()
  await page.mouse.move(x2, y2, { steps: 12 })
  await page.mouse.up()
}

module.exports = {
  route: '/#/develop',
  async run(page) {
    await page.keyboard.press('l')
    await drag(page, 400, 300, 700, 500)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    const shape = await page.evaluate(() => {
      const lines = Object.values(window.app.shapes).filter((s) => s.type === 'line')
      return lines[lines.length - 1]
    })

    return {
      shape,
      isLineType: shape?.type === 'line',
      // A real line has no arrow-only fields at all — if these are present, LineTool is still
      // falling back to creating a decoration-less Arrow.
      hasNoBend: !('bend' in (shape || {})),
      hasNoDecorations: !('decorations' in (shape || {})),
      hasNoLabel: !('label' in (shape || {})),
      handleKeys: shape ? Object.keys(shape.handles).sort() : [],
      strokePaths: await page.evaluate(() => document.querySelectorAll('#canvas svg path').length),
    }
  },
}
