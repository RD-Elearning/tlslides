/**
 * spro demo T11 — `motif/too-close`: content painted against a style master's rule.
 *
 * Consulting draws a hairline under the title band; a stat spotlight's ring and a hub's circles
 * started on it (spro AI Deck demo, D10 slides 4 and 6) while the report was clean, because a
 * style's backdrop is left out of the pairwise checks.
 */
import type { DeckSpec, SlideSpec } from './types'
import { analyzeDeck } from './layout-report'

const deck = (style: string, slides: SlideSpec[]): DeckSpec => ({ version: 1, id: 'd', style, aspect: 'widescreen', slides } as DeckSpec)

const spotlight: SlideSpec = {
  id: 's04',
  layout: 'timeline',
  regions: {
    title: [{ id: 't', type: 'tls.t.title', props: { text: { runs: [{ text: 'Doanh thu theo ngành hàng' }] } } }],
    timeline: [
      {
        id: 'spot',
        type: 'tls.c.stat-spotlight',
        props: { label: 'Sữa chua đạt 310 tỷ đồng', value: '310 tỷ', progress: 87, stats: [{ label: 'Sữa bột', value: '620 tỷ' }, { label: 'Đồ uống', value: '6%' }] },
      },
    ],
  },
}

const quiet: SlideSpec = {
  id: 's02',
  layout: 'timeline',
  regions: {
    title: [{ id: 't', type: 'tls.t.title', props: { text: { runs: [{ text: 'Short title' }] } } }],
    timeline: [{ id: 'b', type: 'tls.t.body', props: { text: { runs: [{ text: 'One short line of body text.' }] } } }],
  },
}

const codes = (d: DeckSpec) => analyzeDeck(d).map((r) => r.findings.filter((f) => f.code === 'motif/too-close'))

const near = (y: number): SlideSpec => ({
  ...quiet,
  id: `near${y}`,
  free: [{ block: { id: 'chip', type: 'tls.m.shape', props: { shape: 'rect', tone: 'solid', size: 'sm' } }, box: { x: 600, y, width: 120, height: 60 } }],
})

describe('motif/too-close', () => {
  it('a block placed just under the consulting title rule is a warning, one across it an error', () => {
    const [under, across] = codes(deck('consulting', [near(210), near(180)]))
    expect(under.map((f) => [f.severity, f.blockIds])).toEqual([['warning', ['chip', 'style:title-rule']]])
    expect(across.map((f) => f.severity)).toEqual(['error'])
  })

  it('blocks that fill the region under the rule keep clear of it (D10 slides 4 and 6)', () => {
    const hub: SlideSpec = {
      id: 's06',
      layout: 'timeline',
      regions: {
        title: [{ id: 't', type: 'tls.t.title', props: { text: { runs: [{ text: 'Chi phí' }] } } }],
        timeline: [
          {
            id: 'hub',
            type: 'tls.l.grid',
            props: {
              columns: 3,
              rows: 2,
              sizing: 'equal',
              gap: 'xl',
              children: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, type: 'tls.m.shape', props: { shape: 'circle', size: 'lg', tone: 'outline', label: id } })),
            },
          },
        ],
      },
    }
    expect(codes(deck('consulting', [spotlight, hub]))).toEqual([[], []])
  })

  it('a slide whose content keeps clear of the rules is not flagged', () => {
    expect(codes(deck('consulting', [quiet]))).toEqual([[]])
  })

  it('full-frame grid lines (swiss columns) are crossed by design', () => {
    const [found] = codes(deck('swiss', [near(300)]))
    expect(found.filter((f) => f.blockIds.some((id) => id.startsWith('style:col')))).toEqual([])
  })
})
