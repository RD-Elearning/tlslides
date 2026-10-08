/**
 * tls.c.quiz — layouts, reveal, answer highlight, explanation toggle, lint, depth, intrinsic size.
 */

import { tlsCQuiz, buildQuiz, answerIndex } from './index'
import { standardBlockSuite, leavesOf, assertContained, assertNoTextOverlap } from '../../text/standard-suite'
import { makeCtx } from '../../layout/test-helpers'
import { validateDeckSpec } from '../../../validate-deck-spec'
import { depthOk, layoutAt, hasPart, registry } from '../composite-test'

standardBlockSuite(tlsCQuiz, { withRegistry: true, overflowProps: { options: ['a', 'b', 'c', 'd', 'e', 'f'] } })

const EX = tlsCQuiz.describe!.example.props as Record<string, unknown>
const textOf = (tree: any, part: string) =>
  leavesOf(tree, part)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(''))
    .join('|')

describe('tls.c.quiz', () => {
  it('is a group-scope learning composite', () => {
    expect(tlsCQuiz.scope).toBe('group')
    expect(tlsCQuiz.category).toBe('learning')
  })

  it('build() depth <= 4 and no depth overflow at max content, both layouts', () => {
    const max = { question: 'q'.repeat(200), options: ['a'.repeat(80), 'b'.repeat(80), 'c'.repeat(80), 'd'.repeat(80), 'e'.repeat(80)], answer: 4, explanation: 'x'.repeat(200) }
    for (const layout of ['list', 'grid']) depthOk(tlsCQuiz, buildQuiz, { ...EX, ...max, layout }, 1500, 1000)
  })

  it('letters every option A..E and shows each option text', () => {
    const t = layoutAt(tlsCQuiz, { ...EX, options: ['one', 'two', 'three', 'four', 'five'], answer: 4 }, 1500, 800)
    expect(textOf(t, 'letter')).toBe('A|B|C|D|E')
    expect(textOf(t, 'option')).toBe('one|two|three|four|five')
  })

  it('reveal shown draws exactly one answer part, on the correct option; none and a bad index draw none', () => {
    const shown = layoutAt(tlsCQuiz, { ...EX, reveal: 'shown', answer: 1 }, 1500, 800)
    expect(leavesOf(shown, 'answer').filter((l) => l.k === 'rect')).toHaveLength(1)
    const rows = leavesOf(shown, 'option').map((l) => l.y)
    const ans = leavesOf(shown, 'answer').find((l) => l.k === 'rect')!
    expect(rows[1]).toBeGreaterThanOrEqual(ans.y)
    expect(rows[1]).toBeLessThan(ans.y + ans.height)
    for (const props of [{ reveal: 'none' }, { answer: 9 }, { answer: -1 }, { answer: 'x' }, { answer: 1.5 }]) {
      const t = layoutAt(tlsCQuiz, { ...EX, ...props }, 1500, 800)
      expect(hasPart(t, 'answer')).toBe(false)
      expect(() => JSON.stringify(t)).not.toThrow()
    }
  })

  it('reveal none also hides the explanation; the explanation toggle removes only it', () => {
    expect(hasPart(layoutAt(tlsCQuiz, { ...EX, reveal: 'none' }, 1500, 800), 'explanation')).toBe(false)
    const off = layoutAt(tlsCQuiz, { ...EX, showExplanation: false }, 1500, 800)
    expect(hasPart(off, 'explanation')).toBe(false)
    expect(hasPart(off, 'answer')).toBe(true)
    expect(hasPart(off, 'question')).toBe(true)
    expect(textOf(layoutAt(tlsCQuiz, EX, 1500, 800), 'explanation')).toContain('median')
  })

  it('the correct option is styled with the positive role', () => {
    const t = layoutAt(tlsCQuiz, EX, 1500, 800)
    const ctx = makeCtx({ width: 1500, height: 800 }, registry())
    const ans = leavesOf(t, 'answer').find((l) => l.k === 'rect')!.node as any
    expect(ans.stroke.color).toBe(ctx.resolveColor('positive').color)
    const badge = leavesOf(t, 'badge')[1].node as any
    expect(badge.fill.color).toBe(ctx.resolveColor('positive').color)
    expect((leavesOf(t, 'badge')[0].node as any).fill.color).not.toBe(badge.fill.color)
  })

  it('grid puts options in two columns; list stacks them', () => {
    const g = layoutAt(tlsCQuiz, { ...EX, options: ['a', 'b', 'c', 'd'], answer: 0, layout: 'grid' }, 1500, 800)
    const xs = leavesOf(g, 'option').map((l) => Math.round(l.x))
    expect(new Set(xs).size).toBe(2)
    const l = layoutAt(tlsCQuiz, { ...EX, options: ['a', 'b', 'c', 'd'], answer: 0, layout: 'list' }, 1500, 800)
    expect(new Set(leavesOf(l, 'option').map((o) => Math.round(o.x))).size).toBe(1)
    for (const t of [g, l]) {
      assertContained(t, { width: 1500, height: 800 })
      assertNoTextOverlap(t)
    }
  })

  it('answer out of range: lint error with a clear message, and validateDeckSpec rejects an index over 4', () => {
    const f = tlsCQuiz.lint!({ ...EX, answer: 5 } as any, {} as any)
    expect(f).toEqual([expect.objectContaining({ level: 'error', rule: 'quiz/answer-out-of-range' })])
    expect(f[0].message).toMatch(/0 to 2/)
    expect(tlsCQuiz.lint!({ ...EX, answer: 3 } as any, {} as any)).toHaveLength(1)
    expect(tlsCQuiz.lint!({ ...EX, answer: 2 } as any, {} as any)).toEqual([])
    expect(tlsCQuiz.lint!({ ...EX, answer: undefined } as any, {} as any)).toHaveLength(1)
    const deck: any = {
      id: 'd', title: 'T', version: 1, aspect: 'widescreen', theme: 'coral-pop',
      slides: [{ id: 's1', layout: 'blank', role: 'content', regions: { content: [{ id: 'q', type: 'tls.c.quiz', props: { ...EX, answer: 7 } }] } }],
    }
    expect(validateDeckSpec(deck, registry()).some((x) => x.level === 'error')).toBe(true)
    expect(answerIndex({ ...(EX as any), answer: 2 })).toBe(2)
  })

  it('intrinsicSize grows with content', () => {
    const ctx = makeCtx({ width: 1500, height: 900 }, registry())
    const a = tlsCQuiz.intrinsicSize!({ ...EX, options: ['a', 'b'], answer: 0 } as any, ctx).height
    const b = tlsCQuiz.intrinsicSize!({ ...EX, options: ['a', 'b', 'c', 'd', 'e'], answer: 0 } as any, ctx).height
    expect(b).toBeGreaterThan(a)
    const narrow = makeCtx({ width: 700, height: 900 }, registry())
    const long = tlsCQuiz.intrinsicSize!({ ...EX, options: ['a b '.repeat(20).trim(), 'b'], answer: 0 } as any, narrow).height
    expect(long).toBeGreaterThan(tlsCQuiz.intrinsicSize!({ ...EX, options: ['a', 'b'], answer: 0 } as any, narrow).height)
  })

  it('capacity reports options past the limit', () => {
    const ctx = makeCtx({ width: 1500, height: 780 }, registry())
    expect(tlsCQuiz.capacity!({ ...EX, options: ['1', '2', '3', '4', '5', '6'] } as any, { width: 1500, height: 780 }, ctx).fits).toBe(false)
  })
})
