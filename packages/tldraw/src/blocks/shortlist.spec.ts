/**
 * spro creative CR2 — the shortlist ranks the whole catalog for a slide (PLAN §6.6, CR2 step 5
 * fixture table).
 */

import { BUILT_IN_BLOCKS } from './library'
import { blockKind, learningBlock, shortlist } from './shortlist'
import type { ShortlistOptions, ShortlistSlide } from './shortlist'

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
    const score = (s: ShortlistSlide, type: string) => shortlist(BUILT_IN_BLOCKS, s, { best: 40 }).find((e) => e.type === type)?.score ?? 0
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

describe('spro sprint 2026-11b S08 wave A reach', () => {
  const best8 = (s: ShortlistSlide) => shortlist(BUILT_IN_BLOCKS, s).slice(0, 8).map((e) => e.type)
  const CASES: Array<[string, ShortlistSlide]> = [
    ['tls.c.key-points', { relations: ['group', 'cause-effect'], items: 4, textLoad: 'paragraphs' }],
    ['tls.c.explainer', { relations: ['definition', 'cause-effect'], textLoad: 'paragraphs' }],
    ['tls.c.frayer', { relations: ['definition', 'terms', 'contrast'], textLoad: 'lines' }],
    ['tls.c.worked-example', { relations: ['worked-example', 'formula'], items: 4, textLoad: 'paragraphs' }],
    ['tls.c.cornell', { relations: ['recap', 'question'], items: 3, textLoad: 'paragraphs' }],
    ['tls.c.faq', { relations: ['question'], items: 4, textLoad: 'paragraphs' }],
    ['tls.c.glossary', { relations: ['terms', 'definition'], items: 6, textLoad: 'paragraphs' }],
    ['tls.c.timeline-detail', { relations: ['timeline', 'story'], items: 4, textLoad: 'paragraphs' }],
    ['tls.c.process-detail', { relations: ['sequence', 'action'], items: 4, textLoad: 'paragraphs' }],
    ['tls.c.compare-detail', { relations: ['contrast'], items: 2, textLoad: 'paragraphs' }],
    ['tls.c.summary-sheet', { relations: ['recap'], items: 4, textLoad: 'paragraphs' }],
    ['tls.c.sidenotes', { relations: ['story', 'definition'], textLoad: 'paragraphs' }],
  ]
  it.each(CASES)('%s ranks in the best 8 for the slide it is made for', (type, slide) => {
    expect(best8(slide)).toContain(type)
  })
  it('on a labels slide a paragraph block never leads and drops behind the blocks made for labels', () => {
    for (const [type, slide] of CASES) {
      if (type === 'tls.c.frayer') continue
      const got = shortlist(BUILT_IN_BLOCKS, { ...slide, textLoad: 'labels' }, { best: 40 })
      const at = got.findIndex((e) => e.type === type)
      expect([type, at]).not.toEqual([type, 0])
      const own = shortlist(BUILT_IN_BLOCKS, slide, { best: 40 }).find((e) => e.type === type)!.score
      expect(got[at]?.score ?? 0).toBeLessThan(own * 0.5)
    }
  })
})

