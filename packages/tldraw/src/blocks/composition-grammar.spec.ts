/**
 * CMP4 — the free-composition grammar, the nearest-pattern fallback and the random-composition dry
 * run (`composition-grammar.ts`, `pipeline/composeRun.ts`).
 */
import { registerBuiltInBlocks } from './library'
import { BlockRegistry } from './registry'
import { checkGrammar, nearestPattern, validateFreeComposition } from './composition-grammar'
import { PATTERN_RECIPES } from './patterns'
import { recipeSlide } from './recipes'
import { generateCompositions, runRandomCompositions, COMPOSE_KINDS } from './pipeline/composeRun'
import type { BlockSpec, DeckSpec, SlideSpec } from './types'
import { defaultBlockRegistry } from './validate-deck-spec'

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)

const t = (id: string, text: string): BlockSpec => ({ id, type: 'tls.t.title', props: { text: { runs: [{ text }] }, size: 'subheading' } })
const body = (id: string, text: string): BlockSpec => ({ id, type: 'tls.t.body', props: { text: { runs: [{ text }] } } })
const card = (id: string, children: BlockSpec[]): BlockSpec => ({ id, type: 'tls.l.card', props: { children } })
const slide = (blocks: BlockSpec[]): SlideSpec => ({ id: 's', layout: 'timeline', regions: { title: [t('tt', 'Title')], timeline: blocks } })
const rules = (s: SlideSpec) => checkGrammar(s, registry).map((f) => f.rule)

describe('CMP4 composition grammar', () => {
  it('a row of peer cards of atoms is grammar-clean', () => {
    expect(rules(slide([{ id: 'r', type: 'tls.l.row', props: { children: [card('a', [t('h1', 'One'), body('b1', 'x')]), card('b', [t('h2', 'Two'), body('b2', 'y')])] } }]))).toEqual([])
  })

  it('names a container outside the grammar, too deep, too many children, a composite inside, mixed peers, a dead style field', () => {
    expect(rules(slide([{ id: 'sec', type: 'tls.l.section', props: { children: [body('b', 'x')] } }]))).toContain('grammar/container')
    const deep = card('c1', [{ id: 's2', type: 'tls.l.stack', props: { children: [card('c3', [body('b', 'x')])] } }])
    expect(rules(slide([deep]))).toContain('grammar/depth')
    expect(rules(slide([{ id: 'st', type: 'tls.l.stack', props: { children: Array.from({ length: 9 }, (_, i) => body(`b${i}`, 'x')) } }]))).toContain('grammar/leaves')
    expect(rules(slide([card('c', [{ id: 'cc', type: 'tls.c.cards', props: {} }])]))).toContain('grammar/scope')
    expect(rules(slide([{ id: 'r', type: 'tls.l.row', props: { children: [card('a', [body('b1', 'x')]), body('b2', 'y')] } }]))).toContain('grammar/peers')
    expect(rules(slide([{ ...card('c', [body('b', 'x')]), style: { density: 'roomy' } as never }]))).toContain('grammar/style')
  })

  it('validateFreeComposition adds the grammar to the validator, addressed from the slide', () => {
    const deck: DeckSpec = { version: 1, id: 'd', title: 'd', theme: 'corporate-navy', aspect: 'widescreen', slides: [slide([{ id: 'sec', type: 'tls.l.section', props: { children: [body('b', 'x')] } }])] }
    const f = validateFreeComposition(deck, registry).find((x) => x.rule === 'grammar/container')
    expect(f?.path).toBe('slides[0].regions.timeline[0]')
  })

  it('a rejected composition falls back to the nearest pattern of its role', () => {
    const steps = slide([{ id: 'r', type: 'tls.l.row', props: { children: [1, 2, 3].map((i) => card(`c${i}`, [{ id: `m${i}`, type: 'tls.t.marker', props: { value: String(i) } }, t(`h${i}`, 'Step'), body(`b${i}`, 'Body')])) } }])
    const near = nearestPattern(steps, 'process', PATTERN_RECIPES, (r, look) => recipeSlide(r, registry, look))
    expect(near?.recipe.id).toBe('process-marker-flow')
  })
})

describe('CMP4 random-composition dry run', () => {
  it('is deterministic, covers every kind and writes only grammar-valid compositions', () => {
    const a = generateCompositions(20, 7)
    expect(JSON.stringify(a)).toBe(JSON.stringify(generateCompositions(20, 7)))
    expect(new Set(a.map((c) => c.kind))).toEqual(new Set(COMPOSE_KINDS))
    for (const c of a) expect([c.slide.id, checkGrammar(c.slide, registry).filter((f) => f.level === 'error')]).toEqual([c.slide.id, []])
  })

  it('reports a pass rate and the rejected classes', () => {
    const r = runRandomCompositions({ count: 10, seed: 3, styles: ['corporate', 'swiss'], registry })
    expect(r.runs).toBe(20)
    expect(r.grammarClean).toBe(true)
    expect(r.passed).toBeGreaterThan(0)
    // what a gate rejects is a design verdict (quality, or S11's advisory grammar warnings: cell templates,
    // split ratios, content share), never an engine error or a grammar break (an error-level rule)
    for (const c of r.rejected) expect(c.code).toMatch(/^quality\/|^grammar\/(content|template|ratio)$/)
  }, 60000)
})

