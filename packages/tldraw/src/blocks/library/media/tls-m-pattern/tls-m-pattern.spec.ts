/**
 * tls.m.pattern — one path node, marks inside the box, scales, tones, performance.
 */

import { tlsMPattern } from './index'
import { standardBlockSuite, absoluteLeaves } from '../../text/standard-suite'
import { ctxNoAssets } from '../media-test'
import { patternMarks, patternPath, PATTERN_GAP, MAX_DOTS } from './layout'

const lay = (props: Record<string, unknown>, w = 960, h = 540) =>
  tlsMPattern.layout({ ...(tlsMPattern.defaults as any), ...props } as any, ctxNoAssets(w, h))
const patterns = ['dots', 'grid', 'lines', 'diagonal'] as const

standardBlockSuite(tlsMPattern, { noCapacity: true })

describe('tls.m.pattern', () => {
  it.each(patterns)('%s: the whole pattern is exactly one path node (1920x1080, scale sm)', (pattern) => {
    const tree = lay({ pattern, scale: 'sm' }, 1920, 1080)
    const leaves = absoluteLeaves(tree)
    expect(leaves).toHaveLength(1)
    expect(leaves[0].k).toBe('path')
    expect(leaves[0].part).toBe('pattern')
  })

  it('performance: a full slide at scale sm builds fast, with a bounded path', () => {
    for (const pattern of patterns) {
      const t0 = Date.now()
      const { d, count } = patternPath(pattern, PATTERN_GAP.sm, 1920, 1080)
      expect(Date.now() - t0).toBeLessThan(200)
      expect(count).toBeGreaterThan(10)
      expect(d.length).toBeLessThan(150_000)
    }
    expect(patternMarks('dots', 8, 1920, 1080).marks.length).toBeLessThanOrEqual(MAX_DOTS)
  })

  it.each(patterns)('%s: every mark stays inside the box, whatever the box', (pattern) => {
    for (const [w, h] of [[960, 540], [100, 700], [700, 100], [37, 41]]) {
      for (const gap of Object.values(PATTERN_GAP)) {
        const { marks, r } = patternMarks(pattern, gap, w, h)
        for (const k of marks) {
          const m = k.kind === 'dot' ? r : 1
          for (const [x, y] of k.kind === 'dot' ? [[k.x, k.y]] : [[k.x, k.y], [k.x2!, k.y2!]]) {
            expect(x).toBeGreaterThanOrEqual(m - 1e-6)
            expect(y).toBeGreaterThanOrEqual(m - 1e-6)
            expect(x).toBeLessThanOrEqual(w - m + 1e-6)
            expect(y).toBeLessThanOrEqual(h - m + 1e-6)
          }
        }
      }
    }
  })

  it('scale: sm has more marks than md than lg', () => {
    for (const pattern of patterns) {
      const n = (s: keyof typeof PATTERN_GAP) => patternMarks(pattern, PATTERN_GAP[s], 960, 540).marks.length
      expect(n('sm')).toBeGreaterThan(n('md'))
      expect(n('md')).toBeGreaterThan(n('lg'))
    }
  })

  it('grid has both directions, lines only horizontals, diagonal only slanted segments', () => {
    const segs = (p: (typeof patterns)[number]) => patternMarks(p, 48, 960, 540).marks
    expect(segs('lines').every((k) => k.y === k.y2)).toBe(true)
    const g = segs('grid')
    expect(g.some((k) => k.y === k.y2)).toBe(true)
    expect(g.some((k) => k.x === k.x2)).toBe(true)
    expect(segs('diagonal').every((k) => Math.abs((k.x2! - k.x) - (k.y2! - k.y)) < 1e-6 && k.x2! > k.x)).toBe(true)
  })

  it('dots are filled, the others are strokes; tone and opacity map to roles and levels', () => {
    const c = ctxNoAssets(960, 540)
    const node = (props: Record<string, unknown>) => absoluteLeaves(lay(props))[0].node as any
    expect(node({ pattern: 'dots' }).fill).toBeDefined()
    for (const pattern of ['grid', 'lines', 'diagonal']) {
      expect(node({ pattern }).stroke.width).toBeGreaterThan(0)
      expect(node({ pattern }).fill).toBeUndefined()
    }
    expect(node({ tone: 'accent' }).fill.color).toBe(c.resolveColor('accent').color)
    expect(node({ tone: 'alt' }).fill.color).toBe(c.resolveColor('surfaceAlt').color)
    expect((lay({ opacity: 'soft' }) as any).opacity).toBeLessThan((lay({ opacity: 'medium' }) as any).opacity)
    expect((lay({ tone: 'alt', opacity: 'medium' }) as any).opacity).toBeUndefined()
  })

  it('has no motion preset unless set explicitly', () => {
    expect(tlsMPattern.motion.preset).toBeUndefined()
  })

  it('a tiny or zero box gives a valid tree', () => {
    for (const pattern of patterns) {
      expect(() => lay({ pattern }, 0, 0)).not.toThrow()
      expect(() => lay({ pattern }, 3, 3)).not.toThrow()
    }
  })
})
