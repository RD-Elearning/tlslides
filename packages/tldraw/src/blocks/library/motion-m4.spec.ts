/**
 * RVM4 — motion smoothness for G07 process/timeline and G08 hierarchy/relationship
 * (reviews/blocks/block-review/MOTION.md §1, criteria J1–J8).
 *
 * Pinned per block without a browser, from the layout tree (document order = the order the motion
 * engine staggers the elements one recipe part matches) and the resolved expressive recipe:
 * - every recipe part exists in the example and every drawn leaf sits under an animated part;
 * - J5 with the example *and* with the maximum item count: each part 150–900 ms on an out ease,
 *   a stagger of at most 120 ms, the whole chain within 2.5 s (3.5 s for the slide-scope steps);
 *   `subtle` is opacity only (J7);
 * - choreography: connectors draw on (draw-path / wipe) after the node they leave and no later
 *   than the node they reach; nodes come in reading / flow order (timeline left to right, tree
 *   root to leaves, mind map centre out, cycle and hub clockwise from 12 o'clock); a label never
 *   starts before its own shape.
 */

import type { BlockDefinition, BlockMotionRuntime, LayoutNode } from '../types'
import { BUILT_IN_BLOCKS } from './index'
import { layoutAt } from './composite/composite-test'
import { styleBlockMotion } from '../motion/motion-style'
import { resolveBlockMotion, resolvePartMotion, type ResolvedPartMotion } from '../motion/resolve-motion'
import { JOURNEY_MS } from './composite/tls-c-journey/animate'
import { tplCtx, recordingDriver, fakeGsap } from './composite/showcase-test'

const G07 = ['tls.g.steps', 'tls.g.chevrons', 'tls.g.cycle', 'tls.g.funnel', 'tls.g.flow', 'tls.c.steps', 'tls.g.timeline', 'tls.g.roadmap', 'tls.g.milestones', 'tls.c.journey']
const G08 = ['tls.g.tree', 'tls.g.pyramid', 'tls.g.layers', 'tls.g.breakdown', 'tls.g.mindmap', 'tls.g.venn', 'tls.g.hub-spoke', 'tls.g.bracket']
const LAYOUT = [...G07, ...G08].filter((t) => t !== 'tls.c.journey')

const def = (type: string): BlockDefinition => {
  const d = BUILT_IN_BLOCKS.find((b) => b.type === type)
  if (!d) throw new Error(`not in BUILT_IN_BLOCKS: ${type}`)
  return d
}

/** Recipe parts the example legitimately lacks (another orientation, icons, arrow heads). */
const OPTIONAL: Record<string, RegExp> = {
  'tls.g.funnel': /^col\[\*\]$/,
  'tls.g.timeline': /^(rail-y|stem\[\*\])$/,
  'tls.g.milestones': /^rail-y$/,
  'tls.g.hub-spoke': /^(hub\.icon|tip\[\*\])$/,
  'tls.g.cycle': /^arrow\[\*\]\.head$/,
}
/** Leaves that ride the block fade on purpose (the roadmap's lane bands, grid and lane names). */
const FRAME: Record<string, RegExp> = { 'tls.g.roadmap': /^(lane\[\d+\](\.name)?|grid\[\d+\])$/ }

