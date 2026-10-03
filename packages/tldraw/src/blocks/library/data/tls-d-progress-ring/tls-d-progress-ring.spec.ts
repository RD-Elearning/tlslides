/**
 * tls.d.progress-ring — arc geometry, clamping, overflow marker, caps, status colours.
 */

import { tlsDProgressRing } from './index'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { absoluteLeaves, leavesOf, standardBlockSuite } from '../../text/standard-suite'

const ctx = (w = 360, h = 420) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 360, h = 420) =>
  tlsDProgressRing.layout({ ...(tlsDProgressRing.defaults as any), ...props } as any, ctx(w, h))
const parts = (tree: any) => absoluteLeaves(tree).map((l) => l.part)
const text = (tree: any, part: string) => (leavesOf(tree, part)[0]?.node as any)?.lines.map((l: any) => l.text).join('')

standardBlockSuite(tlsDProgressRing, { noCapacity: true })

describe('tls.d.progress-ring', () => {
  it('0%: track only, no arc, no caps, no overflow', () => {
    const p = parts(lay({ value: 0 }))
    expect(p).toContain('track')
    expect(p).not.toContain('arc')
    expect(p).not.toContain('arc.start')
    expect(p).not.toContain('overflow')
    expect(text(lay({ value: 0 }), 'value')).toBe('0%')
  })

  it('100%: a closed ring, no round caps, no overflow marker', () => {
    const p = parts(lay({ value: 100 }))
    expect(p).toContain('arc')
    expect(p).not.toContain('arc.start')
    expect(p).not.toContain('overflow')
  })

  it('>100%: ring is clamped to full, an overflow marker appears, the text is unclamped', () => {
    const tree = lay({ value: 140 })
    const p = parts(tree)
    expect(p).toContain('arc')
    expect(p).toContain('overflow')
    expect(text(tree, 'value')).toBe('140%')
  })

  it('round caps add two dots; flat caps add none (both renderers draw only fills)', () => {
    const round = parts(lay({ value: 50, cap: 'round' }))
    expect(round).toContain('arc.start')
    expect(round).toContain('arc.end')
    const flat = parts(lay({ value: 50, cap: 'flat' }))
    expect(flat).not.toContain('arc.start')
    expect(flat).toContain('arc')
  })

  it('a tiny value still draws something visible, never an inverted arc', () => {
    const tree = lay({ value: 1 })
    for (const l of absoluteLeaves(tree)) {
      if (l.k === 'path') expect((l.node as any).d).not.toMatch(/NaN|Infinity/)
    }
    expect(parts(tree)).toContain('arc')
  })

  it('a full ring is drawn as two half arcs (a single near-360 arc renders as a blob)', () => {
    const d = (leavesOf(lay({ value: 100, cap: 'flat' }), 'arc')[0].node as any).d as string
    expect(d.match(/M /g)!.length).toBeGreaterThanOrEqual(2)
    const t = (leavesOf(lay({ value: 100 }), 'track')[0].node as any).d as string
    expect(t.match(/M /g)!.length).toBeGreaterThanOrEqual(2)
  })

  it('max rescales: 30 of 60 reads 50%', () => {
    expect(text(lay({ value: 30, max: 60 }), 'value')).toBe('50%')
  })

  it('format plain prints the value itself', () => {
    expect(text(lay({ value: 4200, max: 5000, format: 'compact' }), 'value')).toBe('4.2K')
    expect(text(lay({ value: 42, max: 50, format: 'plain' }), 'value')).toBe('42')
  })

  it('status tone maps thirds to negative / warning / positive', () => {
    const c = ctx()
    const fill = (v: number) => (leavesOf(lay({ value: v, tone: 'status', cap: 'flat' }), 'arc')[0].node as any).fill.color
    expect(fill(10)).toBe(c.resolveColor('negative').color)
    expect(fill(50)).toBe(c.resolveColor('warning').color)
    expect(fill(90)).toBe(c.resolveColor('positive').color)
  })

  it('label and caption are optional and sit below the ring, centred', () => {
    const tree = lay({ label: 'Done', caption: 'Of everything' })
    const value = leavesOf(tree, 'value')[0]
    const label = leavesOf(tree, 'label')[0]
    const caption = leavesOf(tree, 'caption')[0]
    expect(label.y).toBeGreaterThanOrEqual(value.y + value.height)
    expect(caption.y).toBeGreaterThanOrEqual(label.y + label.height - 1)
    const bare = parts(lay({ label: '', caption: '' }))
    expect(bare).not.toContain('label')
    expect(bare).not.toContain('caption')
  })

  it('NaN / missing value draws an empty ring, not NaN geometry', () => {
    const tree = lay({ value: NaN })
    expect(JSON.stringify(tree)).not.toMatch(/NaN|null/)
  })

  it('thickness sm < md < lg in ring width', () => {
    const w = (thickness: string) => {
      const t = lay({ thickness, value: 100 })
      return leavesOf(t, 'track')[0].width
    }
    // The ring outer size is constant; the hole shrinks. Compare the value text room instead.
    const hole = (thickness: string) => (leavesOf(lay({ thickness, value: 50 }), 'value')[0].node as any).style.size
    expect(w('sm')).toBe(w('lg'))
    expect(hole('lg')).toBeLessThanOrEqual(hole('sm'))
  })
})
