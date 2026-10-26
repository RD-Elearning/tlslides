/**
 * spro demo T11 — `motif/too-close`: content painted against a style master's rule.
 *
 * Consulting draws a hairline under the title band; a stat spotlight's ring and a hub's circles
 * started on it (spro AI Deck demo, D10 slides 4 and 6) while the report was clean, because a
 * style's backdrop is left out of the pairwise checks.
 */
import type { DeckSpec, SlideSpec } from './types'
import { analyzeDeck } from './layout-report'
import { placeDeckMotifs } from './motif-zone'
import { deckSpecToDocument } from './deck-document'
import { documentToDeckSpec } from './slide-decompiler'

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

/**
 * spro creative PLAN §6.7 (CR7a) — masters v2: with `DeckSpec.motifZone: 'auto'` the deck's
 * signature motif (doodle's star, or the deck's subject) leaves the master and is placed on each
 * cover/section page at the corner farthest from the page's text (`placeDeckMotifs`).
 */
describe('motifZone auto', () => {
  // a composed cover whose title sits where doodle's cover master draws its star (top left)
  const cover: SlideSpec = {
    id: 'c',
    layout: 'blank',
    role: 'cover',
    regions: { content: [] },
    free: [{ block: { id: 'st', type: 'tls.t.statement', props: { text: 'Machine learning, week one' } }, box: { x: 96, y: 96, width: 1100, height: 260 } }],
  }
  const doodle = (zone?: 'auto'): DeckSpec => ({ ...deck('doodle', [cover]), ...(zone ? { motifZone: zone } : {}) })
  const textBoxes = (d: DeckSpec) => analyzeDeck(d)[0].blocks.flatMap((b) => b.text.map((t) => t.painted))
  const hits = (a: { x: number; y: number; width: number; height: number }, b: typeof a) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  const motifOf = (d: DeckSpec, id: string) => analyzeDeck(d)[0].blocks.find((b) => b.id === id)?.painted

  it('a fixed master star lands on a top-left title', () => {
    const star = motifOf(doodle(), 'style:star')!
    expect(textBoxes(doodle()).some((t) => hits(star, t))).toBe(true)
  })

  it('auto moves the signature motif to a free corner; the other motifs stay', () => {
    const placed = placeDeckMotifs(doodle('auto'))
    const reports = analyzeDeck(placed)
    expect(reports[0].blocks.some((b) => b.id === 'style:star')).toBe(false)
    expect(reports[0].blocks.some((b) => b.id === 'style:sparkle')).toBe(true)
    const m = motifOf(placed, 'deck-motif')!
    expect(m).toBeDefined()
    expect(textBoxes(placed).some((t) => hits(m, t))).toBe(false)
    // idempotent: placing again keeps the one motif
    expect(placeDeckMotifs(placed).slides[0].free!.filter((f) => f.block.id === 'deck-motif')).toHaveLength(1)
  })

  it("auto: the content master keeps its page furniture (paper, rules) but not its ornaments", () => {
    const content: SlideSpec = { ...quiet, id: 'k' }
    const ids = (zone?: 'auto') => analyzeDeck({ ...deck('doodle', [content]), ...(zone ? { motifZone: zone } : {}) })[0].blocks.map((b) => b.id).filter((id) => id.startsWith('style:'))
    expect(ids()).toEqual(expect.arrayContaining(['style:sparkle', 'style:squiggle']))
    expect(ids('auto')).toEqual([])
    const glass = (zone?: 'auto') => analyzeDeck({ ...deck('glass', [content]), ...(zone ? { motifZone: zone } : {}) })[0].blocks.map((b) => b.id).filter((id) => id.startsWith('style:'))
    expect(glass()).toContain('style:orb-a')
    expect(glass('auto')).toEqual(['style:mesh', 'style:grain'])
  })

  it('a deck without motifZone is left as is, and the round trip keeps the zone', () => {
    const d = doodle()
    expect(placeDeckMotifs(d)).toBe(d)
    // the document places the motif itself; the round trip returns it as a free block, placed once
    const back = documentToDeckSpec(deckSpecToDocument(doodle('auto')).document).spec
    expect(back.motifZone).toBe('auto')
    expect(back.slides[0].free!.filter((f) => f.block.id === 'deck-motif')).toHaveLength(1)
    expect(placeDeckMotifs(back).slides[0].free!.filter((f) => f.block.id === 'deck-motif')).toHaveLength(1)
  })
})
