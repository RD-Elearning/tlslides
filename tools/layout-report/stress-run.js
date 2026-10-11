#!/usr/bin/env node
/**
 * CS0 — content stress over the golden briefs (`reviews/blocks/content-stress/README.md`).
 *
 *   node tools/layout-report/stress-run.js [--brief <id[,id]>] [--level same,min,items,words,over]
 *                                          [--capacity] [--json <file>] [--dist]
 *
 * For each golden brief (`packages/tldraw/src/blocks/__fixtures__/golden-briefs.json`): every design
 * the picker can offer for its roles in its style with its assets, its content rewritten in the
 * brief's language at each level (`pipeline/contentStress.ts`), checked with the S4.1 bar (oracle
 * geometry + quality gate). Prints per level how many designs are not clean and the finding codes;
 * `--capacity` adds the title/list capacity table (`designCapacity`) per design.
 * Exit status: 0 = every design is clean at `same`, 1 = some is not, 2 = usage error.
 */
const fs = require('fs')
const path = require('path')
const { loadOracle } = require('./load')

function usage(msg) {
  if (msg) process.stderr.write(`stress-run: ${msg}\n`)
  process.stderr.write('usage: node tools/layout-report/stress-run.js [--brief <id,..>] [--level <l,..>] [--capacity] [--json <file>] [--dist]\n')
  process.exit(2)
}

const opts = { dist: false, capacity: false }
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  const val = () => (i + 1 < argv.length ? argv[++i] : usage(`${a} needs a value`))
  if (a === '--brief') opts.briefs = val().split(',').filter(Boolean)
  else if (a === '--level') opts.levels = val().split(',').filter(Boolean)
  else if (a === '--capacity') opts.capacity = true
  else if (a === '--json') opts.json = path.resolve(val())
  else if (a === '--dist') opts.dist = true
  else usage(`unknown option ${a}`)
}

const t = loadOracle({ dist: opts.dist })
const registry = t.defaultBlockRegistry()
const briefs = JSON.parse(fs.readFileSync(path.join(__dirname, '../../packages/tldraw/src/blocks/__fixtures__/golden-briefs.json'), 'utf8')).briefs
const chosen = opts.briefs ? briefs.filter((b) => opts.briefs.includes(b.id)) : briefs
if (opts.briefs && chosen.length !== opts.briefs.length) usage(`unknown brief in ${opts.briefs.join(',')}`)
const levels = opts.levels ?? t.STRESS_LEVELS
for (const l of levels) if (!t.STRESS_LEVELS.includes(l)) usage(`unknown level ${l}`)

const cases = chosen.map((b) => ({ id: b.id, style: t.getDeckStyle(b.style), lang: b.lang, roles: b.expectedRoles, assets: b.assets }))
const started = Date.now()
const rows = t.runContentStress(cases, registry, levels)

const code = (p) => p.replace(/^(error|warning|quality) /, '').split(':')[0]
console.log(`content stress: ${chosen.length} briefs, ${rows.length} (style, language, design) runs, ${((Date.now() - started) / 1000).toFixed(1)} s`)
for (const level of levels) {
  const bad = rows.filter((r) => r.levels[level].length)
  const codes = {}
  for (const r of bad) for (const p of new Set(r.levels[level].map(code))) codes[p] = (codes[p] ?? 0) + 1
  const top = Object.entries(codes).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(', ')
  console.log(`  ${level.padEnd(6)} not clean ${String(bad.length).padStart(4)} / ${rows.length}${top ? `  — ${top}` : ''}`)
}
if (levels.includes('same')) {
  const bad = rows.filter((r) => r.levels.same.length)
  if (bad.length) {
    console.log('\nnot clean at `same` (real-length content in the brief language):')
    for (const r of bad) console.log(`  ${r.style}/${r.lang} ${r.design}: ${r.levels.same.join(' | ')}`)
  }
}

let capacity
if (opts.capacity) {
  capacity = []
  const seen = new Set()
  for (const c of cases) {
    const look = t.deckLook(c.style, 0)
    for (const role of new Set(c.roles)) {
      for (const k of t.lookCandidates(t.eligibleRecipes(role, c.style, registry), c.style, registry, look).filter((x) => t.assetsAllow(x.recipe, x.variant, c.assets))) {
        const key = `${c.style.id}|${c.lang}|${k.recipe.id}/${k.variant}`
        if (seen.has(key)) continue
        seen.add(key)
        const slide = t.applyDeckLook(t.recipeSlide(k.recipe, registry, k.variant, c.style), look, k.recipe, k.variant)
        capacity.push({ style: c.style.id, lang: c.lang, role, design: `${k.recipe.id}/${k.variant}`, ...t.designCapacity(slide, c.style, registry, c.lang) })
      }
    }
  }
  const titles = capacity.filter((x) => x.title !== null).map((x) => x.title).sort((a, b) => a - b)
  const q = (p) => titles[Math.floor(p * (titles.length - 1))]
  console.log(`\ntitle capacity (characters, ${titles.length} designs): min ${titles[0]}, p10 ${q(0.1)}, p25 ${q(0.25)}, median ${q(0.5)}, max ${titles.at(-1)}`)
  const lists = capacity.flatMap((x) => x.lists.map((l) => ({ ...l, design: x.design })))
  const short = lists.filter((l) => l.max < l.range[1])
  console.log(`lists below their range's top: ${short.length} / ${lists.length}`)
}

if (opts.json) fs.writeFileSync(opts.json, JSON.stringify({ rows, capacity }, null, 1))
process.exit(rows.some((r) => r.levels.same?.length) ? 1 : 0)
