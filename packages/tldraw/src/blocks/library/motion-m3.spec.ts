/**
 * RVM3 — motion smoothness for G04 metric, G05 chart and G06 table/comparison
 * (reviews/blocks/block-review/MOTION.md §1, criteria J1–J8).
 *
 * What the frame probe measures in the viewer, pinned here per block without a browser:
 * - every recipe part exists in the block's own example, and every drawn leaf is animated by a
 *   part, except the chart frame (gridlines, ticks, categories, legend, tracks) that rides the
 *   block's own fade on purpose — listed per block, so a new uncovered leaf fails;
 * - `expressive` stays in tokens (J5): each part 150–900 ms on an out ease, a stagger of at most
 *   120 ms, the whole block within 2.5 s; `subtle` is opacity only (J7);
 * - marks grow from their baseline, draw from their start or sweep from 12 o'clock (J6), and every
 *   label or value waits for its own mark (same stagger, starting later);
 * - big numbers count up (and only numbers do), tables bring the header first and rows in reading
 *   order, comparisons reveal side by side;
 * - the two html blocks keep their GSAP timelines inside the tokens.
 */

import type { BlockDefinition, BlockMotionRuntime, LayoutNode } from '../types'
import { BUILT_IN_BLOCKS } from './index'
import { layoutAt } from './composite/composite-test'
import { tplCtx, recordingDriver, fakeGsap } from './composite/showcase-test'
import { styleBlockMotion } from '../motion/motion-style'
import { resolveBlockMotion, resolvePartMotion, type ResolvedPartMotion } from '../motion/resolve-motion'
import { CARD_STAGGER, FEATURE_REVEAL_MS } from './composite/tls-c-feature-reveal/animate'
import { SPOT, STAT_SPOTLIGHT_MS } from './composite/tls-c-stat-spotlight/animate'
import { BIG_STAT_TIMING } from './composite/tls-c-big-stat'
import { chartRole } from './composite/_chart'

const G04 = ['tls.t.hero-number', 'tls.d.progress-bar', 'tls.d.progress-ring', 'tls.d.stat-compare', 'tls.d.gauge', 'tls.d.trend-badge', 'tls.d.bullet-chart', 'tls.c.kpi-tile', 'tls.c.kpi-row', 'tls.c.big-stat', 'tls.c.stat-card', 'tls.c.dashboard', 'tls.c.stat-spotlight']
const G05 = ['tls.d.bar', 'tls.d.donut', 'tls.d.line', 'tls.d.area', 'tls.d.grouped-bar', 'tls.d.stacked-bar', 'tls.d.pie', 'tls.d.sparkline', 'tls.d.waterfall', 'tls.d.funnel-chart', 'tls.d.scatter', 'tls.d.radar', 'tls.d.slope', 'tls.d.bubble', 'tls.d.heatmap', 'tls.c.chart-insight']
const G06 = ['tls.d.table', 'tls.d.scorecard', 'tls.d.ranking', 'tls.d.compare-table', 'tls.d.pricing', 'tls.g.matrix-2x2', 'tls.g.swot', 'tls.g.pros-cons', 'tls.g.before-after', 'tls.g.iceberg', 'tls.c.comparison', 'tls.c.case-study', 'tls.c.problem-solution']
const ALL = [...G04, ...G05, ...G06]

/** Recipe parts the block's example legitimately lacks (shown only for some props). */
const OPTIONAL: Record<string, RegExp> = {
  'tls.d.bar': /^$/,
  'tls.d.grouped-bar': /^bar\[\*\]\[\*\]\.value$/,
  'tls.d.stacked-bar': /^seg\[\*\]\[\*\]\.value$/,
  'tls.d.line': /^series\[\*\]\.seg\[\*\]$/,
  'tls.d.pie': /^$/,
  'tls.d.donut': /^label\[\*\](\.leader|\.pct)?$/,
  'tls.d.ranking': /^row\[\*\]\.note$/,
  'tls.d.table': /^rule\[\*\]$/,
  'tls.d.scorecard': /^rule\[\*\]$/,
  'tls.d.compare-table': /^rule\[\*\]$/,
  'tls.c.problem-solution': /^(problem|solution)$/,
  'tls.c.dashboard': /^chart\[(bar|seg|area|slice|dot)\]\[\*\]$/,
  'tls.c.chart-insight': /^chart\[(bar|seg|area|slice|dot)\]\[\*\]$/,
}

