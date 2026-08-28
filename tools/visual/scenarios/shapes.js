/* eslint-disable no-console */
/**
 * Draws one shape with each of the basic tools. Its job is to prove the default style is the
 * clean solid/sans one, not the hand-drawn look the fork shipped with.
 */
const drag = async (page, x1, y1, x2, y2) => {
  await page.mouse.move(x1, y1)
  await page.mouse.down()
  await page.mouse.move(x2, y2, { steps: 12 })
  await page.mouse.up()
}

module.exports = {
  route: '/#/basic',
  async run(page) {
    await page.keyboard.press('r')
    await drag(page, 380, 260, 700, 450)

    await page.keyboard.press('a')
    await drag(page, 380, 540, 700, 620)

    await page.keyboard.press('d')
    await drag(page, 800, 300, 1050, 460)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(600)

    return {
      shapes: await page.evaluate(() => document.querySelectorAll('[aria-label="container"]').length),
      strokePaths: await page.evaluate(() => document.querySelectorAll('#canvas svg path').length),
    }
  },
}
