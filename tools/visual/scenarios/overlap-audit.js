/* eslint-disable no-console */
/**
 * THROWAWAY diagnostic scenario — NOT a regression gate, NOT committed evidence.
 *
 * For every slide of the demo deck (`deck-demo-q3`), collects two independent measurements
 * and cross-checks them:
 *
 *  1. "design-space" rects — the ComponentShape geometry the compiler assigned, read straight
 *     off `window.tlapp.document.pages[<slideId>].shapes` on the real editor route
 *     (`/edit/deck-demo-q3`). Units are slide units (1920x1080 frame).
 *
 *  2. "render-space" rects — what actually landed on screen: every block root's
 *     `getBoundingClientRect()` on the read-only viewer route (`/view/deck-demo-q3`), which is
 *     the same route/component `deck-demo.js` audits. Units are viewport pixels (post
 *     scale-to-fit transform), captured at the slide's FINAL build step so every block that will
 *     ever appear on the slide is visible at once.
 *
 * Reports, per slide:
 *   - every shape's id/componentId/x/y/width/height (design-space)
 *   - every block root's getBoundingClientRect() (render-space)
 *   - pairwise rect intersections in EACH space, with overlap area
 *   - text overflow: elements where scrollWidth > clientWidth or scrollHeight > clientHeight
 *
 * Screenshots go to tools/visual/shots/overlap-audit-<slideId>.png (one per slide, final build
 * step). shoot.js additionally takes tools/visual/shots/overlap-audit.png (last state).
 *
 * Run:  node tools/visual/shoot.js overlap-audit
 * Requires:  cd examples/nextjs-sample && npx next dev -p 5433
 */
const path = require('path')
const { deckSpecToDocument, computeBuildSteps } = require('@tlslides/tldraw')

const DECK = require(
  path.join(__dirname, '..', '..', '..', 'packages', 'tldraw', 'src', 'blocks', '__fixtures__', 'demo-deck.json')
)
const DECK_ID = DECK.id
const SLIDE_IDS = DECK.slides.map((s) => s.id)
const SHOTS_DIR = path.join(__dirname, '..', 'shots')

function manualStepCounts(spec) {
  const { document } = deckSpecToDocument(spec)
  const counts = {}
  for (const slide of spec.slides) {
    const page = document.pages[slide.id]
    const steps = computeBuildSteps(page)
    counts[slide.id] = steps.filter((s) => !s.auto).length
  }
  return counts
}
const MANUAL_STEPS = manualStepCounts(DECK)

/** Rectangle intersection area, or 0 if disjoint (uses left/top/right/bottom form). */
function overlapArea(a, b) {
  const left = Math.max(a.left, b.left)
  const right = Math.min(a.right, b.right)
  const top = Math.max(a.top, b.top)
  const bottom = Math.min(a.bottom, b.bottom)
  if (right <= left || bottom <= top) return 0
  return (right - left) * (bottom - top)
}

function pairwiseOverlaps(items, tolerance) {
  const out = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      const area = overlapArea(
        { left: a.left + tolerance, top: a.top + tolerance, right: a.right - tolerance, bottom: a.bottom - tolerance },
        { left: b.left + tolerance, top: b.top + tolerance, right: b.right - tolerance, bottom: b.bottom - tolerance }
      )
      if (area > 0) {
        out.push({
          a: a.label, b: b.label, area: Math.round(area),
          aBox: { left: Math.round(a.left), top: Math.round(a.top), right: Math.round(a.right), bottom: Math.round(a.bottom) },
          bBox: { left: Math.round(b.left), top: Math.round(b.top), right: Math.round(b.right), bottom: Math.round(b.bottom) },
        })
      }
    }
  }
  return out
}

