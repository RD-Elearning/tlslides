/* eslint-disable no-console */
/**
 * Shows the slide frame (F-01): the "paper" rectangle, the dimming outside of it, a shape drawn
 * both inside and outside the frame, and the deck thumbnails (one widescreen, one square, so
 * the thumbnails visibly differ in aspect ratio). Runs once in light mode and once in dark mode.
 *
 * Uses the /develop route because it exposes `window.app` (see examples/tldraw-example/src/
 * develop.tsx), needed here to create a second, differently-sized slide and to toggle dark mode
 * precisely rather than guessing at a menu's DOM structure.
 */
const path = require('path')

const drag = async (page, x1, y1, x2, y2) => {
  await page.mouse.move(x1, y1)
  await page.mouse.down()
  await page.mouse.move(x2, y2, { steps: 12 })
  await page.mouse.up()
}

module.exports = {
  route: '/#/develop',
  async run(page) {
    const firstPageId = await page.evaluate(() => window.app.currentPageId)

    // A second slide with a different (square) aspect ratio, so the deck thumbnails visibly
    // differ in shape rather than all being cropped to the same box. Do this before drawing
    // anything: `changePage` (which `createPage` and this both go through) re-fits the camera to
    // the target page's frame, and we don't want that disturbing the view after we've drawn.
    await page.evaluate(() => {
      window.app.createPage('square-slide')
      window.app.setPageSize('square-slide', [1080, 1080])
    })
    await page.evaluate((id) => window.app.changePage(id), firstPageId)
    await page.waitForTimeout(200)

    // Zoom out from the auto-fit so there's a generous dimmed margin to draw an "outside the
    // frame" shape into. zoomOut() is a relative step, not a re-fit, so it won't be undone by
    // anything below.
    await page.evaluate(() => window.app.zoomOut())
    await page.evaluate(() => window.app.zoomOut())
    await page.waitForTimeout(200)

    // Find the frame's actual on-screen box so the two shapes are positioned correctly relative
    // to it regardless of the exact zoom/pan the fit landed on. `#develop` scopes this to the
    // main canvas, not one of the deck thumbnails (which render their own `.tl-frame` too).
    const frameBox = await page.evaluate(() => {
      const el = document.querySelector('#develop .tl-frame .tl-frame-paper')
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    })

    // A shape inside the frame.
    await page.keyboard.press('r')
    await drag(
      page,
      frameBox.x + frameBox.width * 0.3,
      frameBox.y + frameBox.height * 0.35,
      frameBox.x + frameBox.width * 0.7,
      frameBox.y + frameBox.height * 0.65
    )

    // A shape outside the frame, in the dimmed pasteboard area (above and to the left of it).
    await page.keyboard.press('r')
    await drag(
      page,
      Math.max(20, frameBox.x - 120),
      Math.max(20, frameBox.y - 60),
      Math.max(60, frameBox.x - 40),
      Math.max(60, frameBox.y - 15)
    )

    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Keep the deck scrolled to the top so the active slide — the one with the drawing — is the
    // one visible in the screenshot. The square slide's differing aspect ratio is proven
    // numerically below instead of by eye, since the panel is not tall enough to show all three.
    await page.evaluate(() => {
      document.querySelector('#TD-DeckPanel [data-radix-scroll-area-viewport]')?.scrollTo(0, 0)
    })
    await page.waitForTimeout(200)

    // Each thumbnail's paper rect should match its own slide's aspect ratio: two widescreen and
    // one square. This is what "thumbnails frame the slide, not the author's camera" means.
    const thumbnailRatios = await page.evaluate(() =>
      [...document.querySelectorAll('#TD-DeckPanel .tl-frame-paper')].map((el) => {
        const r = el.getBoundingClientRect()
        return Math.round((r.width / r.height) * 100) / 100
      })
    )

    const notes = {
      frameBox,
      thumbnailRatios,
      light: {
        shapes: await page.evaluate(() => document.querySelectorAll('[aria-label="container"]').length),
        frameRects: await page.evaluate(
          () => document.querySelectorAll('.tl-frame .tl-frame-paper').length
        ),
      },
    }

    // Light-mode screenshot. shoot.js takes its own screenshot (named after the scenario, i.e.
    // frame.png) once `run` returns below, so this one gets an explicit sibling name to avoid
    // the two colliding — frame.png ends up being the dark-mode shot.
    await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'frame-light.png') })

    // Dark mode.
    await page.evaluate(() => window.app.toggleDarkMode())
    await page.waitForTimeout(300)

    notes.dark = {
      isDarkMode: await page.evaluate(() => window.app.settings.isDarkMode),
    }

    return notes
  },
}
