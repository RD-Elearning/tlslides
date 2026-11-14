/** tls.d.swatches — spro sprint 2026-11c S25: chips in the deck's document colours, never a colour of their own. */
import { tlsDSwatches } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { layoutOf } from '../../diagram/diagram-test'
import { assertNoOverlap, rectsOf } from '../../diagram/diagram-test'

standardBlockSuite(tlsDSwatches, { overflowProps: { swatches: Array.from({ length: 12 }, (_, i) => ({ name: `Colour ${i}`, value: '#123456' })) } })

const five = ['Rêu', 'Cát', 'Đất nung', 'Mây', 'Than'].map((name, i) => ({ name, value: ['#4A5D3A', '#D8C9A7', '#B5562F', '#E9ECEF', '#2B2B2B'][i], use: 'Áo khoác, quần dài', tone: `category:${i}` }))

describe('S25 swatches', () => {
  it('a chip takes its category tone; a chip without one is an outline, never a guessed fill', () => {
    const t = layoutOf(tlsDSwatches, { swatches: [{ name: 'A', tone: 'category:0' }, { name: 'B' }] }, { width: 1400, height: 520 })
    const chips = absoluteLeaves(t).filter((l) => /^chip\[/.test(l.part ?? '')).map((l) => l.node as any)
    expect(chips).toHaveLength(2)
    expect(chips[1].stroke).toBeDefined()
    expect(chips[0].stroke).toBeUndefined()
    expect(chips[0].fill.color).not.toBe(chips[1].fill.color)
  })
  it('five named colours in a wide box: one row, every name and value whole, no overlap', () => {
    const t = layoutOf(tlsDSwatches, { swatches: five }, { width: 1728, height: 600 })
    const texts = absoluteLeaves(t).filter((l) => l.k === 'text')
    expect(texts.flatMap((l) => (l.node as any).lines.map((x: any) => x.text)).join(' ')).not.toContain('…')
    const ys = new Set(rectsOf(t, /^chip\[\d+\]$/).map((r) => Math.round(r.y)))
    expect(ys.size).toBe(1)
    assertNoOverlap([...rectsOf(t, /^chip\[/), ...rectsOf(t, /^(name|value|use)\[/)])
  })
  it('seven colours take two rows', () => {
    const seven = [...five, { name: 'Sương', value: '#F4F1EA' }, { name: 'Gỗ', value: '#7A5235' }]
    const t = layoutOf(tlsDSwatches, { swatches: seven }, { width: 1728, height: 700 })
    expect(new Set(rectsOf(t, /^chip\[\d+\]$/).map((r) => Math.round(r.y))).size).toBe(2)
  })
})
