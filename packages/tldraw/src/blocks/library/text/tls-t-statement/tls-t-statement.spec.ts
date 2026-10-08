/**
 * tls.t.statement — autofit ladder, emphasis modes, alignment, toggles, capacity.
 */

import { tlsTStatement } from './index'
import { makeCtx as rv02Ctx } from '../test-helpers'
import { runWidth } from './layout'
import { makeCtx, makeRegistry } from '../test-helpers'
import { standardBlockSuite, leavesOf, absoluteLeaves } from '../standard-suite'

const ctx = (w = 1200, h = 420) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 1200, h = 420) =>
  tlsTStatement.layout({ ...(tlsTStatement.defaults as any), ...props } as any, ctx(w, h))
const sizeOf = (tree: any): number => (leavesOf(tree, 'text')[0].node as any).style.size

const LONG = 'Our platform lets every team turn **raw data** into a decision in minutes, without waiting on analysts or engineers, anywhere.'

standardBlockSuite(tlsTStatement, {
  overflowProps: { text: 'word '.repeat(140), size: 'md' },
})

describe('tls.t.statement', () => {
  it('uses the requested size when it fits', () => {
    const c = ctx()
    const sizes = { xl: c.resolveText('title').size, lg: c.resolveText('heading').size, md: c.resolveText('subheading').size }
    expect(sizeOf(lay({ text: 'Short.', size: 'xl' }))).toBe(sizes.xl)
    expect(sizeOf(lay({ text: 'Short.', size: 'lg' }))).toBe(sizes.lg)
    expect(sizeOf(lay({ text: 'Short.', size: 'md' }))).toBe(sizes.md)
  })

  it('autofits down the ladder xl -> lg -> md and never below md', () => {
    const c = ctx()
    const xl = sizeOf(lay({ text: LONG, size: 'xl' }, 1200, 260))
    expect(xl).toBeLessThan(c.resolveText('title').size)
    const tiny = sizeOf(lay({ text: LONG, size: 'xl' }, 1200, 20))
    expect(tiny).toBe(c.resolveText('subheading').size)
  })

  it('accent emphasis colours bold runs with the accent role and adds no rects', () => {
    const c = ctx()
    const tree = lay({ emphasis: 'accent', text: 'a **b** c' })
    const runs = (leavesOf(tree, 'text')[0].node as any).lines[0].runs
    const strong = runs.find((r: any) => r.bold)
    expect(strong.color).toBe(c.resolveColor('accent').color)
    expect(leavesOf(tree, 'emphasis')).toHaveLength(0)
  })

  it.each(['underline', 'highlight'] as const)('%s emphasis draws one rect per strong run behind the text', (emphasis) => {
    const tree: any = lay({ emphasis, text: 'one **two** three **four** five' })
    const rects = leavesOf(tree, 'emphasis')
    expect(rects).toHaveLength(2)
    const order = tree.children.map((n: any) => n.part ?? n.k)
    // RVM2: the rects sit in one `emphasis` group (a motion part), drawn before (behind) the text
    expect(order.indexOf('emphasis')).toBeGreaterThanOrEqual(0)
    expect(order.indexOf('emphasis')).toBeLessThan(order.indexOf('text'))
    // strong runs keep the normal text colour in these modes
    const runs = (leavesOf(tree, 'text')[0].node as any).lines[0].runs
    expect(runs.find((r: any) => r.bold).color).toBeUndefined()
  })

  it('emphasis rect boxes equal the run boxes measured at the final (post-autofit) size', () => {
    for (const emphasis of ['highlight', 'underline'] as const) {
      const c = ctx(900, 200)
      const tree = lay({ emphasis, size: 'xl', text: 'Before **the key words** after the words and more filler words here' }, 900, 200)
      const text = leavesOf(tree, 'text')[0]
      const style = (text.node as any).style
      expect(style.size).toBeLessThan(c.resolveText('title').size) // autofit happened
      const lines = (text.node as any).lines
      const line = lines.find((l: any) => l.runs?.some((r: any) => r.bold))
      const li = lines.indexOf(line)
      const ri = line.runs.findIndex((r: any) => r.bold)
      const before = line.runs.slice(0, ri).map((r: any) => r.text).join('')
      // RV02: run offsets use the glyph-advance table (what the browser draws), not the estimate.
      const startX = text.x + line.runs.slice(0, ri).reduce((x: number, r: any) => x + runWidth(r.text, style, !!r.bold), 0)
      expect(before.length).toBeGreaterThan(0)
      const rect = leavesOf(tree, `emphasis[${li}.${ri}]`)[0]
      const runW = runWidth(line.runs[ri].text.replace(/\s+$/, ''), style, true)
      if (emphasis === 'underline') {
        expect(rect.x).toBeCloseTo(startX, 0)
        expect(rect.width).toBeCloseTo(runW, 0)
      } else {
        const pad = Math.round(style.size * 0.08)
        expect(rect.x).toBeCloseTo(startX - pad, 0)
        expect(rect.width).toBeCloseTo(runW + pad * 2, 0)
      }
      // the rect sits within the text line vertically
      expect(rect.y).toBeGreaterThanOrEqual(text.y + (line.top ?? 0) - 1)
      expect(rect.y + rect.height).toBeLessThanOrEqual(text.y + (line.top ?? 0) + style.size * style.lineHeight + 1)
    }
  })

  it('text with no strong runs has no emphasis rects in any mode', () => {
    for (const emphasis of ['accent', 'underline', 'highlight']) {
      expect(leavesOf(lay({ emphasis, text: 'plain words only' }), 'emphasis')).toHaveLength(0)
    }
  })

  it('unbalanced markers stay literal', () => {
    const tree = lay({ text: 'a ** b' })
    expect((leavesOf(tree, 'text')[0].node as any).lines.map((l: any) => l.text).join('')).toBe('a ** b')
  })

  it('center alignment emits one centred node per line', () => {
    const tree = lay({ align: 'center', size: 'md', showMark: false, text: LONG }, 700, 600)
    const lines = leavesOf(tree, 'text')
    expect(lines.length).toBeGreaterThan(1)
    for (const l of lines) expect(Math.abs(l.x + l.width / 2 - 350)).toBeLessThanOrEqual(2)
  })

  it('showMark draws a short accent rule above the text; showAttribution adds the source line', () => {
    const c = ctx()
    const tree = lay({ attribution: 'Board review' })
    const mark = leavesOf(tree, 'mark')[0]
    expect((mark.node as any).fill.color).toBe(c.resolveColor('accent').color)
    expect(mark.y).toBeLessThan(leavesOf(tree, 'text')[0].y)
    expect(leavesOf(tree, 'attribution')).toHaveLength(1)
    expect(leavesOf(lay({ attribution: '' }), 'attribution')).toHaveLength(1 - 1 + 0)
  })

  it('attribution sits below the text with no overlap', () => {
    const tree = lay({ attribution: 'Board review' })
    const t = leavesOf(tree, 'text')[0]
    const a = leavesOf(tree, 'attribution')[0]
    expect(a.y).toBeGreaterThanOrEqual(t.y + t.height)
  })

  it('accepts a RichText object (bold runs are strong)', () => {
    const tree = lay({ text: { runs: [{ text: 'We ' }, { text: 'win', bold: true }] }, emphasis: 'highlight' })
    expect(leavesOf(tree, 'emphasis')).toHaveLength(1)
    expect(absoluteLeaves(tree).length).toBeGreaterThan(2)
  })

  describe('capacity', () => {
    it('reports fits after autofit but not when even md overflows; remedy is shorten text', () => {
      const ok = tlsTStatement.capacity!({ ...(tlsTStatement.defaults as any), text: LONG, size: 'xl' } as any, { width: 1200, height: 300 }, ctx(1200, 300))
      expect(ok.fits).toBe(true)
      const bad = tlsTStatement.capacity!({ ...(tlsTStatement.defaults as any), text: 'word '.repeat(80) } as any, { width: 600, height: 120 }, ctx(600, 120))
      expect(bad.fits).toBe(false)
      expect(bad.remedy).toEqual([{ kind: 'truncate', slot: 'text' }])
      expect(bad.budget.text.max).toBeLessThanOrEqual(100)
    })
  })

  describe('RV02 — highlight sits on its run (review G02)', () => {
    it('places the example highlight where the browser draws "growth engine", not where the estimate does', () => {
      const ex = tlsTStatement.describe!.example.props as any
      const c = ctx(1760, 600)
      const tree = tlsTStatement.layout(ex, c)
      const text = leavesOf(tree, 'text')[0]
      const style = (text.node as any).style
      const rect = leavesOf(tree, 'emphasis')[0]
      // Browser-measured on coral-pop (Inter 64px): the prefix is ~918 units, "growth engine" ~428.
      const prefix = runWidth('Retention, not acquisition, is our ', style)
      expect(Math.abs(prefix - 918)).toBeLessThan(918 * 0.04)
      expect(Math.abs(runWidth('growth engine', style, true) - 428)).toBeLessThan(428 * 0.05)
      const pad = Math.round(style.size * 0.08)
      expect(rect.x + pad).toBeCloseTo(text.x + prefix, 0)
      // The estimate would have put it >200 units further right.
      expect(c.measureText('Retention, not acquisition, is our ', style).width - prefix).toBeGreaterThan(200)
    })
  })
})

describe('RV02 — honest size (review G02)', () => {
  const DEF = tlsTStatement
  const leaves = (n: any, ox = 0, oy = 0, out: any[] = []): any[] => {
    const x = ox + n.box.x
    const y = oy + n.box.y
    if (n.k !== 'group') out.push({ x, y, w: n.box.width, h: n.box.height })
    for (const c of n.children ?? []) leaves(c, x, y, out)
    return out
  }

  it.each([
    ['preferred', DEF.size.preferred],
    ['min', DEF.size.min],
  ])('the example fits size.%s with nothing escaping it', (_label, [w, h]) => {
    const node = DEF.layout(DEF.describe!.example.props as any, rv02Ctx({ width: w, height: h }))
    expect(node.box.height).toBeLessThanOrEqual(h + 0.5)
    for (const l of leaves(node)) {
      expect(l.x + l.w).toBeLessThanOrEqual(w + 0.5)
      expect(l.y + l.h).toBeLessThanOrEqual(h + 0.5)
    }
  })
})
