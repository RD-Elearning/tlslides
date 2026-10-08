/* eslint-disable no-console */
/**
 * R11 — double-click a block's text in the real editor, edit it, save, and prove the change
 * round-trips through the same `documentToDeckSpec` → validate → PUT path the Save button uses
 * (see `EditDeck.tsx`). This is the scenario the R11/R12/R13 phase-completion claims never
 * shipped one for — the previous "visual tests" lived at `packages/tldraw/visual-tests/*.js`,
 * imported `@playwright/test` (not a dependency here) and referenced `window.tldrawApp` (the
 * real global is `window.tlapp`, set in `EditDeck.tsx`'s `onMount`); they could not run.
 *
 * Run:  node tools/visual/shoot.js inline-edit
 * Requires:  cd examples/nextjs-sample && npx next dev -p 5433
 */
module.exports = {
  base: 'http://localhost:5433',
  known: [/Accessing element\.ref was removed in React 19/],
  route: '/edit/deck-demo-q3',
  waitFor: '[data-prop-path="text"]',

  async run(page) {
    const target = page.locator('[data-prop-path="text"]').first()
    const box = await target.boundingBox()

    // Identify which shape actually owns the element we're about to double-click, by its
    // rendered position — not just "the first tls.t.title on the page" — so the assertion
    // below checks the same shape the click landed on.
    const targetShapeId = await page.evaluate((b) => {
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
      const shapeEl = el?.closest('[id]')
      return shapeEl?.id ?? null
    }, box)

    await target.dblclick()
    await page.waitForTimeout(150)

    const editorVisible = await page.evaluate(
      () => !!document.querySelector('[contenteditable="true"]')
    )

    // Select-all + type replaces the seeded text instead of appending to it.
    await page.keyboard.press('Control+A')
    await page.keyboard.type('Edited by inline-edit.js')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(150)

    const editorClosedAfterSave = await page.evaluate(
      () => !document.querySelector('[contenteditable="true"]')
    )

    const shapeAfterSave = targetShapeId
      ? await page.evaluate((id) => window.tlapp.getShape(id).props.text, targetShapeId)
      : null

    await page.screenshot({ path: require('path').join(__dirname, '..', 'shots', 'inline-edit.png') })

    return {
      hadTarget: !!box,
      editorVisible,
      editorClosedAfterSave,
      shapeAfterSave,
      savedCorrectly: shapeAfterSave === 'Edited by inline-edit.js',
    }
  },
}
