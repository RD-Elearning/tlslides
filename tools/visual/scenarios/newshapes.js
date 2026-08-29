/* eslint-disable no-console */
/**
 * T8c.4 — the three new shapes (Polygon, Star, SpeechBubble). Creates each one through the real
 * toolbar hotkey + a canvas drag (`page.keyboard.press('h'/'j'/'b')`, the same idiom `line.js` uses
 * for LineTool — see that file's own comment), not `window.app.createShapes`, so this proves the
 * tool wiring (`state/tools/index.ts`, `TldrawApp.ts`'s `tools` map, `useKeyboardShortcuts.tsx`)
 * actually works end to end, the way the phase brief asks ("creatable ... like existing shapes").
 * `window.app` is then used to apply a style and to read back document/render state for
 * assertions, matching every other scenario's division of labour in this harness.
 *
 * Also proves the two things the brief calls out explicitly for new shapes:
 *  - they render in the Deck thumbnail (same check `background.js` makes for gradients), and
 *  - they render headlessly through `window.renderPageToSvg` (same check `typography.js` makes
 *    for text), with the live style (a custom fill hex) surviving into the exported markup.
 *
 * Uses the /develop route for `window.app`/`window.renderPageToSvg` (see frame.js).
 */
const drag = async (page, x1, y1, x2, y2) => {
  await page.mouse.move(x1, y1)
  await page.mouse.down()
  await page.mouse.move(x2, y2, { steps: 12 })
  await page.mouse.up()
}

const lastShapeOfType = (page, type) =>
  page.evaluate((t) => {
    const shapes = Object.values(window.app.shapes).filter((s) => s.type === t)
    return shapes[shapes.length - 1]
  }, type)

