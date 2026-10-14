/**
 * CMP2 — the oracle sees inside compositions (composition README §2 CMP2): every design check has
 * a positive and a negative case, the composition fixtures produce exactly their expected
 * findings, and the sub-block / ink-guard / painted-surface engine parts behave.
 */
import * as fs from 'fs'
import * as path from 'path'
import { analyzeDeck } from './layout-report'
import type { LayoutReport } from './layout-report'
import { slideQuality } from './pipeline/quality'
import type { BlockSpec, DeckSpec, LayoutNode, SlideSpec } from './types'
import { guardInk } from './layout/ink-guard'
import { collectPaint, inkContrast } from './layout/paint-model'

const FIX = path.join(__dirname, '__fixtures__/composition')

const T = (id: string, text: string, props: Record<string, unknown> = {}): BlockSpec => ({ id, type: 'tls.t.title', props: { text, ...props } })
const B = (id: string, text: string, extra: Partial<BlockSpec> = {}): BlockSpec => ({ id, type: 'tls.t.body', props: { text }, ...extra })
const card = (id: string, children: BlockSpec[], extra: Partial<BlockSpec> = {}): BlockSpec => ({ id, type: 'tls.l.card', props: { children }, ...extra })
const row = (id: string, children: BlockSpec[], props: Record<string, unknown> = {}): BlockSpec => ({ id, type: 'tls.l.row', props: { children, ...props } })

function deckOf(slides: SlideSpec[], extra: Partial<DeckSpec> = {}): DeckSpec {
  return { version: 1, id: 'cmp2', style: 'corporate', theme: 'corporate-navy', slides, ...extra } as DeckSpec
}
function report(slide: SlideSpec, opts: { llmAuthored?: boolean; deck?: Partial<DeckSpec> } = {}): LayoutReport {
  return analyzeDeck(deckOf([slide], opts.deck), opts.llmAuthored ? { llmAuthored: true } : {})[0]
}
const codes = (r: LayoutReport, code: string) => r.findings.filter((f) => f.code === code)
const blank = (id: string, content: BlockSpec[], extra: Partial<SlideSpec> = {}): SlideSpec => ({ id, layout: 'blank', regions: { content }, ...extra })

describe('CMP2 sub-blocks', () => {
  it('lists authored children with id paths, and owns each text leaf', () => {
    const r = report(blank('s', [row('g1', [card('c1', [B('b1', 'One')]), card('c2', [B('b2', 'Two')])])]))
    const g = r.blocks[0]
    expect(g.children?.map((c) => c.path)).toEqual(['g1/c1', 'g1/c1/b1', 'g1/c2', 'g1/c2/b2'])
    expect(g.children?.find((c) => c.path === 'g1/c2/b2')?.level).toBe(3)
    expect(g.text.map((t) => t.block)).toEqual(['g1/c1/b1', 'g1/c2/b2'])
  })

  it('a composite keeps its own spec tree (no sub-blocks)', () => {
    const r = report(blank('s', [{ id: 'sc', type: 'tls.c.stat-card', props: { value: '42%', unit: 'growth' } }]))
    expect(r.blocks[0].children).toBeUndefined()
  })

  it('sibling children that overlap are a pair finding naming both paths', () => {
    const r = report(
      blank('s', [
        {
          id: 'ov',
          type: 'tls.l.overlay',
          props: { children: [B('a', 'First text that fills the overlay box'), B('b', 'Second text on top of the first')] },
        },
      ])
    )
    const f = r.findings.find((x) => x.code === 'text/collision' || x.code === 'layout/overlap')
    expect(f?.blockIds).toEqual(['ov/a', 'ov/b'])
  })
})

