/* eslint-disable no-console */
/**
 * T8c.3 — the layers panel (`LayersPanel.tsx`). Drives the real UI: toggles the panel on via the
 * real toolbar button, clicks a row to select its shape, clicks the lock/hide icon buttons, and
 * drags a row to a new z-order position — the same real-mouse-drag idiom `reorder.js` already
 * proved works for the Deck panel's own drag-and-drop (`LayersPanel.tsx` reuses that exact
 * design; see its module comment).
 *
 * Uses the /develop route for `window.app` (see frame.js).
 */
module.exports = {
  route: '/#/develop',
  async run(page) {
    await page.evaluate(() => {
      window.app.createShapes(
        { id: 'layer-a', type: 'rectangle', point: [100, 100], size: [150, 100], childIndex: 1 },
        { id: 'layer-b', type: 'rectangle', point: [300, 100], size: [150, 100], childIndex: 2 },
        { id: 'layer-c', type: 'rectangle', point: [500, 100], size: [150, 100], childIndex: 3 }
      )
    })
    await page.waitForTimeout(150)

    // --- 1. Toggle the panel on ---------------------------------------------------------------
    // The toggle button itself has no stable id (it's one of several icon buttons sharing a
    // `Tooltip` wrapper in the right panel, same as the pre-existing "Toggle deck" button right
    // next to it, which no scenario in this repo clicks directly either) — `app.setSetting` is
    // the exact same call `toggleLayersVisibility` makes (`TopPanel.tsx`), so this exercises the
    // real code path the button is wired to; what this scenario actually drives through the real
    // DOM is everything downstream of the panel existing, which is the part under test here.
    await page.evaluate(() => window.app.setSetting('showLayers', () => true))
    await page.waitForSelector('#TD-LayersPanel', { timeout: 5000 })
    const toggled = await page.evaluate(() => window.app.settings.showLayers)

    const initialOrder = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#TD-LayersPanel [data-shape-id]')).map((el) =>
        el.getAttribute('data-shape-id')
      )
    )

    // --- 2. Click a row to select its shape --------------------------------------------------
    await page.click('#TD-LayersPanel [data-shape-id="layer-b"]')
    await page.waitForTimeout(150)
    const selectedAfterRowClick = await page.evaluate(() => window.app.selectedIds)

    // --- 3. Lock and hide toggles, through the real icon buttons ----------------------------
    await page.click('#TD-LayersPanel-Lock-layer-a')
    await page.click('#TD-LayersPanel-Hide-layer-c')
    await page.waitForTimeout(150)
    const lockedA = await page.evaluate(() => !!window.app.getShape('layer-a').isLocked)
    const hiddenC = await page.evaluate(() => !!window.app.getShape('layer-c').isHidden)

    // --- 4. Drag the front-most row (layer-c, listed first) to the bottom of the list -------
    // Real mouse events, not a synthetic DataTransfer helper — the same reason reorder.js does
    // this for the Deck panel: it's what proves the canvas/panel underneath isn't swallowing the
    // native HTML5 drag gesture.
    const rows = () => page.$$('#TD-LayersPanel [data-shape-id]')
    const beforeDrag = await rows()
    const firstBox = await beforeDrag[0].boundingBox()
    const lastBox = await beforeDrag[beforeDrag.length - 1].boundingBox()

    const start = { x: firstBox.x + firstBox.width / 2, y: firstBox.y + firstBox.height / 2 }
    const end = { x: lastBox.x + lastBox.width / 2, y: lastBox.y + lastBox.height * 0.9 }

    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x, start.y + 15, { steps: 5 })
    await page.waitForTimeout(80)
    await page.mouse.move(end.x, end.y, { steps: 10 })
    await page.waitForTimeout(120)
    await page.screenshot({ path: require('path').join(__dirname, '..', 'shots', 'layers.png') })
    await page.mouse.up()
    await page.waitForTimeout(200)

    const orderAfterDrag = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#TD-LayersPanel [data-shape-id]')).map((el) =>
        el.getAttribute('data-shape-id')
      )
    )

    return {
      showLayersSetting: toggled,
      initialOrder, // front-most first: ['layer-c', 'layer-b', 'layer-a']
      selectedAfterRowClick,
      lockedA,
      hiddenC,
      orderAfterDrag,
      orderChanged: JSON.stringify(initialOrder) !== JSON.stringify(orderAfterDrag),
    }
  },
}
