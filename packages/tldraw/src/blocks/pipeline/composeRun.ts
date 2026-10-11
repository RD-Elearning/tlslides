/**
 * CMP4 — the random-composition dry run (`reviews/blocks/composition/README.md` CMP4).
 *
 * Stands in for an LLM composing freely: a seeded generator writes grammar-valid compositions
 * (`composition-grammar.ts`) of the kinds an LLM reaches for — peer cards or columns of atoms, a
 * split of text beside a visual, a type lockup, a lockup on a photo, a path of steps joined by
 * connectors — with realistic content of varied length. Each one is run through
 * `validateFreeComposition`, the layout oracle and the quality gate in every deck style. The report
 * gives the pass rate (overall, per kind, per style) and every rejected class (finding code) with
 * its count and an example, so each class is either fixed in the engine or written down.
 *
 * Deterministic (a seeded PRNG, no clock). Pure and DOM-free.
 */
import { analyzeDeck } from '../layout-report'
import { slideQuality, deckTitleSize } from './quality'
import { BUILT_IN_STYLES, getDeckStyle } from '../styles'
import { validateFreeComposition, checkGrammar } from '../composition-grammar'
import { defaultBlockRegistry } from '../validate-deck-spec'
import type { BlockRegistry } from '../registry'
import type { BlockSpec, ConnectorSpec, DeckSpec, SlideSpec } from '../types'

/** The kinds of composition the generator writes. */
export const COMPOSE_KINDS = ['peers', 'split', 'lockup', 'photo', 'path'] as const
export type ComposeKind = (typeof COMPOSE_KINDS)[number]

export interface Composition {
  kind: ComposeKind
  slide: SlideSpec
}

/** Mulberry32: a small seeded PRNG. */
function prng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rich = (text: string) => ({ runs: [{ text }] })
const TITLES = ['Why mid-market teams switch', 'Three things customers ask for', 'How the rollout works', 'Where the pipeline comes from', 'What we need to decide today', 'Growth without a data team']
const HEADS = ['Shared metrics', 'Answers in minutes', 'Governed by default', 'Room to grow', 'One scorecard', 'Faster onboarding', 'Fewer handoffs', 'Clear ownership']
const BODIES = [
  'One definition of revenue for every team.',
  'Guided questions replace a week of spreadsheet work.',
  'Access rules follow the org chart, not the analyst who built the report.',
  'From ten seats to two thousand without a rebuild.',
  'Pilot accounts reached their first insight in under an hour.',
  'Support tickets about numbers fell by half.',
]
const ICONS = ['users', 'zap', 'shield', 'trending-up', 'database', 'target', 'clock', 'layers', 'message', 'rocket']
const BADGES = ['New', 'Pilot', 'Recommended', 'Phase 2', 'Q3']
const STATS = ['42%', '3×', '118%', '1,250', '$2.4M']

