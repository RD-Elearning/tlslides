/* eslint-disable no-console */
/**
 * Q17 — three-way parity (`reviews/blocks/BACKLOG-demo.md` §7): measures every block's geometry,
 * and every `[data-part]` inside it, on the editor canvas and in `<DeckViewer>`, converts both to
 * slide units (the 1920x1080 reference frame), and diffs them per part.
 *
 * This is the *browser* half of the three-way check. The SVG-export half (`renderPageToSvg`,
 * `ComponentShape`'s headless behaviour, and the canonical `layout()` geometry) runs with no
 * browser at all, in `packages/tldraw/src/blocks/parity-3way.spec.ts` — see that file's own doc
 * comment for why the split, and reviews/blocks/BACKLOG-demo.md §7 (Q17) for the task this
 * satisfies. The two are run separately (`node tools/visual/shoot.js parity-3way` and
 * `npx jest src/blocks/parity-3way`); nothing here imports Jest or vice versa.
 *
 * How each path's screen pixels get converted to slide units, without `window.tlapp` (this demo
 * app's edit route does not expose it — only the separate `/` route's Editor.tsx does; confirmed
 * by grep, not assumed):
 *
 *  - Editor: every page always renders a `.tl-frame-paper` `<rect>` (`Tldraw.tsx` passes
 *    `frame={page.size}` unconditionally) sized to the page in *screen* px — its own
 *    `getBoundingClientRect()` already bakes in the camera's zoom and pan, so
 *    `zoom = paperRect.width / 1920` and `paperRect.{left,top}` is the slide's screen-space
 *    origin. No camera object is read at all; this is a direct measurement of the same transform
 *    the editor already computed, not a guess.
 *  - Viewer: `<DeckViewer>` applies one static `transform: scale(s)` to a `[data-testid=
 *    "deck-viewer-slide"]` div sized to the page — same trick, `scale = slideRect.width / 1920`.
 *
 * Block identity: `<DeckViewer>` stamps `data-block-id` (the stable `BlockSpec.id` from the
 * source JSON) on every block. The editor does not — `ComponentShape.id` is a fresh
 * `Utils.uniqueId()` minted by `blockToShape` (`shape-bridge.ts`), never the spec id, and nothing
 * in `ComponentUtil`/`Container` puts the spec id in the DOM. So blocks are matched by *position*
 * instead: `useShapeTree` (`packages/core/src/hooks/useShapeTree.tsx`) sorts strictly by
 * `childIndex` before rendering, and `compileSlide` assigns `childIndex` in the same
 * deterministic, spec-order-following pass `deckSpecToDocument` uses here (in Node, on the same
 * fixture) to precompute "the Nth shape on this slide is block X" — so the Nth
 * `[data-shape="component"]` container in the live editor DOM is compared against the Nth entry
 * of that precomputed order. This is asserted, not assumed: `run()` checks the container count
 * against the precomputed count for every slide and reports a mismatch rather than silently
 * zipping unequal lists.
 */
const path = require('path')
const { deckSpecToDocument, shapeToBlock, computeBuildSteps } = require('@tlslides/tldraw')

const DECK = require(
  path.join(__dirname, '..', '..', '..', 'packages', 'tldraw', 'src', 'blocks', '__fixtures__', 'demo-deck.json')
)

const FRAME_WIDTH = 1920
const TOLERANCE = 1 // slide unit, per BACKLOG-demo.md §7 acceptance

/**
 * How many *manual* (`onClick`-triggered) `ArrowRight` presses `<DeckViewer>` needs, per slide,
 * to go from build step 0 to fully revealed. Computed with the same `computeBuildSteps` the
 * viewer itself calls (Node-side, on our own `deckSpecToDocument` compile — deterministic, so the
 * step/auto pattern is identical to the viewer's own compile even though shape ids differ).
 *
 * This matters because `page.emulateMedia({ reducedMotion: 'reduce' })` makes every *auto*
 * step's delay 0ms — this demo fixture's `withPrevious`/`afterPrevious`-triggered steps complete
 * on their own, near-instantly, the moment a slide is reached, with no keypress at all. Only
 * `onClick` steps (verified against `demo-deck.json`: sl_03 has 3, sl_04 has 3, everything else
 * has 0) need one. An earlier version of this scenario pressed `ArrowRight` until the slide id
 * changed and then retreated once to compensate — that overshoot/retreat approach reliably
 * landed one slide short, because retreating while the just-arrived slide's own leading auto
 * steps had *already* self-completed (a race, not a bug in the viewer) just walks that slide's
 * own build step backward, not back across the slide boundary. Precomputing the exact manual
 * count sidesteps the race entirely: pressing exactly that many times, with a settle wait after
 * each, never overshoots and never needs correcting.
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

/** Precompute, per slide, the childIndex-ascending list of `{ blockId, componentId }` — the
 *  ground truth the editor's position-only DOM has to be matched back against. Pure Node, no
 *  browser: `deckSpecToDocument` is the same function every path (editor doc, viewer, export)
 *  compiles through. */