const w = (n: number, base: string) => Array.from({ length: n }, (_, i) => `${base} ${i + 1}`)
/** Props at the schema's maximum item count, for the J5 budget. */
const MAX_PROPS: Record<string, Record<string, unknown>> = {
  'tls.g.steps': { steps: w(8, 'Step').map((t) => ({ title: t, description: 'One short line' })), connector: 'arrow' },
  'tls.g.chevrons': { steps: w(7, 'Phase').map((l) => ({ label: l, text: 'Note' })) },
  'tls.g.cycle': { steps: w(6, 'Stage').map((l) => ({ label: l, text: 'Note' })), center: 'Loop' },
  'tls.g.funnel': { stages: w(6, 'Stage').map((l) => ({ label: l, text: 'Note' })) },
  'tls.g.flow': {
    nodes: Array.from({ length: 12 }, (_, i) => ({ id: `n${i}`, label: `Step ${i + 1}`, kind: i === 0 ? 'start' : i === 11 ? 'end' : 'step' })),
    edges: [...Array.from({ length: 11 }, (_, i) => ({ from: `n${i}`, to: `n${i + 1}` })), ...[11, 9, 7, 5, 3].map((i) => ({ from: `n${i}`, to: `n${i - 3}`, label: 'Back' }))],
  },
  'tls.c.steps': { steps: w(12, 'Step').map((t) => ({ title: t, desc: 'One short line' })) },
  'tls.g.timeline': { events: w(8, 'Event').map((t, i) => ({ date: String(2017 + i), title: t, text: 'Note' })), nowIndex: 4 },
  'tls.g.roadmap': {
    periods: w(12, 'M'),
    lanes: w(6, 'Lane').map((name) => ({ name, items: [0, 2, 4, 6, 8].map((s) => ({ label: 'Item', start: s, end: s + 1, status: 'active' })) })),
    todayAt: 5,
  },
  'tls.g.milestones': { items: w(8, 'Gate').map((label, i) => ({ date: `M${i + 1}`, label, done: i < 3 })) },
  'tls.g.tree': {
    root: { label: 'Root', children: [0, 1, 2].map((i) => ({ label: `A${i}`, children: [0, 1, 2].map((j) => ({ label: `B${i}${j}` })) })).concat([{ label: 'A3', children: [{ label: 'B30' }, { label: 'B31' }] } as any]) },
  },
  'tls.g.pyramid': { levels: w(6, 'Level').map((l) => ({ label: l, text: 'Note' })) },
  'tls.g.layers': { layers: w(7, 'Layer').map((l) => ({ label: l, text: 'Note' })) },
  'tls.g.breakdown': { whole: { label: 'Total', value: '$600k' }, parts: w(6, 'Part').map((l) => ({ label: l, value: '$100k' })) },
  'tls.g.mindmap': { center: 'Centre', branches: w(6, 'Topic').map((label) => ({ label, children: w(4, 'Sub') })) },
  'tls.g.venn': { sets: [{ label: 'A' }, { label: 'B' }, { label: 'C' }], overlap: 'All' },
  'tls.g.hub-spoke': { hub: { label: 'Hub' }, spokes: w(8, 'Spoke').map((label) => ({ label, text: 'Note' })) },
  'tls.g.bracket': { label: 'Group', items: w(6, 'Item') },
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** The same part matching as `partElements` in motion/play-reveal.ts. */
const matcher = (p: string) =>
  p.includes('[*]')
    ? (x: string) => new RegExp('^' + p.split('[*]').map(esc).join('\\[\\d+\\]') + '$').test(x)
    : (x: string) => x === p || x.startsWith(p + '/') || (x.startsWith(p) && /^\[\d+\]/.test(x.slice(p.length)))

const expressive = (d: BlockDefinition) => {
  const spec = styleBlockMotion('expressive', d.motion, 1)!
  return { block: resolveBlockMotion(spec, d.motion), parts: resolvePartMotion(spec, d.motion) }
}

const treeOf = (d: BlockDefinition, props?: Record<string, unknown>): LayoutNode =>
  layoutAt(d, { ...((d.describe?.example?.props ?? {}) as Record<string, unknown>), ...(props ?? {}) }, d.size.preferred[0], d.size.preferred[1])

interface Timed {
  /** part chain from the root (named nodes only) */
  chain: string[]
  /** when the leaf can first show: the latest start among its animated ancestors (ms) */
  start: number
  /** when every animation above it has ended (ms) */
  end: number
  k: LayoutNode['k']
}

/** Every drawn leaf with its start / end under the expressive recipe (document-order stagger). */
function timeline(d: BlockDefinition, tree: LayoutNode): Timed[] {
  const pms = expressive(d).parts
  const counters = new Map<ResolvedPartMotion, number>()
  const out: Timed[] = []
  const walk = (n: LayoutNode, chain: string[], start: number, end: number) => {
    let s = start
    let e = end
    if (n.part) {
      for (const pm of pms) {
        if (!matcher(pm.partName)(n.part)) continue
        const i = counters.get(pm) ?? 0
        counters.set(pm, i + 1)
        const t = pm.delayMs + i * (pm.staggerMs ?? 0)
        s = Math.max(s, t)
        e = Math.max(e, t + pm.durationMs)
      }
    }
    const next = n.part ? [...chain, n.part] : chain
    if (n.k === 'group') n.children.forEach((c) => walk(c, next, s, e))
    else out.push({ chain: next, start: s, end: e, k: n.k })
  }
  walk(tree, [], 0, 0)
  return out
}

const leaf = (tl: Timed[], part: string) => {
  const t = tl.find((x) => x.chain[x.chain.length - 1] === part)
  if (!t) throw new Error(`no leaf ${part}`)
  return t
}
const leaves = (tl: Timed[], re: RegExp) => tl.filter((x) => re.test(x.chain[x.chain.length - 1]))

describe('RVM4 — the two groups are real blocks', () => {
  it('18 blocks, all in BUILT_IN_BLOCKS', () => {
    expect(G07.length + G08.length).toBe(18)
    for (const t of [...G07, ...G08]) expect(def(t).type).toBe(t)
  })
})

describe.each(LAYOUT.map((t) => [t]))('RVM4 %s', (type) => {
  const d = def(type)
  const recipe = d.motion.parts ?? []

  it('every recipe part exists in the example; every drawn leaf is animated', () => {
    const tree = treeOf(d)
    const parts: string[] = []
    const walk = (n: LayoutNode) => {
      if (n.part) parts.push(n.part)
      if (n.k === 'group') n.children.forEach(walk)
    }
    walk(tree)
    for (const p of recipe) {
      if (OPTIONAL[type]?.test(p)) continue
      expect([type, p, parts.some(matcher(p))]).toEqual([type, p, true])
    }
    const ms = recipe.map(matcher)
    const uncovered = timeline(d, tree)
      .filter((t) => !t.chain.some((x) => ms.some((m) => m(x))))
      .map((t) => t.chain[t.chain.length - 1] ?? '(no part)')
      .filter((p) => !FRAME[type]?.test(p) && p !== 'root')
    expect([type, 'uncovered', [...new Set(uncovered)]]).toEqual([type, 'uncovered', []])
    for (const k of Object.keys(d.motion.partMotion ?? {})) expect([type, k, recipe.includes(k)]).toEqual([type, k, true])
  })

  it.each([['example'], ['max items']])('expressive J5 (%s): 150–900 ms, out ease, stagger <= 120 ms, in budget', (which) => {
    const { block, parts: pms } = expressive(d)
    expect(block.effect).toBe('fadeIn')
    for (const pm of pms) {
      expect([type, pm.partName, pm.durationMs >= 150 && pm.durationMs <= 900]).toEqual([type, pm.partName, true])
      expect([type, pm.partName, pm.easing]).not.toEqual([type, pm.partName, 'linear'])
      expect([type, pm.partName, (pm.staggerMs ?? 0) <= 120]).toEqual([type, pm.partName, true])
    }
    const tl = timeline(d, treeOf(d, which === 'max items' ? MAX_PROPS[type] : undefined))
    const end = Math.max(block.durationMs, ...tl.map((t) => t.end))
    const budget = d.scope === 'slide' ? 3500 : 2500
    expect([type, which, end <= budget]).toEqual([type, which, true])
  })

  it('subtle is a calm fade: opacity only (J7)', () => {
    const spec = styleBlockMotion('subtle', d.motion, 1)!
    for (const pm of resolvePartMotion(spec, d.motion)) expect([type, pm.partName, Object.keys(pm.keyframes)]).toEqual([type, pm.partName, ['opacity']])
  })
})

/* ── connectors draw on, from source to target ────────────────────────────────────────────────── */

const preset = (type: string, part: string) => expressive(def(type)).parts.find((p) => p.partName === part)?.presetId

describe('RVM4 connectors draw on (J6) and labels wait for their shape', () => {
  it.each([
    ['tls.g.steps', 'step[*].connector', 'wipe-x'],
    ['tls.c.steps', 'connector[*]', 'wipe-x'],
    ['tls.g.cycle', 'arrow[*]', 'draw-path'],
    ['tls.g.flow', 'out[*]', 'draw-path'],
    ['tls.g.tree', 'links[*]', 'draw-path'],
    ['tls.g.mindmap', 'arm[*]', 'draw-path'],
    ['tls.g.mindmap', 'twigs[*]', 'draw-path'],
    ['tls.g.hub-spoke', 'wire[*]', 'draw-path'],
    ['tls.g.breakdown', 'bracket', 'draw-path'],
    ['tls.g.bracket', 'brace', 'draw-path'],
    ['tls.g.timeline', 'rail-x', 'wipe-x'],
    ['tls.g.timeline', 'rail-y', 'wipe-down'],
    ['tls.g.milestones', 'rail-x', 'wipe-x'],
    ['tls.g.chevrons', 'seg[*]', 'wipe-x'],
    ['tls.g.funnel', 'seg[*]', 'wipe-down'],
    ['tls.g.layers', 'slab[*]', 'wipe-x'],
    ['tls.g.roadmap', 'bar[*][*]', 'grow-bars-x'],
  ])('%s %s plays %s', (type, part, p) => expect(preset(type, part)).toBe(p))

  it('flow: every edge draws after its source layer and no later than its target (example and 12 layers)', () => {
    const d = def('tls.g.flow')
    for (const props of [undefined, MAX_PROPS['tls.g.flow']]) {
      const p = { ...((d.describe!.example!.props ?? {}) as Record<string, unknown>), ...(props ?? {}) } as { nodes: { id: string }[]; edges: { from: string; to: string; label?: string }[] }
      const tl = timeline(d, treeOf(d, props))
      const node = (id: string) => leaf(tl, `node[${p.nodes.findIndex((n) => n.id === id)}]`)
      p.edges.forEach((e, i) => {
        const stem = leaf(tl, `edge[${i}]`)
        expect(stem.start).toBeGreaterThan(node(e.from).start)
        if (node(e.to).start > node(e.from).start) expect(stem.start).toBeLessThanOrEqual(node(e.to).start)
        expect(leaf(tl, `edge[${i}].head`).start).toBeGreaterThanOrEqual(stem.start + 150)
        for (const l of leaves(tl, new RegExp(`^edge\\[${i}\\]\\.label$`))) expect(l.start).toBeGreaterThanOrEqual(stem.start + 150)
      })
    }
  })

  it('tree: root first, a level per step, each link after its parent and no later than its child', () => {
    const d = def('tls.g.tree')
    const tl = timeline(d, treeOf(d, MAX_PROPS['tls.g.tree']))
    const depth = (id: string) => id.split('-').length - 1
    for (const n of leaves(tl, /^node\[[\d-]+\]$/)) {
      const id = n.chain[n.chain.length - 1].slice(5, -1)
      expect(n.start).toBe(depth(id) * 120)
    }
    for (const l of leaves(tl, /^link\[[\d-]+\]$/)) {
      const child = l.chain[l.chain.length - 1].slice(5, -1)
      const parent = child.split('-').slice(0, -1).join('-')
      expect(l.start).toBeGreaterThan(leaf(tl, `node[${parent}]`).start)
      expect(l.start).toBeLessThanOrEqual(leaf(tl, `node[${child}]`).start)
    }
  })

  it('mind map: centre, then per branch the arm, the topic, the twigs and the sub-topics', () => {
    const d = def('tls.g.mindmap')
    const tl = timeline(d, treeOf(d, MAX_PROPS['tls.g.mindmap']))
    const centre = leaf(tl, 'center').start
    for (let i = 0; i < 6; i++) {
      const arm = leaf(tl, `link[${i}]`).start
      const topic = leaf(tl, `branch[${i}]`).start
      expect(arm).toBeGreaterThan(centre)
      expect(topic).toBeGreaterThan(arm)
      expect(leaf(tl, `branch[${i}].label`).start).toBeGreaterThanOrEqual(topic)
      for (let j = 0; j < 4; j++) {
        const twig = leaf(tl, `link[${i}][${j}]`).start
        expect(twig).toBeGreaterThan(topic)
        expect(leaf(tl, `child[${i}][${j}]`).start).toBeGreaterThan(twig)
      }
    }
  })

  it('cycle: nodes clockwise from 12 o’clock, each arrow after its node and no later than the next', () => {
    const d = def('tls.g.cycle')
    const tree = treeOf(d, MAX_PROPS['tls.g.cycle'])
    const tl = timeline(d, tree)
    const nodes = leaves(tl, /^node\[\d+\]$/)
    expect(nodes.map((n) => n.start)).toEqual([...nodes.map((n) => n.start)].sort((a, b) => a - b))
    const n = nodes.length
    for (const a of leaves(tl, /^arrow\[\d+\]$/)) {
      const i = Number(a.chain[a.chain.length - 1].slice(6, -1))
      expect(a.start).toBeGreaterThan(leaf(tl, `node[${i}]`).start)
      if (i + 1 < n) expect(a.start).toBeLessThanOrEqual(leaf(tl, `node[${i + 1}]`).start)
    }
    for (const l of leaves(tl, /^(label|text|num)\[\d+\]$/)) {
      const i = /\[(\d+)\]$/.exec(l.chain[l.chain.length - 1])![1]
      expect(l.start).toBeGreaterThan(leaf(tl, `node[${i}]`).start)
    }
  })

  it('hub and spoke: the hub, then each spoke wire before its card, labels after the card', () => {
    const d = def('tls.g.hub-spoke')
    const tl = timeline(d, treeOf(d, MAX_PROPS['tls.g.hub-spoke']))
    for (let i = 0; i < 8; i++) {
      const wire = leaf(tl, `link[${i}]`).start
      const card = leaf(tl, `spoke[${i}]`).start
      expect(wire).toBeGreaterThan(leaf(tl, 'hub').start)
      expect(card).toBeGreaterThan(wire)
      expect(leaf(tl, `label[${i}]`).start).toBeGreaterThan(card)
    }
  })

  it.each([
    ['tls.g.chevrons', /^(label|text)\[(\d+)\]$/, (i: string) => `chevron[${i}]`],
    ['tls.g.funnel', /^(label|note|leader)\[(\d+)\]$/, (i: string) => `stage[${i}]`],
    ['tls.g.pyramid', /^(label|note|leader|side)\[(\d+)\]$/, (i: string) => `level[${i}]`],
    ['tls.g.layers', /^(label|note)\[(\d+)\]$/, (i: string) => `layer[${i}]`],
    ['tls.g.timeline', /^(date|title|text)\[(\d+)\]$/, (i: string) => `node[${i}]`],
    ['tls.g.milestones', /^(date|label)\[(\d+)\]$/, (i: string) => `ms[${i}]`],
    ['tls.g.venn', /^text\[(\d+)\]()\.label$/, (i: string) => `disc[${i}]`],
  ])('%s: every label starts after its own shape, also with one text missing', (type, re, owner) => {
    const d = def(type)
    const props = { ...MAX_PROPS[type] }
    // drop the note / date of the second item: later labels must not move a slot early
    for (const k of ['steps', 'stages', 'levels', 'layers', 'events', 'items']) {
      const list = props[k] as Record<string, unknown>[] | undefined
      if (Array.isArray(list)) props[k] = list.map((x, i) => (i === 1 ? { ...x, text: '', date: '' } : x))
    }
    const tl = timeline(d, treeOf(d, props))
    let n = 0
    for (const l of tl) {
      const m = re.exec(l.chain[l.chain.length - 1] ?? '')
      if (!m) continue
      const i = m[2] !== undefined && m[2] !== '' ? m[2] : m[1]
      expect([type, l.chain[l.chain.length - 1], l.start > leaf(tl, owner(i)).start]).toEqual([type, l.chain[l.chain.length - 1], true])
      n++
    }
    expect(n).toBeGreaterThan(0)
  })

  it('timeline: events left to right after the axis; roadmap bars lane by lane, each label after its bar', () => {
    const t = def('tls.g.timeline')
    const tl = timeline(t, treeOf(t))
    const nodes = leaves(tl, /^node\[\d+\]$/)
    expect(nodes.every((n) => n.start > leaf(tl, 'axis').start)).toBe(true)
    expect(nodes.map((n) => n.start)).toEqual([...nodes.map((n) => n.start)].sort((a, b) => a - b))
    const r = def('tls.g.roadmap')
    const rl = timeline(r, treeOf(r))
    for (const b of leaves(rl, /^bar\[\d+\]\[\d+\]$/)) expect(leaf(rl, `${b.chain[b.chain.length - 1]}.label`).start).toBeGreaterThan(b.start)
    // the roadmap bar origin is authored so the zero-line heuristic never re-plans it
    expect(r.motion.partMotion!['bar[*][*]'].origin).toBe('left center')
  })
})

describe('RVM4 tls.c.journey (html, own GSAP timeline)', () => {
  it('every tween is 150-900 ms on a non-linear ease, ends at rest (no set), within JOURNEY_MS', () => {
    const d = def('tls.c.journey')
    const root = document.createElement('div')
    document.body.appendChild(root)
    root.innerHTML = d.html!.template(JSON.parse(JSON.stringify(d.describe!.example.props)), tplCtx(1600, 700))
    const g = fakeGsap()
    const rt: BlockMotionRuntime = {
      driver: recordingDriver().driver,
      gsap: g.gsap,
      timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      reducedMotion: false,
      style: 'expressive',
      onComplete: () => undefined,
    } as BlockMotionRuntime
    d.html!.animate!(root, rt)
    expect(g.tweens.length).toBeGreaterThan(3)
    expect(g.tweens.filter((t) => t.op === 'set')).toHaveLength(0) // the halo used to snap back to rest
    let end = 0
    for (const t of g.tweens) {
      const to = t.vars[1] as { duration: number; ease: string; opacity?: number; scale?: number }
      expect(to.duration).toBeGreaterThanOrEqual(0.15)
      expect(to.duration).toBeLessThanOrEqual(0.9)
      expect(to.ease).not.toBe('none')
      if (to.opacity !== undefined) expect(to.opacity).toBe(1)
      if (to.scale !== undefined) expect(to.scale).toBe(1)
      end = Math.max(end, (t.vars[2] as number) + to.duration)
    }
    expect(end * 1000).toBeLessThanOrEqual(JOURNEY_MS)
    expect(JOURNEY_MS).toBeLessThanOrEqual(2500)
    expect(d.motion.expressiveMs).toBe(JOURNEY_MS)
    root.remove()
  })
})
