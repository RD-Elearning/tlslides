/* eslint-disable no-console */
/**
 * Block review — per-block UI + motion check for one category (or an explicit list of types).
 * Plan and checklist: reviews/blocks/block-review/README.md.
 *
 * For every block it runs four passes and writes PNGs to tools/visual/shots/review/<category>/:
 *
 *   1. gallery  — opens the BlockInserter on the category tab and shoots the block's card
 *                 (`<type>.card.png`): the live preview sample the user drags from.
 *   2. drop     — on a blank editor slide, drags the card onto the canvas with real HTML5 DnD
 *                 selects the new shape (`<type>.drop.png`, inspector open), then deselects
 *                 (`<type>.drop-canvas.png`), and reports its page box.
 *   3. viewer   — a generated deck (two slides per block: "wide" = title + full-width region with
 *                 motionStyle expressive, "narrow" = left half of two-column with motionStyle
 *                 subtle) is PUT to the mock API and played in /view: mid-animation frames at
 *                 MID ms (`<type>.<variant>.mid-<ms>.png`) and the settled slide
 *                 (`<type>.<variant>.png`). Reports parts stuck below full opacity, elements that
 *                 escape the slide, and text boxes whose content overflows them.
 *   4. present  — the same generated deck in the editor's Present mode (`<type>.present.png`).
 *   5. motion   — (not in the default passes) frame-by-frame motion probe in /view
 *                 (reviews/blocks/block-review/MOTION.md §1, J1–J8). A separate deck
 *                 (`review-motion-<category>`) holds a blank lead slide, then one slide per block
 *                 per style in REVIEW_MOTION_STYLES (default `expressive`; any of
 *                 static,subtle,expressive,reduced — `reduced` is expressive with
 *                 prefers-reduced-motion emulated). Element blocks sit second on the slide, after a
 *                 title, which is also the S8 case. The probe (motion-probe.js) samples every
 *                 `[data-part]`, block wrapper and driver-touched element on every animation frame
 *                 from the ArrowRight that opens the slide until the chain is done + 300 ms, then
 *                 writes `motion.<style>` verdicts per block into report.json and prints one line
 *                 per block. REVIEW_MOTION_PNG=1 adds three mid PNGs (150/400/800 ms), which costs
 *                 frame timing; put `static` first in the styles so J3 compares each block's
 *                 end frame with its static render (authored opacities), else J3 expects opacity
 *                 1 / no transform / no clip; REVIEW_MOTION_DUMP=1 writes the raw samples. The motion pass alone keeps the other passes' data in an existing
 *                 report.json.
 *                 REVIEW_PASSES=motion REVIEW_CATEGORY=chart node tools/visual/shoot.js block-review
 *
 * Plus the compiler findings for each slide (region/overflow etc.), straight from
 * `deckSpecToDocument` in node.
 *
 * Run (needs `next dev -p 5433` in examples/nextjs-sample and a rebuilt packages/tldraw/dist):
 *   REVIEW_CATEGORY=process node tools/visual/shoot.js block-review --width=1600 --height=900
 *   REVIEW_BLOCKS=tls.g.cycle,tls.g.flow node tools/visual/shoot.js block-review ...
 *   REVIEW_PASSES=gallery,drop  (default: gallery,drop,viewer,present)
 *   REVIEW_THEME=midnight       (default: coral-pop)
 * Mid-animation frames default to 60,200,500,1000 ms (subtle entrances are over by ~350 ms).
 * A machine-readable report lands next to the PNGs as report.json.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..', '..')
const tl = require(path.join(ROOT, 'examples', 'nextjs-sample', 'node_modules', '@tlslides', 'tldraw'))

const ALL = Array.isArray(tl.BUILT_IN_BLOCKS) ? tl.BUILT_IN_BLOCKS : Object.values(tl.BUILT_IN_BLOCKS)
const CATEGORY = process.env.REVIEW_CATEGORY || ''
const ONLY = process.env.REVIEW_BLOCKS ? process.env.REVIEW_BLOCKS.split(',') : null
const PASSES = (process.env.REVIEW_PASSES || 'gallery,drop,viewer,present').split(',')
const THEME = process.env.REVIEW_THEME || 'coral-pop'
const MID = (process.env.REVIEW_MID || '60,200,500,1000').split(',').map(Number)
const SETTLE = Number(process.env.REVIEW_SETTLE || 3500)
const MOTION_STYLES = (process.env.REVIEW_MOTION_STYLES || 'expressive').split(',').filter(Boolean)
const MOTION_PNG = process.env.REVIEW_MOTION_PNG === '1'
const probe = require('./motion-probe')

const BLOCKS = ALL.filter((b) => (ONLY ? ONLY.includes(b.type) : b.category === CATEGORY))
if (!BLOCKS.length) throw new Error(`block-review: no blocks for REVIEW_CATEGORY=${CATEGORY} REVIEW_BLOCKS=${ONLY}`)
const TAG = CATEGORY || 'custom'
const DECK_ID = `review-${TAG}`.replace(/[^a-z0-9-]/g, '-')
const BLANK_ID = 'review-blank'
const OUT = path.join(__dirname, '..', 'shots', 'review', TAG)
const slug = (t) => t.replace(/^tls\./, '').replace(/\./g, '-')

/** The block's own example props (what the AI is shown), else its defaults. */
function sampleProps(def) {
  return JSON.parse(JSON.stringify(def.describe?.example?.props ?? def.defaults ?? {}))
}

