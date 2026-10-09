/**
 * tls.c.cards — leads, tones, alignment, equal cards, depth, intrinsic size, capacity.
 */

import { tlsCCards, buildCards } from './index'
import { standardBlockSuite, leavesOf, assertContained, assertNoTextOverlap } from '../../text/standard-suite'
import { makeCtx } from '../../layout/test-helpers'
import { depthOk, layoutAt, hasPart, registry } from '../composite-test'

const FOUR = [
  { icon: 'target', number: '01', image: '/demo/photo-1.svg', title: 'T'.repeat(40), text: 'x '.repeat(79) + 'x' },
  { icon: 'check', number: '02', image: '/demo/photo-2.svg', title: 'Second card', text: 'Short text.' },
  { icon: 'zap', number: '03', image: '/demo/photo-3.svg', title: 'Third', text: 'Another short text for the third card.' },
  { icon: 'users', number: '04', image: '/demo/photo-4.svg', title: 'Fourth', text: 'And one more.' },
]

standardBlockSuite(tlsCCards, { withRegistry: true, overflowProps: { cards: [...FOUR, ...FOUR] } })

const EX = tlsCCards.describe!.example.props as Record<string, unknown>
const bgs = (t: any) => leavesOf(t, 'card').filter((l) => l.k === 'rect')

