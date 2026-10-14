#!/usr/bin/env node
/**
 * LO4 — the layout oracle on the command line (plain Node, no browser).
 *
 *   node tools/layout-report/cli.js deck.json [--slide <id|index>] [--format text|json]
 *                                             [--no-map] [--text-metrics table|estimate] [--llm] [--dist]
 *   node tools/layout-report/cli.js --metrics [--types tls.t.title,tls.d.bar] [--theme midnight] [--style corporate] [--dist]
 *   cat deck.json | node tools/layout-report/cli.js - --format json
 *   node tools/layout-report/cli.js deck.json --tree [--slide <id|index>]
 *
 * deck.json is a DeckSpec (`reviews/blocks/SCHEMA.md`). `--slide` takes a slide id, or a 0-based
 * index. Text output is `formatLayoutReport` per slide (what goes into the LLM prompt); JSON is
 * `{ deck, slides: LayoutReport[], summary }`. `--metrics` prints the size cards
 * (`buildBlockMetrics`, the same data as `packages/tldraw/src/blocks/__generated__/block-metrics.json`).
 * `--theme <id>` (LO8) samples the cards with a built-in deck theme's tokens instead of the default
 * theme the committed JSON uses (a theme with another type scale changes heights).
 * `--style <id>` (AC1) samples them with a deck style: its default palette (or `--theme`, one of its
 * palettes), its token overrides and its knob defaults per block type.
 * `--llm` (CMP2) analyses the deck as LLM-authored: `nesting/too-deep` holds containers to 3 levels.
 * `--dist` loads the built package instead of bundling the source (see `load.js`).
 * `--tree` (CMP1) prints the laid-out node tree of every slide as JSON (`layoutDeck`: the editor's
 * path at rest — one group per block at its absolute box with `blockId`/`type`, text nodes with
 * `weight`/`align`, plus `blocks[]` with id, type, box, layer, z and props): the input a later
 * exporter (python-pptx on the FastAPI side) maps to shapes.
 *
 * Exit status: 0 = report printed (findings do not change it), 2 = usage / input error.
 * See `reviews/blocks/LLM-ARCHITECTURE.md` §"Layout oracle loop".
 */
const fs = require('fs')
const { loadOracle } = require('./load')

function usage(msg) {
  if (msg) process.stderr.write(`layout-report: ${msg}\n`)
  process.stderr.write(
    'usage: node tools/layout-report/cli.js <deck.json|-> [--slide <id|index>] [--format text|json] [--no-map]\n' +
      '                                       [--text-metrics table|estimate] [--llm] [--dist]\n' +
      '       node tools/layout-report/cli.js --metrics [--types a,b] [--theme <id>] [--style <id>] [--dist]\n' +
      '       node tools/layout-report/cli.js <deck.json|-> --tree [--slide <id|index>] [--dist]\n'
  )
  process.exit(2)
}

function parseArgs(argv) {
  const opts = { format: 'text', map: true, textMetrics: 'table', dist: false, metrics: false, tree: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const val = () => {
      if (i + 1 >= argv.length) usage(`${a} needs a value`)
      return argv[++i]
    }
    if (a === '--slide') opts.slide = val()
    else if (a === '--format') opts.format = val()
    else if (a === '--no-map') opts.map = false
    else if (a === '--text-metrics') opts.textMetrics = val()
    else if (a === '--dist') opts.dist = true
    else if (a === '--llm') opts.llm = true
    else if (a === '--metrics') opts.metrics = true
    else if (a === '--tree') opts.tree = true
    else if (a === '--types') opts.types = val().split(',').filter(Boolean)
    else if (a === '--theme') opts.theme = val()
    else if (a === '--style') opts.style = val()
    else if (a === '-h' || a === '--help') usage()
    else if (a.startsWith('--')) usage(`unknown option ${a}`)
    else if (opts.deck === undefined) opts.deck = a
    else usage(`unexpected argument ${a}`)
  }
  if (!['text', 'json'].includes(opts.format)) usage(`--format must be text or json`)
  if (!['table', 'estimate'].includes(opts.textMetrics)) usage(`--text-metrics must be table or estimate`)
  if (!opts.metrics && opts.deck === undefined) usage('no deck given')
  return opts
}

