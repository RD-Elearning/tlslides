#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires, no-console */
/**
 * Headless visual check for the editor.
 *
 * Unit tests and snapshots pass while the canvas renders nothing — the bundle can ship raw JSX
 * and every jest suite still goes green. This drives a real browser instead, so a screenshot is
 * the evidence.
 *
 * Usage:
 *   node tools/visual/shoot.js <scenario> [--base=URL] [--out=DIR] [--width=N] [--height=N]
 *
 * Scenarios live in tools/visual/scenarios/<name>.js and export { route, run(page) }.
 * A non-zero exit means the page threw, so this is usable as a CI gate.
 */
const fs = require('fs')
const path = require('path')
const { loadPlaywright } = require('./playwright')

const args = process.argv.slice(2)
const name = args.find((a) => !a.startsWith('--'))
const flag = (k, d) => {
  const hit = args.find((a) => a.startsWith(`--${k}=`))
  return hit ? hit.slice(k.length + 3) : d
}

if (!name) {
  console.error('usage: node tools/visual/shoot.js <scenario> [--base=URL] [--out=DIR]')
  process.exit(2)
}

const base = flag('base', 'http://localhost:5431')
// Resolved against this script, not the caller's cwd, so the harness works from any directory.
const outDir = path.resolve(flag('out', path.join(__dirname, 'shots')))
const width = Number(flag('width', 1440))
const height = Number(flag('height', 900))

const scenarioPath = path.join(__dirname, 'scenarios', `${name}.js`)
if (!fs.existsSync(scenarioPath)) {
  console.error(`no such scenario: ${name} (expected ${scenarioPath})`)
  process.exit(2)
}
const scenario = require(scenarioPath)

;(async () => {
  const { chromium } = loadPlaywright()
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width, height } })

  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text().slice(0, 200)}`))

  const url = base + (scenario.route || '/')
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  // The editor mounts asynchronously and measures itself with a resize observer; nothing renders
  // on the first frame.
  await page.waitForSelector('#canvas', { timeout: 20000 })
  await page.waitForTimeout(1500)

  const notes = (await scenario.run(page)) || {}

  // A scenario may declare errors it knowingly tolerates (see the `known` field). They are
  // reported separately rather than filtered out, so a regression that adds a NEW error still
  // fails the run.
  const known = scenario.known || []
  const tolerated = errors.filter((e) => known.some((re) => re.test(e)))
  const unexpected = errors.filter((e) => !tolerated.includes(e))

  const file = path.join(outDir, `${name}.png`)
  await page.screenshot({ path: file })
  await browser.close()

  console.log(
    JSON.stringify({ scenario: name, url, file, notes, tolerated, errors: unexpected }, null, 2)
  )
  if (unexpected.length) process.exit(1)
})().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
