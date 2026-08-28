/* eslint-disable no-console */
/**
 * Phase 11 — the background system: page-level solid/gradient backgrounds (`BackgroundMenu`) and
 * gradient shape fills (StyleMenu's new "Gradient" row), both driven through the real UI like
 * stylepanel.js does — `window.app` is only used to seed a deterministic rectangle and to read
 * back document/render state for assertions.
 *
 * The whole point of this phase is that these gradients are real SVG `<defs>`, not CSS, so they
 * survive export unchanged (see Frame.tsx's and GradientDef's comments). This scenario is the
 * proof: after building the look through the UI, it calls `window.app.copySvg(...)` — the same
 * export path "Copy as SVG"/PNG export use — and greps the *returned string* for `<linearGradient`
 * nodes. If someone ever "simplified" the background to a CSS `background-image` gradient, the
 * live screenshot would look identical and this assertion would be the only thing that catches it.
 *
 * Uses the /develop route for `window.app` (see frame.js).
 */
module.exports = {
  route: '/#/develop',
  async run(page) {
    // --- 1. A gradient shape fill, via the UI, before touching the page background ------------
    // (built first so the fill/enum coherence rule — picking a gradient preset must clear
    // `style.fill` — is checked against a shape that started with a plain flat fill, not a blank
    // one, which would make the assertion vacuous.)
    await page.evaluate(() => {
      window.app.createShapes({
        id: 'bg-rect',
        type: 'rectangle',
        point: [700, 260],
        size: [500, 300],
        style: { color: 'blue', size: 'small', dash: 'solid', isFilled: true, fill: '#f5a623' },
      })
    })
    await page.waitForTimeout(200)
    // Click the shape's actual on-screen box rather than a guessed page-space coordinate: the
    // default camera fit zooms/pans the slide to fit the viewport, so page coordinates don't map
    // 1:1 onto screen pixels the way they happen to for a shape sitting right near the origin.
    // Scoped to `#develop` because the Deck thumbnail renders the very same shape id in its own
    // `<svg>` (see `frame.js`'s comment on the same collision for `.tl-frame`).
    const shapeBox = await page.locator('#develop #bg-rect_svg').boundingBox()
    await page.mouse.click(shapeBox.x + shapeBox.width / 2, shapeBox.y + shapeBox.height / 2)
    await page.waitForTimeout(150)

    await page.click('#TD-Styles')
    await page.waitForSelector('#TD-Styles-FillGradient-Container', { timeout: 5000 })
    const shapeFillBeforeGradient = await page.evaluate(
      () => window.app.getShape('bg-rect').style.fill
    )
    await page.click('#TD-Styles-FillGradient-ocean-breeze')
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)

    const shapeStyleAfterGradient = await page.evaluate(() => window.app.getShape('bg-rect').style)

    // Render check: the shape's own <defs> (inside its `_svg`-suffixed <g>, per GradientDef's
    // comment) actually contains a <linearGradient>, and the shape's fill attribute references it.
    const shapeRender = await page.evaluate(() => {
      const g = document.getElementById('bg-rect_svg')
      const gradientEl = g?.querySelector('defs linearGradient')
      const fillRect = Array.from(g?.querySelectorAll('rect, path') || []).find(
        (el) => el.getAttribute('fill')?.startsWith('url(')
      )
      return {
        gradientId: gradientEl?.getAttribute('id'),
        fillAttr: fillRect?.getAttribute('fill'),
      }
    })

    // --- 2. The page background, via BackgroundMenu ------------------------------------------
    await page.click('#TD-Background')
    await page.waitForSelector('#TD-Background-Content', { timeout: 5000 })
    await page.click('#TD-Background-Tab-Gradient')
    await page.waitForTimeout(150)

    // Set an arbitrary, non-preset angle through the real number field.
    await page.fill('#TD-Background-Angle-Input', '110')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(150)

    // Edit a stop's color through the real color input (Playwright can't drive the native color
    // picker UI, but `fill` on an <input type="color"> dispatches a real `input`/`change` event,
    // which is what the component actually listens for).
    await page.fill('#TD-Background-Stop-1-Position', '80')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(150)

    const customGradient = await page.evaluate(() => window.app.page.background)

    // Add a third stop through the real "Add stop" button.
    await page.click('#TD-Background-AddStop')
    await page.waitForTimeout(150)
    const stopsAfterAdd = await page.evaluate(
      () => window.app.page.background && window.app.page.background.stops.length
    )

    // Now apply a curated preset — the other half of T11.4's ask — overwriting the custom
    // gradient above. Reopen the menu since editing fields doesn't close it, but the preset click
    // does route through a DropdownMenu.Item.
    await page.click('#TD-Background-Preset-northern-lights')
    await page.waitForTimeout(200)

    const pageBackgroundAfterPreset = await page.evaluate(() => window.app.page.background)

    // Render check: the live frame's own <defs> now has the gradient, and the paper rect
    // references it — not a CSS background-image (see the module comment).
    const frameRender = await page.evaluate(() => {
      const frame = document.querySelector('#develop .tl-frame')
      const gradientEl = frame?.querySelector('defs linearGradient')
      const paper = frame?.querySelector('.tl-frame-paper')
      return {
        gradientId: gradientEl?.getAttribute('id'),
        paperFill: paper?.getAttribute('fill'),
        computedBackgroundImage: paper
          ? getComputedStyle(paper).getPropertyValue('background-image')
          : null,
      }
    })

    // Deck thumbnails render through the same `Frame` (ReadOnlyEditor) — confirm the current
    // slide's thumbnail picked up the background too, per T11.2's explicit ask.
    const deckThumbnailHasGradient = await page.evaluate(() => {
      const thumb = document.querySelector('#TD-DeckPanel [data-page-id]')
      return !!thumb?.querySelector('.tl-frame defs linearGradient')
    })

    await page.waitForTimeout(200)
    await page.screenshot({ path: require('path').join(__dirname, '..', 'shots', 'background.png') })

    // --- 3. The actual proof: does the gradient survive `copySvg` export? --------------------
    const exportedSvg = await page.evaluate(() =>
      window.app.copySvg([], window.app.currentPageId, true)
    )
    const exportHasPageGradient = /<linearGradient/.test(exportedSvg || '')
    const exportHasShapeGradientRef = (exportedSvg || '').includes('bg-rect-fill-gradient')

    return {
      shape: {
        fillBeforeGradient: shapeFillBeforeGradient,
        styleAfterGradient: shapeStyleAfterGradient,
        render: shapeRender,
      },
      background: {
        customGradient,
        stopsAfterAdd,
        afterPreset: pageBackgroundAfterPreset,
        frameRender,
        deckThumbnailHasGradient,
      },
      export: {
        length: exportedSvg?.length ?? 0,
        exportHasPageGradient,
        exportHasShapeGradientRef,
      },
    }
  },
}
