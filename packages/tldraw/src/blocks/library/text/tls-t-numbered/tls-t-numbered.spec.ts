/**
 * tls.t.numbered — marker text, constant marker column, start, two-column balance, capacity.
 */

import { tlsTNumbered } from './index'
import { markerLabel } from './layout'
import { makeCtx, makeRegistry } from '../test-helpers'
import { standardBlockSuite, leavesOf, absoluteLeaves } from '../standard-suite'

const ctx = (w = 800, h = 480) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 800, h = 480) =>
  tlsTNumbered.layout({ ...(tlsTNumbered.defaults as any), ...props } as any, ctx(w, h))
const markerTexts = (tree: any): string[] =>
  absoluteLeaves(tree)
    .filter((l) => l.k === 'text' && l.part?.endsWith('.marker'))
    .map((l) => (l.node as any).lines[0].runs?.[0]?.text ?? (l.node as any).lines[0].text)

standardBlockSuite(tlsTNumbered, {
  overflowProps: { items: Array.from({ length: 30 }, (_, i) => `Point number ${i + 1} with some words`) },
})

describe('tls.t.numbered', () => {
  it('roman markers for 1-8', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((n) => markerLabel('roman', n))).toEqual([
      'I.', 'II.', 'III.', 'IV.', 'V.', 'VI.', 'VII.', 'VIII.',
    ])
  })

  it('alpha markers for 1-8, and bijective past 26', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((n) => markerLabel('alpha', n))).toEqual(['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.'])
    expect(markerLabel('alpha', 26)).toBe('Z.')
    expect(markerLabel('alpha', 27)).toBe('AA.')
  })

  it('padded and decimal markers', () => {
    expect(markerLabel('padded', 3)).toBe('03')
    expect(markerLabel('padded', 12)).toBe('12')
    expect(markerLabel('decimal', 3)).toBe('3.')
  })

  it('renders marker text for every style at the right positions', () => {
    expect(markerTexts(lay({ markerStyle: 'roman', items: ['a', 'b', 'c', 'd'] }))).toEqual(['I.', 'II.', 'III.', 'IV.'])
    expect(markerTexts(lay({ markerStyle: 'padded', items: ['a', 'b'] }))).toEqual(['01', '02'])
  })

  it('start: 4 renders 4, 5, 6', () => {
    expect(markerTexts(lay({ start: 4, items: ['a', 'b', 'c'] }))).toEqual(['4.', '5.', '6.'])
  })

  it('invalid start falls back to 1', () => {
    expect(markerTexts(lay({ start: -3, items: ['a', 'b'] }))).toEqual(['1.', '2.'])
    expect(markerTexts(lay({ start: 'x' as any, items: ['a', 'b'] }))).toEqual(['1.', '2.'])
  })

  it('text edge is the same for every item (marker column = widest marker)', () => {
    const tree = lay({ markerStyle: 'roman', items: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] })
    const xs = new Set(leavesOf(tree, 'item').filter((l) => l.part!.endsWith('.text')).map((l) => Math.round(l.x)))
    expect(xs.size).toBe(1)
    const textX = [...xs][0]
    for (const m of leavesOf(tree, 'item').filter((l) => l.part!.endsWith('.marker'))) {
      expect(m.x + m.width).toBeLessThanOrEqual(textX)
    }
  })

  it('badge draws a filled circle behind each number', () => {
    const tree = lay({ markerStyle: 'badge', items: ['a', 'b', 'c'] })
    const circles = absoluteLeaves(tree).filter((l) => l.k === 'rect' && l.part?.endsWith('.badge'))
    expect(circles).toHaveLength(3)
    for (const c of circles) {
      expect((c.node as any).radius).toBe(c.width / 2)
      expect(c.width).toBe(c.height)
    }
  })

  it('2-column split balances items (ceil first) and the columns start at the same y', () => {
    const tree = lay({ columns: '2', items: ['a', 'b', 'c', 'd', 'e'] })
    const texts = leavesOf(tree, 'item').filter((l) => l.part!.endsWith('.text'))
    const xs = [...new Set(texts.map((t) => Math.round(t.x)))].sort((a, b) => a - b)
    expect(xs).toHaveLength(2)
    expect(texts.filter((t) => Math.round(t.x) === xs[0])).toHaveLength(3)
    expect(texts.filter((t) => Math.round(t.x) === xs[1])).toHaveLength(2)
    expect(texts[0].y).toBe(texts.find((t) => Math.round(t.x) === xs[1])!.y)
  })

  it('markerTone picks the colour role', () => {
    const c = ctx()
    const accent = c.resolveColor('accent').color
    const muted = c.resolveColor('textMuted').color
    const colorOf = (tone: string) =>
      (leavesOf(lay({ markerTone: tone }), 'item').find((l) => l.part === 'item[0].marker')!.node as any).style.color
    expect(colorOf('accent')).toBe(accent)
    expect(colorOf('muted')).toBe(muted)
  })

  it('spacing changes the total height', () => {
    const h = (spacing: string) => (lay({ spacing }) as any).box.height
    expect(h('compact')).toBeLessThan(h('default'))
    expect(h('default')).toBeLessThan(h('roomy'))
  })

  it('strong runs keep their text, markers are not rendered literally', () => {
    const tree = lay({ items: ['one **two** three', 'four'] })
    const t = leavesOf(tree, 'item').find((l) => l.part === 'item[0].text')!.node as any
    expect(t.lines.map((l: any) => l.text).join('')).toBe('one two three')
    expect(t.lines[0].runs.some((r: any) => r.bold)).toBe(true)
  })

  describe('capacity', () => {
    it('suggests two columns when wide, then truncate', () => {
      const items = Array.from({ length: 8 }, (_, i) => `A fairly long numbered point that wraps onto a second line ${i}`)
      const r = tlsTNumbered.capacity!({ ...(tlsTNumbered.defaults as any), items } as any, { width: 1000, height: 200 }, ctx(1000, 200))
      expect(r.fits).toBe(false)
      expect(r.remedy[0]).toEqual({ kind: 'reflow', to: "columns: '2'" })
      expect(r.remedy[r.remedy.length - 1]).toEqual({ kind: 'truncate', slot: 'items' })
    })

    it('does not suggest columns when already narrow', () => {
      const items = Array.from({ length: 8 }, (_, i) => `Point ${i}`)
      const r = tlsTNumbered.capacity!({ ...(tlsTNumbered.defaults as any), items } as any, { width: 400, height: 60 }, ctx(400, 60))
      expect(r.fits).toBe(false)
      expect(r.remedy).toEqual([{ kind: 'truncate', slot: 'items' }])
    })

    it('reports items over the schema max as not fitting even in a tall box', () => {
      const items = Array.from({ length: 9 }, () => 'x')
      const r = tlsTNumbered.capacity!({ ...(tlsTNumbered.defaults as any), items } as any, { width: 800, height: 4000 }, ctx(800, 4000))
      expect(r.fits).toBe(false)
      expect(r.budget.items).toEqual({ max: 8, used: 9, unit: 'items' })
    })
  })
})
