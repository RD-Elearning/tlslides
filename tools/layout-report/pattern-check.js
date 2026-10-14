#!/usr/bin/env node
/**
 * CMP4 — check composition patterns in every deck style, and write decks for contact sheets.
 *
 *   node tools/layout-report/pattern-check.js [<id-prefix>[,<id-prefix>]] [--out <dir>] [--dist]
 *
 * For every pattern look (`patterns.ts`) × the ten deck styles: the validator, the layout oracle
 * (LLM-authored) and the quality gate. Prints one line per failing (look, style) with its first
 * findings, then `N/M clean`. `--out` writes `decks.json` (one deck per look × style) and
 * `sheets.json` (one sheet per look, ten cells) for a contact-sheet harness. Exit 1 when any is dirty.
 */
const fs = require('fs')
const path = require('path')
const { loadOracle } = require('./load')

const argv = process.argv.slice(2)
let only = null
let out = null
let dist = false
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--out') out = path.resolve(argv[++i])
  else if (argv[i] === '--dist') dist = true
  else only = argv[i].split(',')
}
const o = loadOracle({ dist })
const reg = o.defaultBlockRegistry()
const styles = o.BUILT_IN_STYLES.map((s) => o.getDeckStyle(s.id))
const decks = {}
const sheets = []
let bad = 0
let total = 0
for (const r of o.PATTERN_RECIPES) {
  if (only && !only.some((x) => r.id.startsWith(x))) continue
  for (const look of o.variantIds(r)) {
    const cells = []
    for (const st of styles) {
      const slide = o.prefixIds(o.recipeSlide(r, reg, look, st), 's01')
      slide.id = 's01'
      const deck = { version: 1, id: `p-${r.id}-${look}-${st.id}`, title: `${r.id}/${look}`, theme: st.palettes[0].id, style: st.id, aspect: 'widescreen', slides: [slide] }
      const rep = o.analyzeDeck(deck, { registry: reg, llmAuthored: true })[0]
      const q = o.slideQuality(rep, { titleSize: o.deckTitleSize(deck) })
      const f = [
        ...o.validateDeckSpec(deck, reg).filter((x) => x.level === 'error' || x.level === 'warning').map((x) => `validate ${x.rule}: ${x.message}`),
        ...rep.findings.filter((x) => x.severity !== 'info').map((x) => `${x.severity} ${x.code}: ${x.message}`),
        ...q.findings.map((x) => `quality ${x.code}: ${x.message}`),
      ]
      total++
      if (f.length) {
        bad++
        console.log(`✗ ${r.id}/${look} ${st.id}\n   ${f.slice(0, 4).join('\n   ')}`)
      }
      const key = `${r.id}_${look}_${st.id}`.replace(/[^a-z0-9]+/gi, '_')
      decks[key] = deck
      cells.push({ deck: key, slide: 0, label: `${r.id}/${look} · ${st.id}${f.length ? ` ✗${f.length}` : ''}` })
    }
    sheets.push({ name: `${r.id}--${look}`, cols: 5, scale: 0.3, cells })
  }
}
console.log(`${total - bad}/${total} clean`)
if (out) {
  fs.mkdirSync(out, { recursive: true })
  fs.writeFileSync(path.join(out, 'decks.json'), JSON.stringify(decks))
  fs.writeFileSync(path.join(out, 'sheets.json'), JSON.stringify(sheets))
}
process.exit(bad ? 1 : 0)
