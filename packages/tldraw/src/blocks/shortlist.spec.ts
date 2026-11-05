/**
 * spro creative CR2 — the shortlist ranks the whole catalog for a slide (PLAN §6.6, CR2 step 5
 * fixture table).
 */

import { BUILT_IN_BLOCKS } from './library'
import { blockKind, learningBlock, shortlist } from './shortlist'
import type { ShortlistSlide } from './shortlist'

const top = (slide: ShortlistSlide, n = 3, o = {}) => shortlist(BUILT_IN_BLOCKS, slide, o).slice(0, n).map((e) => e.type)
const CHARTS = BUILT_IN_BLOCKS.filter((d) => d.category === 'chart' || d.fits?.data === 'series' || d.fits?.data === 'table').map((d) => d.type)

describe('creative CR2 shortlist', () => {
  it('a series → a chart first', () => {
    const t = top({ relations: ['series'], items: 6, data: 'series', textLoad: 'labels' })
    expect(CHARTS).toContain(t[0])
  })

  it('dated steps → timeline, journey or milestones', () => {
    const t = top({ relations: ['timeline', 'sequence'], items: 5, textLoad: 'lines' })
    expect(['tls.g.timeline', 'tls.c.journey', 'tls.g.milestones']).toContain(t[0])
  })

  it('misconceptions → myth-fact', () => {
    expect(top({ relations: ['contrast', 'question'], items: 3, textLoad: 'lines', energy: 'lively' }, 4)).toContain('tls.g.myth-fact')
  })

  it('a share → icon-array or donut', () => {
    const t = top({ relations: ['share'], data: 'share', textLoad: 'labels' }, 3)
    expect(t.some((x) => ['tls.d.icon-array', 'tls.d.donut'].includes(x))).toBe(true)
  })

  it('4 roles → people or cards', () => {
    const t = top({ relations: ['people', 'group'], items: 4, textLoad: 'lines' }, 3)
    expect(t.some((x) => ['tls.c.team', 'tls.c.cards'].includes(x))).toBe(true)
  })

  it('a frame role → frame blocks only, no composition', () => {
    const list = shortlist(BUILT_IN_BLOCKS, { relations: [], frame: 'closing' })
    expect(list.length).toBeGreaterThan(3)
    for (const e of list) expect(BUILT_IN_BLOCKS.find((d) => d.type === e.type)!.fits!.frames).toContain('closing')
  })

  it('data: none → no chart', () => {
    const list = shortlist(BUILT_IN_BLOCKS, { relations: ['sequence', 'number'], items: 4, data: 'none' })
    for (const e of list) expect(['series', 'table', 'share']).not.toContain(BUILT_IN_BLOCKS.find((d) => d.type === e.type)?.fits?.data)
  })

  it('an absorbed block that fits best stays in the list', () => {
    // tls.g.cycle is absorbed by tls.c.steps (tier 2) and is the best loop
    expect(top({ relations: ['cycle'], items: 4, textLoad: 'labels' }, 3)).toContain('tls.g.cycle')
  })

  it('is diverse, deterministic for a seed, and ends with stretch candidates and composition', () => {
    const slide: ShortlistSlide = { relations: ['group', 'terms'], items: 4, textLoad: 'lines', key: 's05' }
    const a = shortlist(BUILT_IN_BLOCKS, slide)
    expect(shortlist(BUILT_IN_BLOCKS, slide)).toEqual(a)
    expect(a.filter((e) => !e.stretch && e.type !== 'composition')).toHaveLength(8)
    expect(a.filter((e) => e.stretch).length).toBeGreaterThan(0)
    expect(a[a.length - 1].type).toBe('composition')
    const kinds = new Set(a.slice(0, 8).map((e) => blockKind(BUILT_IN_BLOCKS.find((d) => d.type === e.type)!)))
    expect(kinds.size).toBeGreaterThanOrEqual(3)
    expect(a[0].variants.length).toBeGreaterThan(0)
  })

  it('excludes missing assets and style avoids; a used block loses its place', () => {
    const slide: ShortlistSlide = { relations: ['image-led'], textLoad: 'labels' }
    expect(top(slide, 8, { assets: { images: false } })).not.toContain('tls.m.image')
    const s2: ShortlistSlide = { relations: ['cycle'], items: 4 }
    expect(top(s2, 8, { exclude: ['tls.g.cycle'] })).not.toContain('tls.g.cycle')
    const score = (o = {}) => shortlist(BUILT_IN_BLOCKS, s2, o).find((e) => e.type === 'tls.g.cycle')!.score
    expect(score({ used: ['tls.g.cycle'] })).toBeLessThan(score())
  })
})

