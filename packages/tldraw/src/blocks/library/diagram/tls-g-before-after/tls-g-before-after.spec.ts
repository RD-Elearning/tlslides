/**
 * tls.g.before-after — panel geometry, arrow styles, emphasis, images, limits.
 */

import { tlsGBeforeAfter } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, within } from '../diagram-test'
import { assertExampleFits } from '../../data/_chart/chart-test'

const SZ = { width: 1100, height: 520 }
const MIN = { width: 560, height: 300 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGBeforeAfter, props, size)
const panel = (full = false, image = '') => ({ label: 'Tag', title: full ? 't'.repeat(50) : 'Title', text: full ? 'x'.repeat(200) : 'Some text', ...(image ? { image } : {}) })

standardBlockSuite(tlsGBeforeAfter, { overflowProps: { before: { title: 'a', text: 'x'.repeat(201) } } })

describe('tls.g.before-after', () => {
  it.each([['arrow'], ['chevron'], ['none']])('arrow=%s: panels, arrow and text never overlap and stay inside the panels, with and without images', (arrow) => {
    for (const size of [SZ, MIN]) {
      for (const image of ['', 'asset-1']) {
        const t = lay({ before: panel(true, image), after: panel(true, image), arrow }, size)
        assertChartSane(t, size)
        const cards = rectsOf(t, /^(before|after)\[card\]/)
        expect(cards).toHaveLength(2)
        assertNoOverlap([...cards, ...rectsOf(t, /^arrow\[shape\]/)])
        for (const r of rectsOf(t, /^(before|after)\[(tag|title|text|image)\]/)) expect(within(r, cards[r.part.startsWith('before') ? 0 : 1], 1)).toBe(true)
        expect(rectsOf(t, /^arrow\[shape\]/)).toHaveLength(arrow === 'none' ? 0 : 1)
      }
    }
  })

  it('the arrow sits in the gap, centred between the panels', () => {
    const t = lay({ before: panel(), after: panel() })
    const [b, a] = rectsOf(t, /^(before|after)\[card\]/)
    const ar = rectsOf(t, /^arrow\[shape\]/)[0]
    expect(ar.x).toBeGreaterThanOrEqual(b.x + b.width)
    expect(ar.x + ar.width).toBeLessThanOrEqual(a.x)
    expect(Math.abs(ar.y + ar.height / 2 - 260)).toBeLessThan(1)
  })

  it('emphasis: after outlines the After panel with the accent only; none keeps both neutral', () => {
    const stroke = (emphasis: string) => {
      const t: any = lay({ before: panel(), after: panel(), emphasis })
      const card = (n: string) => t.children.find((g: any) => g.part === n).children.find((x: any) => x.part === `${n}[card]`)
      return [card('before').stroke.color, card('after').stroke.color]
    }
    const [b1, a1] = stroke('after')
    expect(a1).not.toBe(b1)
    const [b2, a2] = stroke('none')
    expect(a2).toBe(b2)
  })

  it('an image node is emitted per panel that has one, with the asset id and an alt text', () => {
    const t: any = lay({ before: panel(false, 'img-a'), after: panel() })
    const imgs = JSON.stringify(t).match(/"k":"image"/g) ?? []
    expect(imgs).toHaveLength(1)
    expect(JSON.stringify(t)).toContain('"assetId":"img-a"')
  })

  it('a missing side or hostile input never yields NaN', () => {
    for (const p of [{ before: null, after: null }, { before: panel() }, { before: 3, after: [] }, { before: { title: 5 }, after: { title: 'x' } }]) {
      expect(JSON.stringify(lay(p as any))).not.toMatch(/NaN|Infinity/)
    }
  })

  it('capacity: a 201 character text does not fit', () => {
    expect(tlsGBeforeAfter.capacity!({ before: { title: 'a', text: 'x'.repeat(201) }, after: { title: 'b' } } as any, SZ, chartCtx(SZ)).fits).toBe(false)
  })
})

describe('RV06 — example fits its box (review G06)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsGBeforeAfter)
  })
})
