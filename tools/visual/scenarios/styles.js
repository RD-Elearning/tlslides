/* eslint-disable no-console */
/**
 * Phase 8a — style expressiveness (opacity, arbitrary stroke width, corner radius). Creates six
 * rectangles directly via `window.app.createShapes` (there is no UI panel for these fields yet —
 * that's Phase 8b/8c — so the only way to set them today is the imperative API, same as
 * frame.js/reorder.js use `window.app` for things the UI doesn't expose either):
 *
 *  - `draw-rounded` / `solid-rounded-thick` / `dashed-rounded`: a large `cornerRadius` on each of
 *    the three dash styles. Draw exercises rectangleHelpers.ts's hand-drawn corner path; Solid and
 *    Dashed both exercise DashedRectangle.tsx's rounded-<rect> path (Dashed is the case where the
 *    dash pattern goes around a rounded corner instead of a plain 4-line perimeter).
 *  - `solid-rounded-thick` / `thick-stroke-solid`: a stroke width far outside the small/medium/large
 *    enum (T8a.2).
 *  - `opacity-back` / `opacity-front-draw`: two overlapping filled rectangles — one fully opaque,
 *    one Draw-dash and 35% opaque — so translucency is visible as a color blend where they overlap,
 *    on a Draw-dash shape specifically (the shape type whose opacity fix required moving the
 *    opacity attribute from <SVGContainer> onto an inner <g>, per the comment in RectangleUtil.tsx).
 *
 * Uses the /develop route for `window.app` (see frame.js).
 */
module.exports = {
  route: '/#/develop',
  async run(page) {
    await page.evaluate(() => {
      window.app.createShapes(
        {
          id: 'draw-rounded',
          type: 'rectangle',
          point: [80, 100],
          size: [440, 280],
          childIndex: 1,
          style: { color: 'blue', size: 'small', dash: 'draw', isFilled: true, cornerRadius: 120 },
        },
        {
          id: 'solid-rounded-thick',
          type: 'rectangle',
          point: [600, 100],
          size: [440, 280],
          childIndex: 2,
          style: {
            color: 'orange',
            size: 'small',
            dash: 'solid',
            isFilled: false,
            cornerRadius: 120,
            strokeWidth: 20,
          },
        },
        {
          id: 'dashed-rounded',
          type: 'rectangle',
          point: [1120, 100],
          size: [440, 280],
          childIndex: 3,
          style: {
            color: 'black',
            size: 'small',
            dash: 'dashed',
            isFilled: false,
            cornerRadius: 100,
            strokeWidth: 10,
          },
        },
        {
          id: 'thick-stroke-solid',
          type: 'rectangle',
          point: [80, 460],
          size: [440, 280],
          childIndex: 4,
          style: { color: 'red', size: 'small', dash: 'solid', isFilled: false, strokeWidth: 32 },
        },
        {
          id: 'opacity-back',
          type: 'rectangle',
          point: [600, 460],
          size: [380, 360],
          childIndex: 5,
          style: { color: 'green', size: 'small', dash: 'solid', isFilled: true, opacity: 1 },
        },
        {
          id: 'opacity-front-draw',
          type: 'rectangle',
          point: [820, 540],
          size: [380, 360],
          childIndex: 6,
          style: { color: 'violet', size: 'small', dash: 'draw', isFilled: true, opacity: 0.35 },
        }
      )
    })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(600)

    // Round-trip check: the fields persist on the document exactly as given (no migration, no
    // silent coercion).
    const persistedStyles = await page.evaluate(() => {
      const pageId = window.app.currentPageId
      const shapes = window.app.document.pages[pageId].shapes
      return [
        'draw-rounded',
        'solid-rounded-thick',
        'dashed-rounded',
        'thick-stroke-solid',
        'opacity-back',
        'opacity-front-draw',
      ].map((id) => ({ id, style: shapes[id]?.style }))
    })

    // Render checks: read the actual SVG attributes the renderer produced, not just the document
    // data, so a bug that stores the field but fails to draw it would still show up here.
    const rendered = await page.evaluate(() => {
      const rx = (id) => document.querySelector(`#${CSS.escape(id + '_svg')} rect`)?.getAttribute('rx')
      const groupOpacity = (id) =>
        document.querySelector(`#${CSS.escape(id + '_svg')} > g`)?.getAttribute('opacity')
      const strokeGroupWidth = (id) =>
        document.querySelector(`#${CSS.escape(id + '_svg')} g[stroke-width]`)?.getAttribute('stroke-width')
      return {
        solidRoundedRx: rx('solid-rounded-thick'),
        dashedRoundedRx: rx('dashed-rounded'),
        thickStrokeWidth: strokeGroupWidth('thick-stroke-solid'),
        opacityBackGroupOpacity: groupOpacity('opacity-back'),
        opacityFrontGroupOpacity: groupOpacity('opacity-front-draw'),
      }
    })

    return {
      shapeCount: await page.evaluate(
        () => Object.keys(window.app.document.pages[window.app.currentPageId].shapes).length
      ),
      persistedStyles,
      rendered,
    }
  },
}
