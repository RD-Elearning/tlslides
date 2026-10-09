#!/usr/bin/env node
/**
 * LO8 — smoke test for the *built* package as a headless consumer (what a FastAPI-side Node
 * process or a Next.js API route sees), in plain Node, no bundler:
 *
 *   node_modules/.bin/turbo run build:packages   # alone: no jest/tsc in parallel
 *   node tools/layout-report/smoke-dist.js
 *
 * 1. `require('packages/tldraw/dist/index.js')` (CJS) exposes the layout-oracle API;
 * 2. `analyzeDeck` + `formatLayoutReport` run on the demo fixture and agree with the source build
 *    (same findings);
 * 3. `buildBlockMetrics` from dist reproduces the committed size cards for a few blocks;
 * 4. reports whether `import()` of `dist/index.mjs` works in plain Node (known: it does not —
 *    `@tlslides/core` ships CJS without ESM named exports; bundlers are unaffected). Informational:
 *    it does not fail the smoke test.
 * Exit 0 = the CJS entry is consumable; non-zero with the reason otherwise.
 */
const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')
const { loadOracle, PKG } = require('./load')

const DIST = path.join(PKG, 'dist/index.js')
const FIXTURE = path.join(PKG, 'src/blocks/__fixtures__/demo-deck.json')
const CARDS = path.join(PKG, 'src/blocks/__generated__/block-metrics.json')
const API = ['measureBlock', 'analyzeSlide', 'analyzeDeck', 'formatLayoutReport', 'buildBlockMetrics', 'sizeHint', 'blockSizeHints', 'METRICS_WIDTHS']
const TYPES = ['tls.t.title', 'tls.t.bullets', 'tls.c.testimonial', 'tls.g.steps']

function fail(msg) {
  console.error(`smoke-dist: FAIL — ${msg}`)
  process.exit(1)
}

async function main() {
  if (!fs.existsSync(DIST)) fail(`${DIST} missing: run node_modules/.bin/turbo run build:packages`)
  const t0 = Date.now()
  const dist = require(DIST)
  const missing = API.filter((k) => dist[k] === undefined)
  if (missing.length) fail(`dist/index.js lacks ${missing.join(', ')}`)
  console.log(`ok  require(dist/index.js) in ${Date.now() - t0} ms: ${API.join(', ')}`)

  const deck = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'))
  const fromDist = dist.analyzeDeck(deck)
  const fromSrc = loadOracle().analyzeDeck(deck)
  const key = (reports) => reports.map((s) => s.findings.map((f) => `${s.slideId} ${f.severity} ${f.code}`).join('\n')).join('\n')
  if (key(fromDist) !== key(fromSrc)) fail('analyzeDeck findings differ between dist and src (stale build? rebuild first)')
  const text = dist.formatLayoutReport(fromDist[0])
  if (!/^SLIDE /.test(text)) fail('formatLayoutReport returned no report')
  console.log(`ok  analyzeDeck(demo-deck): ${fromDist.length} slides, findings identical to src; text report ${text.length} chars`)

  const committed = JSON.parse(fs.readFileSync(CARDS, 'utf8')).blocks
  const built = dist.buildBlockMetrics(undefined, { types: TYPES }).blocks
  for (const t of TYPES) {
    if (JSON.stringify(built[t]) !== JSON.stringify(committed[t])) fail(`size card ${t} from dist differs from the committed block-metrics.json (stale build?)`)
  }
  console.log(`ok  buildBlockMetrics from dist = committed cards for ${TYPES.join(', ')}; ${TYPES.map((t) => `${t} ${dist.sizeHint(built[t])}`).join('; ')}`)

  try {
    const esm = await import(pathToFileURL(path.join(PKG, 'dist/index.mjs')).href)
    console.log(`ok  import(dist/index.mjs) works in plain node (${Object.keys(esm).length} exports)`)
  } catch (e) {
    console.log(`info import(dist/index.mjs) fails in plain node (known, bundlers unaffected): ${String(e.message).split('\n')[0]}`)
  }
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)))