describe('tls.c.cards', () => {
  it('is a group-scope list composite whose avoid line points at feature-grid', () => {
    expect(tlsCCards.scope).toBe('group')
    expect(tlsCCards.category).toBe('list')
    expect(tlsCCards.describe!.avoid).toContain('tls.c.feature-grid')
    expect(tlsCCards.related).toContain('tls.c.feature-grid')
  })

  it('build() depth <= 4 and no depth overflow at 4 full cards, every lead', () => {
    for (const lead of ['icon', 'number', 'image', 'none']) depthOk(tlsCCards, buildCards, { cards: FOUR, lead }, 1500, 520)
  })

  it('draws one card per item, equal width and equal height', () => {
    for (const n of [2, 3, 4]) {
      const t = layoutAt(tlsCCards, { cards: FOUR.slice(0, n) }, 1500, 520)
      const b = bgs(t)
      expect(b).toHaveLength(n)
      for (const r of b) {
        expect(r.width).toBeCloseTo(b[0].width, 3)
        expect(r.height).toBeCloseTo(b[0].height, 3)
      }
    }
  })

  it('each lead shows its own field and the title/text of every card', () => {
    const cards = FOUR.slice(0, 3)
    expect(leavesOf(layoutAt(tlsCCards, { cards, lead: 'icon' }, 1500, 520), 'lead').every((l) => l.k === 'icon')).toBe(true)
    const num = layoutAt(tlsCCards, { cards, lead: 'number' }, 1500, 520)
    expect(leavesOf(num, 'lead').map((l) => (l.node as any).lines[0].text)).toEqual(['01', '02', '03'])
    expect(leavesOf(layoutAt(tlsCCards, { cards, lead: 'image' }, 1500, 520), 'lead').every((l) => l.k === 'image')).toBe(true)
    expect(hasPart(layoutAt(tlsCCards, { cards, lead: 'none' }, 1500, 520), 'lead')).toBe(false)
    expect(leavesOf(num, 'title')).toHaveLength(3)
    expect(leavesOf(num, 'text')).toHaveLength(3)
  })

  it('a missing lead field leaves that card without a lead but keeps the layout aligned', () => {
    const t = layoutAt(tlsCCards, { cards: [{ title: 'A', text: 'a' }, { icon: 'target', title: 'B', text: 'b' }], lead: 'icon' }, 1500, 520)
    const [a, b] = [leavesOf(t, 'title[0]')[0], leavesOf(t, 'title[1]')[0]]
    expect(a.y).toBeCloseTo(b.y, 3)
    expect(leavesOf(t, 'lead')).toHaveLength(1)
  })

  it('tone changes the card paint: alt fills, outline strokes only, accent-first fills only the first', () => {
    const cards = FOUR.slice(0, 3)
    const alt = bgs(layoutAt(tlsCCards, { cards, tone: 'alt' }, 1500, 520))
    expect(alt.every((r) => (r.node as any).fill && !(r.node as any).stroke)).toBe(true)
    const out = bgs(layoutAt(tlsCCards, { cards, tone: 'outline' }, 1500, 520))
    expect(out.every((r) => !(r.node as any).fill && (r.node as any).stroke)).toBe(true)
    const af = bgs(layoutAt(tlsCCards, { cards, tone: 'accent-first' }, 1500, 520))
    expect((af[0].node as any).fill.color).not.toBe((af[1].node as any).fill.color)
    expect((af[1].node as any).fill.color).toBe((af[2].node as any).fill.color)
    const sf = bgs(layoutAt(tlsCCards, { cards, tone: 'surface' }, 1500, 520))
    expect(sf.every((r) => (r.node as any).fill && (r.node as any).stroke)).toBe(true)
  })

  it('centre alignment centres title lines inside each card', () => {
    const t = layoutAt(tlsCCards, { cards: FOUR.slice(0, 3), align: 'center' }, 1500, 520)
    const cardRects = bgs(t)
    leavesOf(t, 'title').forEach((l) => {
      const card = cardRects.find((r) => l.x >= r.x && l.x <= r.x + r.width)!
      expect(Math.abs(l.x + l.width / 2 - (card.x + card.width / 2))).toBeLessThan(2)
    })
  })

  it('stays inside the box with long text at 4 cards and keeps text apart', () => {
    for (const lead of ['icon', 'number', 'image']) {
      const t = layoutAt(tlsCCards, { cards: FOUR, lead }, 1500, 760)
      assertContained(t, { width: 1500, height: 760 })
      assertNoTextOverlap(t)
    }
  })

  it('intrinsicSize grows with the text and root height follows the content when the box is short', () => {
    const ctx = makeCtx({ width: 1500, height: 900 }, registry())
    const short = tlsCCards.intrinsicSize!({ cards: [{ title: 'A', text: 'a' }, { title: 'B', text: 'b' }], lead: 'none' } as any, ctx)
    const long = tlsCCards.intrinsicSize!({ cards: [{ title: 'A', text: 'word '.repeat(30) }, { title: 'B', text: 'b' }], lead: 'none' } as any, ctx)
    expect(long.height).toBeGreaterThan(short.height)
    expect(layoutAt(tlsCCards, { cards: FOUR, lead: 'image' }, 1500, 200).box.height).toBeGreaterThan(200)
  })

  it('capacity flags more than four cards', () => {
    const ctx = makeCtx({ width: 1500, height: 520 }, registry())
    expect(tlsCCards.capacity!({ cards: [...FOUR, FOUR[0]] } as any, { width: 1500, height: 520 }, ctx).fits).toBe(false)
  })

  it('the example fits as a group in a two-column region', async () => {
    const { compileInRegion } = await import('../composite-test')
    const { rects, frame } = compileInRegion(tlsCCards, EX as any, 'two-column', 'left')
    expect(rects).toHaveLength(1)
    expect(rects[0].right).toBeLessThanOrEqual(frame.width)
    expect(rects[0].bottom).toBeLessThanOrEqual(frame.height)
  })
})