export function generateCompositions(count: number, seed = 1): Composition[] {
  const rnd = prng(seed)
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]
  const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1))
  const out: Composition[] = []
  for (let n = 0; n < count; n++) {
    const kind = COMPOSE_KINDS[n % COMPOSE_KINDS.length]
    let id = 0
    const nid = (p: string) => `${p}${++id}`
    const b = (type: string, props: Record<string, unknown>, extra: Partial<BlockSpec> = {}): BlockSpec => ({ id: nid(type.split('.').pop()!.replace(/-/g, '')), type, props, ...extra })
    const heading = (t: string, size = 'subheading') => b('tls.t.title', { text: rich(t), size, color: 'text' })
    const bodyB = (t: string, size?: string) => b('tls.t.body', { text: rich(t), ...(size ? { size } : {}) })
    const title = b('tls.t.title', { text: rich(pick(TITLES)) })
    let slide: SlideSpec
    const connectors: ConnectorSpec[] = []
    if (kind === 'peers' || kind === 'path') {
      const count = kind === 'path' ? int(3, 4) : int(2, 4)
      const lead = pick(['icon', 'marker', 'badge', 'shape', 'none'] as const)
      const withBody = kind === 'path' || rnd() < 0.7
      const container = kind === 'path' ? 'tls.l.stack' : pick(['tls.l.card', 'tls.l.card', 'tls.l.stack'] as const)
      const roomy = count <= 3
      const leads: string[] = []
      const peers = Array.from({ length: count }, (_, i) => {
        const kids: BlockSpec[] = []
        const leadType = kind === 'path' ? (lead === 'none' || lead === 'badge' ? 'marker' : lead) : lead
        if (leadType === 'icon') kids.push(b('tls.m.icon', { icon: ICONS[(i + n) % ICONS.length], size: 'lg', iconStyle: 'disc' }))
        if (leadType === 'marker') kids.push(b('tls.t.marker', { value: String(i + 1), tone: i === 0 ? 'solid' : 'soft' }))
        if (leadType === 'badge') kids.push(b('tls.t.badge', { text: BADGES[(i + n) % BADGES.length], tone: 'soft' }))
        if (leadType === 'shape') kids.push(b('tls.m.shape', { label: String(i + 1), shape: 'circle', tone: i === 0 ? 'solid' : 'soft', size: 'sm' }))
        if (kids.length) leads.push(kids[0].id)
        kids.push(heading(HEADS[(i + n) % HEADS.length], roomy ? 'heading' : 'subheading'))
        if (withBody) kids.push(bodyB(BODIES[(i * 2 + n) % BODIES.length], roomy ? 'lead' : undefined))
        return b(container, { children: kids, ...(container === 'tls.l.stack' ? { sizing: 'content', gap: 'sm' } : {}) })
      })
      const grid = kind === 'peers' && count === 4 && rnd() < 0.4
      const group = grid ? b('tls.l.grid', { columns: 2, rows: 2, sizing: 'equal', gap: 'lg', children: peers }) : b('tls.l.row', { sizing: 'equal', gap: kind === 'path' ? '2xl' : 'lg', children: peers })
      if (kind === 'path' && leads.length === count) for (let i = 1; i < count; i++) connectors.push({ id: nid('k'), from: { block: leads[i - 1] }, to: { block: leads[i] }, dash: rnd() < 0.5, head: 'none' })
      slide = { id: 's', layout: 'timeline', regions: { title: [title], timeline: [group] } }
    } else if (kind === 'split') {
      const visual = pick(['image', 'shape', 'stat', 'avatar', 'progress'] as const)
      const text = b('tls.l.stack', { sizing: 'content', gap: 'md', children: [...(rnd() < 0.5 ? [b('tls.t.badge', { text: pick(BADGES), tone: 'soft' })] : []), heading(pick(HEADS), 'heading'), bodyB(pick(BODIES), 'lead')] }, { style: { align: 'center' } })
      const vis =
        visual === 'image' ? b('tls.m.image', { src: '/demo/photo-1.svg', alt: 'A team at work', fit: 'cover' })
        : visual === 'shape' ? b('tls.m.shape', { label: pick(HEADS), icon: pick(ICONS), shape: pick(['circle', 'rounded', 'hexagon']), tone: 'solid', size: 'lg' })
        : visual === 'stat' ? b('tls.t.hero-number', { value: pick(STATS), caption: 'since the pilot' })
        : visual === 'avatar' ? b('tls.m.avatar', { image: '/demo/portrait-2.svg', name: 'Nguyen Van An', role: 'Data engineering', size: 'xl', layout: 'stacked', align: 'center' })
        : b('tls.d.progress-ring', { value: 72, label: 'of target' })
      const left = rnd() < 0.5
      slide = { id: 's', layout: 'timeline', regions: { title: [title], timeline: [b('tls.l.split', { ratio: pick([0.45, 0.5, 0.55]), gutter: '3xl', children: left ? [text, vis] : [vis, text] })] } }
    } else if (kind === 'lockup') {
      slide = {
        id: 's',
        layout: 'section-stack',
        regions: {
          content: [
            b('tls.t.badge', { text: pick(BADGES), tone: pick(['soft', 'solid']) }),
            b('tls.t.title', { text: rich(pick(TITLES)), size: pick(['display', 'fit']), rule: rnd() < 0.5 }),
            bodyB(pick(BODIES), 'subheading'),
          ],
        },
      }
    } else {
      const anchor = pick(['bottom-left', 'left', 'center'] as const)
      slide = {
        id: 's',
        layout: 'full-bleed',
        regions: {
          content: [
            b('tls.m.image', { src: '/demo/photo-2.svg', alt: 'A city at dusk', fit: 'cover' }, { layer: 'backdrop' }),
            b('tls.l.stack', { sizing: 'content', gap: 'md', children: [b('tls.t.badge', { text: pick(BADGES), tone: 'solid' }), b('tls.t.title', { text: rich(pick(TITLES)), size: 'display', align: anchor === 'center' ? 'center' : 'start' }), bodyB(pick(BODIES), 'lead')] }, { layer: 'overlay', anchor, style: { surface: 'scrim', padding: 'xl', radius: 'md' } }),
          ],
        },
      }
    }
    if (connectors.length) slide = { ...slide, connectors }
    out.push({ kind, slide: { ...slide, id: `c${n + 1}` } })
  }
  return out
}

