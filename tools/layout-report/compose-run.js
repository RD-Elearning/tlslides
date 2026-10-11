#!/usr/bin/env node
/**
 * CMP4 — the random-composition dry run (`packages/tldraw/src/blocks/pipeline/composeRun.ts`).
 *
 *   node tools/layout-report/compose-run.js [--count 200] [--seed 1] [--style <id[,id]>] [--json] [--dist] [--out <dir>]
 *
 * Generates grammar-valid free compositions (peer cards, a split, a lockup, a lockup on a photo, a
 * path with connectors), runs each through `validateFreeComposition`, the layout oracle and the
 * quality gate in every deck style, and prints the pass rate per kind and per style plus every
 * rejected class (finding code) with its count and an example. `--out` writes the compositions as
 * decks (one per kind × style) for contact sheets.
 */
const fs = require('fs')
const path = require('path')
const { loadOracle } = require('./load')

const opts = { count: 200, seed: 1, styles: undefined, json: false, dist: false, out: null }
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  const val = () => argv[++i]
  if (a === '--count') opts.count = Number(val())
  else if (a === '--seed') opts.seed = Number(val())
  else if (a === '--style') opts.styles = val().split(',')
  else if (a === '--json') opts.json = true
  else if (a === '--dist') opts.dist = true
  else if (a === '--out') opts.out = path.resolve(val())
  else {
    process.stderr.write(`compose-run: unknown argument ${a}\n`)
    process.exit(2)
  }
}
const o = loadOracle({ dist: opts.dist })
const r = o.runRandomCompositions({ count: opts.count, seed: opts.seed, styles: opts.styles })
if (opts.json) {
  process.stdout.write(JSON.stringify(r, null, 2) + '\n')
} else {
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '-')
  console.log(`${r.compositions} compositions × styles = ${r.runs} runs, ${r.passed} pass (${pct(r.passed, r.runs)}); generator grammar-clean: ${r.grammarClean}`)
  console.log('\nby kind:')
  for (const [k, v] of Object.entries(r.byKind)) console.log(`  ${k.padEnd(8)} ${String(v.passed).padStart(4)}/${String(v.runs).padEnd(4)} ${pct(v.passed, v.runs)}`)
  console.log('\nby style:')
  for (const [k, v] of Object.entries(r.byStyle)) console.log(`  ${k.padEnd(11)} ${String(v.passed).padStart(4)}/${String(v.runs).padEnd(4)} ${pct(v.passed, v.runs)}`)
  console.log('\nrejected classes (finding code: count — example):')
  for (const c of r.rejected) console.log(`  ${c.code}: ${c.count} — ${c.example.slice(0, 220)}`)
}
if (opts.out) {
  fs.mkdirSync(opts.out, { recursive: true })
  const comps = o.generateCompositions(opts.count, opts.seed)
  for (const s of o.BUILT_IN_STYLES) {
    if (opts.styles && !opts.styles.includes(s.id)) continue
    const deck = { version: 1, id: `compose-${s.id}`, title: `Compositions — ${s.id}`, theme: s.palettes[0].id, style: s.id, aspect: 'widescreen', slides: comps.map((c) => c.slide) }
    fs.writeFileSync(path.join(opts.out, `${s.id}.json`), JSON.stringify(deck, null, 2) + '\n')
  }
}
