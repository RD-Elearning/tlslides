/* eslint-disable no-console */
/**
 * L7 — the motion-showcase deck with motion ON.
 *
 * (a) Screenshots every slide after its build chain has finished and the last timeline settled
 *     (shots/motion-<slide>.png), plus mid-animation frames that prove motion happens
 *     (shots/motion-<slide>-mid-<ms>.png).
 * (b) Records a video of the whole deck playing, in a second browser context at 1600x900
 *     (shots/motion-showcase.webm).
 *
 * Run:  node tools/visual/shoot.js motion-showcase --width=1920 --height=1080
 *       (needs `next dev -p 5433` in examples/nextjs-sample and a rebuilt packages/tldraw/dist)
 *       MOTION_VIDEO=0 skips the video; MOTION_SLIDES=ms_01,ms_04 limits the screenshots.
 */
const fs = require('fs')
const path = require('path')

const DECK = require(
  path.join(__dirname, '..', '..', '..', 'examples', 'nextjs-sample', 'data', 'decks', 'motion-showcase.json')
)
const SHOTS = path.join(__dirname, '..', 'shots')
const WANT = process.env.MOTION_SLIDES ? process.env.MOTION_SLIDES.split(',') : DECK.slides.map((s) => s.id)
/** Frames captured this long after a slide is shown, to prove things move. */
const MID = { ms_01: [500, 1100], ms_02: [700], ms_04: [900], ms_06: [1200], ms_07: [500], ms_08: [700], ms_11: [800] }
/** Settle time after the last build step is revealed (the longest timeline is ~3.4 s). */
const SETTLE = 3800

async function buildState(page) {
  return page.evaluate(() => {
    const v = document.querySelector('[data-testid="deck-viewer"]')
    return {
      slide: Number(v.getAttribute('data-slide-index')),
      step: Number(v.getAttribute('data-build-step')),
      steps: Number(v.getAttribute('data-build-step-count')),
    }
  })
}

/** Wait until the auto chain has revealed every step of the current slide. */
async function waitChain(page, limitMs = 20000) {
  const t0 = Date.now()
  for (;;) {
    const s = await buildState(page)
    if (s.step >= s.steps) return s
    if (Date.now() - t0 > limitMs) return { ...s, timedOut: true }
    await page.waitForTimeout(100)
  }
}

/** Opacity of every part / block wrapper still invisible after settling (stuck elements). */
async function stuck(page) {
  return page.evaluate(() => {
    const out = []
    const slide = document.querySelector('[data-testid="deck-viewer-slide"]')
    for (const el of slide.querySelectorAll('[data-shape-id], [data-part]')) {
      const o = Number(getComputedStyle(el).opacity)
      if (o < 0.95) out.push(`${el.getAttribute('data-block-id') || el.getAttribute('data-part')}:${o.toFixed(2)}`)
    }
    return out
  })
}

module.exports = {
  base: 'http://localhost:5433',
  known: [/Accessing element\.ref was removed in React 19/],
  route: '/view/motion-showcase',
  waitFor: '[data-testid="deck-viewer"]',

  async run(page) {
    const out = { slides: {}, mid: {}, stuck: {}, chain: {} }
    fs.mkdirSync(SHOTS, { recursive: true })

    // shoot.js waits ~1.5 s after load, so slide 1 has already played: Home replays its build.
    await page.keyboard.press('Home')
    // (a) settled screenshots + mid-animation frames, slide by slide.
    for (let i = 0; i < DECK.slides.length; i++) {
      const id = DECK.slides[i].id
      if (i > 0) {
        await waitChain(page)
        await page.keyboard.press('ArrowRight')
      }
      const shownAt = Date.now()
      if (!WANT.includes(id)) continue
      for (const ms of MID[id] || []) {
        const wait = ms - (Date.now() - shownAt)
        if (wait > 0) await page.waitForTimeout(wait)
        const file = path.join(SHOTS, `motion-${id}-mid-${ms}.png`)
        await page.screenshot({ path: file })
        out.mid[`${id}@${ms}`] = file
      }
      const chain = await waitChain(page)
      out.chain[id] = `${chain.step}/${chain.steps}${chain.timedOut ? ' TIMEOUT' : ''} after ${Date.now() - shownAt}ms`
      await page.waitForTimeout(SETTLE)
      const file = path.join(SHOTS, `motion-${id}.png`)
      await page.screenshot({ path: file })
      out.slides[id] = file
      const s = await stuck(page)
      if (s.length) out.stuck[id] = s
    }

    // (b) the video: a fresh context so the recording starts on slide 1.
    if (process.env.MOTION_VIDEO !== '0') {
      const browser = page.context().browser()
      const dir = path.join(SHOTS, 'video-tmp')
      fs.rmSync(dir, { recursive: true, force: true })
      const ctx = await browser.newContext({
        viewport: { width: 1600, height: 900 },
        recordVideo: { dir, size: { width: 1600, height: 900 } },
      })
      const vp = await ctx.newPage()
      const errors = []
      vp.on('pageerror', (e) => errors.push(e.message.slice(0, 200)))
      vp.on('console', (m) => m.type() === 'error' && !/element\.ref was removed/.test(m.text()) && errors.push(m.text().slice(0, 200)))
      await vp.goto(this.base + this.route, { waitUntil: 'networkidle', timeout: 30000 })
      await vp.waitForSelector(this.waitFor, { timeout: 20000 })
      await vp.waitForTimeout(600)
      for (let i = 0; i < DECK.slides.length; i++) {
        if (i > 0) {
          await waitChain(vp)
          await vp.keyboard.press('ArrowRight')
        }
        await waitChain(vp)
        await vp.waitForTimeout(SETTLE)
      }
      const video = vp.video()
      await ctx.close()
      const target = path.join(SHOTS, 'motion-showcase.webm')
      fs.rmSync(target, { force: true })
      fs.renameSync(await video.path(), target)
      fs.rmSync(dir, { recursive: true, force: true })
      out.video = target
      out.videoErrors = errors
    }
    return out
  },
}