module.exports = {
  base: 'http://localhost:5433',
  known: [/Accessing element\.ref was removed in React 19/],
  route: `/view/${DECK_ID}`,
  waitFor: '[data-testid="deck-viewer"]',

  async run(page) {
    /* ---- Pass 1: design-space shape geometry, off the real editor's window.tlapp ---- */
    await page.goto(`http://localhost:5433/edit/${DECK_ID}`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForFunction(() => !!window.tlapp, { timeout: 20000 })
    await page.waitForTimeout(800) // let the doc + zoomToFit settle

    const designSpace = await page.evaluate(() => {
      const doc = window.tlapp.document
      const out = {}
      for (const [pageId, tdPage] of Object.entries(doc.pages)) {
        const shapes = Object.values(tdPage.shapes)
          .filter((s) => s.type === 'component')
          .map((s) => ({
            id: s.id,
            componentId: s.componentId,
            x: s.point ? s.point[0] : null,
            y: s.point ? s.point[1] : null,
            width: s.size ? s.size[0] : null,
            height: s.size ? s.size[1] : null,
          }))
        out[pageId] = shapes
      }
      return out
    })

    /* ---- Pass 2: render-space rects + overflow, on the read-only viewer ---- */
    await page.goto(`http://localhost:5433/view/${DECK_ID}`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForSelector('[data-testid="deck-viewer"]', { timeout: 20000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(500)

    const results = {}

    for (let slideIdx = 0; slideIdx < SLIDE_IDS.length; slideIdx++) {
      const slideId = SLIDE_IDS[slideIdx]
      const manualSteps = MANUAL_STEPS[slideId] || 0

      for (let step = 0; step < manualSteps; step++) {
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(200)
      }
      await page.waitForTimeout(300)

      // Screenshot this slide at its final build step.
      await page.screenshot({ path: path.join(SHOTS_DIR, `overlap-audit-${slideId}.png`), fullPage: false })

      const renderData = await page.evaluate(() => {
        const viewer = document.querySelector('[data-testid="deck-viewer"]')
        const slideEl = viewer && viewer.querySelector('[data-testid="deck-viewer-slide"]')
        if (!slideEl) return { error: 'no slide container' }

        // Block roots: the wrapper div DeckViewer gives each shape (data-shape-id/data-block-id).
        const blockRoots = Array.from(slideEl.querySelectorAll('[data-shape-id]')).map((el) => {
          const r = el.getBoundingClientRect()
          return {
            shapeId: el.getAttribute('data-shape-id'),
            blockId: el.getAttribute('data-block-id'),
            left: r.left, top: r.top, right: r.right, bottom: r.bottom,
            width: r.width, height: r.height,
          }
        })

        // Leaf text/part elements for a finer-grained overlap + overflow check.
        const parts = Array.from(slideEl.querySelectorAll('[data-part]'))
        const leafParts = parts.filter((el) => !el.querySelector('[data-part]'))

        const overflow = []
        for (const el of leafParts) {
          const dx = el.scrollWidth - el.clientWidth
          const dy = el.scrollHeight - el.clientHeight
          if (dx > 1 || dy > 1) {
            const r = el.getBoundingClientRect()
            overflow.push({
              part: el.getAttribute('data-part'),
              text: (el.textContent || '').trim().slice(0, 80),
              scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, overflowX: dx,
              scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, overflowY: dy,
              rect: { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) },
            })
          }
        }

        return { blockRoots, leafPartCount: leafParts.length, overflow }
      })

      if (renderData.error) {
        results[slideId] = { error: renderData.error }
        if (slideIdx < SLIDE_IDS.length - 1) {
          await page.keyboard.press('ArrowRight')
          await page.waitForTimeout(500)
        }
        continue
      }

      const blockOverlaps = pairwiseOverlaps(
        renderData.blockRoots.map((b) => ({ ...b, label: `${b.blockId || b.shapeId}` })),
        1
      )

      const designShapes = designSpace[slideId] || []
      const designOverlaps = pairwiseOverlaps(
        designShapes.map((s) => ({
          label: `${s.id}(${s.componentId})`,
          left: s.x, top: s.y, right: s.x + s.width, bottom: s.y + s.height,
        })),
        0
      )

      results[slideId] = {
        slideIndex: slideIdx,
        designShapes,
        designOverlaps,
        blockRoots: renderData.blockRoots,
        blockOverlaps,
        overflow: renderData.overflow,
      }

      if (slideIdx < SLIDE_IDS.length - 1) {
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(500)
      }
    }

    const totalBlockOverlaps = Object.values(results).reduce((n, r) => n + (r.blockOverlaps ? r.blockOverlaps.length : 0), 0)
    const totalDesignOverlaps = Object.values(results).reduce((n, r) => n + (r.designOverlaps ? r.designOverlaps.length : 0), 0)
    const totalOverflow = Object.values(results).reduce((n, r) => n + (r.overflow ? r.overflow.length : 0), 0)

    return {
      totalSlides: SLIDE_IDS.length,
      slideResults: results,
      summary: { totalBlockOverlaps, totalDesignOverlaps, totalOverflow },
    }
  },
}
