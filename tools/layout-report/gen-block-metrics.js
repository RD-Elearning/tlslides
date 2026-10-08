#!/usr/bin/env node
/**
 * LO3 — regenerate the committed size cards:
 *   node tools/layout-report/gen-block-metrics.js
 * writes packages/tldraw/src/blocks/__generated__/block-metrics.json (the size cards, for FastAPI)
 * and block-size-hints.ts (the digest index's `h≈…` hints) from `buildBlockMetrics()` over the
 * built-in registry. `block-metrics.spec.ts` fails when either committed file is stale.
 */
const fs = require('fs')
const path = require('path')
const { loadOracle, PKG } = require('./load')

const OUT = path.join(PKG, 'src/blocks/__generated__/block-metrics.json')
const t0 = Date.now()
const oracle = loadOracle()
const file = oracle.buildBlockMetrics()
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, oracle.stringifyBlockMetrics(file))
fs.writeFileSync(path.join(path.dirname(OUT), 'block-size-hints.ts'), oracle.stringifySizeHints(oracle.blockSizeHints(file)))
const cards = Object.values(file.blocks)
const n = (p) => cards.filter(p).length
console.log(
  `wrote ${path.relative(process.cwd(), OUT)}: ${cards.length} blocks ` +
    `(lines ${n((c) => c.model && c.model.var === 'lines')}, items ${n((c) => c.model && c.model.var === 'items')}, ` +
    `fixed ${n((c) => c.model && c.model.var === 'fixed')}, fill ${n((c) => c.fill)}, no model ${n((c) => !c.model)}) ` +
    `in ${Date.now() - t0} ms`
)
