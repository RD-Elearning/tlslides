/**
 * spro creative R3e — `regionStack`: the `band` layout's diagram and its caption are centred as one
 * stack (golden r3a–r3d: 9 `quality/unbalanced` slides were a diagram centred in the band and a
 * caption centred in the foot, an empty band of 21–37 % of the page between them).
 */
import type { DeckSpec, SlideSpec } from './types'
import { analyzeSlide } from './layout-report'
import { deckSpecToDocument } from './deck-document'
import { documentToDeckSpec } from './slide-decompiler'
import { getSlideLayout } from './slide-layouts'
import { slideQuality } from './pipeline/quality'

const SLIDE: SlideSpec = {
  id: 's1',
  layout: 'band',
  valign: 'auto',
  regions: {
    title: [{ id: 't', type: 'tls.t.title', props: { text: 'January to May 2026' } }],
    band: [
      {
        id: 'm',
        type: 'tls.g.milestones',
        props: {
          items: [
            { date: 'January', label: 'Certification' },
            { date: 'February', label: 'Pre-orders open' },
            { date: 'March', label: '600 retail stores' },
            { date: 'May', label: 'Installer program' },
          ],
        },
      },
    ],
    foot: [{ id: 'f', type: 'tls.t.caption', props: { text: 'February pre-orders carry the 15% early-bird discount.' } }],
  },
}

describe('spro creative R3e — regionStack', () => {
  const band = getSlideLayout('band')!
  it('the band layout stacks band over foot', () => {
    expect(band.regionStack).toEqual([['band', 'foot']])
  })

  it('the caption follows the diagram one gap below, and the pair is centred across band + foot', () => {
    const report = analyzeSlide(SLIDE)
    const m = report.blocks.find((b) => b.id === 'm')!
    const f = report.blocks.find((b) => b.id === 'f')!
    const gap = f.box.y - (m.box.y + m.box.height)
    expect(gap).toBeGreaterThan(0)
    expect(gap).toBeLessThan(60)
    const r = report.regions
    const above = m.box.y - r.band.y
    const below = r.foot.y + r.foot.height - (f.box.y + f.box.height)
    expect(Math.abs(above - below)).toBeLessThan(2)
    expect(report.findings.map((x) => x.code)).not.toContain('region/displaced')
    const q = slideQuality(report, { balance: true })
    // per-region centring left 0.22 here; what is left is the diagram's own inner margin
    expect(q.innerGap).toBeLessThan(0.15)
    expect(q.findings.map((x) => x.code)).not.toContain('quality/unbalanced')
  })

  it('the round trip returns the caption to the foot', () => {
    const deck: DeckSpec = { version: 1, slides: [SLIDE] } as DeckSpec
    const { document } = deckSpecToDocument(deck)
    const back = documentToDeckSpec(document)
    const s = back.spec.slides[0]
    expect((s.regions.foot ?? []).map((b) => b.id)).toEqual(['f'])
    expect((s.regions.band ?? []).map((b) => b.id)).toEqual(['m'])
    expect(JSON.stringify(s)).not.toContain('stackRegion')
  })

  it('a region that overflows keeps the per-region placement', () => {
    const tall: SlideSpec = {
      ...SLIDE,
      regions: { ...SLIDE.regions, foot: Array.from({ length: 6 }, (_, i) => ({ id: `f${i}`, type: 'tls.t.body', props: { text: 'A long caption line that wraps.' } })) },
    }
    const report = analyzeSlide(tall)
    const m = report.blocks.find((b) => b.id === 'm')!
    const r = report.regions
    // band centres its own diagram as before
    expect(Math.abs(m.box.y - r.band.y - (r.band.y + r.band.height - m.box.y - m.box.height))).toBeLessThan(2)
  })
})