function buildDeck() {
  const slides = []
  for (const def of BLOCKS) {
    const s = slug(def.type)
    const block = (v) => ({ id: `b_${s}_${v}`, type: def.type, props: sampleProps(def) })
    const title = (v) => ({ id: `t_${s}_${v}`, type: 'tls.t.title', props: { text: `${def.name} — ${v}` } })
    if (def.scope === 'slide') {
      slides.push({ id: `${s}-wide`, layout: 'blank', motionStyle: 'expressive', regions: { content: [block('wide')] } })
      slides.push({ id: `${s}-narrow`, layout: 'blank', motionStyle: 'subtle', regions: { content: [block('narrow')] } })
    } else {
      slides.push({
        id: `${s}-wide`, layout: 'timeline', motionStyle: 'expressive',
        regions: { title: [title('wide')], timeline: [block('wide')] },
      })
      slides.push({
        id: `${s}-narrow`, layout: 'two-column', motionStyle: 'subtle',
        regions: { title: [title('narrow')], left: [block('narrow')], right: [] },
      })
    }
  }
  return { version: 1, id: DECK_ID, title: `Block review — ${TAG}`, theme: THEME, aspect: '16:9', slides }
}

/** The motion-pass deck: a blank lead slide, then one slide per block per style. */
function buildMotionDeck() {
  const slides = [{ id: 'm-lead', layout: 'blank', motionStyle: 'static', regions: { content: [] } }]
  const plan = []
  for (const style of MOTION_STYLES) {
    for (const def of BLOCKS) {
      const s = slug(def.type)
      const ms = style === 'reduced' ? 'expressive' : style
      const id = `m-${s}-${style}`
      const blockId = `b_${s}_m${style}`
      const block = { id: blockId, type: def.type, props: sampleProps(def) }
      if (def.scope === 'slide') {
        slides.push({ id, layout: 'blank', motionStyle: ms, regions: { content: [block] } })
      } else {
        slides.push({
          id, layout: 'timeline', motionStyle: ms,
          regions: { title: [{ id: `t_${s}_m${style}`, type: 'tls.t.title', props: { text: `${def.name} — ${style}` } }], timeline: [block] },
        })
      }
      plan.push({ def, style, slideId: id, blockId, index: slides.length - 1 })
    }
  }
  return { deck: { version: 1, id: `${DECK_ID}-motion`, title: `Motion review — ${TAG}`, theme: THEME, aspect: '16:9', slides }, plan }
}

