const OUT = process.env.CALIB_OUT || require('path').join(require('os').tmpdir(), 'tls-calibration')
const rows = require(require('path').join(OUT, 'joined.json')).filter((r) => !r.missing)
const q = (arr, p) => {
  if (!arr.length) return NaN
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]
}
const pct = (x) => (Number.isFinite(x) ? (x * 100).toFixed(1) + '%' : '-')
const H = (b) => (b ? b.height : 0)

function heightStats(label, sel, which) {
  const errs = []
  const abs = []
  const worst = []
  for (const r of rows.filter(sel)) {
    const d = r.painted.dom
    const p = r.painted[which]
    if (!d || !p || d.height < 4) continue
    const e = (p.height - d.height) / d.height
    errs.push(Math.abs(e))
    abs.push(Math.abs(p.height - d.height))
    worst.push([Math.abs(e), `${r.slide}:${r.id}(${r.type}) ${Math.round(p.height)} vs dom ${Math.round(d.height)}`])
  }
  worst.sort((a, b) => b[0] - a[0])
  console.log(`${label.padEnd(34)} n=${errs.length} median ${pct(q(errs, 0.5))} p95 ${pct(q(errs, 0.95))} max ${pct(q(errs, 1))} | abs median ${q(abs, 0.5)?.toFixed(1)} p95 ${q(abs, 0.95)?.toFixed(1)} | >5%: ${errs.filter((e) => e > 0.05).length}`)
  return worst
}

const isLayout = (r) => r.kind === 'layout'
const isHtml = (r) => r.kind === 'html'
const rigid = (r) => !r.elastic
console.log('blocks', rows.length, 'layout', rows.filter(isLayout).length, 'html', rows.filter(isHtml).length, 'elastic', rows.filter((r) => r.elastic).length)
console.log('\n== painted height: report vs DOM ==')
const w1 = heightStats('layout, table (report default)', isLayout, 'table')
heightStats('layout, estimate (pre-LO6 editor)', isLayout, 'estimate')
heightStats('layout rigid, table', (r) => isLayout(r) && rigid(r), 'table')
heightStats('layout elastic, table', (r) => isLayout(r) && !rigid(r), 'table')
const w2 = heightStats('html, table (poster)', isHtml, 'table')
heightStats('html, estimate (poster)', isHtml, 'estimate')
console.log('\nworst layout/table:', w1.slice(0, 10).map((x) => x[1]))
console.log('worst html/table:', w2.slice(0, 9).map((x) => `${pct(x[0])} ${x[1]}`))

// natural height vs DOM for rigid blocks (natural = what the planner sees)
console.log('\n== natural.height (table) vs DOM painted, rigid blocks ==')
for (const [lab, sel] of [['layout', isLayout], ['html', isHtml]]) {
  const errs = rows.filter((r) => sel(r) && rigid(r) && r.painted.dom && r.painted.dom.height >= 4).map((r) => Math.abs(r.natural.table.height - r.painted.dom.height) / r.painted.dom.height)
  console.log(lab, 'n', errs.length, 'median', pct(q(errs, 0.5)), 'p95', pct(q(errs, 0.95)))
}

// line counts: per text leaf (layout kind; leaves matched by order)
console.log('\n== text lines (layout kind; leaves paired by order) ==')
let n = 0, tMis = 0, eMis = 0, tUnder = 0, eUnder = 0, renderedMis = 0, overflowW = 0, unmatched = 0
const mis = []
const ovs = []
const bySize = {}
// AC3: a table line count agrees with the browser when it lies between the browser's own wrap at
// the box width (strict, the most lines) and at the box + 3 % / 2 units (tolerant, the fewest): a
// line within 3 % of its box is the measurement noise (LO5: shrink-wrapped labels the DOM paints
// unwrapped; AC3: lines 0-3 % over a card's box that the table correctly breaks). STRICT=1 compares
// with the strict wrap only, TOL=1 with the tolerant wrap only (the LO5 metric).
const agrees = (lines, d) =>
  process.env.STRICT ? lines === d.browserStrict : process.env.TOL ? lines === d.browserTol : lines >= d.browserTol && lines <= d.browserStrict
