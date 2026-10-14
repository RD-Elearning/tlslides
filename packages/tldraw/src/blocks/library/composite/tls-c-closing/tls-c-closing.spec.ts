/**
 * tls.c.closing — variants, toggles, button/link, capacity, depth, slide-scope compile.
 */

import { tlsCClosing, buildClosing } from './index'
import { standardBlockSuite, leavesOf, assertContained, assertNoTextOverlap } from '../../text/standard-suite'
import { collectParts } from '../../layout/test-helpers'
import { makeCtx } from '../../layout/test-helpers'
import { depthOk, layoutAt, hasPart, registry, slideScopeCompiles } from '../composite-test'

standardBlockSuite(tlsCClosing, { withRegistry: true, overflowProps: { contacts: ['a', 'b', 'c', 'd', 'e', 'f'] } })

const EX = tlsCClosing.describe!.example.props as Record<string, unknown>
const textOf = (tree: any, part: string) =>
  leavesOf(tree, part)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(''))
    .join('|')

describe('tls.c.closing', () => {
  it('is a slide-scope closing composite', () => {
    expect(tlsCClosing.scope).toBe('slide')
    expect(tlsCClosing.category).toBe('closing')
  })

  it('build() depth <= 4 and no depth overflow at max content, both variants', () => {
    const max = { title: 'w'.repeat(50), text: 'x'.repeat(160), cta: 'c'.repeat(40), contacts: ['a'.repeat(60), 'b'.repeat(60), 'c'.repeat(60), 'd'.repeat(60)], person: { name: 'n'.repeat(40), role: 'r'.repeat(50) } }
    for (const variant of ['centered', 'split']) depthOk(tlsCClosing, buildClosing, { ...EX, ...max, variant }, 1600, 800)
  })

  it('each toggle removes exactly its piece', () => {
    for (const variant of ['centered', 'split']) {
      const full = { ...EX, variant }
      for (const [key, part] of [['showCta', 'cta'], ['showContacts', 'contacts'], ['showPerson', 'person']]) {
        const off = layoutAt(tlsCClosing, { ...full, [key]: false }, 1600, 800)
        expect(hasPart(off, part)).toBe(false)
        for (const other of ['cta', 'contacts', 'person'].filter((p) => p !== part)) expect(hasPart(off, other)).toBe(true)
        expect(hasPart(off, 'title')).toBe(true)
      }
    }
  })

  it('centered centres the title; split keeps title left and the person in the right panel', () => {
    const c = layoutAt(tlsCClosing, { ...EX, variant: 'centered' }, 1600, 800)
    for (const l of leavesOf(c, 'title')) expect(Math.abs(l.x + l.width / 2 - 800)).toBeLessThan(2)
    const s = layoutAt(tlsCClosing, { ...EX, variant: 'split' }, 1600, 800)
    expect(leavesOf(s, 'title')[0].x).toBe(0)
    expect(leavesOf(s, 'person')[0].x).toBeGreaterThan(800)
    expect(leavesOf(s, 'panel')[0].x).toBeGreaterThan(800)
  })

  it('ctaStyle button draws a pill behind the label; link draws accent text with an arrow and no pill', () => {
    const b = layoutAt(tlsCClosing, { ...EX, ctaStyle: 'button' }, 1600, 800)
    const pill = leavesOf(b, 'cta').find((l) => l.k === 'rect')!
    const label = leavesOf(b, 'cta').find((l) => l.k === 'text')!
    expect(label.x).toBeGreaterThanOrEqual(pill.x)
    expect(label.x).toBeLessThan(pill.x + pill.width / 2)
    expect(label.y).toBeGreaterThanOrEqual(pill.y)
    expect(label.y + label.height).toBeLessThanOrEqual(pill.y + pill.height + 1)
    // the rendered text (glyph table width) fits the pill
    const { lineWidth } = require('../_kit')
    expect(label.x - pill.x + lineWidth('Book office hours', (label.node as any).style)).toBeLessThanOrEqual(pill.width)
    const l = layoutAt(tlsCClosing, { ...EX, ctaStyle: 'link' }, 1600, 800)
    expect(leavesOf(l, 'cta').some((x) => x.k === 'rect')).toBe(false)
    expect(textOf(l, 'cta')).toContain('→')
  })

  it('shows the contacts and the person text; text never overlaps', () => {
    for (const variant of ['centered', 'split']) {
      const t = layoutAt(tlsCClosing, { ...EX, variant, contacts: ['a@x.org', 'b.org'] }, 1600, 800)
      expect(textOf(t, 'contacts')).toContain('a@x.org')
      expect(textOf(t, 'contacts')).toContain('b.org')
      expect(textOf(t, 'person')).toContain('Tran')
      assertNoTextOverlap(t)
      assertContained(t, { width: 1600, height: 800 })
    }
  })

  it('capacity reports contacts past the limit', () => {
    const ctx = makeCtx({ width: 1600, height: 800 }, registry())
    expect(tlsCClosing.capacity!({ ...EX, contacts: ['1', '2', '3', '4', '5'] } as any, { width: 1600, height: 800 }, ctx).fits).toBe(false)
  })

  it('the example compiles in a title and a blank region, inside the frame', () => {
    slideScopeCompiles(tlsCClosing, 'title', 'title')
    slideScopeCompiles(tlsCClosing, 'blank', 'content')
  })
})