/** Leaves that ride the block's own fade on purpose: a chart's frame (gridlines, ticks, category
 *  labels, legend, tracks, bands), table backgrounds, a card's surface, headers of a tile. */
const FRAME: Record<string, RegExp> = {
  'tls.t.hero-number': /^$/,
  'tls.d.progress-bar': /^row\[\d+\]\.(label|track)$/,
  'tls.d.progress-ring': /^track$/,
  'tls.d.stat-compare': /^(left\.label|right\.label|caption)$/,
  'tls.d.gauge': /^tick\[\d+\](\.label)?$/,
  'tls.d.trend-badge': /^$/,
  'tls.d.bullet-chart': /^row\[\d+\]\.(label|band\[\d+\])$/,
  'tls.c.kpi-tile': /^label$/,
  'tls.c.kpi-row': /^$/,
  'tls.c.stat-card': /^background$/,
  'tls.c.dashboard': /^chart\[\d+\]$/,
  'tls.d.bar': /^(grid|ytick|xtick|cat)\[\d+\]$/,
  'tls.d.donut': /^legend\/(swatch|label)-\d+$|^track$/,
  'tls.d.line': /^(grid|ytick|cat)\[\d+\]$|^legend\//,
  'tls.d.area': /^(grid|ytick|cat)\[\d+\]$|^legend\//,
  'tls.d.grouped-bar': /^(grid|ytick|xtick|cat)\[\d+\]$|^legend\//,
  'tls.d.stacked-bar': /^(grid|ytick|xtick|cat)\[\d+\]$|^legend\//,
  'tls.d.pie': /^legend\//,
  'tls.d.sparkline': /^$/,
  'tls.d.waterfall': /^(grid|ytick|cat)\[\d+\]$/,
  'tls.d.funnel-chart': /^$/,
  'tls.d.scatter': /^(grid|ytick|xtick)\[\d+\]$/,
  'tls.d.radar': /^(grid|spoke|gridlabel|axis)\[\d+\]$/,
  'tls.d.slope': /^(head|rail)\.(start|end)$/,
  'tls.d.bubble': /^(grid|ytick|xtick)\[\d+\]$|^sizelegend/,
  'tls.d.heatmap': /^(col|row)\[\d+\]$|^legend\./,
  'tls.c.chart-insight': /^chart\[\d+\]$|^source$/,
  'tls.d.table': /^(head\.bg|zebra\[\d+\]|footer\.rule)$/,
  'tls.d.scorecard': /^rule-head$/,
  'tls.d.ranking': /^row\[\d+\]\.track$/,
  'tls.d.compare-table': /^(zebra\[\d+\]|winner|winner\.head)$/,
  'tls.d.pricing': /^$/,
  'tls.g.matrix-2x2': /^axis-(label|title)\[[a-z]+\]$/,
  'tls.g.swot': /^$/,
  'tls.g.pros-cons': /^divider$/,
  'tls.g.before-after': /^$/,
  'tls.g.iceberg': /^$/,
  'tls.c.comparison': /^\(no part\)$/, // a highlighted column's panel
  'tls.c.case-study': /^$/,
  'tls.c.problem-solution': /^$/,
}