export interface ComposeRunResult {
  compositions: number
  runs: number
  passed: number
  /** Every composition the generator wrote is grammar-valid. */
  grammarClean: boolean
  byKind: Record<string, { runs: number; passed: number }>
  byStyle: Record<string, { runs: number; passed: number }>
  /** Rejected classes: finding code → count, and one example (`style kind: message`). */
  rejected: Array<{ code: string; count: number; example: string }>
}

/** Run `count` generated compositions through every style (or the given ones). */
export function runRandomCompositions(opts: { count?: number; seed?: number; styles?: readonly string[]; registry?: BlockRegistry } = {}): ComposeRunResult {
  const registry = opts.registry ?? defaultBlockRegistry()
  const comps = generateCompositions(opts.count ?? 100, opts.seed ?? 1)
  const styles = BUILT_IN_STYLES.filter((s) => !opts.styles || opts.styles.includes(s.id)).map((s) => getDeckStyle(s.id) ?? s)
  const byKind: ComposeRunResult['byKind'] = {}
  const byStyle: ComposeRunResult['byStyle'] = {}
  const classes = new Map<string, { count: number; example: string }>()
  let runs = 0
  let passed = 0
  let grammarClean = true
  for (const c of comps) {
    if (checkGrammar(c.slide, registry).some((f) => f.level === 'error')) grammarClean = false
    for (const style of styles) {
      const deck: DeckSpec = { version: 1, id: `compose-${c.slide.id}-${style.id}`, title: 'compose', theme: style.palettes[0].id, style: style.id, aspect: 'widescreen', slides: [c.slide] }
      const report = analyzeDeck(deck, { registry, llmAuthored: true })[0]
      const q = slideQuality(report, { titleSize: deckTitleSize(deck) })
      const found = [
        ...validateFreeComposition(deck, registry).map((f) => ({ code: f.rule, message: f.message })),
        ...report.findings.filter((f) => f.severity !== 'info').map((f) => ({ code: f.code, message: f.message })),
        ...q.findings.filter((f) => !report.findings.some((r) => r.code === f.code && r.severity !== 'info')).map((f) => ({ code: f.code, message: f.message })),
      ]
      runs++
      const ok = found.length === 0
      if (ok) passed++
      byKind[c.kind] = byKind[c.kind] ?? { runs: 0, passed: 0 }
      byKind[c.kind].runs++
      if (ok) byKind[c.kind].passed++
      byStyle[style.id] = byStyle[style.id] ?? { runs: 0, passed: 0 }
      byStyle[style.id].runs++
      if (ok) byStyle[style.id].passed++
      for (const f of found) {
        const k = classes.get(f.code) ?? { count: 0, example: `${style.id} ${c.kind} ${c.slide.id}: ${f.message}` }
        k.count++
        classes.set(f.code, k)
      }
    }
  }
  const rejected = [...classes.entries()].map(([code, v]) => ({ code, ...v })).sort((a, b) => b.count - a.count)
  return { compositions: comps.length, runs, passed, grammarClean, byKind, byStyle, rejected }
}