describe('AC2 — look knob (variant: big-type)', () => {
  const BT = { ...EX, contacts: ['strategy@northwind.example', 'northwind.example/plan'], variant: 'big-type' }

  it('declares big-type as a variant', () => {
    expect((tlsCClosing.schema.variant.type as any).values).toEqual(['centered', 'split', 'big-type'])
  })

  it.each([
    ['preferred', tlsCClosing.size.preferred],
    ['min', tlsCClosing.size.min],
  ])('big-type fits size.%s: nothing escapes, no text overlaps, every piece present', (_l, [w, h]) => {
    const t = layoutAt(tlsCClosing, BT, w, h)
    expect(t.box.height).toBeLessThanOrEqual(h + 0.5)
    assertContained(t, { width: w, height: h })
    assertNoTextOverlap(t)
    for (const part of ['title', 'text', 'cta', 'person', 'contacts']) expect(hasPart(t, part)).toBe(true)
  })

  it('the title is one giant start-aligned line (2x display or more on a full slide); the footer sits at the bottom', () => {
    const ctx = makeCtx({ width: 1728, height: 888 }, registry())
    const t = layoutAt(tlsCClosing, BT, 1728, 888)
    const title = leavesOf(t, 'title').filter((l) => l.k === 'text')
    expect(title).toHaveLength(1)
    expect(title[0].x).toBe(0)
    expect((title[0].node as any).style.size).toBeGreaterThanOrEqual(2 * ctx.resolveText('display').size)
    const contacts = leavesOf(t, 'contacts')[0]
    expect(contacts.y + contacts.height).toBeCloseTo(888, 0)
    expect(leavesOf(t, 'cta').find((l) => l.k === 'rect')!.x).toBe(0)
  })

  it('a long title steps down to fit the width (never wider than the box)', () => {
    const t = layoutAt(tlsCClosing, { ...BT, title: 'Questions, ideas and objections welcome' }, 1600, 800)
    for (const l of leavesOf(t, 'title')) expect(l.x + l.width).toBeLessThanOrEqual(1600 + 1)
  })

  it('toggles still remove their piece', () => {
    for (const [key, part] of [['showCta', 'cta'], ['showContacts', 'contacts'], ['showPerson', 'person']]) {
      expect(hasPart(layoutAt(tlsCClosing, { ...BT, [key]: false }, 1600, 800), part)).toBe(false)
    }
  })

  it('big-type: DOM and SVG agree', async () => {
    const { assertParity } = await import('../../../parity-harness')
    await assertParity(tlsCClosing, BT as any, { width: 1600, height: 800 }, undefined, { registry: registry() })
  }, 30000)
})