const BLANK = {
  version: 1, id: BLANK_ID, title: 'Blank', theme: THEME, aspect: '16:9',
  slides: [{ id: 'blank-1', layout: 'blank', regions: { content: [] } }],
}

async function put(page, base, id, spec) {
  // Right after a dev-server restart the first GET can miss the deck that was just PUT (the API
  // route is compiled lazily), so read it back and retry until it is really there.
  for (let i = 0; i < 6; i++) {
    const r = await page.request.put(`${base}/api/decks/${id}`, { data: spec })
    if (!r.ok()) throw new Error(`PUT ${id} -> ${r.status()}`)
    const g = await page.request.get(`${base}/api/decks/${id}`)
    if (g.ok()) return
    await page.waitForTimeout(1000)
  }
  throw new Error(`deck ${id} not readable after PUT`)
}

async function go(page, url) {
  for (let i = 0; ; i++) {
    try {
      await page.goto('about:blank')
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
      return
    } catch (e) {
      if (i >= 2) throw e
      await page.waitForTimeout(1000)
    }
  }
}

async function viewerState(page) {
  return page.evaluate(() => {
    const v = document.querySelector('[data-testid="deck-viewer"]')
    return {
      slide: Number(v.getAttribute('data-slide-index')),
      step: Number(v.getAttribute('data-build-step')),
      steps: Number(v.getAttribute('data-build-step-count')),
    }
  })
}

async function waitChain(page, limitMs = 20000) {
  const t0 = Date.now()
  let lastStep = -1
  let lastMove = Date.now()
  for (;;) {
    const s = await viewerState(page)
    if (s.step >= s.steps) return { ...s, ms: Date.now() - t0 }
    if (Date.now() - t0 > limitMs) return { ...s, timedOut: true }
    if (s.step !== lastStep) { lastStep = s.step; lastMove = Date.now() }
    // A manual (click) step never moves by itself; an auto step does. Pressing ArrowRight on an
    // auto step makes DeckViewer skip the whole chain and settle it, which would hide exactly
    // what is reviewed, so only press after a long stall.
    if (Date.now() - lastMove > 3000) {
      await page.keyboard.press('ArrowRight')
      lastMove = Date.now()
    }
    await page.waitForTimeout(100)
  }
}

/** Visual-health probes on the settled viewer slide. */
async function audit(page) {
  return page.evaluate(() => {
    const slide = document.querySelector('[data-testid="deck-viewer-slide"]')
    const sr = slide.getBoundingClientRect()
    const stuck = []
    const escapes = []
    const overflow = []
    for (const el of slide.querySelectorAll('[data-shape-id], [data-part]')) {
      const o = Number(getComputedStyle(el).opacity)
      if (o < 0.95) stuck.push(`${el.getAttribute('data-block-id') || el.getAttribute('data-part')}:${o.toFixed(2)}`)
    }
    for (const el of slide.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      const tol = 2
      if (r.left < sr.left - tol || r.top < sr.top - tol || r.right > sr.right + tol || r.bottom > sr.bottom + tol) {
        // only report the outermost escaping element
        if (!escapes.some((e) => e.el.contains(el))) escapes.push({ el, d: `${el.tagName.toLowerCase()}${el.getAttribute('data-part') ? '[' + el.getAttribute('data-part') + ']' : ''}` })
      }
      const cs = getComputedStyle(el)
      const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())
      if (hasText && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) && cs.overflow !== 'visible') {
        overflow.push(`${el.textContent.trim().slice(0, 40)} (${el.scrollWidth}x${el.scrollHeight} > ${el.clientWidth}x${el.clientHeight})`)
      }
    }
    return { stuck, escapes: escapes.map((e) => e.d).slice(0, 10), overflow: overflow.slice(0, 10) }
  })
}

