#!/usr/bin/env node
/**
 * AC7 — scripted dry run of the AI pipeline (no LLM), the reference implementation of the
 * S2a -> S4.1 loop in `reviews/blocks/LLM-ARCHITECTURE.md`.
 *
 *   node tools/layout-report/dry-run.js [--out <dir>] [--style <id[,id]>] [--seeds 1,2,3] [--chain] [--json] [--dist]
 *
 * For each of the 10 built-in deck styles: a fixed 12-slide outline, a deterministic recipe pick per
 * slide (S2a), the outline headline filled into the recipe's title slot (S3), the layout oracle with
 * up to 3 repair rounds (S4.1), and the S2a prompt sections measured against
 * `reviews/blocks/ai-curation/README.md` §5.2. The logic lives in
 * `packages/tldraw/src/blocks/pipeline/dryRun.ts`; this file is the CLI around it.
 *
 * AC8: every style runs once per seed (`--seeds`, default 1,2,3) through the variety picker
 * (`pipeline/variety.ts`); `--chain` passes each seed's look signatures to the next as
 * `avoidSignatures` (the backend's "recent decks" use). The variety table reports, per style, how
 * many slides differ in look signature between every pair of seeds and the avoidable repeats inside
 * each deck.
 *
 * Decks are written to `--out` (default `tools/layout-report/__dryrun__/`, git-ignored); feed one to
 * `node tools/layout-report/cli.js <deck>` to read its full layout report.
 * Exit status: 0 = every deck has 0 errors, 1 = some deck has errors, 2 = usage error.
 */
const fs = require('fs')
const path = require('path')
const { loadOracle } = require('./load')

function usage(msg) {
  if (msg) process.stderr.write(`dry-run: ${msg}\n`)
  process.stderr.write('usage: node tools/layout-report/dry-run.js [--out <dir>] [--style <id[,id]>] [--seeds 1,2,3] [--chain] [--json] [--dist]\n')
  process.exit(2)
}

const opts = { out: path.join(__dirname, '__dryrun__'), json: false, dist: false, styles: undefined, seeds: [1, 2, 3], chain: false }
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  const val = () => (i + 1 < argv.length ? argv[++i] : usage(`${a} needs a value`))
  if (a === '--out') opts.out = path.resolve(val())
  else if (a === '--style') opts.styles = val().split(',').filter(Boolean)
  else if (a === '--seeds') opts.seeds = val().split(',').filter(Boolean).map(Number)
  else if (a === '--chain') opts.chain = true
  else if (a === '--json') opts.json = true
  else if (a === '--dist') opts.dist = true
  else if (a === '-h' || a === '--help') usage()
  else usage(`unknown argument ${a}`)
}

const oracle = loadOracle({ dist: opts.dist })
if (opts.styles) {
  const known = oracle.BUILT_IN_STYLES.map((s) => s.id)
  for (const s of opts.styles) if (!known.includes(s)) usage(`unknown style ${s} (styles: ${known.join(', ')})`)
}
if (opts.seeds.some((n) => !Number.isInteger(n) || n < 0)) usage('--seeds takes non-negative integers')
const variety = oracle.runVariety(opts.styles, { seeds: opts.seeds, chainAvoid: opts.chain })
const results = variety.flatMap((v) => v.runs)

fs.mkdirSync(opts.out, { recursive: true })
for (const r of results) fs.writeFileSync(path.join(opts.out, `${r.style}-s${r.seed}.json`), JSON.stringify(r.deck, null, 2) + '\n')

const budget = oracle.PROMPT_BUDGET
const summary = results.map(({ deck, ...r }) => r)
const pct = (x) => `${Math.round(100 * x)}%`
if (opts.json) {
  const varietySummary = variety.map((v) => ({ style: v.style, seeds: v.seeds, pairDiffer: v.pairDiffer, minDiffer: v.minDiffer, avoidableRepeats: v.avoidableRepeats }))
  process.stdout.write(JSON.stringify({ budget, out: opts.out, variety: varietySummary, styles: summary }, null, 2) + '\n')
} else {
  const pad = (v, n) => String(v).padStart(n)
  const head = ['style', 'seed', 'slides', 'recipes', 'designs', 'repairs', 'err', 'warn', 'visual', 'kept']
  console.log(head.map((h, i) => (i ? pad(h, 7) : h.padEnd(10))).join(' '))
  for (const r of summary) {
    const uniq = new Set(r.recipes).size
    console.log([r.style.padEnd(10), pad(r.seed, 7), pad(r.slides, 7), pad(uniq, 7), pad(new Set(r.signatures).size, 7), pad(r.repairs.length, 7), pad(r.errors, 7), pad(r.warnings, 7), pad(r.needsVisualCheck, 7), pad(r.exampleKept, 7)].join(' '))
  }
  console.log('')
  console.log(`Variety (look signatures, pipeline/variety.ts): slides that differ between seeds ${opts.seeds.join(', ')}${opts.chain ? ' (chained avoidSignatures)' : ''}`)
  console.log(['style'.padEnd(10), pad('pairs', 16), pad('min', 6), pad('repeats', 8), '  deck look (title)'].join(' '))
  for (const v of variety) console.log([v.style.padEnd(10), pad(v.pairDiffer.map(pct).join('/'), 16), pad(pct(v.minDiffer), 6), pad(v.avoidableRepeats, 8), '  ' + v.runs.map((r) => JSON.stringify(r.deckLook.title)).join(' ')].join(' '))
  console.log('')
  console.log('S2a prompt chars per section, all-roles recipes (column header = §5.2 target; * = over target):')
  const cols = ['header', 'styleCard', 'recipes', 'tier1', 'tier2', 'icons', 'total']
  console.log(['style'.padEnd(10), ...cols.map((c) => pad(`${c}/${budget[c]}`, 15))].join(' '))
  const first = summary.filter((r, i) => summary.findIndex((x) => x.style === r.style) === i)
  for (const r of first) console.log([r.style.padEnd(10), ...cols.map((c) => pad(r.prompt[c] + (r.prompt[c] > budget[c] ? '*' : ''), 15))].join(' '))
  console.log('')
  console.log('S2a prompt with only the slide\'s own role recipes (worst role per style):')
  console.log(['style'.padEnd(10), 'role'.padStart(11), ...cols.map((c) => pad(c, 9))].join(' '))
  for (const r of first) console.log([r.style.padEnd(10), r.promptPerRole.role.padStart(11), ...cols.map((c) => pad(r.promptPerRole[c], 9))].join(' '))
  console.log('')
  for (const r of summary) {
    for (const rep of r.repairs) console.log(`repair ${r.style} seed ${r.seed} slide ${rep.slide} round ${rep.round}: ${rep.action} ${rep.from} -> ${rep.to} (${rep.detail})`)
    for (const f of r.findings) console.log(`finding ${r.style} seed ${r.seed}: ${f}`)
  }
  console.log(`\ndecks written to ${opts.out}`)
}
process.exit(results.some((r) => r.errors > 0 || r.warnings > 0) ? 1 : 0)