describe('CMP2 design checks: positive and negative cases', () => {
  it('contrast/low: a pinned literal ink on an accent card; a role ink there is solved', () => {
    const bad = report(blank('s', [row('g', [card('c', [B('b', 'Pinned grey', { style: { on: '#5A6B7C' } })], { style: { surface: 'accent' } })])]))
    expect(codes(bad, 'contrast/low')).toHaveLength(1)
    expect(codes(bad, 'contrast/low')[0].message).toContain('g/c/b')
    const good = report(blank('s', [row('g', [card('c', [B('b', 'Role ink'), { id: 'k', type: 'tls.t.kicker', props: { text: 'Accent kicker' } }], { style: { surface: 'accent' } })])]))
    expect(codes(good, 'contrast/low')).toHaveLength(0)
  })

  it('contrast/low: text on a photo needs a scrim; a scrim surface clears it', () => {
    const img = { id: 'img', type: 'tls.m.image', props: { src: 'https://example.com/p.jpg', alt: 'p', fit: 'cover' }, layer: 'backdrop' } as BlockSpec
    const bad = report({ id: 's', layout: 'full-bleed', regions: { content: [img, { ...T('t', 'On the photo', { size: 'display' }), layer: 'overlay', anchor: 'bottom-left' }] } })
    expect(codes(bad, 'contrast/low')[0]?.message).toContain('photo')
    const good = report({ id: 's', layout: 'full-bleed', regions: { content: [img, { ...T('t', 'On the photo', { size: 'display' }), layer: 'overlay', anchor: 'bottom-left', style: { surface: 'scrim', padding: 'lg' } }] } })
    expect(codes(good, 'contrast/low')).toHaveLength(0)
  })

  it('layout/misaligned: one peer title wraps; equal titles do not', () => {
    // CMP4: peer cards of one structure share their children's tracks (`peer-tracks.ts`), so the
    // engine itself aligns them; a peer of another structure (an extra child) still drifts.
    const peers = (t2: string, extra = false) =>
      row('r', [
        card('c1', [T('t1', 'Plan', { size: 'heading' }), B('b1', 'Short.')]),
        card('c2', [T('t2', t2, { size: 'heading' }), B('b2', 'Short.'), ...(extra ? [B('b2x', 'More.')] : [])]),
        card('c3', [T('t3', 'Ship', { size: 'heading' }), B('b3', 'Short.')]),
      ])
    expect(codes(report(blank('s', [peers('A much longer card title that wraps')])), 'layout/misaligned')).toHaveLength(0)
    const bad = codes(report(blank('s', [peers('A much longer card title that wraps', true)])), 'layout/misaligned')
    expect(bad).toHaveLength(1)
    expect(bad[0].message).toMatch(/^3 of 3 card in r \(c1, c2, c3\)/)
    expect(bad[0].fix).toContain('c2')
    expect(codes(report(blank('s', [peers('Build')])), 'layout/misaligned')).toHaveLength(0)
  })

  it('layout/unequal-peers: content-sized row of unequal bodies; equal sizing is clean', () => {
    const kids = [B('a', 'Plan.'), B('b', 'Build the product with the pilot customers.'), B('c', 'Ship it.')]
    expect(codes(report(blank('s', [row('r', kids, { sizing: 'content' })])), 'layout/unequal-peers')).toHaveLength(1)
    expect(codes(report(blank('s', [row('r', kids)])), 'layout/unequal-peers')).toHaveLength(0)
  })

  it('layout/narrow-child: six display titles in a row; three are fine', () => {
    const titles = (n: number) => row('r', Array.from({ length: n }, (_, i) => T(`t${i}`, 'Quarterly growth results', { size: 'title' })))
    const bad = codes(report(blank('s', [titles(6)])), 'layout/narrow-child')
    expect(bad).toHaveLength(1)
    expect(bad[0].message).toMatch(/^6 of 6 title in r/)
    expect(codes(report(blank('s', [row('r', [B('a', 'One clear line'), B('b', 'Another line')])])), 'layout/narrow-child')).toHaveLength(0)
  })

  it('nesting/too-deep: 4 authored levels for an LLM-authored slide only', () => {
    const deep = blank('s', [{ id: 's1', type: 'tls.l.stack', props: { children: [card('c', [{ id: 's2', type: 'tls.l.stack', props: { children: [B('b', 'Deep')] } }])] } }])
    expect(codes(report(deep, { llmAuthored: true }), 'nesting/too-deep')).toHaveLength(1)
    expect(codes(report(deep), 'nesting/too-deep')).toHaveLength(0)
    const three = blank('s', [{ id: 's1', type: 'tls.l.stack', props: { children: [card('c', [B('b', 'Level 3')])] } }])
    expect(codes(report(three, { llmAuthored: true }), 'nesting/too-deep')).toHaveLength(0)
  })

  it('type/too-many-sizes: six sizes; five are fine', () => {
    const stack = (kids: BlockSpec[]) => blank('s', [{ id: 'st', type: 'tls.l.stack', props: { children: kids } }])
    const five = [T('a', 'Display', { size: 'display' }), T('b', 'Title', { size: 'title' }), T('c', 'Heading', { size: 'heading' }), B('e', 'Body'), { id: 'f', type: 'tls.t.caption', props: { text: 'Caption' } } as BlockSpec]
    expect(codes(report(stack(five)), 'type/too-many-sizes')).toHaveLength(0)
    expect(codes(report(stack([...five, T('d', 'Subheading', { size: 'subheading' })])), 'type/too-many-sizes')).toHaveLength(1)
  })

  it('accent/overuse: seven accent cards in a professional style; six are within budget', () => {
    const grid = (n: number) => blank('s', [{ id: 'g', type: 'tls.l.grid', props: { columns: 4, rows: 2, children: Array.from({ length: n }, (_, i) => card(`c${i}`, [B(`b${i}`, `Item ${i}`)], { style: { surface: 'accent' } })) } }])
    expect(codes(report(grid(7)), 'accent/overuse')).toHaveLength(1)
    expect(codes(report(grid(6)), 'accent/overuse')).toHaveLength(0)
  })

  it('text/long-measure: a full-width paragraph is info; a column is not', () => {
    const long = 'This paragraph runs across the full width of the slide, so every line carries far more than the seventy-five characters a reader takes in comfortably and loses the next line.'
    const f = codes(report(blank('s', [B('b', long)])), 'text/long-measure')
    expect(f).toHaveLength(1)
    expect(f[0].severity).toBe('info')
    expect(codes(report({ id: 's', layout: 'two-column', regions: { left: [B('b', long)] } }), 'text/long-measure')).toHaveLength(0)
  })

  it('motion/stagger-total and motion/too-many-heroes under expressive; a calm slide is clean', () => {
    const items = (n: number) => ({ id: 'l', type: 'tls.t.bullets', props: { items: Array.from({ length: n }, (_, i) => ({ text: `Point ${i + 1}` })) } }) as BlockSpec
    const heroes = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `h${i}`, type: 'tls.t.hero-number', props: { value: `${(i + 1) * 12}%` } }) as BlockSpec)
    const slide = (n: number, h: number): SlideSpec => ({ id: 's', layout: 'two-column', motionStyle: 'expressive', regions: { left: [items(n)], right: heroes(h) } })
    const bad = report(slide(12, 3))
    // CMP4: the check measures what plays — the engine caps every indexed family at
    // STAGGER_CAP_MS (300 ms, CMP3), under the 400 ms threshold: 12 bullets play in 300 ms
    expect(codes(bad, 'motion/stagger-total')).toHaveLength(0)
    expect(codes(bad, 'motion/too-many-heroes')).toHaveLength(1)
    const ok = report(slide(11, 2))
    expect(codes(ok, 'motion/stagger-total')).toHaveLength(0)
    expect(codes(ok, 'motion/too-many-heroes')).toHaveLength(0)
  })

  it('the quality gate runs the design checks (warnings and errors, one line each)', () => {
    const r = report(blank('s', [row('g', [card('c', [B('b', 'Pinned grey', { style: { on: '#5A6B7C' } })], { style: { surface: 'accent' } })])]))
    const q = slideQuality(r)
    expect(q.findings.map((f) => f.code)).toContain('contrast/low')
    expect(q.findings.every((f) => !f.message.includes('\n'))).toBe(true)
  })
})

