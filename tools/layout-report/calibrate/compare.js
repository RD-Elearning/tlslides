/* LO5 calibration: join browser measurements (dom.json) with analyzeDeck (table + estimate). */
const OUT = process.env.CALIB_OUT || require('path').join(require('os').tmpdir(), 'tls-calibration')
const fs = require('fs')
const path = require('path')
const { loadOracle, PKG } = require('../load')
const oracle = loadOracle()
const FIX = path.join(PKG, 'src/blocks/__fixtures__')
const DECKS = process.env.CALIB_DECKS
  ? JSON.parse(process.env.CALIB_DECKS)
  : { demo: 'demo-deck.json', tour: 'block-library-tour.json', colorful: 'colorful-blocks-demo.json', motion: 'motion-showcase.json' }
const dom = JSON.parse(fs.readFileSync(path.join(OUT, 'dom.json'), 'utf8')).result
const registry = oracle.defaultBlockRegistry ? oracle.defaultBlockRegistry() : null
const kindOf = (type) => {
  const def = registry && registry.get(type)
  return def ? def.kind || 'layout' : '?'
}

const rows = []
for (const [deck, file] of Object.entries(DECKS)) {
  const spec = JSON.parse(fs.readFileSync(path.join(FIX, file), 'utf8'))
  const table = oracle.analyzeDeck(spec, { metrics: 'table' })
  const est = oracle.analyzeDeck(spec, { metrics: 'estimate' })
  table.forEach((rep, si) => {
    const domBlocks = dom[deck][rep.slideId] || []
    rep.blocks.forEach((b, bi) => {
      const e = est[si].blocks[bi]
      const d = domBlocks.find((x) => x.blockId === b.id)
      if (!d) {
        rows.push({ deck, slide: rep.slideId, id: b.id, type: b.type, missing: true })
        return
      }
      const boxDelta = Math.max(Math.abs(d.box.x - b.box.x), Math.abs(d.box.y - b.box.y), Math.abs(d.box.width - b.box.width), Math.abs(d.box.height - b.box.height))
      const tLines = b.text.map((t) => t.lines)
      const eLines = e.text.map((t) => t.lines)
      rows.push({
        deck,
        slide: rep.slideId,
        id: b.id,
        type: b.type,
        kind: kindOf(b.type),
        elastic: b.elastic,
        layer: b.layer,
        confidence: b.confidence,
        box: b.box,
        boxDelta: Math.round(boxDelta * 10) / 10,
        crashed: d.crashed,
        natural: { table: b.natural, estimate: e.natural },
        painted: { table: b.painted, estimate: e.painted, dom: d.painted },
        textPainted: { dom: d.textPainted },
        text: {
          table: b.text.map((t) => ({ p: t.propPath || t.part, part: t.part, lines: t.lines, w: t.maxLineWidth, boxW: t.box.width, fs: t.fontSize, y: t.box.y, painted: t.painted })),
          estimate: e.text.map((t) => ({ p: t.propPath || t.part, lines: t.lines, w: t.maxLineWidth })),
          dom: d.textLeaves,
          html: d.htmlText,
          htmlParts: d.htmlParts || [],
        },
        tLines,
        eLines,
      })
    })
  })
}
fs.writeFileSync(path.join(OUT, 'joined.json'), JSON.stringify(rows))
console.log('rows', rows.length, 'missing', rows.filter((r) => r.missing).length, 'boxDelta>1', rows.filter((r) => r.boxDelta > 1).length)
