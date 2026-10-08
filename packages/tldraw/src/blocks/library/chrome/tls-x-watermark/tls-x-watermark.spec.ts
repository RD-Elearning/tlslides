/**
 * tls.x.watermark — faint rgba colour, centred and fitted, strength, single line, empty text.
 */

import { tlsXWatermark } from './index'
import { withAlpha } from './layout'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { standardBlockSuite, leavesOf } from '../../text/standard-suite'

const ctx = (w = 1400, h = 360) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 1400, h = 360) =>
  tlsXWatermark.layout({ ...(tlsXWatermark.defaults as any), ...props } as any, ctx(w, h))
const wm = (tree: any) => leavesOf(tree, 'text')[0]

standardBlockSuite(tlsXWatermark, { noCapacity: true })

describe('tls.x.watermark', () => {
  it('is one horizontal text line, centred in its box', () => {
    const l = wm(lay({}))
    expect((l.node as any).lines).toHaveLength(1)
    // the node box is 6% + 4 px wider than the glyphs (drawn from its left edge), so its centre sits right of 700
    expect(Math.abs(l.x + l.width / 2 - 700)).toBeLessThan(0.04 * l.width)
    expect(l.y + l.height / 2).toBeCloseTo(180, -1)
  })

  it('fills most of the width but never leaves the box', () => {
    const l = wm(lay({ text: 'CONFIDENTIAL' }))
    expect(l.width).toBeGreaterThan(1400 * 0.5)
    expect(l.x).toBeGreaterThanOrEqual(0)
    expect(l.x + l.width).toBeLessThanOrEqual(1402)
    expect(l.height).toBeLessThanOrEqual(360)
  })

  it('shrinks to fit a short, wide box', () => {
    expect(wm(lay({}, 1400, 100)).height).toBeLessThanOrEqual(100)
  })

  it('draws in the text colour at low alpha: soft is stronger than faint', () => {
    const a = (o: string) => Number(String((wm(lay({ opacity: o })).node as any).style.color).match(/,([\d.]+)\)$/)![1])
    expect(a('faint')).toBeLessThan(a('soft'))
    expect(a('soft')).toBeLessThanOrEqual(0.2)
    expect(withAlpha('#336699', 0.1)).toBe('rgba(51,102,153,0.1)')
    expect(withAlpha('not-a-colour', 0.1)).toBe('not-a-colour')
  })

  it('empty text draws nothing', () => {
    expect(leavesOf(lay({ text: '  ' }), 'text')).toHaveLength(0)
  })

  it('has no angle option (diagonal is blocked on node rotation)', () => {
    expect(Object.keys(tlsXWatermark.schema)).toEqual(['text', 'opacity'])
  })
})