function groundTruthOrder(spec) {
  const { document } = deckSpecToDocument(spec)
  const order = {}
  for (const slide of spec.slides) {
    const page = document.pages[slide.id]
    const shapes = Object.values(page.shapes).sort(
      (a, b) => (a.childIndex || 0) - (b.childIndex || 0)
    )
    order[slide.id] = shapes.map((s) => {
      const block = shapeToBlock(s)
      return { blockId: block ? block.id : undefined, componentId: s.componentId }
    })
  }
  return order
}

const SLIDE_IDS = DECK.slides.map((s) => s.id)
const GROUND_TRUTH = groundTruthOrder(DECK)
const MANUAL_STEPS = manualStepCounts(DECK)

/* ── measurement (in-page) helpers ──────────────────────────────────────────────────────── */

async function measureEditorSlide(page) {
  return page.evaluate(
    ({ frameWidth }) => {
      // `id="canvas"` is not unique in this app: the slide-sorter sidebar mounts one
      // miniature `<Canvas>` per slide, each reusing the same `id="canvas"` (an existing,
      // pre-Q17 HTML-validity bug in the app, not introduced here). `document.
      // getElementById` returns the first one in tree order, which is the main editing
      // canvas (verified: its shape count matches the current slide's block count, while
      // every duplicate is a 160x90 thumbnail). Scoping every query to it, rather than a
      // bare `#canvas ...` `querySelectorAll`, is what keeps this from silently summing
      // shapes across all 6 thumbnails plus the real canvas.
      const canvas = document.getElementById('canvas')
      if (!canvas) return { error: 'no #canvas found' }
      const paper = canvas.querySelector('svg.tl-frame rect.tl-frame-paper')
      if (!paper) return { error: 'no .tl-frame-paper found (no window.tlapp on this route either — see scenario doc comment)' }
      const paperRect = paper.getBoundingClientRect()
      const zoom = paperRect.width / frameWidth
      const toSlideUnits = (r) => ({
        x: Math.round(((r.left - paperRect.left) / zoom) * 10) / 10,
        y: Math.round(((r.top - paperRect.top) / zoom) * 10) / 10,
        width: Math.round((r.width / zoom) * 10) / 10,
        height: Math.round((r.height / zoom) * 10) / 10,
      })
      const containers = Array.from(canvas.querySelectorAll('[data-shape="component"]'))
      return {
        zoom,
        blocks: containers.map((c) => {
          // The `[data-shape="component"]` `Container` div (`Shape.tsx`) is NOT the shape's own
          // box — `usePosition` (packages/core/src/hooks/usePosition.ts) inflates it by
          // `--tl-padding` (64px, a fixed resize-handle/selection margin: `calc(64px * max(1,
          // var(--tl-scale)))`) on every side, and offsets its position by the same amount. The
          // un-padded content box is `.tl-inner-div` (`HTMLContainer.tsx`, `width/height: 100%`
          // of the padded parent's *content* box), one level in. Measuring the outer container
          // directly at zoom ~0.5 first looked like a uniform ~128-unit block-placement bug on
          // every single block, every slide — it was this padding, not a real one; see this
          // scenario's own report for the numbers before/after.
          const inner = c.querySelector('.tl-inner-div') || c
          return {
            box: toSlideUnits(inner.getBoundingClientRect()),
            parts: Array.from(c.querySelectorAll('[data-part]')).map((el) => ({
              part: el.getAttribute('data-part'),
              box: toSlideUnits(el.getBoundingClientRect()),
            })),
          }
        }),
      }
    },
    { frameWidth: FRAME_WIDTH }
  )
}

async function measureViewerSlide(page) {
  return page.evaluate(
    ({ frameWidth }) => {
      const slideEl = document.querySelector('[data-testid="deck-viewer-slide"]')
      if (!slideEl) return { error: 'no [data-testid="deck-viewer-slide"] found' }
      const slideRect = slideEl.getBoundingClientRect()
      const scale = slideRect.width / frameWidth
      const toSlideUnits = (r) => ({
        x: Math.round(((r.left - slideRect.left) / scale) * 10) / 10,
        y: Math.round(((r.top - slideRect.top) / scale) * 10) / 10,
        width: Math.round((r.width / scale) * 10) / 10,
        height: Math.round((r.height / scale) * 10) / 10,
      })
      const blocks = Array.from(slideEl.querySelectorAll('[data-block-id]'))
      return {
        slideId: slideEl.getAttribute('data-slide-id'),
        scale,
        blocks: blocks.map((b) => ({
          blockId: b.getAttribute('data-block-id'),
          box: toSlideUnits(b.getBoundingClientRect()),
          parts: Array.from(b.querySelectorAll('[data-part]')).map((el) => ({
            part: el.getAttribute('data-part'),
            box: toSlideUnits(el.getBoundingClientRect()),
          })),
        })),
      }
    },
    { frameWidth: FRAME_WIDTH }
  )
}