describe('CMP2 composition fixtures', () => {
  // Expected non-info findings (plus long-measure info) per slide; every other slide is clean.
  const EXPECTED: Record<string, Record<string, string[]>> = {
    'cmp1-grid-cards.json': {},
    'cmp2-backdrop-overlay.json': { c2_photo: ['contrast/low', 'contrast/low'] },
    'cmp3-split-stack.json': {},
    'cmp4-defaults.json': {},
    // analysed as LLM-authored: the 6- and 7-deep stress slides are also past the LLM's 3 levels
    'cmp5-stress.json': { c5_deep6: ['nesting/too-deep'], c5_deep7: ['block/dropped', 'nesting/too-deep'], c5_row6: ['layout/narrow-child'] },
    'cmp6-design-checks.json': {
      d_card3: ['contrast/low'],
      d_misaligned: ['layout/misaligned'],
      d_unequal: ['layout/unequal-peers'],
      d_deep: ['nesting/too-deep'],
      d_sizes: ['type/too-many-sizes'],
      d_accent: ['accent/overuse'],
      d_measure: ['text/long-measure'],
      d_motion: ['motion/too-many-heroes'],
    },
  }
  it.each(Object.keys(EXPECTED))('%s', (file) => {
    const deck = JSON.parse(fs.readFileSync(path.join(FIX, file), 'utf8')) as DeckSpec
    const reports = analyzeDeck(deck, { llmAuthored: true })
    const got: Record<string, string[]> = {}
    for (const r of reports) {
      const list = r.findings.filter((f) => f.severity !== 'info' || f.code === 'text/long-measure').map((f) => f.code).sort()
      if (list.length) got[r.slideId] = list
    }
    const want = Object.fromEntries(Object.entries(EXPECTED[file]).map(([k, v]) => [k, [...v].sort()]))
    expect(got).toEqual(want)
  })
})

