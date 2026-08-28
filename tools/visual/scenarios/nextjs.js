/* eslint-disable no-console */
/**
 * Drives the examples/nextjs-sample reference app: draws a shape with a pointer (same as a real
 * user), clicks the "Add rectangle" and "Add slide" API buttons, and checks that onPersist wrote
 * a document to localStorage. Its job is to prove the Next.js/React 19 integration is not just
 * compiling, but actually mounts, accepts input, and drives the imperative API end to end.
 *
 * The app has no `id` prop on <Tldraw>, so it has no IndexedDB persistence of its own — see
 * components/Editor.tsx. The `tlslides-nextjs-sample-document` localStorage key is the only
 * persistence path, written from the `onPersist` callback, and is what this scenario checks for.
 */
const STORAGE_KEY = 'tlslides-nextjs-sample-document'

const drag = async (page, x1, y1, x2, y2) => {
  await page.mouse.move(x1, y1)
  await page.mouse.down()
  await page.mouse.move(x2, y2, { steps: 12 })
  await page.mouse.up()
}

module.exports = {
  // Served by examples/nextjs-sample, not the tldraw-example harness.
  base: 'http://localhost:5433',
  route: '/',
  // @radix-ui/react-slot@0.1.2 (pinned by packages/tldraw, 2021-era) reads `element.ref`, which
  // React 19 warns about on every `asChild` render. It is cosmetic — the value still resolves via
  // React's back-compat getter — but it cannot be fixed without upgrading Radix across the fork.
  known: [/Accessing element\.ref was removed in React 19/],
  async run(page) {
    // Draw a rectangle by hand, exercising the pointer/tool pipeline through React 19.
    await page.keyboard.press('r')
    await drag(page, 300, 300, 550, 480)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Exercise the imperative API buttons wired up in components/Editor.tsx.
    await page.click('#add-rectangle')
    await page.waitForTimeout(200)

    // Read the shape count on the current page BEFORE adding a slide, since createPage switches
    // the current page (see reviews/03-nextjs-control-api.md friction point #2).
    const drawnPageId = await page.evaluate(() => window.tlapp.currentPageId)
    const shapeCountOnFirstPage = await page.evaluate(
      () => Object.keys(window.tlapp.document.pages[window.tlapp.currentPageId].shapes).length
    )

    await page.click('#add-slide')
    await page.waitForTimeout(300)

    const pageCount = await page.evaluate(() => Object.keys(window.tlapp.document.pages).length)
    const persisted = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)

    // Return to the slide that has content, so the screenshot shows the drawing rather than the
    // blank slide createPage switched to. Addressed by id rather than by clicking "previous",
    // which is relative and lands on the wrong slide once the deck has more than two.
    await page.evaluate((id) => window.tlapp.changePage(id), drawnPageId)
    await page.waitForTimeout(600)

    return {
      shapeCountOnFirstPage,
      pageCount,
      persistedToLocalStorage: Boolean(persisted),
      persistedDocumentId: persisted ? JSON.parse(persisted).id : null,
    }
  },
}
