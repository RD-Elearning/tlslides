/**
 * tls.c.objectives — markers, columns, intro toggle, depth, capacity, slide-scope compile.
 */

import { tlsCObjectives, buildObjectives } from './index'
import { standardBlockSuite, leavesOf, assertContained, assertNoTextOverlap } from '../../text/standard-suite'
import { makeCtx } from '../../layout/test-helpers'
import { depthOk, layoutAt, hasPart, registry, slideScopeCompiles } from '../composite-test'
import { specNodes } from '../_kit'

const SIX = Array.from({ length: 6 }, (_, i) => `Objective ${i + 1}: ` + 'describe the thing in detail '.repeat(3))
standardBlockSuite(tlsCObjectives, { withRegistry: true, overflowProps: { items: [...SIX, 'a'] } })

const EX = tlsCObjectives.describe!.example.props as Record<string, any>
const textOf = (tree: any, part: string) =>
  leavesOf(tree, part)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(''))
    .join('|')

describe('tls.c.objectives', () => {
  it('is a slide-scope agenda composite pointing at agenda', () => {
    expect(tlsCObjectives.scope).toBe('slide')
    expect(tlsCObjectives.category).toBe('agenda')
    expect(tlsCObjectives.describe!.avoid).toContain('tls.c.agenda')
  })

  it('each marker picks its list block; depth <= 4 and no overflow at six long items', () => {
    const want: Record<string, string> = { numbered: 'tls.t.numbered', check: 'tls.t.checklist', icon: 'tls.m.icon-list' }
    for (const marker of ['numbered', 'check', 'icon']) {
      expect(specNodes(buildObjectives({ ...EX, marker } as any)).some((s) => s.type === want[marker])).toBe(true)
      for (const cols of ['1', '2']) depthOk(tlsCObjectives, buildObjectives, { items: SIX, marker, cols }, 1500, 900)
    }
  })

  it('shows the intro and every item for every marker', () => {
    for (const marker of ['numbered', 'check', 'icon']) {
      const t = layoutAt(tlsCObjectives, { ...EX, marker }, 1500, 640)
      expect(textOf(t, 'intro')).toContain('By the end')
      const list = textOf(t, 'list')
      for (const w of ['Describe a sample', 'fitting chart', 'two-sample']) expect(list).toContain(w)
      assertContained(t, { width: 1500, height: 640 })
      assertNoTextOverlap(t)
    }
  })

  it('showIntro false removes exactly the intro line; the list stays', () => {
    const off = layoutAt(tlsCObjectives, { ...EX, showIntro: false }, 1500, 640)
    expect(hasPart(off, 'intro')).toBe(false)
    expect(hasPart(off, 'list')).toBe(true)
  })

  it('two columns put items side by side for numbered and check', () => {
    for (const marker of ['numbered', 'check']) {
      const one = layoutAt(tlsCObjectives, { ...EX, items: SIX.slice(0, 4), marker, cols: '1' }, 1500, 900)
      const two = layoutAt(tlsCObjectives, { ...EX, items: SIX.slice(0, 4), marker, cols: '2' }, 1500, 900)
      const xs = (t: any) => new Set(leavesOf(t, 'list').filter((l) => l.k === 'text').map((l) => Math.round(l.x))).size
      expect(xs(two)).toBeGreaterThan(xs(one))
    }
  })

  it('the block is vertically centred and grows past a too-short box', () => {
    const t = layoutAt(tlsCObjectives, EX, 1500, 900)
    const ys = leavesOf(t, 'intro').concat(leavesOf(t, 'list'))
    expect(Math.abs(Math.min(...ys.map((l) => l.y)) - (900 - Math.max(...ys.map((l) => l.y + l.height))))).toBeLessThan(30)
    expect(layoutAt(tlsCObjectives, { ...EX, items: SIX }, 1500, 150).box.height).toBeGreaterThan(150)
  })

  it('capacity flags more than six objectives', () => {
    const ctx = makeCtx({ width: 1500, height: 640 }, registry())
    expect(tlsCObjectives.capacity!({ ...EX, items: [...SIX, 'x'] } as any, { width: 1500, height: 640 }, ctx).fits).toBe(false)
  })

  it('the example compiles in a blank and a title region, inside the frame', () => {
    slideScopeCompiles(tlsCObjectives, 'blank', 'content')
    slideScopeCompiles(tlsCObjectives, 'title', 'title')
  })
})
