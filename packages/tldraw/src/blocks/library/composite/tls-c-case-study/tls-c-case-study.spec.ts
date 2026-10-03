/**
 * tls.c.case-study — columns/rows, emphasis, metric and client toggles, depth, slide-scope compile.
 */

import { tlsCCaseStudy, buildCaseStudy } from './index'
import { standardBlockSuite, leavesOf, assertContained, assertNoTextOverlap } from '../../text/standard-suite'
import { contrastRatio } from '../../../color-math'
import { lumOf } from '../../text/_engine/color'
import { depthOk, layoutAt, hasPart, slideScopeCompiles } from '../composite-test'

standardBlockSuite(tlsCCaseStudy, { withRegistry: true, noCapacity: true })

const EX = tlsCCaseStudy.describe!.example.props as Record<string, unknown>
const textOf = (tree: any, part: string) =>
  leavesOf(tree, part)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(''))
    .join('|')

describe('tls.c.case-study', () => {
  it('is a slide-scope comparison composite', () => {
    expect(tlsCCaseStudy.scope).toBe('slide')
    expect(tlsCCaseStudy.category).toBe('comparison')
  })

  it('build() depth <= 4 and no depth overflow at max content, both layouts', () => {
    const max = { client: 'c'.repeat(40), challenge: 'x'.repeat(220), solution: 'y'.repeat(220), result: 'z'.repeat(220), metric: { value: '+123456789%', label: 'l'.repeat(40) } }
    for (const layout of ['columns', 'rows']) depthOk(tlsCCaseStudy, buildCaseStudy, { ...EX, ...max, layout }, 1500, 900)
  })

  it('columns: three panels side by side, same height, challenge < solution < result in x', () => {
    const t = layoutAt(tlsCCaseStudy, { ...EX, layout: 'columns' }, 1500, 700)
    const p = leavesOf(t, 'panel')
    expect(p).toHaveLength(3)
    expect(p[0].x).toBeLessThan(p[1].x)
    expect(p[1].x).toBeLessThan(p[2].x)
    expect(new Set(p.map((x) => Math.round(x.height))).size).toBe(1)
    assertContained(t, { width: 1500, height: 700 })
    assertNoTextOverlap(t)
  })

  it('rows: three bands stacked, labels in a left column, the metric inside the result band', () => {
    const t = layoutAt(tlsCCaseStudy, { ...EX, layout: 'rows' }, 1500, 800)
    const p = leavesOf(t, 'panel')
    expect(p[0].y).toBeLessThan(p[1].y)
    expect(p[1].y).toBeLessThan(p[2].y)
    expect(textOf(t, 'label')).toBe('CHALLENGE|SOLUTION|RESULT')
    const m = leavesOf(t, 'metric')[0]
    expect(m.y).toBeGreaterThanOrEqual(p[2].y)
    expect(m.y + m.height).toBeLessThanOrEqual(p[2].y + p[2].height + 1)
    assertContained(t, { width: 1500, height: 800 })
    assertNoTextOverlap(t)
  })

  it('each toggle removes exactly its piece', () => {
    for (const layout of ['columns', 'rows']) {
      const off = layoutAt(tlsCCaseStudy, { ...EX, layout, showMetric: false }, 1500, 800)
      expect(hasPart(off, 'metric')).toBe(false)
      expect(hasPart(off, 'metriclabel')).toBe(false)
      expect(hasPart(off, 'client')).toBe(true)
      const off2 = layoutAt(tlsCCaseStudy, { ...EX, layout, showClient: false }, 1500, 800)
      expect(hasPart(off2, 'client')).toBe(false)
      expect(hasPart(off2, 'metric')).toBe(true)
    }
  })

  it('emphasis result fills the result panel with the accent and its text reads on it', () => {
    for (const layout of ['columns', 'rows']) {
      const t = layoutAt(tlsCCaseStudy, { ...EX, layout, emphasis: 'result' }, 1500, 800)
      const p = leavesOf(t, 'panel')
      const fills = p.map((x) => (x.node as any).fill.color as string)
      expect(fills[2]).not.toBe(fills[0])
      for (const part of ['metric', 'metriclabel']) {
        const col = (leavesOf(t, part)[0].node as any).style.color as string
        expect(contrastRatio(lumOf(col), lumOf(fills[2]))).toBeGreaterThanOrEqual(3)
      }
      const none = layoutAt(tlsCCaseStudy, { ...EX, layout, emphasis: 'none' }, 1500, 800)
      const nf = leavesOf(none, 'panel').map((x) => (x.node as any).fill.color)
      expect(new Set(nf).size).toBe(1)
    }
  })

  it('shows the three texts and the headline value', () => {
    const t = layoutAt(tlsCCaseStudy, EX, 1500, 800)
    expect(textOf(t, 'text')).toContain('Long queues')
    expect(textOf(t, 'text')).toContain('kiosks')
    expect(textOf(t, 'metric')).toBe('-80%')
  })

  it('max content in both layouts stays inside the box and text never overlaps', () => {
    const max = { client: 'c'.repeat(40), challenge: 'word '.repeat(44).trim(), solution: 'word '.repeat(44).trim(), result: 'word '.repeat(44).trim(), metric: { value: '+123456789%', label: 'l'.repeat(40) } }
    for (const layout of ['columns', 'rows']) {
      const t = layoutAt(tlsCCaseStudy, { ...EX, ...max, layout }, 1500, 1000)
      assertNoTextOverlap(t)
      assertContained(t, { width: 1500, height: Math.ceil(t.box.height) })
    }
  })

  it('the example compiles in a title and a blank region, inside the frame', () => {
    slideScopeCompiles(tlsCCaseStudy, 'title', 'title')
    slideScopeCompiles(tlsCCaseStudy, 'blank', 'content')
  })
})
