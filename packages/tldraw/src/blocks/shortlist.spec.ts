/**
 * spro creative CR2 — the shortlist ranks the whole catalog for a slide (PLAN §6.6, CR2 step 5
 * fixture table).
 */

import { BUILT_IN_BLOCKS } from './library'
import { blockKind, shortlist } from './shortlist'
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
