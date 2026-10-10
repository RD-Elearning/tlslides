/**
 * tls.t.badge — pill sizing, tones, icon, shrink-to-fit, anchoring, motion (CMP3 atom).
 */

import { tlsTBadge } from './index'
import { makeCtx, makeRegistry } from '../test-helpers'
import { standardBlockSuite, leavesOf, absoluteLeaves } from '../standard-suite'

standardBlockSuite(tlsTBadge, { noCapacity: true })

const lay = (props: Record<string, unknown>, w = 600, h = 120) =>
  tlsTBadge.layout({ ...(tlsTBadge.defaults as any), ...props } as any, makeCtx({ width: w, height: h }, makeRegistry()))
const pill = (tree: any) => leavesOf(tree, 'badge.pill')[0]

describe('tls.t.badge', () => {
  it('the pill hugs its label at the top-left and the root reports its height', () => {
    const t = lay({})
    const p = pill(t)
    expect(p.x).toBe(0)
    expect(p.y).toBe(0)
    expect(p.width).toBeLessThan(300)
    expect(t.box.height).toBe(p.height)
    const text = leavesOf(t, 'badge.text')[0]
    expect(text.x).toBeGreaterThan(0)
    expect(text.x + text.width).toBeLessThanOrEqual(p.x + p.width)
  })

  it('a longer label makes a wider pill; size steps grow the pill', () => {
    expect(pill(lay({ text: 'New' })).width).toBeLessThan(pill(lay({ text: 'Most popular plan' })).width)
    const h = (size: string) => pill(lay({ size })).height
    expect(h('sm')).toBeLessThan(h('md'))
    expect(h('md')).toBeLessThan(h('lg'))
  })

  it('tones: solid fills with the accent, soft with a tint, outline only strokes', () => {
    const ctx = makeCtx({ width: 600, height: 120 })
    const accent = ctx.resolveColor('accent').color
    expect((pill(lay({ tone: 'solid' })).node as any).fill).toEqual({ type: 'solid', color: accent })
    const soft = (pill(lay({ tone: 'soft' })).node as any).fill
    expect(soft.type).toBe('solid')
    expect(soft.color).not.toBe(accent)
    const outline = pill(lay({ tone: 'outline' })).node as any
    expect(outline.fill).toBeUndefined()
    expect(outline.stroke.width).toBeGreaterThan(0)
  })

  it('an icon leads the label inside the pill', () => {
    const t = lay({ icon: 'star' })
    const icon = leavesOf(t, 'badge.icon')[0]
    const text = leavesOf(t, 'badge.text')[0]
    expect(icon.k).toBe('icon')
    expect(icon.x + icon.width).toBeLessThanOrEqual(text.x)
    expect(pill(t).width).toBeGreaterThan(pill(lay({})).width)
    expect(leavesOf(lay({ icon: 'no-such-icon' }), 'badge.icon')).toHaveLength(0)
  })

  it('a box narrower or lower than the pill shrinks the type; nothing leaves the box', () => {
    for (const [w, h] of [[90, 24], [140, 30], [64, 28]]) {
      const t = lay({ text: 'Most popular' }, w, h)
      for (const l of absoluteLeaves(t)) {
        expect(l.x + l.width).toBeLessThanOrEqual(w + 1)
        expect(l.y + l.height).toBeLessThanOrEqual(Math.max(h, 1) + 1)
      }
    }
  })

  it('intrinsic size equals the pill', () => {
    const ctx = makeCtx({ width: 600, height: 120 })
    const s = tlsTBadge.intrinsicSize!({ text: 'Most popular' } as any, ctx)
    const p = pill(lay({ text: 'Most popular' }))
    expect(s).toEqual({ width: p.width, height: p.height })
  })

  it('is an overlay atom anchored top-right, popping in under expressive', () => {
    expect(tlsTBadge.layer).toBe('overlay')
    expect(tlsTBadge.anchor).toBe('top-right')
    expect(tlsTBadge.motion).toEqual({ parts: ['badge'], preset: 'fade-up', expressive: 'pop' })
    expect(leavesOf(lay({}), 'badge').length).toBeGreaterThan(0)
  })
})
