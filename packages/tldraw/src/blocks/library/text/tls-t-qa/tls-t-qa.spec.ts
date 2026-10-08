/**
 * tls.t.qa — pair structure, markers, ordering, capacity, and the recorded reveal gap.
 */

import { tlsTQa } from './index'
import { makeCtx, makeRegistry } from '../test-helpers'
import { standardBlockSuite, leavesOf } from '../standard-suite'

const ctx = (w = 900, h = 460) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 900, h = 460) =>
  tlsTQa.layout({ ...(tlsTQa.defaults as any), ...props } as any, ctx(w, h))
const one = (tree: any, part: string) => leavesOf(tree, part).find((l) => l.part === part)!

standardBlockSuite(tlsTQa, {
  overflowProps: { items: Array.from({ length: 12 }, (_, i) => ({ q: `Question ${i}?`, a: 'An answer that takes some words to say.' })) },
})

describe('tls.t.qa', () => {
  it('runs q[0], a[0], q[1], a[1]... downwards without overlap', () => {
    const tree = lay({})
    const seq = ['q[0]', 'a[0]', 'q[1]', 'a[1]', 'q[2]', 'a[2]'].map((p) => one(tree, p))
    for (let i = 1; i < seq.length; i++) expect(seq[i].y).toBeGreaterThanOrEqual(seq[i - 1].y + seq[i - 1].height - 1)
  })

  it('marker qa: Q and A badges for every pair, answers aligned with questions', () => {
    const tree = lay({ marker: 'qa' })
    expect(leavesOf(tree, 'qmark')).toHaveLength(6)
    expect(leavesOf(tree, 'amark')).toHaveLength(6)
    expect(one(tree, 'q[0]').x).toBe(one(tree, 'a[0]').x)
    const label = (p: string) => (one(tree, p).node as any).lines[0].runs[0].text
    expect([label('qmark[0]'), label('amark[0]')]).toEqual(['Q', 'A'])
  })

  it('marker numbered: numbers on the questions only', () => {
    const tree = lay({ marker: 'numbered' })
    expect(leavesOf(tree, 'amark')).toHaveLength(0)
    expect((one(tree, 'qmark[1]').node as any).lines[0].runs[0].text).toBe('2')
  })

  it('marker none: no badges and the text starts at x 0', () => {
    const tree = lay({ marker: 'none' })
    expect(leavesOf(tree, 'qmark')).toHaveLength(0)
    expect(one(tree, 'q[0]').x).toBe(0)
    expect(one(tree, 'a[0]').x).toBe(0)
  })

  it('questions are bold, answers keep bold runs from **markers**', () => {
    const tree = lay({})
    expect((one(tree, 'q[0]').node as any).lines[0].runs[0].bold).toBe(true)
    expect((one(tree, 'a[0]').node as any).lines.some((l: any) => l.runs?.some((r: any) => r.bold))).toBe(true)
  })

  it('a long answer pushes the next question down', () => {
    const tree = lay({ items: [{ q: 'Q', a: 'word '.repeat(60) }, { q: 'Next', a: 'x' }] }, 500, 900)
    const a = one(tree, 'a[0]')
    expect(a.height).toBeGreaterThan(100)
    expect(one(tree, 'q[1]').y).toBeGreaterThanOrEqual(a.y + a.height)
  })

  it('ships without an answers-on-click reveal option (per-part triggers are unsupported)', () => {
    expect(tlsTQa.schema.reveal).toBeUndefined()
  })

  it('capacity: truncate remedy; items over the max do not fit even in a tall box', () => {
    const items = Array.from({ length: 6 }, () => ({ q: 'q', a: 'a' }))
    const r = tlsTQa.capacity!({ ...(tlsTQa.defaults as any), items } as any, { width: 900, height: 4000 }, ctx(900, 4000))
    expect(r.fits).toBe(false)
    expect(r.remedy).toEqual([{ kind: 'truncate', slot: 'items' }])
  })
})
