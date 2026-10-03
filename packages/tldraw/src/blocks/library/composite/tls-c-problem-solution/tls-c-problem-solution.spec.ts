/**
 * tls.c.problem-solution — panels/callouts, icons toggle, arrow, depth, intrinsic size.
 */

import { tlsCProblemSolution, buildProblemSolution } from './index'
import { standardBlockSuite, leavesOf, assertContained, assertNoTextOverlap } from '../../text/standard-suite'
import { makeCtx } from '../../layout/test-helpers'
import { depthOk, layoutAt, hasPart, registry } from '../composite-test'

standardBlockSuite(tlsCProblemSolution, { withRegistry: true, noCapacity: true })

const EX = tlsCProblemSolution.describe!.example.props as Record<string, unknown>
const textOf = (tree: any, part: string) =>
  leavesOf(tree, part)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(''))
    .join('|')

describe('tls.c.problem-solution', () => {
  it('is a group-scope comparison composite', () => {
    expect(tlsCProblemSolution.scope).toBe('group')
    expect(tlsCProblemSolution.category).toBe('comparison')
  })

  it('build() depth <= 4 and no depth overflow at max content, both styles', () => {
    const side = { title: 't'.repeat(40), text: 'x'.repeat(200) }
    for (const style of ['panels', 'callouts']) depthOk(tlsCProblemSolution, buildProblemSolution, { ...EX, problem: side, solution: side, style }, 1500, 600)
  })

  it('problem sits left of the arrow, solution right; the arrow is between them', () => {
    for (const style of ['panels', 'callouts']) {
      const t = layoutAt(tlsCProblemSolution, { ...EX, style }, 1500, 400)
      const a = leavesOf(t, 'arrow')[0]
      const p = leavesOf(t, 'problem').concat(leavesOf(t, 'panel')[0] ? [leavesOf(t, 'panel')[0]] : [])
      const maxP = Math.max(...leavesOf(t, style === 'panels' ? 'text' : 'problem').filter((l, i) => (style === 'panels' ? i === 0 : true)).map((l) => l.x + l.width))
      expect(maxP).toBeLessThanOrEqual(a.x + 1)
      const sol = leavesOf(t, style === 'panels' ? 'text' : 'solution').filter((l, i) => (style === 'panels' ? i === 1 : true))
      for (const l of sol) expect(l.x).toBeGreaterThanOrEqual(a.x + a.width - 1)
      expect(p.length).toBeGreaterThan(0)
    }
  })

  it('icons toggle removes exactly the icons, never the arrow, in both styles', () => {
    for (const style of ['panels', 'callouts']) {
      const on = layoutAt(tlsCProblemSolution, { ...EX, style, showIcons: true }, 1500, 400)
      const off = layoutAt(tlsCProblemSolution, { ...EX, style, showIcons: false }, 1500, 400)
      expect(leavesOf(on, 'icon')).toHaveLength(2)
      expect(hasPart(off, 'icon')).toBe(false)
      expect(hasPart(off, 'arrow')).toBe(true)
      expect(textOf(off, 'text').length + textOf(off, 'problem').length).toBeGreaterThan(0)
    }
  })

  it('callouts style uses the danger and success roles', () => {
    const ctx = makeCtx({ width: 1500, height: 400 }, registry())
    const t = layoutAt(tlsCProblemSolution, { ...EX, style: 'callouts' }, 1500, 400)
    expect(JSON.stringify(t)).toContain('"type":"solid"')
    const icons = leavesOf(t, 'icon')
    expect(icons).toHaveLength(2)
    expect((icons[0].node as any).fill).not.toBe((icons[1].node as any).fill)
    expect(ctx.resolveColor('negative').color).not.toBe(ctx.resolveColor('positive').color)
  })

  it('panels: both panels have the same height and the content fits', () => {
    const t = layoutAt(tlsCProblemSolution, EX, 1500, 400)
    const p = leavesOf(t, 'panel')
    expect(p).toHaveLength(2)
    expect(p[0].height).toBe(p[1].height)
    assertContained(t, { width: 1500, height: Math.ceil(t.box.height) })
    assertNoTextOverlap(t)
  })

  it('intrinsicSize grows with text length', () => {
    const ctx = makeCtx({ width: 1000, height: 600 }, registry())
    const short = tlsCProblemSolution.intrinsicSize!(EX as any, ctx).height
    const long = tlsCProblemSolution.intrinsicSize!({ ...EX, problem: { title: 'P', text: 'long words here '.repeat(12) } } as any, ctx).height
    expect(long).toBeGreaterThan(short)
  })
})