module.exports = {
  base: 'http://localhost:5433',
  known: [/Accessing element\.ref was removed in React 19/],
  route: '/',
  waitFor: 'body',

  async run(page) {
    const base = this.base
    fs.mkdirSync(OUT, { recursive: true })
    const deck = buildDeck()
    const report = { category: TAG, theme: THEME, blocks: {} }
    const R = (t) => (report.blocks[t] = report.blocks[t] || { errors: [] })
    let current = null
    page.on('pageerror', (e) => current && R(current).errors.push(`pageerror: ${e.message.slice(0, 160)}`))
    page.on('console', (m) => {
      if (current && m.type() === 'error' && !/element\.ref was removed/.test(m.text())) R(current).errors.push(m.text().slice(0, 160))
    })

    // 0. compiler findings, per block
    const { findings } = tl.deckSpecToDocument(deck)
    for (const def of BLOCKS) {
      const s = slug(def.type)
      R(def.type).findings = (findings || [])
        .filter((f) => JSON.stringify(f).includes(`_${s}_`) || (f.slideId || '').startsWith(s))
        .map((f) => `${f.severity || ''} ${f.code || ''}: ${(f.message || '').slice(0, 140)}`)
    }

    await put(page, base, DECK_ID, deck)
    await put(page, base, BLANK_ID, BLANK)

    // 1 + 2. gallery card and drag-drop into a blank slide
    if (PASSES.includes('gallery') || PASSES.includes('drop')) {
      for (const def of BLOCKS) {
        current = def.type
        const r = R(def.type)
        await go(page, `${base}/edit/${BLANK_ID}`)
        await page.waitForSelector('#TD-BlockInserter-Trigger', { timeout: 20000 })
        await page.waitForTimeout(800)
        await page.click('#TD-BlockInserter-Trigger')
        await page.waitForSelector('.tls-block-inserter')
        const label = tl.CATEGORY_INFO ? tl.CATEGORY_INFO[def.category]?.label : null
        if (label) await page.click(`.tls-block-inserter button:has-text("${label} (")`).catch(() => {})
        const card = page.locator(`[data-block-type="${def.type}"]`).first()
        await card.scrollIntoViewIfNeeded()
        await page.waitForTimeout(500)
        if (PASSES.includes('gallery')) {
          await card.screenshot({ path: path.join(OUT, `${slug(def.type)}.card.png`) })
          r.card = await card.evaluate((el) => {
            const prev = el.firstElementChild
            const pr = prev.getBoundingClientRect()
            let painted = 0
            let outside = 0
            for (const n of prev.querySelectorAll('*')) {
              const b = n.getBoundingClientRect()
              if (!b.width || !b.height) continue
              painted++
              if (b.left < pr.left - 2 || b.right > pr.right + 2 || b.top < pr.top - 2 || b.bottom > pr.bottom + 2) outside++
            }
            return { previewBox: `${Math.round(pr.width)}x${Math.round(pr.height)}`, paintedNodes: painted, nodesOutsidePreview: outside, text: el.innerText.slice(0, 80) }
          })
        }
        if (PASSES.includes('drop')) {
          const before = await page.evaluate(() => Object.keys(window.tlapp.page.shapes).length)
          const canvas = page.locator('#canvas')
          const cb = await canvas.boundingBox()
          await card.dragTo(canvas, { targetPosition: { x: cb.width * 0.62, y: cb.height * 0.5 } })
          await page.waitForTimeout(900)
          const after = await page.evaluate(() => {
            const app = window.tlapp
            const shapes = Object.values(app.page.shapes)
            const last = shapes[shapes.length - 1]
            return { n: shapes.length, last: last && { id: last.id, type: last.type, point: last.point.map(Math.round), size: (last.size || []).map(Math.round) } }
          })
          r.drop = { added: after.n - before, shape: after.last }
          if (after.n > before) {
            await page.keyboard.press('Escape')
            await page.evaluate((id) => { window.tlapp.select(id) }, after.last.id)
            await page.evaluate(() => window.tlapp.zoomToFit())
            await page.waitForTimeout(600)
          }
          // with the block selected: the inspector is open, which is part of what is reviewed
          await page.screenshot({ path: path.join(OUT, `${slug(def.type)}.drop.png`) })
          // and deselected, so the block is not hidden behind the inspector panel
          await page.evaluate(() => { window.tlapp.selectNone(); window.tlapp.zoomToFit() })
          await page.waitForTimeout(400)
          await page.locator('#canvas').screenshot({ path: path.join(OUT, `${slug(def.type)}.drop-canvas.png`) })
        }
      }
    }

    // 3. viewer with motion
    if (PASSES.includes('viewer')) {
      current = null
      await go(page, `${base}/view/${DECK_ID}`)
      await page.waitForSelector('[data-testid="deck-viewer"]', { timeout: 20000 })
      await page.waitForTimeout(400)
      await page.keyboard.press('Home')
      for (let i = 0; i < deck.slides.length; i++) {
        const sl = deck.slides[i]
        const def = BLOCKS[Math.floor(i / 2)]
        const variant = i % 2 === 0 ? 'wide' : 'narrow'
        current = def.type
        if (i > 0) {
          await waitChain(page)
          await page.keyboard.press('ArrowRight')
        }
        const shownAt = Date.now()
        for (const ms of MID) {
          const w = ms - (Date.now() - shownAt)
          if (w > 0) await page.waitForTimeout(w)
          await page.screenshot({ path: path.join(OUT, `${slug(def.type)}.${variant}.mid-${ms}.png`) })
        }
        const chain = await waitChain(page)
        await page.waitForTimeout(SETTLE)
        await page.screenshot({ path: path.join(OUT, `${slug(def.type)}.${variant}.png`) })
        R(def.type)[variant] = { slide: sl.id, chain: `${chain.step}/${chain.steps}${chain.timedOut ? ' TIMEOUT' : ''}`, ...(await audit(page)) }
      }
    }

    // 4. editor present mode on the generated deck (wide slides only)
    if (PASSES.includes('present')) {
      // Written first: a failure in this pass must not lose the viewer results.
      fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
      const openEditor = async () => {
        await go(page, `${base}/edit/${DECK_ID}`)
        await page.waitForSelector('#canvas', { timeout: 20000 })
        await page.waitForTimeout(1000)
      }
      const present = async (pageId) => {
        // Leaving and entering Present are asynchronous: wait for each to settle, or the next
        // block's "enter" is skipped (state still true) and the pending "leave" then wins.
        await page.evaluate(() => window.tlapp.settings.isPresentationMode && window.tlapp.togglePresentationMode())
        await page.waitForFunction(() => !window.tlapp.settings.isPresentationMode, null, { timeout: 6000 })
        await page.evaluate((id) => {
          const app = window.tlapp
          const pg = Object.values(app.document.pages).find((p) => p.id === id)
          if (pg) app.changePage(pg.id)
          app.togglePresentationMode()
        }, pageId)
        await page.waitForFunction(() => window.tlapp.settings.isPresentationMode, null, { timeout: 6000 })
        // The flag can be on while the editor chrome is still showing: wait for the Present bar.
        await page.waitForFunction(() => /Build \d+ \/ \d+/.test(document.body.innerText), null, { timeout: 6000 })
      }
      await openEditor()
      for (const def of BLOCKS) {
        current = def.type
        const id = `${slug(def.type)}-wide`
        try {
          try {
            await present(id)
          } catch (e) {
            // After many page changes the editor can stop toggling: start from a fresh page once.
            await openEditor()
            await present(id)
          }
          await page.waitForTimeout(SETTLE)
          await page.screenshot({ path: path.join(OUT, `${slug(def.type)}.present.png`) })
        } catch (e) {
          R(def.type).presentError = String(e.message).split('\n')[0].slice(0, 160)
          await openEditor().catch(() => {})
        }
      }
    }

    // 5. motion probe
    if (PASSES.includes('motion')) {
      const { deck: mdeck, plan } = buildMotionDeck()
      await put(page, base, mdeck.id, mdeck)
      const lines = []
      const staticRef = {}
      const open = async (reduced) => {
        await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
        await go(page, `${base}/view/${mdeck.id}`)
        await page.waitForSelector('[data-testid="deck-viewer"]', { timeout: 20000 })
        await page.evaluate(probe.installSampler)
        await page.waitForTimeout(600)
      }
      let reducedNow = null
      let at = 0
      for (const item of plan) {
        const reduced = item.style === 'reduced'
        if (reduced !== reducedNow) {
          await open(reduced)
          reducedNow = reduced
          at = 0
        }
        current = item.def.type
        // walk to the slide before this one, waiting out each chain (ArrowRight on a running auto
        // chain would skip it)
        while (at < item.index - 1) {
          await waitChain(page)
          await page.keyboard.press('ArrowRight')
          at++
        }
        await waitChain(page)
        await page.waitForTimeout(300)
        await page.evaluate((id) => window.__mp.start(id), item.slideId)
        await page.keyboard.press('ArrowRight')
        at++
        const t0 = Date.now()
        let doneAt = 0
        const shots = MOTION_PNG ? [150, 400, 800] : []
        for (;;) {
          const w = shots.length ? shots[0] - (Date.now() - t0) : 0
          if (shots.length && w <= 0) {
            const ms = shots.shift()
            await page.screenshot({ path: path.join(OUT, `${slug(item.def.type)}.motion-${item.style}.mid-${ms}.png`) })
            continue
          }
          const st = await viewerState(page)
          const ps = await page.evaluate(() => window.__mp.status())
          // Done = every build step revealed, then 1.2 s more (a part's tween may run up to
          // ~900 ms after its step, and a tween GSAP cannot interpolate shows no change until its
          // last frame), and nothing moved for 300 ms.
          if (st.slide === item.index && st.step >= st.steps) doneAt = doneAt || Date.now()
          if (doneAt && Date.now() - doneAt > 1200 && ps.quietMs > 300 && ps.frames > 5) break
          if (Date.now() - t0 > 12000) break
          await page.waitForTimeout(Math.min(100, w || 100))
        }
        const rec = await page.evaluate(() => window.__mp.stop())
        if (process.env.REVIEW_MOTION_DUMP === '1') fs.writeFileSync(path.join(OUT, `${slug(item.def.type)}.motion-${item.style}.json`), JSON.stringify(rec))
        if (item.style === 'static') staticRef[item.def.type] = probe.restFrame(rec, item.blockId)
        const v = probe.verdicts(rec, { blockId: item.blockId, scope: item.def.scope, style: item.style, ref: staticRef[item.def.type] })
        const r = R(item.def.type)
        r.motion = r.motion || {}
        r.motion[item.style] = v
        const line = probe.summary(item.def.type, item.style, v)
        lines.push(line)
        console.error(line)
      }
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      report.motionSummary = lines
    }

    current = null
    // A partial run (e.g. the motion pass alone) keeps what earlier runs wrote for the other passes.
    const file = path.join(OUT, 'report.json')
    if (fs.existsSync(file) && !PASSES.includes('viewer')) {
      try {
        const old = JSON.parse(fs.readFileSync(file, 'utf8'))
        for (const [t, b] of Object.entries(report.blocks)) old.blocks[t] = { ...(old.blocks[t] || {}), ...b }
        if (report.motionSummary) old.motionSummary = report.motionSummary
        Object.assign(report, old)
      } catch (e) { /* unreadable: overwrite */ }
    }
    fs.writeFileSync(file, JSON.stringify(report, null, 2))
    return { out: OUT, report: path.join(OUT, 'report.json'), blocks: BLOCKS.length }
  },
}