describe('spro sprint 2026-11b S05-D softLoad', () => {
  it('at a paragraphs load a lines block loses less with softLoad, others unchanged', () => {
    const slide: ShortlistSlide = { relations: ['group'], items: 4, textLoad: 'paragraphs' }
    const score = (s: ShortlistSlide, type: string) => shortlist(BUILT_IN_BLOCKS, s).find((e) => e.type === type)?.score ?? 0
    // tls.c.cards is a lines block, tls.t.tags a labels block
    expect(score({ ...slide, softLoad: true }, 'tls.c.cards')).toBeGreaterThan(score(slide, 'tls.c.cards'))
    expect(score({ ...slide, softLoad: true }, 'tls.t.tags')).toBeCloseTo(score(slide, 'tls.t.tags'), 5)
  })
})

describe('spro sprint 2026-11b S07-b learning decks', () => {
  const statement: ShortlistSlide = { relations: ['statement', 'definition'] }
  it('tls.t.statement: never in self-study, in class only for a quote/question/statement slide', () => {
    expect(learningBlock('tls.t.statement', 'highlight', statement, { purpose: 'self_study' })).toMatch(/self-study/)
    expect(learningBlock('tls.t.statement', 'highlight', { relations: ['definition'] }, { purpose: 'in_class' })).toMatch(/statement only/)
    expect(learningBlock('tls.t.statement', 'highlight', statement, {})).toBeNull()
    // a statement on a statement slide is not a number highlight (its cap is the deck's)
    expect(learningBlock('tls.t.statement', 'highlight', statement, { purpose: 'in_class', highlightsLeft: 0 })).toBeNull()
  })
  it('a number highlight needs the slide to have the number, within the deck budget', () => {
    expect(learningBlock('tls.c.big-stat', 'highlight', { relations: ['number'], data: 'single' }, { purpose: 'self_study' })).toBeNull()
    expect(learningBlock('tls.c.big-stat', 'highlight', { relations: ['number'], data: 'none' }, { purpose: 'self_study' })).toMatch(/number/)
    expect(learningBlock('tls.t.quote', 'highlight', { relations: ['quote'] }, { purpose: 'in_class' })).toBeNull()
    expect(learningBlock('tls.c.big-stat', 'highlight', { relations: ['number'], data: 'single' }, { purpose: 'in_class', highlightsLeft: 0 })).toMatch(/highlights/)
    expect(learningBlock('tls.c.big-stat', 'highlight', { relations: ['number'], data: 'none' }, { purpose: 'general' })).toBeNull()
  })
  it('decor and frame blocks never carry a learning content slide; general purpose is unchanged', () => {
    const slide: ShortlistSlide = { relations: ['statement'] }
    const useOf = (t: string) => BUILT_IN_BLOCKS.find((d) => d.type === t)?.fits?.use
    const learning = shortlist(BUILT_IN_BLOCKS, slide, { purpose: 'in_class', best: 16, stretch: 6 })
    expect(learning.filter((e) => ['decor', 'frame'].includes(useOf(e.type) ?? ''))).toEqual([])
    expect(shortlist(BUILT_IN_BLOCKS, slide, { purpose: 'general' })).toEqual(shortlist(BUILT_IN_BLOCKS, slide))
  })
})