describe('RV03 — honest size', () => {
  it.each([
    ['preferred', tlsCCards.size.preferred],
    ['min', tlsCCards.size.min],
    ['half-width', [860, 480]],
  ])('the example fits size.%s with nothing escaping it', (_l, [w, h]) => {
    const node = layoutAt(tlsCCards, EX, w, h)
    expect(node.box.height).toBeLessThanOrEqual(h + 0.5)
    for (const l of leavesOf(node as any, '')) {
      expect(l.box.x + l.box.width).toBeLessThanOrEqual(w + 0.5)
      expect(l.box.y + l.box.height).toBeLessThanOrEqual(h + 0.5)
    }
  })

  it('cards hug their content in a tall region instead of stretching to 460', () => {
    const tall = layoutAt(tlsCCards, EX, 1500, 900)
    expect(tall.box.height).toBeLessThan(520)
  })
})

describe('AC2 — look knob (numeral: giant)', () => {
  const GIANT = {
    cards: [
      { number: '01', title: 'Pick one team', text: 'A team of 20 to 50 people with a weekly report.' },
      { number: '02', title: 'Run six weeks', text: 'Shared dashboards replace the spreadsheet.' },
      { number: '03', title: 'Decide together', text: 'Keep, change or stop, with the numbers in hand.' },
      { number: '04', title: 'Roll out', text: 'Two more teams a quarter.' },
    ],
    lead: 'number',
    numeral: 'giant',
  }
  const numeralSize = (t: any) => (leavesOf(t, 'lead').find((l) => l.k === 'text')!.node as any).style.size

  it('declares the knob as an enum', () => {
    expect((tlsCCards.schema.numeral.type as any).values).toEqual(['plain', 'giant'])
  })

  for (const n of [3, 4]) {
    it.each([
      ['preferred', tlsCCards.size.preferred],
      ['min', tlsCCards.size.min],
    ])(`giant numerals, ${n} cards, fit size.%s: contained, no text overlap`, (_l, [w, h]) => {
      const t = layoutAt(tlsCCards, { ...GIANT, cards: GIANT.cards.slice(0, n) }, w, h)
      expect(t.box.height).toBeLessThanOrEqual(h + 0.5)
      assertContained(t, { width: w, height: h })
      assertNoTextOverlap(t)
    })
  }

  it('giant paints the numbers at display size, plain at heading size; the title sits under the numeral', () => {
    const ctx = makeCtx({ width: 1500, height: 600 }, registry())
    const giant = layoutAt(tlsCCards, GIANT, 1500, 600)
    expect(numeralSize(giant)).toBe(ctx.resolveText('display').size)
    // plain: the heading numeral (the title block may autofit it a few percent below the token)
    const plain = numeralSize(layoutAt(tlsCCards, { ...GIANT, numeral: 'plain' }, 1500, 600))
    expect(plain).toBeLessThanOrEqual(ctx.resolveText('heading').size)
    expect(plain).toBeGreaterThan(0.9 * ctx.resolveText('heading').size)
    const lead = leavesOf(giant, 'lead[0]').find((l) => l.k === 'text')!
    const title = leavesOf(giant, 'title[0]')[0]
    expect(title.y).toBeGreaterThanOrEqual(lead.y + lead.height - 1)
  })

  it('a short box steps the giant numeral down (display, then title) before the cards overflow', () => {
    const ctx = makeCtx({ width: 1500, height: 400 }, registry())
    const t = layoutAt(tlsCCards, GIANT, 1500, 400)
    expect(numeralSize(t)).toBeLessThan(ctx.resolveText('display').size)
    expect(t.box.height).toBeLessThanOrEqual(400.5)
  })

  it('numeral is ignored without lead: number (icons unchanged)', () => {
    const ex = tlsCCards.describe!.example.props as Record<string, unknown>
    expect(layoutAt(tlsCCards, { ...ex, numeral: 'giant' }, 1500, 400)).toEqual(layoutAt(tlsCCards, ex, 1500, 400))
  })

  it('giant: DOM and SVG agree', async () => {
    const { assertParity } = await import('../../../parity-harness')
    await assertParity(tlsCCards, { ...GIANT, cards: GIANT.cards.slice(0, 3) } as any, { width: 1500, height: 520 }, undefined, { registry: registry() })
  }, 30000)
})