/* ── navigation ──────────────────────────────────────────────────────────────────────────── */

async function editorGotoSlide(page, slideTitle) {
  await page.click('#TD-Page')
  await page.waitForSelector('[role="menuitemradio"]', { timeout: 5000 })
  await page.click(`[title="${slideTitle}"]`)
  await page.waitForTimeout(200)
  // Deselect so no selection outline/indicator is present, matching blocks.js's convention.
  await page.keyboard.press('Escape')
  await page.mouse.move(20, 20)
  await page.waitForTimeout(150)
}

const getViewerSlideId = (page) =>
  page.evaluate(
    () => document.querySelector('[data-testid="deck-viewer-slide"]')?.getAttribute('data-slide-id') || null
  )

/**
 * Advance the (uncontrolled) `<DeckViewer>` by exactly one slide, then wait out that slide's own
 * manually-triggered (`onClick`) steps — see `manualStepCounts`'s doc comment for why this is a
 * precomputed count instead of "press until something changes." A motion-hidden part's box is
 * offset from rest (`hiddenState` in motion-helpers.ts uses `translate`, never `display:none`),
 * so measuring before every step is revealed would report bogus deltas that are really just
 * "hasn't animated in yet," not a layout disagreement.
 */
async function viewerAdvanceOneSlideFullyRevealed(page, targetSlideId) {
  await page.keyboard.press('ArrowRight') // leaves the previous slide, arrives at targetSlideId step 0
  await page.waitForTimeout(150) // let targetSlideId's own leading auto (withPrevious/afterPrevious) steps fire
  const manual = MANUAL_STEPS[targetSlideId] || 0
  for (let i = 0; i < manual; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(150)
  }
  await page.waitForTimeout(150) // trailing auto steps after the last manual one
}

/* ── comparison ──────────────────────────────────────────────────────────────────────────── */

function within(a, b) {
  return Math.abs(a - b) <= TOLERANCE
}

function boxDelta(a, b) {
  return {
    x: Math.round((a.x - b.x) * 10) / 10,
    y: Math.round((a.y - b.y) * 10) / 10,
    width: Math.round((a.width - b.width) * 10) / 10,
    height: Math.round((a.height - b.height) * 10) / 10,
  }
}

function boxWithinTolerance(a, b) {
  return within(a.x, b.x) && within(a.y, b.y) && within(a.width, b.width) && within(a.height, b.height)
}

/** Compare editor vs viewer for one slide, using the precomputed `groundTruth` order to give the
 *  editor's position-only blocks a stable id to compare against the viewer's `data-block-id`. */
function compareSlide(slideId, groundTruth, editorData, viewerData) {
  const rows = []
  const notCompared = []

  if (editorData.error) {
    notCompared.push({ slideId, reason: `editor: ${editorData.error}` })
    return { rows, notCompared }
  }
  if (viewerData.error) {
    notCompared.push({ slideId, reason: `viewer: ${viewerData.error}` })
    return { rows, notCompared }
  }

  if (editorData.blocks.length !== groundTruth.length) {
    notCompared.push({
      slideId,
      reason: `editor block count ${editorData.blocks.length} != ground-truth count ${groundTruth.length} — positional match abandoned for this slide`,
    })
    return { rows, notCompared }
  }

  // viewerData.blocks keyed by the stable blockId every path agrees on.
  const viewerByBlockId = new Map(viewerData.blocks.map((b) => [b.blockId, b]))

  groundTruth.forEach((gt, i) => {
    const editorBlock = editorData.blocks[i]
    const viewerBlock = viewerByBlockId.get(gt.blockId)
    if (!viewerBlock) {
      notCompared.push({ slideId, blockId: gt.blockId, reason: 'not present in viewer DOM (data-block-id not found)' })
      return
    }

    rows.push({
      slideId,
      blockId: gt.blockId,
      part: '(block)',
      editor: editorBlock.box,
      viewer: viewerBlock.box,
      delta: boxDelta(editorBlock.box, viewerBlock.box),
      pass: boxWithinTolerance(editorBlock.box, viewerBlock.box),
    })

    const editorParts = new Map(editorBlock.parts.map((p) => [p.part, p.box]))
    const viewerParts = new Map(viewerBlock.parts.map((p) => [p.part, p.box]))
    const allPartNames = new Set([...editorParts.keys(), ...viewerParts.keys()])

    for (const part of allPartNames) {
      const eBox = editorParts.get(part)
      const vBox = viewerParts.get(part)
      if (!eBox || !vBox) {
        notCompared.push({
          slideId,
          blockId: gt.blockId,
          part,
          reason: !eBox ? 'part missing in editor DOM' : 'part missing in viewer DOM',
        })
        continue
      }
      rows.push({
        slideId,
        blockId: gt.blockId,
        part,
        editor: eBox,
        viewer: vBox,
        delta: boxDelta(eBox, vBox),
        pass: boxWithinTolerance(eBox, vBox),
      })
    }
  })

  return { rows, notCompared }
}

