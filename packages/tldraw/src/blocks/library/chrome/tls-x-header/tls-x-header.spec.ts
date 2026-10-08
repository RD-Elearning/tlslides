/**
 * tls.x.header — label left, meta right, tone, rule toggle, ellipsis, no overlap.
 */

import { tlsXHeader } from './index'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { standardBlockSuite, leavesOf } from '../../text/standard-suite'

const ctx = (w = 1600, h = 48) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 1600, h = 48) =>
  tlsXHeader.layout({ ...(tlsXHeader.defaults as any), ...props } as any, ctx(w, h))
const one = (tree: any, part: string) => leavesOf(tree, part)[0]
const text = (l: any) => l.node.lines.map((x: any) => x.text).join('')

standardBlockSuite(tlsXHeader, { noCapacity: true })

describe('tls.x.header', () => {
  it('label sits at the left edge, meta ends at the right edge', () => {
    const t = lay({})
    expect(one(t, 'label').x).toBe(0)
    const m = one(t, 'meta')
    expect(m.x + m.width).toBeCloseTo(1600, 3)
    expect(m.x).toBeGreaterThan(one(t, 'label').x + one(t, 'label').width)
  })

  it('either text may be empty: the other still renders, an empty header is empty', () => {
    expect(leavesOf(lay({ meta: '' }), 'meta')).toHaveLength(0)
    expect(leavesOf(lay({ meta: '' }), 'label')).toHaveLength(1)
    expect(leavesOf(lay({ label: '' }), 'label')).toHaveLength(0)
    expect(leavesOf(lay({ label: '', meta: '' }), 'label')).toHaveLength(0)
  })

  it('tone accent colours the label only; meta stays muted', () => {
    const c = ctx()
    const a = lay({ tone: 'accent' })
    expect((one(a, 'label').node as any).style.color).toBe(c.resolveColor('accent').color)
    expect((one(a, 'meta').node as any).style.color).toBe(c.resolveColor('textMuted').color)
    expect((one(lay({ tone: 'muted' }), 'label').node as any).style.color).toBe(c.resolveColor('textMuted').color)
  })

  it('showRule draws a hairline rect under the text across the full width', () => {
    const on = lay({ showRule: true })
    const r = one(on, 'rule')
    expect(r.k).toBe('rect')
    expect(r.width).toBe(1600)
    expect(r.y).toBeGreaterThanOrEqual(one(on, 'label').y + one(on, 'label').height - 1)
    expect(leavesOf(lay({ showRule: false }), 'rule')).toHaveLength(0)
    expect((on as any).box.height).toBeLessThanOrEqual(80)
  })

  it('long label and meta are ellipsised, stay single-line, in the box, and never overlap', () => {
    const t = lay({ label: 'L'.repeat(40), meta: 'M'.repeat(40) }, 360)
    const l = one(t, 'label')
    const m = one(t, 'meta')
    expect((l.node as any).lines).toHaveLength(1)
    expect(text(l).endsWith('…') || text(m).endsWith('…')).toBe(true)
    expect(l.x + l.width).toBeLessThanOrEqual(m.x)
    expect(m.x + m.width).toBeLessThanOrEqual(362)
  })

  it('a long label next to a short meta keeps the meta whole', () => {
    const t = lay({ label: 'L'.repeat(40), meta: 'v1' }, 300)
    expect(text(one(t, 'meta'))).toBe('v1')
  })
})