describe('CMP2 engine parts', () => {
  it('the ink guard re-solves a derived ink on its card, never a literal', () => {
    const tree = (color: string): LayoutNode => ({
      k: 'group',
      box: { x: 0, y: 0, width: 400, height: 200 },
      children: [
        { k: 'rect', box: { x: 0, y: 0, width: 400, height: 200 }, fill: { type: 'solid', color: '#0B5FFF' } },
        { k: 'text', box: { x: 20, y: 20, width: 300, height: 40 }, lines: [{ text: 'Kicker', top: 0, baseline: 30, width: 90 }], style: { family: 'Inter', size: 22, lineHeight: 1.4, letterSpacing: 0, color } },
      ],
    })
    const surface = { behind: { type: 'solid' as const, color: '#FFFFFF' }, luminance: 1, overImage: false }
    const derived = tree('#0B5FFF')
    expect(guardInk(derived, surface, new Set())).toBe(1)
    const { ops, inks } = collectPaint(derived)
    expect(inkContrast(inks[0], ops, () => ({ rgb: { r: 255, g: 255, b: 255 } }))!.ratio).toBeGreaterThanOrEqual(4.5)
    const pinned = tree('#0B5FFF')
    expect(guardInk(pinned, surface, new Set(['#0B5FFF']))).toBe(0)
  })

  it('an authored style.surface on a title is painted as a rect behind it, hugging the text', () => {
    const r = analyzeDeck(deckOf([blank('s', [T('t', 'Panel', { size: 'heading' })].map((b) => ({ ...b, style: { surface: 'surfaceAlt', padding: 'md' } })))]))[0]
    expect(r.blocks[0].painted!.width).toBeLessThan(600)
  })

  it('a card packs its authored children from the top (no voids between them)', () => {
    const r = report(blank('s', [row('g', [card('c', [{ id: 'i', type: 'tls.m.icon', props: { icon: 'zap', size: 'md' } }, B('b', 'Body under the icon')])])]))
    const kids = r.blocks[0].children!
    const icon = kids.find((c) => c.path === 'g/c/i')!
    const body = kids.find((c) => c.path === 'g/c/b')!
    expect(body.box.y - (icon.box.y + icon.box.height)).toBeLessThanOrEqual(24)
  })

  it('an anchored region block on full-bleed keeps the safe margin', () => {
    const img = { id: 'img', type: 'tls.m.image', props: { src: 'https://example.com/p.jpg', alt: 'p', fit: 'cover' }, layer: 'backdrop' } as BlockSpec
    const r = report({ id: 's', layout: 'full-bleed', regions: { content: [img, { id: 'k', type: 'tls.t.kicker', props: { text: 'Top left' }, layer: 'overlay', anchor: 'top-left' }] } })
    const k = r.blocks.find((b) => b.id === 'k')!
    expect(k.box.x).toBeGreaterThanOrEqual(96)
    expect(k.box.y).toBeGreaterThanOrEqual(96)
  })
})
