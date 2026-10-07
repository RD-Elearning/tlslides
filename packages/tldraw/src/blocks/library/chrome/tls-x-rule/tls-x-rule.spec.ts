/**
 * tls.x.rule — axis, weight, tone (incl. gradient paint), short bar, motion.
 */

import { tlsXRule } from './index'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { standardBlockSuite, leavesOf } from '../../text/standard-suite'
import { renderNodeToSvg } from '../../../render-svg'
import { MOTION_PRESETS } from '../../../motion/presets'

const ctx = (w = 1200, h = 40) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 1200, h = 40) =>
  tlsXRule.layout({ ...(tlsXRule.defaults as any), ...props } as any, ctx(w, h))
// the bar: part `rule` (horizontal) or `rule-v` (vertical, M1b/E7)
const rule = (tree: any) => leavesOf(tree, 'rule')[0] ?? leavesOf(tree, 'rule-v')[0]

standardBlockSuite(tlsXRule, { noCapacity: true })

describe('tls.x.rule', () => {
  it('horizontal: full width, height by weight; thickness hairline < md < bold', () => {
    const h = (weight: string) => rule(lay({ weight })).height
    expect(rule(lay({})).width).toBe(1200)
    expect([h('hairline'), h('md'), h('bold')]).toEqual([2, 4, 8])
  })

  it('vertical: full height, width by weight', () => {
    const r = rule(lay({ axis: 'vertical', weight: 'md' }, 40, 600))
    expect(r.height).toBe(600)
    expect(r.width).toBe(4)
  })

  it('short is a 64 px bar at the start (never longer than the box)', () => {
    expect(rule(lay({ length: 'short' })).width).toBe(64)
    expect(rule(lay({ length: 'short' })).x).toBe(0)
    expect(rule(lay({ length: 'short' }, 30, 10)).width).toBe(30)
    expect(rule(lay({ axis: 'vertical', length: 'short' }, 10, 400)).height).toBe(64)
  })

  it('tone line / accent use the role colours; gradient is a linearGradient accent -> accent2', () => {
    const c = ctx()
    expect((rule(lay({ tone: 'line' })).node as any).fill).toEqual({ type: 'solid', color: c.resolveColor('line').color })
    expect((rule(lay({ tone: 'accent' })).node as any).fill).toEqual({ type: 'solid', color: c.resolveColor('accent').color })
    const g = (rule(lay({ tone: 'gradient' })).node as any).fill
    expect(g.type).toBe('linearGradient')
    expect(g.stops.map((s: any) => s.color)).toEqual([c.resolveColor('accent').color, c.resolveColor('accent2').color])
    expect(g.angle).toBe(90)
    expect((rule(lay({ tone: 'gradient', axis: 'vertical' }, 40, 600)).node as any).fill.angle).toBe(180)
  })

  it('the gradient reaches the SVG export as a linearGradient def', () => {
    expect(renderNodeToSvg(lay({ tone: 'gradient' }))).toContain('<linearGradient')
  })

  it('is a rect, not a line node, and carries the rule part', () => {
    expect(rule(lay({})).k).toBe('rect')
  })

  it('motion: a horizontal rule wipes from its start, a vertical one top-down (M1b/E7)', () => {
    expect(tlsXRule.motion).toEqual({ parts: ['rule', 'rule-v'], preset: 'wipe-x', partMotion: { 'rule-v': { preset: 'wipe-down' } } })
    expect(MOTION_PRESETS['wipe-x']).toBeDefined()
    expect(MOTION_PRESETS['wipe-down']).toBeDefined()
    expect(rule(lay({})).part).toBe('rule')
    expect(rule(lay({ axis: 'vertical' }, 40, 600)).part).toBe('rule-v')
  })

  it('category is decoration (not chrome)', () => {
    expect(tlsXRule.category).toBe('decoration')
  })

  it('DOM and SVG agree for the gradient and the vertical rule (parity probe)', async () => {
    const { assertParity } = await import('../../../parity-harness')
    await assertParity(tlsXRule, { axis: 'horizontal', weight: 'bold', tone: 'gradient', length: 'full' } as any, { width: 960, height: 40 })
    await assertParity(tlsXRule, { axis: 'vertical', weight: 'md', tone: 'gradient', length: 'short' } as any, { width: 40, height: 540 })
  }, 60000)
})