module.exports = {
  route: '/#/develop',
  async run(page) {
    // --- 1. Create all three through the real toolbar hotkey + drag -------------------------
    await page.keyboard.press('h')
    await drag(page, 120, 120, 320, 320)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)

    await page.keyboard.press('j')
    await drag(page, 420, 120, 620, 320)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)

    await page.keyboard.press('b')
    await drag(page, 720, 120, 1020, 320)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)

    const polygon = await lastShapeOfType(page, 'polygon')
    const star = await lastShapeOfType(page, 'star')
    const speechBubble = await lastShapeOfType(page, 'speechBubble')

    // --- 2. A custom fill on the star, through the real style command -----------------------
    await page.evaluate((id) => {
      window.app.select(id)
      window.app.style({ isFilled: true, fill: '#3a7bd5', color: 'blue' })
    }, star.id)
    await page.waitForTimeout(150)

    // --- 2b. The hand-drawn ("Draw" dash) variant of all three — new, untested-by-eye geometry
    // (`getPolygonDrawPoints`'s generalisation of the rectangle/triangle wobble-outline recipe to
    // an arbitrary vertex count). A jest test can confirm a `<path>` gets emitted; only a real
    // screenshot can confirm the wobble itself doesn't self-intersect or gap at a vertex the way
    // Phase 8a's rounded-rectangle-as-hexagon bug did. Placed below the solid row so both are
    // visible in the same screenshot.
    await page.evaluate(() => {
      window.app.createShapes(
        { id: 'draw-polygon', type: 'polygon', point: [120, 420], size: [200, 200], sides: 6, style: { color: 'black', size: 'small', dash: 'draw', isFilled: false } },
        { id: 'draw-star', type: 'star', point: [420, 420], size: [200, 200], points: 5, innerRadiusRatio: 0.5, style: { color: 'black', size: 'small', dash: 'draw', isFilled: true, fill: '#f5a623' } },
        { id: 'draw-bubble', type: 'speechBubble', point: [720, 420], size: [300, 200], style: { color: 'black', size: 'small', dash: 'draw', isFilled: false } },
        // A large arbitrary stroke width (T8a.2), same as `styles.js`'s own rounded-rectangle
        // check — the jitter amplitude scales with stroke width, so this is what actually proves
        // the wobble outline doesn't self-intersect or gap at a vertex, not just that a <path>
        // got emitted (the small-stroke-width shapes above wobble by under 2px, imperceptible at
        // this zoom).
        { id: 'draw-polygon-thick', type: 'polygon', point: [120, 650], size: [200, 200], sides: 7, style: { color: 'black', size: 'small', dash: 'draw', strokeWidth: 8, isFilled: false } },
        // Control: the same treatment (unfilled, Draw dash, strokeWidth 8) on a pre-existing
        // shape type. A first draft of this check used strokeWidth 24 and looked alarming — a
        // thick black "ring/gear" rather than a crisp heptagon outline — until this exact same
        // rectangle control produced an identical-looking ring, proving it's how an *unfilled*
        // thick hand-drawn stroke has always rendered in this fork (the pen only ever traces the
        // perimeter; nothing fills the interior), not a self-intersection bug in the new polygon
        // geometry. Dialed back to 8 here so the screenshot stays legible as "a slightly thicker
        // wobble," which is the case this scenario actually needs to cover.
        { id: 'draw-rect-thick', type: 'rectangle', point: [420, 650], size: [200, 200], style: { color: 'black', size: 'small', dash: 'draw', strokeWidth: 8, isFilled: false } }
      )
    })
    await page.waitForTimeout(150)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
    await page.screenshot({ path: require('path').join(__dirname, '..', 'shots', 'newshapes.png') })

    const drawVariantPaths = await page.evaluate(
      () => ({
        polygon: !!document.querySelector('#develop [id="draw-polygon_svg"] path'),
        star: !!document.querySelector('#develop [id="draw-star_svg"] path'),
        bubble: !!document.querySelector('#develop [id="draw-bubble_svg"] path'),
      })
    )

    // --- 3. Renders live: real polygon elements with the right vertex counts ----------------
    // Scoped to `#develop` (the main canvas's own `Renderer` id) throughout: the Deck thumbnail
    // renders these same shape ids in its own tree (it's the current slide's own
    // `ReadOnlyEditor`), the identical collision `background.js`/`inspector.js` already document.
    const live = await page.evaluate(
      ({ polygonId, starId, speechBubbleId }) => {
        const countPoints = (id) => {
          const el = document.querySelector(`#develop [id="${id}_svg"] polygon`)
          return el ? el.getAttribute('points').trim().split(' ').length : null
        }
        const starFill = document
          .querySelector(`#develop [id="${starId}_svg"] polygon[fill]:not([fill="none"])`)
          ?.getAttribute('fill')
        return {
          polygonVertexCount: countPoints(polygonId),
          starVertexCount: countPoints(starId),
          speechBubbleVertexCount: countPoints(speechBubbleId),
          starFill,
        }
      },
      { polygonId: polygon.id, starId: star.id, speechBubbleId: speechBubble.id }
    )

    // --- 4. Renders in the Deck thumbnail (same `ReadOnlyEditor`, same shape ids) ------------
    const inThumbnail = await page.evaluate(
      ({ polygonId, starId, speechBubbleId }) => {
        const thumb = document.querySelector('#TD-DeckPanel [data-page-id]')
        return {
          polygon: !!thumb?.querySelector(`[id="${polygonId}_svg"]`),
          star: !!thumb?.querySelector(`[id="${starId}_svg"]`),
          speechBubble: !!thumb?.querySelector(`[id="${speechBubbleId}_svg"]`),
        }
      },
      { polygonId: polygon.id, starId: star.id, speechBubbleId: speechBubble.id }
    )

    // --- 5. Renders headlessly through renderPageToSvg, custom style included ---------------
    const currentPageId = await page.evaluate(() => window.app.currentPageId)
    const headlessSvg = await page.evaluate(
      (pageId) => window.renderPageToSvg(window.app.document.pages[pageId], {}),
      currentPageId
    )

    // renderPageToSvg emits no per-shape id attribute (see the module's own comment on why —
    // Phase 15/17 precedent), so match by vertex count instead, the same way typography.js
    // matches its own headless assertions structurally rather than by id.
    const vertexCounts = [...headlessSvg.matchAll(/<polygon[^>]*points="([^"]+)"/g)].map(
      (m) => m[1].trim().split(' ').length
    )

    return {
      shapes: {
        polygonSides: polygon.sides,
        starPoints: star.points,
        starInnerRadiusRatio: star.innerRadiusRatio,
        speechBubbleType: speechBubble.type,
      },
      live,
      drawVariantPaths,
      inThumbnail,
      headless: {
        vertexCounts,
        hasHexagon: vertexCounts.includes(6),
        hasTenPointStar: vertexCounts.includes(10),
        hasSevenPointBubble: vertexCounts.includes(7),
        customFillSurvivesExport: headlessSvg.includes('#3a7bd5'),
      },
    }
  },
}