describe('spro sprint 2026-11b S09 wave B reach', () => {
  const best8 = (s: ShortlistSlide, o = {}) => shortlist(BUILT_IN_BLOCKS, s, o).slice(0, 8).map((e) => e.type)
  const CASES: Array<[string, ShortlistSlide, ShortlistOptions]> = [
    ['tls.c.stat-explain', { relations: ['number', 'cause-effect'], data: 'single', textLoad: 'lines' }, {}],
    ['tls.c.number-grid', { relations: ['number', 'group'], items: 4, data: 'single', textLoad: 'lines' }, {}],
    ['tls.c.infographic-row', { relations: ['group', 'sequence'], items: 4, textLoad: 'labels', energy: 'lively' }, {}],
    // the slide S07 sends here: a statement-shaped slide of a learning deck (self-study blocks tls.t.statement)
    ['tls.c.split-statement', { relations: ['statement'], items: 3, textLoad: 'lines' }, { purpose: 'self_study' }],
    ['tls.c.quote-context', { relations: ['quote', 'story'], textLoad: 'lines' }, {}],
    ['tls.g.concept-map', { relations: ['network', 'hierarchy'], items: 7, textLoad: 'labels' }, {}],
    ['tls.g.cycle-detail', { relations: ['cycle'], items: 4, textLoad: 'lines' }, {}],
    ['tls.g.cause-chain', { relations: ['cause-effect'], items: 3, textLoad: 'lines' }, {}],
    ['tls.g.number-line', { relations: ['formula', 'ranking', 'number'], items: 3, textLoad: 'labels' }, {}],
    ['tls.c.image-notes', { relations: ['image-led', 'terms'], items: 3, textLoad: 'lines' }, {}],
    // a calm academic deck with no photos (the cover role holds 14 blocks; tier-1 ones win ties)
    ['tls.c.cover-masthead', { relations: ['statement'], frame: 'cover', energy: 'neutral' }, { family: 'academic', assets: { images: false } }],
    ['tls.c.closing-recap', { relations: ['recap', 'action'], items: 3, frame: 'closing' }, {}],
  ]
  it.each(CASES)('%s ranks in the best 8 for the slide it is made for', (type, slide, o) => {
    expect(best8(slide, o)).toContain(type)
  })
  it('in a learning deck a number slide with its number reaches the explained highlights; without it they are blocked', () => {
    const o = { purpose: 'in_class' as const, best: 8 }
    expect(best8({ relations: ['number', 'cause-effect'], data: 'single', textLoad: 'lines' }, o)).toContain('tls.c.stat-explain')
    const none = shortlist(BUILT_IN_BLOCKS, { relations: ['number', 'group'], items: 4, textLoad: 'lines' }, { ...o, best: 40 }).map((e) => e.type)
    expect(none).not.toContain('tls.c.stat-explain')
    expect(none).not.toContain('tls.c.number-grid')
  })
  it('a statement-shaped teaching slide reaches split-statement (an info block), not only tls.t.statement', () => {
    const got = best8({ relations: ['statement'], items: 3, textLoad: 'lines' }, { purpose: 'self_study' })
    expect(got).toContain('tls.c.split-statement')
    expect(got).not.toContain('tls.t.statement')
  })
})

describe('spro sprint 2026-11b S10 reveal blocks and activity slides', () => {
  const top = (s: ShortlistSlide, o: ShortlistOptions) => shortlist(BUILT_IN_BLOCKS, s, o).slice(0, 8).map((e) => e.type)
  const all = (s: ShortlistSlide, o: ShortlistOptions) => shortlist(BUILT_IN_BLOCKS, s, { ...o, best: 40 }).map((e) => e.type)
  const IN_CLASS: ShortlistOptions = { purpose: 'in_class', presented: true }
  const CASES: Array<[string, ShortlistSlide, ShortlistOptions]> = [
    ['tls.c.tabs', { relations: ['contrast'], items: 3, textLoad: 'labels' }, IN_CLASS], // three states set side by side
    ['tls.c.accordion', { relations: ['question', 'definition'], items: 4, textLoad: 'labels' }, IN_CLASS],
    ['tls.c.step-through', { relations: ['sequence', 'worked-example'], items: 4, textLoad: 'labels' }, IN_CLASS],
    ['tls.c.hotspots', { relations: ['image-led', 'terms'], items: 3, textLoad: 'labels' }, IN_CLASS],
  ]
  it.each(CASES)('%s ranks in the best 8 of an in-class presented deck', (type, slide, o) => {
    expect(top(slide, o)).toContain(type)
  })
  it.each(CASES)('%s is never offered in self-study, a balanced in-class deck or a general deck', (type, slide) => {
    expect(all(slide, { purpose: 'self_study', presented: true })).not.toContain(type)
    expect(all(slide, { purpose: 'in_class' })).not.toContain(type)
    expect(all(slide, {})).not.toContain(type)
  })
  it('an activity slide ranks only activity blocks: order and sort reach their own slides', () => {
    // spro leaves the open activities out (owner 2026-10-31: `OPEN_ACTIVITY_BLOCKS`)
    const o: ShortlistOptions = { purpose: 'in_class', exclude: ['tls.a.reveal', 'tls.a.flip-cards'] }
    const order = top({ relations: ['sequence', 'question'], items: 4, textLoad: 'lines', activity: true }, o)
    expect(order[0]).toBe('tls.a.order')
    const sort = top({ relations: ['group', 'question'], items: 6, textLoad: 'lines', activity: true }, o)
    expect(sort).toContain('tls.a.sort')
    expect([...order, ...sort].every((t) => t.startsWith('tls.a.') || t === 'tls.c.quiz' || t === 'tls.c.question-wall' || t === 'composition')).toBe(true)
  })
})