function readDeck(file) {
  const raw = file === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(file, 'utf8')
  const deck = JSON.parse(raw)
  if (!deck || !Array.isArray(deck.slides)) throw new Error('not a DeckSpec: no `slides` array')
  return deck
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  const oracle = loadOracle({ dist: opts.dist })

  if (opts.metrics) {
    const bopts = opts.types ? { types: opts.types } : {}
    if (opts.style !== undefined) {
      // AC1: the style's palette (its default, or --theme naming one of its palettes), its tokens
      // and its knob defaults — what a deck with this `style` compiles with.
      const style = oracle.getDeckStyle(opts.style)
      if (!style) usage(`unknown style ${opts.style} (styles: ${oracle.BUILT_IN_STYLES.map((s) => s.id).join(', ')})`)
      const theme = oracle.resolveDeckTheme(opts.theme ?? style.palettes[0].id, style.id)
      if (opts.theme !== undefined && theme.id !== opts.theme) usage(`theme ${opts.theme} is not a palette of style ${style.id}`)
      bopts.tokens = oracle.resolveTokens(theme, oracle.deckSpecTokens({ style: style.id }))
      bopts.blockDefaults = style.blockDefaults
      bopts.themeName = `${style.id}/${theme.id}`
    } else if (opts.theme !== undefined) {
      const theme = oracle.resolveDeckTheme(opts.theme)
      if (theme.id !== opts.theme) usage(`unknown theme ${opts.theme}`)
      bopts.tokens = oracle.resolveTokens(theme)
      bopts.themeName = theme.id
    }
    const file = oracle.buildBlockMetrics(undefined, bopts)
    process.stdout.write(oracle.stringifyBlockMetrics(file))
    return
  }

  let deck
  try {
    deck = readDeck(opts.deck)
  } catch (err) {
    usage(`cannot read ${opts.deck}: ${err.message}`)
  }
  let slides = deck.slides
  if (opts.slide !== undefined) {
    const byId = slides.filter((s) => s.id === opts.slide)
    const idx = /^\d+$/.test(opts.slide) ? Number(opts.slide) : -1
    slides = byId.length ? byId : idx >= 0 && idx < deck.slides.length ? [deck.slides[idx]] : []
    if (!slides.length) usage(`no slide ${opts.slide} (ids: ${deck.slides.map((s) => s.id).join(', ')})`)
  }
  if (opts.tree) {
    // CMP1: the JSON node dump (export-ready X1/X2/X3/X8).
    const laid = oracle.layoutDeck({ ...deck, slides })
    process.stdout.write(JSON.stringify({ deck: deck.id ?? null, slides: laid }) + '\n')
    return
  }
  const reports = oracle.analyzeDeck({ ...deck, slides }, { metrics: opts.textMetrics, ...(opts.llm ? { llmAuthored: true } : {}) })

  if (opts.format === 'json') {
    const count = (sev) => reports.reduce((n, r) => n + r.findings.filter((f) => f.severity === sev).length, 0)
    const out = {
      deck: deck.id ?? null,
      slides: reports,
      summary: {
        slides: reports.length,
        errors: count('error'),
        warnings: count('warning'),
        needsVisualCheck: reports.filter((r) => r.needsVisualCheck && r.needsVisualCheck.length).map((r) => r.slideId),
      },
    }
    process.stdout.write(JSON.stringify(out) + '\n')
    return
  }
  process.stdout.write(reports.map((r) => oracle.formatLayoutReport(r, { map: opts.map })).join('\n\n') + '\n')
}

main()
