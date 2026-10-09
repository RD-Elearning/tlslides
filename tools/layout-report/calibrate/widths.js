const { loadOracle } = require('../load')
const OUT = process.env.CALIB_OUT || require('path').join(require('os').tmpdir(), 'tls-calibration')
const o = loadOracle()
const tm = o.tableMetrics(), em = o.estimateMetrics
const dom = require(require('path').join(OUT, 'dom.json')).result
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] }
const groups = {}
const add = (g, v, ex) => { (groups[g] = groups[g] || []).push([v, ex]) }
const VI = /[À-ỹĐđ]/
for (const deck of Object.values(dom)) for (const blocks of Object.values(deck)) for (const b of blocks) for (const leaf of b.textLeaves) for (const L of leaf.lineInfo || []) {
  const t = L.t.replace(/\s+$/, '')
  if (t.length < 3 || L.w < 5 || L.sized) continue
  const st = { family: leaf.family, size: leaf.fontSize, lineHeight: 1.2, letterSpacing: leaf.letterSpacingPx / leaf.fontSize, color: '#000' }
  const tw = tm(t, st).width, ew = em(t, st).width
  const ls = leaf.letterSpacingPx
  const r = L.w / tw
  const g = ls > 0.01 ? 'letterSpacing>0' : ls < -0.01 ? 'letterSpacing<0' : L.bold ? 'bold run' : /^[^a-z]*[A-Z]{3}[^a-z]*$/.test(t) ? 'uppercase' : VI.test(t) ? 'vietnamese' : 'plain'
  add(g, r, `${t.slice(0, 30)}|fs${leaf.fontSize} ls${ls.toFixed(1)} dom${L.w.toFixed(0)} table${tw} est${ew}`)
  add('ALL table', r); add('ALL estimate', L.w / ew)
  // AC3: per font family (the first name in the stack), the style decks' new faces.
  add(`family ${String(leaf.family).split(',')[0].replace(/["']/g, '').trim()}`, r, `${t.slice(0, 30)}|fs${leaf.fontSize} dom${L.w.toFixed(0)} table${tw}`)
}
for (const [g, a] of Object.entries(groups)) {
  const v = a.map((x) => x[0]).map((x) => x - 1)
  const absv = v.map(Math.abs)
  console.log(g.padEnd(18), 'n', String(a.length).padStart(4), 'dom/pred-1: median', (q(v, 0.5) * 100).toFixed(1) + '%', 'p05', (q(v, 0.05) * 100).toFixed(1) + '%', 'p95', (q(v, 0.95) * 100).toFixed(1) + '%', '|abs| p95', (q(absv, 0.95) * 100).toFixed(1) + '%')
  if (!g.startsWith('ALL')) console.log('   e.g.', a.sort((x, y) => Math.abs(y[0] - 1) - Math.abs(x[0] - 1)).slice(0, 3).map((x) => x[1]).join(' ;; '))
}
