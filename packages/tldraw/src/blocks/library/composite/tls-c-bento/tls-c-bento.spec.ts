/**
 * tls.c.bento (AC6) — patterns, tile kinds, the accent anchor, fallback, fit at min, depth, parity.
 */

import { tlsCBento, buildBento, bentoCells, patternFor } from './index'
import { standardBlockSuite, leavesOf, absoluteLeaves, assertContained, assertNoTextOverlap } from '../../text/standard-suite'
import { depthOk, layoutAt, hasPart, slideScopeCompiles } from '../composite-test'

const STAT = { kind: 'stat', value: '42%', label: 'revenue growth in one year' }
const POINT = (t: string) => ({ kind: 'point', icon: 'users', title: t, text: 'Most new seats come from teams adding colleagues.' })
const IMAGE = { kind: 'image', image: '/demo/photo-1.svg', alt: 'A workshop' }
const QUOTE = { kind: 'quote', quote: 'We buy tools for the whole team now.', name: 'Linh Pham, COO' }
const FIVE = [STAT, POINT('One'), IMAGE, QUOTE, POINT('Five')]

standardBlockSuite(tlsCBento, { withRegistry: true, overflowProps: { tiles: [...FIVE, POINT('Six'), POINT('Seven')] } })

const W = 1728
const H = 732
const tiles = (t: any) => leavesOf(t, 'tile').filter((l) => l.k === 'rect' || l.k === 'image')

describe('tls.c.bento', () => {
  it('is a slide-scope list composite, tier 1, with the pattern knob', () => {
    expect(tlsCBento.scope).toBe('slide')
    expect(tlsCBento.category).toBe('list')
    expect(tlsCBento.aiTier).toBe(1)
    expect(tlsCBento.looks).toEqual(['pattern'])
    expect((tlsCBento.schema.pattern.type as any).values).toEqual(['1+2', '2+1', 'hero+3', '3+2'])
  })

  it.each([
    ['1+2', 3],
    ['2+1', 3],
    ['hero+3', 4],
    ['3+2', 5],
  ] as const)('%s tiles the box with %i cells, gaps between, nothing overlapping', (pattern, n) => {
    const cells = bentoCells(pattern, W, H, 32)
    expect(cells).toHaveLength(n)
    const area = cells.reduce((a, c) => a + c.width * c.height, 0)
    expect(area / (W * H)).toBeGreaterThan(0.85)
    for (const c of cells) {
      expect(c.x).toBeGreaterThanOrEqual(0)
      expect(c.y).toBeGreaterThanOrEqual(0)
      expect(c.x + c.width).toBeLessThanOrEqual(W + 1)
      expect(c.y + c.height).toBeLessThanOrEqual(H + 1)
    }
    for (let i = 0; i < cells.length; i++)
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i]
        const b = cells[j]
        const apart = a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y
        expect(apart).toBe(true)
      }
    // asymmetric: not every cell the same size
    expect(new Set(cells.map((c) => `${c.width}x${c.height}`)).size).toBeGreaterThan(1)
  })

  it('a pattern with more slots than tiles falls back to one that fits; extra tiles are dropped', () => {
    expect(patternFor('3+2', 3)).toBe('1+2')
    expect(patternFor('2+1', 3)).toBe('2+1')
    expect(patternFor('3+2', 4)).toBe('hero+3')
    expect(patternFor('1+2', 5)).toBe('1+2')
    expect(tiles(layoutAt(tlsCBento, { tiles: FIVE.slice(0, 3), pattern: '3+2' }, W, H))).toHaveLength(3)
    expect(tiles(layoutAt(tlsCBento, { tiles: FIVE, pattern: '1+2' }, W, H))).toHaveLength(3)
  })

  it('every kind draws its own content; the first stat tile is accent-filled', () => {
    const t = layoutAt(tlsCBento, { tiles: FIVE, pattern: '3+2' }, W, H)
    expect(hasPart(t, 'value[0]')).toBe(true)
    expect(hasPart(t, 'label[0]')).toBe(true)
    expect(leavesOf(t, 'icon').some((l) => l.k === 'icon')).toBe(true)
    expect(leavesOf(t, 'tile').some((l) => l.k === 'image')).toBe(true)
    expect(hasPart(t, 'mark[3]')).toBe(true)
    expect(hasPart(t, 'quote[3]')).toBe(true)
    const anchor = leavesOf(t, 'tile[0]').find((l) => l.k === 'rect')!.node as any
    expect(anchor.fill.color.toLowerCase()).not.toBe((leavesOf(t, 'tile[1]').find((l) => l.k === 'rect')!.node as any).fill.color.toLowerCase())
  })

  it('a big stat tile sets its number larger than display', () => {
    const t = layoutAt(tlsCBento, { tiles: [STAT, POINT('A'), POINT('B'), QUOTE], pattern: 'hero+3' }, W, H)
    const v = leavesOf(t, 'value[0]')[0].node as any
    expect(v.style.size).toBeGreaterThan(152)
  })

  it.each(['1+2', '2+1', 'hero+3', '3+2'])('%s at preferred and min size: contained, no text overlap', (pattern) => {
    for (const [w, h] of [tlsCBento.size.preferred, tlsCBento.size.min]) {
      const t = layoutAt(tlsCBento, { tiles: FIVE, pattern }, w, h)
      assertContained(t, { width: w, height: h })
      assertNoTextOverlap(t)
      expect(absoluteLeaves(t).length).toBeGreaterThan(5)
    }
  })

  it('build() depth <= 4 and the slide compiles inside the frame', () => {
    depthOk(tlsCBento, buildBento, { tiles: FIVE, pattern: '3+2' }, W, H)
    slideScopeCompiles(tlsCBento, 'timeline', 'timeline')
  })
})