const def = (type: string): BlockDefinition => {
  const d = BUILT_IN_BLOCKS.find((b) => b.type === type)
  if (!d) throw new Error(`not in BUILT_IN_BLOCKS: ${type}`)
  return d
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** The same part matching as `partElements` in motion/play-reveal.ts. */
const matcher = (p: string) =>
  p.includes('[*]')
    ? (x: string) => new RegExp('^' + p.split('[*]').map(esc).join('\\[\\d+\\]') + '$').test(x)
    : (x: string) => x === p || x.startsWith(p + '/') || (x.startsWith(p) && /^\[\d+\]/.test(x.slice(p.length)))

const exampleTree = (d: BlockDefinition): LayoutNode =>
  layoutAt(d, (d.describe?.example?.props ?? {}) as Record<string, unknown>, d.size.preferred[0], d.size.preferred[1])

/** Every part in the tree (document order), and every drawn leaf with the part chain above it. */
function partsOf(tree: LayoutNode): { parts: string[]; leaves: string[][] } {
  const parts: string[] = []
  const leaves: string[][] = []
  const walk = (n: LayoutNode, chain: string[]) => {
    const next = n.part ? [...chain, n.part] : chain
    if (n.part) parts.push(n.part)
    if (n.k === 'group') n.children.forEach((c) => walk(c, next))
    else leaves.push(next)
  }
  walk(tree, [])
  return { parts, leaves }
}

const expressive = (d: BlockDefinition) => {
  const spec = styleBlockMotion('expressive', d.motion, 1)!
  return { spec, block: resolveBlockMotion(spec, d.motion), parts: resolvePartMotion(spec, d.motion) }
}
const part = (pms: ResolvedPartMotion[], name: string) => {
  const p = pms.find((x) => x.partName === name)
  if (!p) throw new Error(`no recipe part ${name}`)
  return p
}

const layoutKind = ALL.filter((t) => def(t).kind !== 'html')

describe('RVM3 — the three groups are real blocks', () => {
  it('42 blocks, all in BUILT_IN_BLOCKS', () => {
    expect(ALL).toHaveLength(42)
    for (const t of ALL) expect(def(t).type).toBe(t)
  })
})

describe.each(layoutKind.map((t) => [t]))('RVM3 %s', (type) => {
  const d = def(type)
  const tree = exampleTree(d)
  const { parts, leaves } = partsOf(tree)
  const recipe = d.motion.parts ?? []

  it('every recipe part exists in the example; every drawn leaf is animated or is frame', () => {
    expect(recipe.length).toBeGreaterThan(0)
    expect(recipe).not.toContain('root')
    for (const p of recipe) {
      if (OPTIONAL[type]?.test(p)) continue
      expect([type, p, parts.some(matcher(p))]).toEqual([type, p, true])
    }
    const ms = recipe.map(matcher)
    const uncovered = leaves
      .filter((chain) => !chain.some((x) => ms.some((m) => m(x))))
      .map((c) => [...c].reverse().find((x) => x !== 'root') ?? '(no part)')
    const notFrame = [...new Set(uncovered)].filter((p) => !FRAME[type].test(p))
    expect([type, 'uncovered', notFrame]).toEqual([type, 'uncovered', []])
  })

  it('every partMotion key is a recipe part and names a real preset', () => {
    for (const k of Object.keys(d.motion.partMotion ?? {})) expect([type, k, recipe.includes(k)]).toEqual([type, k, true])
  })

  it('expressive: parts 150-900 ms on an out ease, stagger <= 120 ms, done within 2.5 s (J5)', () => {
    const { block, parts: pms } = expressive(d)
    expect(block.effect).toBe('fadeIn') // the frame fades; no block-level zoom or wipe
    expect(block.durationMs).toBeGreaterThanOrEqual(150)
    expect(block.durationMs).toBeLessThanOrEqual(900)
    let end = block.durationMs
    for (const pm of pms) {
      expect([type, pm.partName, pm.durationMs >= 150 && pm.durationMs <= 900]).toEqual([type, pm.partName, true])
      expect([type, pm.partName, pm.easing]).not.toEqual([type, pm.partName, 'linear'])
      expect([type, pm.partName, pm.easing]).not.toEqual([type, pm.partName, 'ease-in-out'])
      expect([type, pm.partName, (pm.staggerMs ?? 0) <= 120]).toEqual([type, pm.partName, true])
      const n = Math.max(1, parts.filter(matcher(pm.partName)).length)
      end = Math.max(end, pm.delayMs + (n - 1) * (pm.staggerMs ?? 0) + pm.durationMs)
    }
    expect([type, end]).toEqual([type, Math.min(end, 2500)])
  })

  it('subtle is a calm fade: opacity only, nothing counts (J7)', () => {
    const spec = styleBlockMotion('subtle', d.motion, 1)!
    expect(resolveBlockMotion(spec, d.motion).effect).toBe('fadeIn')
    for (const pm of resolvePartMotion(spec, d.motion)) {
      expect([type, pm.partName, Object.keys(pm.keyframes)]).toEqual([type, pm.partName, ['opacity']])
      expect(pm.presetId).toBe('fade')
    }
  })
})

/* ── J6: the right mark motion, and labels after their marks ─────────────────────────────────── */

/** block → mark part → the preset that grows / draws / sweeps it. */
const MARKS: Record<string, Record<string, string>> = {
  'tls.d.bar': { 'bar[*][*]': 'grow-bars-y' },
  'tls.d.grouped-bar': { 'bar[*][*]': 'grow-bars-y' },
  'tls.d.stacked-bar': { 'seg[*][*]': 'grow-segments' },
  'tls.d.waterfall': { 'bar[*]': 'grow-bars-y', 'connector[*]': 'wipe-x' },
  'tls.d.line': { 'series[*]': 'draw-path', 'series[*].seg[*]': 'draw-path' },
  'tls.d.area': { 'area[*]': 'wipe-x', 'area[*].edge': 'draw-path' },
  'tls.d.sparkline': { line: 'draw-path', fill: 'wipe-x' },
  'tls.d.radar': { 'series[*]': 'draw-path' },
  'tls.d.slope': { 'line[*]': 'draw-path' },
  'tls.d.pie': { 'slice[*]': 'sweep', 'label[*].leader': 'draw-path' },
  'tls.d.donut': { 'slice[*]': 'sweep', 'label[*].leader': 'draw-path' },
  'tls.d.progress-ring': { ring: 'sweep' },
  'tls.d.progress-bar': { 'row[*].fill': 'grow-bars-x' },
  'tls.d.bullet-chart': { 'row[*].bar': 'grow-bars-x' },
  'tls.d.ranking': { 'row[*].bar': 'grow-bars-x' },
  'tls.d.gauge': { 'bands[*]': 'wipe-x' },
  'tls.d.scatter': { 'point[*]': 'field-in', trend: 'draw-path' },
  'tls.d.bubble': { 'point[*]': 'field-in' },
  'tls.g.matrix-2x2': { 'axes[y]': 'wipe-y', 'axes[x]': 'wipe-x' },
  'tls.c.dashboard': { 'chart[bar][*]': 'grow-bars-y', 'chart[seg][*]': 'grow-segments', 'chart[line][*]': 'draw-path', 'chart[area][*]': 'wipe-x', 'chart[slice][*]': 'sweep' },
  'tls.c.chart-insight': { 'chart[bar][*]': 'grow-bars-y', 'chart[seg][*]': 'grow-segments', 'chart[line][*]': 'draw-path', 'chart[area][*]': 'wipe-x', 'chart[slice][*]': 'sweep' },
}

/** [block, label part, its mark part]: the label waits for the mark (same stagger, so label i
 *  follows mark i), starting once an out-eased mark is well along (>= 150 ms later). */
const LABEL_AFTER_MARK: Array<[string, string, string]> = [
  ['tls.d.bar', 'bar[*][*].value', 'bar[*][*]'],
  ['tls.d.grouped-bar', 'bar[*][*].value', 'bar[*][*]'],
  ['tls.d.stacked-bar', 'total[*]', 'seg[*][*]'],
  ['tls.d.stacked-bar', 'seg[*][*].value', 'seg[*][*]'],
  ['tls.d.waterfall', 'value[*]', 'bar[*]'],
  ['tls.d.line', 'label[*]', 'series[*]'],
  ['tls.d.radar', 'series[*].area', 'series[*]'],
  ['tls.d.slope', 'label[*].end', 'line[*]'],
  ['tls.d.slope', 'line[*].end', 'line[*]'],
  ['tls.d.sparkline', 'last', 'line'],
  ['tls.d.sparkline', 'dot', 'line'],
  ['tls.d.pie', 'label[*]', 'slice[*]'],
  ['tls.d.donut', 'label[*]', 'slice[*]'],
  ['tls.d.donut', 'centre.label', 'slice[*]'],
  ['tls.d.funnel-chart', 'dropoff[*]', 'stage[*]'],
  ['tls.d.funnel-chart', 'stage[*].label', 'stage[*]'],
  ['tls.d.scatter', 'label[*]', 'point[*]'],
  ['tls.d.bubble', 'label[*]', 'point[*]'],
  ['tls.d.progress-ring', 'label', 'ring'],
  ['tls.d.bullet-chart', 'row[*].target', 'row[*].bar'],
  ['tls.d.gauge', 'needle', 'bands[*]'],
  ['tls.g.matrix-2x2', 'qlabel[*]', 'axes[x]'],
  ['tls.g.matrix-2x2', 'item-label[*]', 'item[*]'],
  ['tls.c.dashboard', 'chart[label][*]', 'chart[line][*]'],
  ['tls.c.dashboard', 'insight', 'chart[line][*]'],
  ['tls.c.chart-insight', 'chart[label][*]', 'chart[bar][*]'],
  ['tls.c.chart-insight', 'insight', 'chart[line][*]'],
]

describe('RVM3 J6 — marks grow from the baseline, draw from their start, sweep from 12 o’clock', () => {
  it.each(Object.entries(MARKS).flatMap(([t, m]) => Object.entries(m).map(([p, preset]) => [t, p, preset])))('%s %s plays %s', (type, name, preset) => {
    expect(part(expressive(def(type)).parts, name).presetId).toBe(preset)
  })

  it.each(LABEL_AFTER_MARK)('%s: %s waits for %s', (type, label, mark) => {
    const pms = expressive(def(type)).parts
    const l = part(pms, label)
    const m = part(pms, mark)
    expect(l.delayMs - m.delayMs).toBeGreaterThanOrEqual(150)
    // an indexed label keeps pace with its own mark (never falls behind into the next one's slot)
    if (label.includes('[*]') && mark.includes('[*]')) expect(l.staggerMs ?? 0).toBeGreaterThanOrEqual(m.staggerMs ?? 0)
  })

  it('the bar charts no longer replace their grow with a fade (the RV05 workaround is gone)', () => {
    for (const t of ['tls.d.bar', 'tls.d.grouped-bar', 'tls.d.stacked-bar', 'tls.d.pie', 'tls.d.line', 'tls.d.area', 'tls.d.sparkline', 'tls.d.radar', 'tls.d.slope', 'tls.d.progress-bar', 'tls.d.bullet-chart', 'tls.d.progress-ring', 'tls.d.gauge']) {
      const presets = expressive(def(t)).parts.map((p) => p.presetId)
      expect([t, presets.some((p) => ['grow-bars-x', 'grow-bars-y', 'grow-segments', 'draw-path', 'sweep', 'wipe-x'].includes(p ?? ''))]).toEqual([t, true])
    }
  })
})

/* ── count-up ──────────────────────────────────────────────────────────────────────────────── */

/** block → the parts that count up under expressive (every other part never does). */
const COUNTS: Record<string, string[]> = {
  'tls.t.hero-number': ['value'],
  'tls.c.kpi-tile': ['value'],
  'tls.c.kpi-row': ['value'],
  'tls.c.stat-card': ['value'],
  // the pill (`delta`, a rect: no digits, nothing to count) plays its text's count-up entrance
  'tls.d.stat-compare': ['left.value', 'right.value', 'delta', 'delta.text'],
  'tls.d.trend-badge': ['badge.text'],
  'tls.d.progress-bar': ['row[*].value'],
  'tls.d.progress-ring': ['value'],
  'tls.d.bullet-chart': ['row[*].value'],
  'tls.d.gauge': ['value'],
  'tls.d.donut': ['centre'],
  'tls.d.funnel-chart': ['stage[*].value'],
  'tls.d.ranking': ['row[*].value'],
  'tls.d.pricing': ['price[*]'],
  'tls.c.case-study': ['metric'],
}

describe('RVM3 count-up — numbers count, nothing else does', () => {
  it.each(Object.entries(COUNTS))('%s counts %j', (type, counted) => {
    const pms = expressive(def(type)).parts
    expect(pms.filter((p) => p.presetId === 'count-up').map((p) => p.partName).sort()).toEqual([...counted].sort())
    for (const name of counted) expect(part(pms, name).easing).not.toBe('linear')
  })

  it('a count-up block no longer zooms in from 0.7 as a whole (block preset count-up)', () => {
    for (const t of Object.keys(COUNTS)) {
      const d = def(t)
      expect([t, d.motion.preset, d.motion.expressive]).not.toContain('count-up')
    }
  })

  it('captions with digits are never counted (hero-number "FY2024 total")', () => {
    expect(part(expressive(def('tls.t.hero-number')).parts, 'caption').presetId).toBe('fade-up')
  })
})

/* ── tables and comparisons ────────────────────────────────────────────────────────────────── */

describe('RVM3 tables — the header first, then the rows in reading order', () => {
  it.each(['tls.d.table', 'tls.d.scorecard', 'tls.d.compare-table'])('%s', (type) => {
    const d = def(type)
    const pms = expressive(d).parts
    const head = part(pms, 'head')
    const rows = part(pms, 'row[*]')
    expect(head.delayMs).toBe(0)
    expect(rows.delayMs).toBeGreaterThan(head.delayMs)
    expect(rows.staggerMs!).toBeGreaterThan(0)
    expect(rows.staggerMs!).toBeLessThanOrEqual(120)
    // the example's rows are emitted top to bottom
    const tree = exampleTree(d)
    const ys: number[] = []
    const walk = (n: LayoutNode, inRow: boolean) => {
      const row = /^row\[\d+\]$/.test(n.part ?? '')
      if (row) ys.push(Infinity)
      if (n.k === 'group') n.children.forEach((c) => walk(c, inRow || row))
      else if (inRow && ys[ys.length - 1] === Infinity) ys[ys.length - 1] = n.box.y
    }
    walk(tree, false)
    expect(ys.length).toBeGreaterThan(1)
    expect([...ys].sort((a, b) => a - b)).toEqual(ys)
  })

  it('tls.d.table: the footer row is the next row[n] inside its footer group (it follows the body)', () => {
    const tree = exampleTree(def('tls.d.table')) as Extract<LayoutNode, { k: 'group' }>
    const footer = tree.children.find((c) => c.part === 'footer') as Extract<LayoutNode, { k: 'group' }>
    expect(footer).toBeDefined()
    const bodyRows = tree.children.filter((c) => /^row\[\d+\]$/.test(c.part ?? '')).length
    expect(footer.children.map((c) => c.part)).toEqual([`row[${bodyRows}]`])
  })

  it('ranking rows come in top to bottom, the bar growing while its value counts', () => {
    const pms = expressive(def('tls.d.ranking')).parts
    expect(part(pms, 'row[*].bar').delayMs).toBe(part(pms, 'row[*].value').delayMs)
    expect(new Set(pms.map((p) => p.staggerMs))).toEqual(new Set([100]))
  })
})

describe('RVM3 comparisons — side by side, consistently', () => {
  it('pros-cons and before-after: the pair enters from both sides together and settles at 0', () => {
    for (const [t, l, r] of [['tls.g.pros-cons', 'pros', 'cons'], ['tls.g.before-after', 'before', 'after']]) {
      const pms = expressive(def(t)).parts
      const a = part(pms, l)
      const b = part(pms, r)
      expect([a.keyframes.translate, b.keyframes.translate]).toEqual([['-24px 0', '0 0'], ['24px 0', '0 0']])
      expect(a.delayMs).toBe(b.delayMs)
    }
    expect(part(expressive(def('tls.g.pros-cons')).parts, 'verdict').delayMs).toBeGreaterThanOrEqual(250)
    expect(part(expressive(def('tls.g.before-after')).parts, 'arrow').delayMs).toBeGreaterThanOrEqual(200)
  })

  it('tls.c.comparison emits its content row by row across the columns, bullets with their items', () => {
    const { parts } = partsOf(exampleTree(def('tls.c.comparison')))
    const items = parts.filter((p) => /\.item\[\d+\]$/.test(p))
    const keys = items.map((p) => {
      const m = /^col\[(\d+)\]\.item\[(\d+)\]$/.exec(p)!
      return Number(m[2]) * 100 + Number(m[1])
    })
    expect(keys).toEqual([...keys].sort((a, b) => a - b))
    expect(parts.filter((p) => /\.bullet\[\d+\]$/.test(p)).length).toBe(items.length)
    const pms = expressive(def('tls.c.comparison')).parts
    expect(part(pms, 'col[*].bullet[*]').delayMs).toBe(part(pms, 'col[*].item[*]').delayMs)
    expect(part(pms, 'col[*].bullet[*]').staggerMs).toBe(part(pms, 'col[*].item[*]').staggerMs)
  })

  it('panels and plans go left to right, one stagger (<= 120 ms) apart', () => {
    for (const [t, p] of [['tls.d.pricing', 'plan[*]'], ['tls.c.case-study', 'panel'], ['tls.c.problem-solution', 'panel'], ['tls.g.swot', 'quad[*]']]) {
      const s = part(expressive(def(t)).parts, p).staggerMs!
      expect([t, s > 0 && s <= 120]).toEqual([t, true])
    }
  })

  it('swot cards are tagged quad[0..3] in reading order', () => {
    const { parts } = partsOf(exampleTree(def('tls.g.swot')))
    expect(parts.filter((p) => /^quad\[\d+\]$/.test(p))).toEqual(['quad[0]', 'quad[1]', 'quad[2]', 'quad[3]'])
  })
})

/* ── layout support for the sweeps and the composites' charts ─────────────────────────────────── */

describe('RVM3 layout support', () => {
  it('progress-ring: the arc and its caps sit in a `ring` group with an unpainted full-ring guide', () => {
    const tree = exampleTree(def('tls.d.progress-ring')) as Extract<LayoutNode, { k: 'group' }>
    const ring = tree.children.find((c) => c.part === 'ring') as Extract<LayoutNode, { k: 'group' }>
    expect(ring).toBeDefined()
    const guide = ring.children[0] as Extract<LayoutNode, { k: 'path' }>
    expect(guide.k).toBe('path')
    expect(guide.fill).toBeUndefined()
    expect(guide.stroke).toBeUndefined()
    expect(ring.children.map((c) => c.part)).toEqual([undefined, 'arc', 'arc.start', 'arc.end'])
    // the track stays outside: it does not sweep
    expect(tree.children.some((c) => c.part === 'track')).toBe(true)
  })

  it('chartRole sorts the chart blocks’ parts into marks, labels and frame', () => {
    expect(['bar[0][1]', 'seg[1][0]', 'series[0]', 'series[0].seg[1]', 'area[1]', 'area[0].edge', 'slice[2]', 'series[0].dot[3]'].map(chartRole)).toEqual(['bar', 'seg', 'line', 'line', 'area', 'line', 'slice', 'dot'])
    expect(['bar[0][1].value', 'total[0]', 'label[0]', 'label[1].pct', 'label[0].leader', 'centre', 'centre.label'].map(chartRole)).toEqual(Array(7).fill('label'))
    expect(['grid[0]', 'ytick[2]', 'cat[1]', 'legend/swatch-0', 'track'].map(chartRole)).toEqual(Array(5).fill('frame'))
  })

  it('dashboard and chart-insight keep `chart[` names and tag the line mark', () => {
    for (const t of ['tls.c.dashboard', 'tls.c.chart-insight']) {
      const { parts } = partsOf(exampleTree(def(t)))
      expect(parts.some((p) => p === 'chart[line][0]')).toBe(true)
      expect(parts.filter((p) => p.startsWith('chart')).every((p) => p.startsWith('chart['))).toBe(true)
    }
  })
})

/* ── html blocks ───────────────────────────────────────────────────────────────────────────── */

describe('RVM3 html metric blocks', () => {
  const mount = (type: string) => {
    const d = def(type)
    const root = document.createElement('div')
    document.body.appendChild(root)
    root.innerHTML = d.html!.template(JSON.parse(JSON.stringify(d.describe!.example.props)), tplCtx(1200, 600))
    return { d, root }
  }
  const rt = (driver: BlockMotionRuntime['driver'], style: 'subtle' | 'expressive', gsap?: unknown): BlockMotionRuntime => ({
    driver,
    ...(gsap ? { gsap } : {}),
    timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    reducedMotion: false,
    style,
    onComplete: () => undefined,
  })
  const durations = (g: ReturnType<typeof fakeGsap>) =>
    g.tweens.map((t) => (t.vars[t.op === 'fromTo' ? 1 : 0] as { duration?: number }).duration).filter((x): x is number => x !== undefined)

  it('big-stat: the number fades in over >= 150 ms and counts for 800 ms; every tween inside 150-900 ms', () => {
    const { d, root } = mount('tls.c.big-stat')
    const g = fakeGsap()
    // big-stat waits for its timeline with `then`
    const gsap = { timeline: (v?: Record<string, unknown>) => Object.assign(g.gsap.timeline(v), { then: (cb?: () => void) => Promise.resolve().then(cb) }) }
    d.html!.animate!(root, rt(recordingDriver().driver, 'expressive', gsap))
    const ds = durations(g)
    expect(ds.length).toBeGreaterThanOrEqual(3)
    for (const s of ds) {
      expect(s).toBeGreaterThanOrEqual(0.15)
      expect(s).toBeLessThanOrEqual(0.9)
    }
    expect(BIG_STAT_TIMING.countMs).toBe(800)
    root.remove()
  })

  it('big-stat (driver path): the count keeps the target format and ends on the exact text', () => {
    const { d, root } = mount('tls.c.big-stat')
    const value = root.querySelector<HTMLElement>('[data-part="value"]')!
    const final = value.textContent
    const seen: string[] = []
    const rec = recordingDriver()
    const driver = {
      ...rec.driver,
      play: (t: Element, k: never, o: { onUpdate?: (p: number) => void }) => {
        if (o.onUpdate) {
          o.onUpdate(0.5)
          seen.push(`${value.textContent}|${value.style.fontVariantNumeric}`)
        }
        return rec.driver.play(t, k, o as never)
      },
    }
    d.html!.animate!(root, rt(driver as never, 'expressive'))
    expect(seen.length).toBe(1)
    expect(seen[0]).toMatch(/\|tabular-nums$/)
    expect(value.textContent).toBe(final)
    expect(value.style.fontVariantNumeric).toBe('')
    root.remove()
  })

  it('stat-spotlight: tweens inside 900 ms, a stat stagger <= 120 ms, the chain within 2.5 s', () => {
    const { d, root } = mount('tls.c.stat-spotlight')
    const g = fakeGsap()
    d.html!.animate!(root, rt(recordingDriver().driver, 'expressive', g.gsap))
    for (const s of durations(g)) expect(s).toBeLessThanOrEqual(0.9)
    expect(SPOT.stats.stagger).toBeLessThanOrEqual(0.12)
    expect(STAT_SPOTLIGHT_MS).toBeLessThanOrEqual(2500)
    expect(d.motion.expressiveMs).toBe(STAT_SPOTLIGHT_MS)
    // the drawn arc has no transform of its own and rests fully drawn (dash offset 0), and the stat
    // parts carry no padding (a tween's style rewrite would touch a layout property)
    const arc = root.querySelector<SVGElement>('[data-arc]')!
    expect(arc.getAttribute('transform')).toBeNull()
    expect(arc.style.strokeDashoffset).toBe('0')
    const draw = g.tweens.find((t) => t.target === arc)!
    expect([(draw.vars[0] as any).strokeDashoffset, (draw.vars[1] as any).strokeDashoffset]).toEqual([Number(arc.getAttribute('data-length')), 0])
    for (const s of Array.from(root.querySelectorAll<HTMLElement>('[data-part^="stat["]'))) expect(s.style.padding).toBe('')
    root.remove()
  })

  it('feature-reveal (G01, raised by M1b): cards stagger at most 120 ms', () => {
    const { d, root } = mount('tls.c.feature-reveal')
    const g = fakeGsap()
    d.html!.animate!(root, rt(recordingDriver().driver, 'expressive', g.gsap))
    const cards = g.tweens.filter((t) => /^card\[/.test((t.target as Element).getAttribute?.('data-part') ?? ''))
    const at = cards.map((t) => t.vars[2] as number)
    expect(at.length).toBeGreaterThan(1)
    for (let i = 1; i < at.length; i++) expect(at[i] - at[i - 1]).toBeCloseTo(CARD_STAGGER, 5)
    expect(CARD_STAGGER).toBeLessThanOrEqual(0.12)
    expect(FEATURE_REVEAL_MS).toBeLessThanOrEqual(2000)
    root.remove()
  })
})
