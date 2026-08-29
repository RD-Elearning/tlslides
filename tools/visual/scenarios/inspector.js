/* eslint-disable no-console */
/**
 * T8c.1 — the numeric X/Y/W/H/rotation inspector (`InspectorMenu.tsx`). Drives the real panel —
 * select a shape on the canvas, open the "Position" dropdown (`#TD-Inspector`), type into its
 * fields — the way `stylepanel.js` drives the real Styles panel rather than only calling
 * `window.app`. `window.app` is used only to seed deterministic shapes and to read back
 * document/render state for assertions.
 *
 * Covers both halves of the brief's explicit ask:
 *  - a single selection: every field (X, Y, W, H, Rotation) is read from, and writes back to,
 *    the shape itself, verified against the actual rendered `<g transform="...">` attribute, not
 *    only the document.
 *  - a multi-selection: only X/Y (the combined bounding box, translating every selected shape by
 *    the same delta) is editable; W/H/Rotation are shown, disabled — see InspectorMenu.tsx's own
 *    comment for why that split is a deliberate scope decision, not an oversight.
 *
 * Uses the /develop route for `window.app` (see frame.js).
 */
module.exports = {
  route: '/#/develop',
  async run(page) {
    await page.evaluate(() => {
      window.app.createShapes(
        { id: 'inspect-rect', type: 'rectangle', point: [200, 150], size: [300, 180] },
        { id: 'inspect-rect-2', type: 'rectangle', point: [650, 150], size: [200, 120] }
      )
    })
    await page.waitForTimeout(200)

    // --- 1. Single selection: read the panel's initial values against the real shape --------
    const box1 = await page.locator('#develop #inspect-rect_svg').boundingBox()
    await page.mouse.click(box1.x + box1.width / 2, box1.y + box1.height / 2)
    await page.waitForTimeout(150)

    await page.click('#TD-Inspector')
    await page.waitForSelector('#TD-Inspector-X-Input', { timeout: 5000 })

    const initialValues = await page.evaluate(() => ({
      x: document.querySelector('#TD-Inspector-X-Input').value,
      y: document.querySelector('#TD-Inspector-Y-Input').value,
      w: document.querySelector('#TD-Inspector-W-Input').value,
      h: document.querySelector('#TD-Inspector-H-Input').value,
      rotation: document.querySelector('#TD-Inspector-Rotation-Input').value,
    }))

    // --- 2. Edit every field through the real inputs ----------------------------------------
    await page.fill('#TD-Inspector-X-Input', '260')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    await page.fill('#TD-Inspector-Y-Input', '190')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    await page.fill('#TD-Inspector-W-Input', '400')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    await page.fill('#TD-Inspector-H-Input', '220')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    await page.fill('#TD-Inspector-Rotation-Input', '30')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(150)

    const afterEdit = await page.evaluate(() => window.app.getShape('inspect-rect'))

    // The real, rendered proof — not just the document — matching the discipline every other
    // scenario in this phase uses: `@tlslides/core`'s `usePosition` hook writes the shape's
    // translate/rotate directly onto `#<shapeId>`'s own `style.transform` (a plain `<div>`, see
    // `Container.tsx`/`usePosition.ts`) — a rotation typed into the panel must show up there,
    // in radians, not only in the document.
    const renderedTransform = await page.evaluate(
      // Scoped to `#develop` (the main canvas's own `Renderer` id — see `Tldraw.tsx`'s `id={id}`
      // prop) rather than a bare `#inspect-rect`: the Deck thumbnail's `ReadOnlyEditor` renders
      // the very same shape id in its own tree, the identical collision `background.js` already
      // documents for `#bg-rect_svg`.
      () => document.querySelector('#develop #inspect-rect')?.style.transform || null
    )
    const renderedRotationRad = renderedTransform
      ? Number((renderedTransform.match(/rotate\(([-\d.]+)rad\)/) || [])[1])
      : null

    // --- 3. A Tab keystroke inside these fields must NOT clone the shape -------------------
    // This is exactly the trap `stopKeyPropagationUnlessEscape`'s own doc comment names this
    // phase's numeric inspector as the next place it applies (see components/preventEvent.ts).
    const shapeCountAfterEdits = await page.evaluate(() => Object.keys(window.app.shapes).length)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)

    // --- 4. Multi-selection: X/Y translates both shapes; W/H/Rotation are disabled ----------
    await page.evaluate(() => window.app.select('inspect-rect', 'inspect-rect-2'))
    await page.waitForTimeout(150)
    await page.click('#TD-Inspector')
    await page.waitForSelector('#TD-Inspector-X-Input', { timeout: 5000 })

    const multiDisabled = await page.evaluate(() => ({
      wDisabled: document.querySelector('#TD-Inspector-W-Input').disabled,
      hDisabled: document.querySelector('#TD-Inspector-H-Input').disabled,
      rotationDisabled: document.querySelector('#TD-Inspector-Rotation-Input').disabled,
    }))

    const pointsBeforeMultiMove = await page.evaluate(() => ({
      a: window.app.getShape('inspect-rect').point,
      b: window.app.getShape('inspect-rect-2').point,
    }))
    const multiX = await page.evaluate(
      () => document.querySelector('#TD-Inspector-X-Input').value
    )
    await page.fill('#TD-Inspector-X-Input', String(Number(multiX) + 50))
    await page.keyboard.press('Tab')
    await page.waitForTimeout(150)
    const pointsAfterMultiMove = await page.evaluate(() => ({
      a: window.app.getShape('inspect-rect').point,
      b: window.app.getShape('inspect-rect-2').point,
    }))

    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
    await page.screenshot({ path: require('path').join(__dirname, '..', 'shots', 'inspector.png') })

    const deltaA = pointsAfterMultiMove.a[0] - pointsBeforeMultiMove.a[0]
    const deltaB = pointsAfterMultiMove.b[0] - pointsBeforeMultiMove.b[0]

    return {
      initialValues,
      afterEdit: {
        point: afterEdit.point,
        size: afterEdit.size,
        rotationDeg: Math.round(((afterEdit.rotation || 0) * 180) / Math.PI),
      },
      renderedTransformPresent: !!renderedTransform,
      renderedRotationDeg: renderedRotationRad !== null ? Math.round((renderedRotationRad * 180) / Math.PI) : null,
      shapeCountAfterEdits, // must stay 2 — a Tab-clone bug would make this 3+
      multiDisabled,
      multiTranslate: {
        deltaA: Math.round(deltaA),
        deltaB: Math.round(deltaB),
        movedTogether: Math.round(deltaA) === Math.round(deltaB) && Math.round(deltaA) === 50,
      },
    }
  },
}
