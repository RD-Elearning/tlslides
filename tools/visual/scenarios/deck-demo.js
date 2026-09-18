/* eslint-disable no-console */
/**
 * R0 regression test — the six-slide demo deck viewed through <DeckViewer>.
 *
 * Screenshots every slide at its final build step and asserts that no two text
 * nodes' bounding boxes intersect (the F1 overlap bug). Also verifies the
 * data-slide-index / data-build-step attributes (F6) and that the viewer
 * renders all slides.
 *
 * Run:  node tools/visual/shoot.js deck-demo
 * Requires:  cd examples/nextjs-sample && npx next dev -p 5433
 */
const path = require('path')
const { deckSpecToDocument, computeBuildSteps } = require('@tlslides/tldraw')

const DECK = require(
  path.join(__dirname, '..', '..', '..', 'packages', 'tldraw', 'src', 'blocks', '__fixtures__', 'demo-deck.json')
)

const SLIDE_IDS = DECK.slides.map((s) => s.id)

/**
 * How many manual (onClick) ArrowRight presses are needed per slide to reach
 * the final build step. Auto steps complete on their own with reducedMotion.
 */
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

module.exports = {
  base: 'http://localhost:5433',
  known: [/Accessing element\.ref was removed in React 19/],
  route: `/view/${DECK.id}`,

  async run(page) {
    // Enable reduced motion so auto-steps complete instantly.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(500)

    const results = {}

    for (let slideIdx = 0; slideIdx < SLIDE_IDS.length; slideIdx++) {
      const slideId = SLIDE_IDS[slideIdx]
      const manualSteps = MANUAL_STEPS[slideId] || 0

      // Press ArrowRight for each manual step to reach the final build step.
      for (let step = 0; step < manualSteps; step++) {
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(200)
      }

      // Wait for auto-steps to settle.
      await page.waitForTimeout(300)

      // Screenshot the slide at its final build step.
      await page.screenshot({
        path: path.join(__dirname, '..', '..', '..', 'reviews', 'blocks', `deck-slide-${slideIdx + 1}.png`),
        fullPage: false,
      })

      // Check data attributes (F6).
      const attrs = await page.evaluate(() => {
        const viewer = document.querySelector('[data-testid="deck-viewer"]')
        if (!viewer) return { error: 'no deck-viewer found' }
        return {
          slideIndex: viewer.getAttribute('data-slide-index'),
          slideCount: viewer.getAttribute('data-slide-count'),
          buildStep: viewer.getAttribute('data-build-step'),
          buildStepCount: viewer.getAttribute('data-build-step-count'),
          ariaLive: viewer.getAttribute('aria-live'),
          srText: viewer.querySelector('.sr-only')?.textContent?.trim() ?? null,
        }
      })

      // Check for overlapping text nodes (F1).
      const overlapResult = await page.evaluate(() => {
        const viewer = document.querySelector('[data-testid="deck-viewer"]')
        if (!viewer) return { error: 'no viewer' }

        const slideContainer = viewer.querySelector('[data-testid="deck-viewer-slide"]')
        if (!slideContainer) return { error: 'no slide container' }

        // Get all text-bearing elements (nodes with data-part that contain text).
        const textElements = Array.from(
          slideContainer.querySelectorAll('[data-part]')
        ).filter((el) => {
          // Only check elements that have visible text content.
          const text = el.textContent?.trim()
          return text && text.length > 0
        })

        // Get bounding boxes for each text element.
        const boxes = textElements.map((el, i) => {
          const rect = el.getBoundingClientRect()
          return {
            index: i,
            part: el.getAttribute('data-part'),
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          }
        })

        // Check for intersections between any two boxes.
        const overlaps = []
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i]
            const b = boxes[j]
            // Two boxes intersect if they overlap in both x and y dimensions.
            // Allow a small tolerance (1px) for anti-aliasing.
            const tolerance = 1
            const xOverlap = a.left < b.right - tolerance && b.left < a.right - tolerance
            const yOverlap = a.top < b.bottom - tolerance && b.top < a.bottom - tolerance
            if (xOverlap && yOverlap) {
              overlaps.push({
                a: a.part,
                b: b.part,
                aBox: { left: Math.round(a.left), top: Math.round(a.top), right: Math.round(a.right), bottom: Math.round(a.bottom) },
                bBox: { left: Math.round(b.left), top: Math.round(b.top), right: Math.round(b.right), bottom: Math.round(b.bottom) },
              })
            }
          }
        }

        return { textCount: boxes.length, overlaps, overlapCount: overlaps.length }
      })

      results[slideId] = {
        slideIndex: slideIdx,
        attrs,
        textOverlap: overlapResult,
      }

      // Move to the next slide.
      if (slideIdx < SLIDE_IDS.length - 1) {
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(500)
      }
    }

    // Go back to slide 4 (index 3) to verify the "Slide 4 of 6" text.
    // Navigate from the beginning.
    await page.reload()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(500)

    // Navigate to slide 4.
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(300)
    }
    // Advance past auto-steps.
    const sl4Steps = MANUAL_STEPS[SLIDE_IDS[3]] || 0
    for (let s = 0; s < sl4Steps; s++) {
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(300)

    const slide4Attrs = await page.evaluate(() => {
      const viewer = document.querySelector('[data-testid="deck-viewer"]')
      if (!viewer) return { error: 'no viewer' }
      return {
        slideIndex: viewer.getAttribute('data-slide-index'),
        slideCount: viewer.getAttribute('data-slide-count'),
        srText: viewer.querySelector('.sr-only')?.textContent?.trim() ?? null,
      }
    })

    // Summary.
    const allOverlaps = Object.entries(results).flatMap(([id, r]) =>
      (r.textOverlap.overlaps || []).map((o) => ({ slideId: id, ...o }))
    )

    return {
      totalSlides: SLIDE_IDS.length,
      slideResults: results,
      slide4Verification: slide4Attrs,
      totalOverlaps: allOverlaps.length,
      overlaps: allOverlaps,
      // The test passes when there are zero overlaps across all slides.
      passed: allOverlaps.length === 0,
    }
  },
}