const nearest = (lines, d) => (process.env.STRICT ? d.browserStrict : process.env.TOL ? d.browserTol : lines < d.browserTol ? d.browserTol : d.browserStrict)
for (const r of rows.filter(isLayout)) {
  const dl = r.text.dom.map((d) => ({ ...d, browserStrict: d.browser, browser: d.browserTol }))
  if (dl.length !== r.text.table.length) {
    unmatched++
    continue
  }
  dl.forEach((d, i) => {
    if (!d.nonEmpty) return
    const t = r.text.table[i]
    const e = r.text.estimate[i]
    n++
    if (!agrees(t.lines, d)) {
      tMis++
      if (t.lines < nearest(t.lines, d)) tUnder++
      mis.push(`${r.slide}:${r.id} ${t.p} table ${t.lines} est ${e ? e.lines : '-'} browser ${d.browserTol}-${d.browserStrict} (w ${Math.round(d.boxWidth)}, fs ${d.fontSize})`)
    }
    // AC8.5: the estimate can lay a block out with another leaf count (a card that drops a line
    // under the old average-width metric); the table pairing is what this report is about.
    if (e && !agrees(e.lines, d)) {
      eMis++
      if (e.lines < nearest(e.lines, d)) eUnder++
    }
    // LO6: the editor (what the DOM paints) measures with `table`.
    if (d.rendered !== t.lines) renderedMis++
    if (d.maxRenderedWidth > d.boxWidth + 2) {
      overflowW++
      ovs.push(`${r.slide}:${r.id} ${t.p} rendered ${d.maxRenderedWidth} > box ${Math.round(d.boxWidth)} (+${(((d.maxRenderedWidth - d.boxWidth) / d.boxWidth) * 100).toFixed(0)}%)`)
    }
  })
}
console.log(`leaves ${n} (blocks with leaf-count mismatch skipped: ${unmatched})`)
console.log(`table lines != browser wrap: ${tMis} (${pct(tMis / n)}), table under-counts ${tUnder}`)
console.log(`estimate lines != browser wrap: ${eMis} (${pct(eMis / n)}), estimate under-counts ${eUnder}`)
console.log(`rendered lines != table = editor (sanity): ${renderedMis}`)
console.log(`rendered (editor) line wider than its box: ${overflowW}`)
console.log('table mismatches:', mis.slice(0, 30))
console.log('width overflows:', ovs.slice(0, 15))

// block-level line mismatch (any leaf)
const blk = rows.filter(isLayout).filter((r) => r.text.dom.length === r.text.table.length && r.text.dom.some((d, i) => d.nonEmpty && !agrees(r.text.table[i].lines, { ...d, browserStrict: d.browser })))
console.log('layout blocks with any table-vs-browser line mismatch:', blk.length, '/', rows.filter(isLayout).filter((r) => r.text.table.length).length, 'types', [...new Set(blk.map((r) => r.type))].join(' '))

// html line totals
console.log('\n== html kind: total text lines poster(table) vs DOM ==')
for (const r of rows.filter(isHtml)) {
  const domLines = r.text.html.reduce((s, h) => s + h.lines, 0)
  const tl = r.tLines.reduce((a, b) => a + b, 0)
  console.log(`${r.slide}:${r.id} ${r.type} poster ${tl} dom ${domLines} | h table ${Math.round(H(r.painted.table))} dom ${Math.round(H(r.painted.dom))} box ${Math.round(r.box.height)}`)
}

// LO7: html kind per data-part — poster text leaves (same part names) vs the live DOM.
console.log('\n== html kind per part: poster vs live DOM (lines, top/bottom in units) ==')
{
  let parts = 0, lineMis = 0
  const dTop = [], dBot = [], misList = []
  for (const r of rows.filter(isHtml)) {
    const byPart = new Map()
    for (const t of r.text.table) {
      if (!t.part || !t.painted) continue
      const e = byPart.get(t.part) || { lines: 0, y1: Infinity, y2: -Infinity }
      e.lines += t.lines
      e.y1 = Math.min(e.y1, t.painted.y)
      e.y2 = Math.max(e.y2, t.painted.y + t.painted.height)
      byPart.set(t.part, e)
    }
    for (const d of r.text.htmlParts || []) {
      const p = byPart.get(d.part)
      if (!p) { misList.push(`${r.slide}:${r.id} ${d.part} not in poster (dom ${d.lines}L)`); continue }
      parts++
      if (p.lines !== d.lines) { lineMis++; misList.push(`${r.slide}:${r.id} ${d.part} poster ${p.lines}L dom ${d.lines}L`) }
      dTop.push(Math.abs(p.y1 - d.y)); dBot.push(Math.abs(p.y2 - d.bottom))
      if (Math.abs(p.y1 - d.y) > 4 || Math.abs(p.y2 - d.bottom) > 4) misList.push(`${r.slide}:${r.id} ${d.part} top ${Math.round(p.y1)} vs ${Math.round(d.y)}, bottom ${Math.round(p.y2)} vs ${Math.round(d.bottom)}`)
    }
  }
  console.log(`html parts ${parts}: line-count mismatches ${lineMis}; |top| median ${q(dTop, 0.5)?.toFixed(1)} p95 ${q(dTop, 0.95)?.toFixed(1)} max ${q(dTop, 1)?.toFixed(1)}; |bottom| median ${q(dBot, 0.5)?.toFixed(1)} p95 ${q(dBot, 0.95)?.toFixed(1)} max ${q(dBot, 1)?.toFixed(1)}`)
  console.log('html part diffs:', misList.slice(0, 40))
}

// per type summary of worst height error (table)
const byType = {}
for (const r of rows) {
  const d = r.painted.dom
  const p = r.painted.table
  if (!d || !p || d.height < 4) continue
  const e = Math.abs(p.height - d.height) / d.height
  ;(byType[r.type] = byType[r.type] || []).push(e)
}
const tw = Object.entries(byType).map(([t, es]) => [t, Math.max(...es), es.length]).sort((a, b) => b[1] - a[1])
console.log('\nworst types (max |height err|, table):', tw.slice(0, 15).map(([t, m, c]) => `${t} ${pct(m)} (n${c})`).join('; '))