describe('S11 grammar v2', () => {
  const panel = (id: string, children: BlockSpec[]): BlockSpec => ({ id, type: 'tls.l.stack', props: { children } })
  const kick = (id: string): BlockSpec => ({ id, type: 'tls.t.kicker', props: { text: 'Note' } })
  it('cells of one template are peers whatever their container; differing cells are a template warning', () => {
    const same = rules(slide([{ id: 'r', type: 'tls.l.row', props: { children: [card('a', [t('h1', 'One'), body('b1', 'x')]), panel('b', [t('h2', 'Two'), body('b2', 'y')])] } }]))
    expect(same).toEqual([])
    const diff = checkGrammar(slide([{ id: 'r', type: 'tls.l.row', props: { children: [card('a', [t('h1', 'One'), body('b1', 'x')]), card('b', [body('b2', 'y')])] } }]), registry)
    expect(diff.map((f) => [f.rule, f.level])).toEqual([['grammar/template', 'warning']])
    expect(diff[0].message).toContain('same parts')
  })
  it('up to 8 children; a split ratio outside the set names the nearest', () => {
    expect(rules(slide([{ id: 'g', type: 'tls.l.grid', props: { columns: 4, rows: 2, children: Array.from({ length: 8 }, (_, i) => body(`b${i}`, 'x')) } }]))).toEqual([])
    const f = checkGrammar(slide([{ id: 'sp', type: 'tls.l.split', props: { ratio: 0.72, children: [body('a', 'x'), body('b', 'y')] } }]), registry)
    expect(f.map((x) => x.rule)).toEqual(['grammar/ratio'])
    expect(f[0].message).toContain('use 0.67')
    expect(rules(slide([{ id: 'sp', type: 'tls.l.split', props: { ratio: 0.4, children: [body('a', 'x'), body('b', 'y')] } }]))).toEqual([])
  })
  it('a composition that is mostly decoration is an error (< 50 %), a warning under 60 %', () => {
    const decor = checkGrammar(slide([card('c', [kick('k1'), kick('k2'), { id: 'r1', type: 'tls.x.rule', props: {} }, body('b', 'x')])]), registry).filter((x) => x.rule === 'grammar/content')
    expect(decor.map((x) => x.level)).toEqual(['error'])
    const half = checkGrammar(slide([card('c', [kick('k1'), kick('k2'), kick('k3'), t('h', 'T'), body('b', 'x'), body('b2', 'y')])]), registry).filter((x) => x.rule === 'grammar/content')
    expect(half.map((x) => x.level)).toEqual(['warning'])
  })
})

describe('compose PLAN.md B2/B6 — one accent, one decoration', () => {
  const reg = defaultBlockRegistry()
  const tk = (id: string) => ({ id, type: 'tls.t.takeaway', props: { text: 'x' } })
  it('a second takeaway or callout is a grammar/accent warning; one is fine', () => {
    const one = { id: 's', layout: 'two-column', regions: { title: [], left: [tk('a')], right: [] } } as any
    const two = { id: 's', layout: 'two-column', regions: { title: [], left: [tk('a')], right: [{ id: 'c', type: 'tls.t.callout', props: { text: 'y' } }] } } as any
    expect(checkGrammar(one, reg).filter((f) => f.rule === 'grammar/accent')).toEqual([])
    const f = checkGrammar(two, reg).filter((x) => x.rule === 'grammar/accent')
    expect(f).toHaveLength(1)
    expect(f[0].level).toBe('warning')
  })
  it('two decorative blocks are a grammar/decoration warning', () => {
    const d = (id: string) => ({ id, type: 'tls.m.decoration', props: { shape: 'blob' }, layer: 'backdrop' })
    const slide = { id: 's', layout: 'blank', regions: { content: [d('a'), d('b')] } } as any
    expect(checkGrammar(slide, reg).map((x) => x.rule)).toContain('grammar/decoration')
  })
})

it('a child without a type is a grammar finding, not a crash', () => {
  const reg = defaultBlockRegistry()
  const slide = { id: 's', layout: 'blank', regions: { content: [{ id: 'r', type: 'tls.l.stack', props: { children: [{ id: 'x', props: {} }] } }] } } as any
  const f = checkGrammar(slide, reg)
  expect(f.map((x) => x.path)).toContain('regions.content[0].props.children[0]')
})
