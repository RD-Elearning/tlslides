/**
 * tls.m.icon-list — icon scaling, shapes, text toggle, row heights, capacity.
 */

import { tlsMIconList } from './index'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { standardBlockSuite, leavesOf, absoluteLeaves } from '../../text/standard-suite'
import { getIcon } from '../../../icons'

const ctx = (w = 760, h = 480) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 760, h = 480) =>
  tlsMIconList.layout({ ...(tlsMIconList.defaults as any), ...props } as any, ctx(w, h))
const ITEMS = [
  { icon: 'rocket', title: 'One', text: 'First point.' },
  { icon: 'shield', title: 'Two', text: 'Second point.' },
  { icon: 'nope-not-an-icon', title: 'Three' },
]

standardBlockSuite(tlsMIconList, {
  overflowProps: { items: Array.from({ length: 12 }, (_, i) => ({ icon: 'star', title: `Point ${i}`, text: 'Some description text' })) },
})

describe('tls.m.icon-list', () => {
  it('draws every icon in a square box with a scaled path (not the raw 24-unit path)', () => {
    const tree = lay({ items: ITEMS })
    for (let i = 0; i < 3; i++) {
      const icon = leavesOf(tree, `icon[${i}]`)[0]
      expect(icon.k).toBe('icon')
      expect(icon.width).toBe(icon.height)
      expect(icon.width).toBeGreaterThan(24)
    }
    const raw = getIcon('rocket')!.path
    expect((leavesOf(tree, 'icon[0]')[0].node as any).icon).not.toBe(raw)
  })

  it('an unknown icon name falls back to a drawn icon (never text)', () => {
    const icon = leavesOf(lay({ items: ITEMS }), 'icon[2]')[0]
    expect(icon.k).toBe('icon')
    expect((icon.node as any).icon.length).toBeGreaterThan(10)
  })

  it('iconStyle controls the backing shape: none, circle (full radius), square (rounded)', () => {
    const bg = (style: string) => leavesOf(lay({ items: ITEMS, iconStyle: style }), 'iconbg')
    expect(bg('plain')).toHaveLength(0)
    const circles = bg('circle')
    expect(circles).toHaveLength(3)
    expect((circles[0].node as any).radius).toBe(circles[0].width / 2)
    const squares = bg('square')
    expect((squares[0].node as any).radius).toBeLessThan(squares[0].width / 2)
  })

  it('tone picks the icon colour role; shapes use surfaceAlt', () => {
    const c = ctx()
    const tree = lay({ items: ITEMS, iconTone: 'accent2' })
    expect((leavesOf(tree, 'icon[0]')[0].node as any).fill).toBe(c.resolveColor('accent2').color)
    expect((leavesOf(tree, 'iconbg[0]')[0].node as any).fill.color).toBe(c.resolveColor('surfaceAlt').color)
  })

  it('showText:false drops the descriptions and shortens the list', () => {
    const on = lay({ items: ITEMS, showText: true }) as any
    const off = lay({ items: ITEMS, showText: false }) as any
    expect(leavesOf(on, 'text')).toHaveLength(2)
    expect(leavesOf(off, 'text')).toHaveLength(0)
    expect(off.box.height).toBeLessThanOrEqual(on.box.height)
  })

  it('an item without a description gets no text node and stays centred on its icon', () => {
    const tree = lay({ items: ITEMS })
    expect(leavesOf(tree, 'text[2]')).toHaveLength(0)
    const bg = leavesOf(tree, 'iconbg[2]')[0]
    const title = leavesOf(tree, 'title[2]')[0]
    expect(Math.abs(title.y + title.height / 2 - (bg.y + bg.height / 2))).toBeLessThanOrEqual(2)
  })

  it('a long description grows its row without overlapping the next item', () => {
    const tree = lay({ items: [{ icon: 'star', title: 'A', text: 'word '.repeat(60) }, { icon: 'star', title: 'B', text: 'x' }] }, 500, 900)
    const a = leavesOf(tree, 'text[0]')[0]
    const b = leavesOf(tree, 'title[1]')[0]
    expect(a.y + a.height).toBeLessThanOrEqual(b.y)
  })

  it('all leaves keep the text column to the right of the icon column', () => {
    const tree = lay({ items: ITEMS })
    const icons = leavesOf(tree, 'iconbg')
    const title = leavesOf(tree, 'title[0]')[0]
    expect(title.x).toBeGreaterThanOrEqual(icons[0].x + icons[0].width)
    expect(absoluteLeaves(tree).length).toBeGreaterThan(8)
  })

  describe('capacity', () => {
    it('remedy order: showText false, then truncate', () => {
      const r = tlsMIconList.capacity!({ ...(tlsMIconList.defaults as any) } as any, { width: 760, height: 120 }, ctx(760, 120))
      expect(r.fits).toBe(false)
      expect(r.remedy).toEqual([{ kind: 'reflow', to: 'showText: false' }, { kind: 'truncate', slot: 'items' }])
    })
    it('no showText remedy when descriptions are already off', () => {
      const r = tlsMIconList.capacity!({ ...(tlsMIconList.defaults as any), showText: false } as any, { width: 760, height: 100 }, ctx(760, 100))
      expect(r.fits).toBe(false)
      expect(r.remedy).toEqual([{ kind: 'truncate', slot: 'items' }])
    })
  })
})