/* ── scenario ────────────────────────────────────────────────────────────────────────────── */

module.exports = {
  base: 'http://localhost:5433',
  route: '/edit/deck-demo-q3',
  // React 19 + Radix's `asChild` (`@radix-ui/react-slot@0.1.2`, pinned by packages/tldraw) reads
  // `element.ref`, which React 19 warns about on every render. Pre-existing, not Q17's — see
  // tools/visual/scenarios/nextjs.js and blocks.js, which tolerate the exact same warning.
  known: [/Accessing element\.ref was removed in React 19/],
  async run(page) {
    const editorBySlide = {}
    const viewerBySlide = {}

    /* ---- Path 1: editor canvas ------------------------------------------------------- */
    for (let i = 0; i < SLIDE_IDS.length; i++) {
      const slideId = SLIDE_IDS[i]
      await editorGotoSlide(page, `Slide ${i + 1}`)
      editorBySlide[slideId] = await measureEditorSlide(page)
    }

    /* ---- Path 2: <DeckViewer> ---------------------------------------------------------- */
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(this.base + '/view/deck-demo-q3', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForSelector('[data-testid="deck-viewer"]', { timeout: 20000 })
    await page.waitForTimeout(300)

    for (let i = 0; i < SLIDE_IDS.length; i++) {
      const slideId = SLIDE_IDS[i]
      if (i === 0) {
        // Already mounted on slide 0 at build step 0 — nothing to press, just wait out its own
        // manual/auto steps (same logic `viewerAdvanceOneSlideFullyRevealed` uses after a press).
        const manual = MANUAL_STEPS[slideId] || 0
        await page.waitForTimeout(150)
        for (let m = 0; m < manual; m++) {
          await page.keyboard.press('ArrowRight')
          await page.waitForTimeout(150)
        }
        await page.waitForTimeout(150)
      } else {
        await viewerAdvanceOneSlideFullyRevealed(page, slideId)
      }
      const reached = await getViewerSlideId(page)
      if (reached !== slideId) {
        viewerBySlide[slideId] = { error: `could not navigate viewer to ${slideId} (landed on ${reached})` }
        continue
      }
      viewerBySlide[slideId] = await measureViewerSlide(page)
    }

    /* ---- Compare -------------------------------------------------------------------- */
    const allRows = []
    const allNotCompared = []
    let partsSeen = 0

    for (const slideId of SLIDE_IDS) {
      const gt = GROUND_TRUTH[slideId]
      const { rows, notCompared } = compareSlide(slideId, gt, editorBySlide[slideId], viewerBySlide[slideId])
      allRows.push(...rows)
      allNotCompared.push(...notCompared)
      partsSeen += rows.length
    }

    const failing = allRows.filter((r) => !r.pass)
    const worst = [...allRows].sort((a, b) => {
      const da = Math.max(Math.abs(a.delta.x), Math.abs(a.delta.y), Math.abs(a.delta.width), Math.abs(a.delta.height))
      const db = Math.max(Math.abs(b.delta.x), Math.abs(b.delta.y), Math.abs(b.delta.width), Math.abs(b.delta.height))
      return db - da
    })

    return {
      slideCount: SLIDE_IDS.length,
      groundTruthBlockCounts: Object.fromEntries(SLIDE_IDS.map((id) => [id, GROUND_TRUTH[id].length])),
      comparedRows: allRows.length,
      comparedRowsNonZero: allRows.length > 0,
      failingRows: failing.length,
      notComparedCount: allNotCompared.length,
      notCompared: allNotCompared,
      worst20: worst.slice(0, 20),
      verdict: failing.length === 0 && allRows.length > 0 ? 'PASS (editor <-> viewer, within 1 unit)' : 'MISMATCH — see worst20 / failingRows',
    }
  },
}
