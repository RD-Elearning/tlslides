/**
 * spro enhance PLAN.md L5 — content grows into the space: a balanced slide whose content floats in
 * its page is compiled again with one larger text scale; a full slide and an authored slide stay.
 */
import { analyzeDeck } from '../layout-report'
import { compileSlide } from '../slide-compiler'
import { shapeToAuthoredBlock, shapeToBlock } from '../shape-bridge'
import { BlockRegistry } from '../registry'
import { registerBuiltInBlocks } from '../library'
import { TEST_TOKENS } from '../parity-harness'
import type { BlockSpec, DeckSpec, SlideSpec } from '../types'



const registry = new BlockRegistry()
registerBuiltInBlocks(registry)
const FRAME = { width: 1920, height: 1080 }
const T: BlockSpec = { id: 't', type: 'tls.t.title', props: { text: 'Three ways to walk a tree' } }
const list = (n: number, text = 'Visit the node, then its children'): BlockSpec => ({
  id: 'l',
  type: 'tls.t.bullets',
  props: { items: Array.from({ length: n }, (_, i) => ({ text: `${text} ${i + 1}` })) },
})
const slide = (body: BlockSpec[], valign?: 'auto'): SlideSpec => ({ id: 's', layout: 'title-content', ...(valign ? { valign } : {}), regions: { title: [T], content: body } }) as SlideSpec
const deck = (s: SlideSpec): DeckSpec => ({ version: 1, id: 'q', title: 'q', theme: 'minimal-white', style: 'minimal', aspect: 'widescreen', slides: [s] }) as DeckSpec
const fonts = (s: SlideSpec) => {
  const r = analyzeDeck(deck(s))[0]
  return r.blocks.flatMap((b) => b.text.map((t) => ({ region: b.region, size: Math.round(t.fontSize * (t.scale || 1)) })))
}
const grownOf = (s: SlideSpec) =>
  compileSlide(s, FRAME, TEST_TOKENS, registry).shapes.map((sh) => [(sh.props.$block as { id?: string }).id, (sh.props.$block as { grown?: number }).grown])
const grownIds = (s: SlideSpec) => grownOf(s).filter(([, g]) => g !== undefined).map(([id]) => id)

describe('growText (L5)', () => {
  it('a short list on a balanced slide grows, the title stays', () => {
    const plain = fonts(slide([list(3)]))
    const grown = fonts(slide([list(3)], 'auto'))
    const body = (f: typeof plain) => Math.max(...f.filter((x) => x.region !== 'title').map((x) => x.size))
    const title = (f: typeof plain) => Math.max(...f.filter((x) => x.region === 'title').map((x) => x.size))
    expect(body(grown)).toBeGreaterThan(body(plain) * 1.05)
    expect(title(grown)).toBe(title(plain))
    expect(grownIds(slide([list(3)], 'auto'))).toEqual(['l'])
  })

  it('one scale for the whole body: the slide keeps its count of text sizes', () => {
    const body: BlockSpec[] = [list(2), { id: 'k', type: 'tls.t.takeaway', props: { text: 'Pre-order visits the root first.' } }]
    const count = (s: SlideSpec) => new Set(fonts(s).map((f) => f.size)).size
    expect(grownIds(slide(body, 'auto')).sort()).toEqual(['k', 'l'])
    expect(count(slide(body, 'auto'))).toBe(count(slide(body)))
  })

  it('a full slide and a slide that is not judged on balance compile as authored', () => {
    expect(grownIds(slide([list(14, 'A longer item that takes most of the width of the content region')], 'auto'))).toEqual([])
    expect(grownIds(slide([list(3)]))).toEqual([])
    const off = compileSlide(slide([list(3)], 'auto'), FRAME, TEST_TOKENS, registry, { growText: false })
    expect(off.shapes.every((sh) => (sh.props.$block as { grown?: number }).grown === undefined)).toBe(true)
  })

  it('a short row of cards that spans the width but floats in the height grows (review 2026-10-24)', () => {
    const card = (i: number): BlockSpec => ({
      id: `c${i}`,
      type: 'tls.l.card',
      props: { children: [{ id: `h${i}`, type: 'tls.t.subtitle', props: { text: `Pillar ${i}` } }, { id: `p${i}`, type: 'tls.t.body', props: { text: 'One short line of detail.' } }] },
    })
    const row: BlockSpec = { id: 'r', type: 'tls.l.row', props: { gap: 'lg', children: [card(1), card(2), card(3)] } }
    expect(grownIds(slide([row], 'auto'))).toEqual(['r'])
  })

  it('the decompiler returns the authored style; renderers keep the scale', () => {
    const shape = compileSlide(slide([{ ...list(3), style: { align: 'start' } }], 'auto'), FRAME, TEST_TOKENS, registry).shapes.find((sh) => (sh.props.$block as { id?: string }).id === 'l')!
    expect(shapeToBlock(shape)?.style?.textScale).toBeGreaterThan(1)
    expect(shapeToAuthoredBlock(shape)?.style).toEqual({ align: 'start' })
  })
})

describe('growText leaves html blocks alone', () => {
  it('a slide with a big-stat compiles as authored', () => {
    const stat: BlockSpec = { id: 'k', type: 'tls.c.big-stat', props: { value: 34.7, label: 'Error rate' } }
    expect(grownIds(slide([stat, list(2)], 'auto'))).toEqual([])
  })
})

describe('harmonizeTypes (2026-10-24)', () => {
  // a corpus slide: a tree beside a column of text; the tree's largest tier added a sixth size
  const treeSlide: SlideSpec = {
    id: 's',
    layout: 'two-column',
    regions: {
      title: [{ id: 't', type: 'tls.t.title', props: { text: 'Định nghĩa Cây và Phân loại Nút' } }],
      left: [{ id: 'tree', type: 'tls.g.tree', props: { root: { label: '50', children: [{ label: '40', children: [{ label: '15' }, { label: '30' }] }, { label: '60', children: [{ label: '45' }, { label: '70' }] }] } } }],
      right: [
        {
          id: 'col',
          type: 'tls.l.stack',
          props: {
            sizing: 'content',
            children: [
              { id: 'd', type: 'tls.t.definition', props: { term: 'Cây (Tree)', layout: 'stacked', definition: 'Tập hữu hạn các nút nối với nhau bằng các cạnh, không tạo thành chu trình.' } },
              { id: 'k', type: 'tls.t.kv-list', props: { leader: 'rule', items: [{ key: 'Nút gốc (Root)', value: 'Không có nút cha' }, { key: 'Nút trung gian', value: 'Có ít nhất một cây con, không phải gốc' }, { key: 'Nút lá (Leaf)', value: 'Không có cây con, bậc bằng 0' }] } },
              { id: 'tk', type: 'tls.t.takeaway', props: { size: 'body', tone: 'accent', label: 'Đồ thị không chu trình', text: 'Cây là đồ thị không chu trình có phân cấp rõ rệt.' } },
            ],
          },
        },
      ],
    },
  } as SlideSpec
  const sizes = (s: SlideSpec) => {
    const merged: number[] = []
    for (const x of [...new Set(fonts(s).map((f) => f.size))].sort((a, b) => b - a)) if (!merged.length || merged[merged.length - 1] - x > 1) merged.push(x)
    return merged.length
  }

  it('a slide with tiered blocks ends at five text sizes or fewer', () => {
    expect(sizes(treeSlide)).toBeLessThanOrEqual(5)
    // two tiered blocks that each pick their own tier, beside a column of text
    const busy: SlideSpec = { ...treeSlide, regions: { ...treeSlide.regions, left: [{ id: 'tl', type: 'tls.g.timeline', props: { events: [{ date: '2024', title: 'Start', text: 'A first note' }, { date: '2025', title: 'Grow', text: 'A second note' }, { date: '2026', title: 'Scale', text: 'A third note' }] } }, ...(treeSlide.regions!.left as BlockSpec[])] } } as SlideSpec
    expect(sizes(busy)).toBeLessThanOrEqual(5)
  })

  it('`style.typeStep` steps a block down its tiers; the decompiler drops a compiled step', () => {
    const tree = (treeSlide.regions!.left as BlockSpec[])[0]
    const at = (typeStep?: number) => {
      const s = { ...treeSlide, regions: { ...treeSlide.regions, left: [{ ...tree, ...(typeStep ? { style: { typeStep } } : {}) }] } } as SlideSpec
      return Math.max(...fonts(s).filter((f) => f.region === 'left').map((f) => f.size))
    }
    expect(at(1)).toBeLessThan(at())
    expect(at(2)).toBeLessThan(at(1))
    const shape = compileSlide({ ...treeSlide, regions: { ...treeSlide.regions, left: [{ ...tree, style: { typeStep: 1 } }] } } as SlideSpec, FRAME, TEST_TOKENS, registry).shapes.find((sh) => (sh.props.$block as { id?: string }).id === 'tree')!
    ;(shape.props.$block as { stepped?: number }).stepped = 1
    expect(shapeToBlock(shape)?.style?.typeStep).toBe(1)
    expect(shapeToAuthoredBlock(shape)?.style).toBeUndefined()
  })

  it('a slide already at five sizes is compiled as authored', () => {
    expect(grownOf(slide([list(3)])).length).toBeGreaterThan(0)
    const shapes = compileSlide(slide([{ id: 'tl', type: 'tls.g.timeline', props: { events: [{ date: '2024', title: 'Start' }, { date: '2025', title: 'Grow' }, { date: '2026', title: 'Scale' }] } }]), FRAME, TEST_TOKENS, registry).shapes
    expect(shapes.every((sh) => (sh.props.$block as { stepped?: number }).stepped === undefined)).toBe(true)
  })
})

describe('a packed stack gives a tiered child the excess (2026-10-24)', () => {
  it('a cover lockup with a KPI row does not spill out of its region', () => {
    const cover: SlideSpec = {
      id: 's',
      layout: 'section-stack',
      regions: {
        content: [
          {
            id: 'lockup',
            type: 'tls.l.stack',
            props: {
              gap: 'lg',
              sizing: 'content',
              children: [
                { id: 'b', type: 'tls.t.badge', props: { text: 'One-day workshop', tone: 'soft' } },
                { id: 'h', type: 'tls.t.title', props: { rule: true, text: 'Design Thinking Workshop: Problem to Prototype in a Day, with a longer title' } },
                { id: 'k', type: 'tls.c.kpi-row', props: { gap: 'lg', tile: 'accent-bar', tiles: [{ label: 'Hours in the day', value: 6, format: 'plain' }, { label: 'Steps from problem to prototype', value: 5, format: 'plain' }, { label: 'Prototype tested with users', value: 1, format: 'plain' }] } },
              ],
            },
          },
        ],
      },
    } as SlideSpec
    for (const style of ['memphis', 'minimal', 'swiss']) {
      const r = analyzeDeck({ ...deck(cover), style, theme: style === 'memphis' ? 'memphis-pop' : 'minimal-white' } as DeckSpec)[0]
      expect(r.findings.filter((f) => f.code === 'content/overflow').map((f) => `${style} ${f.message}`)).toEqual([])
    }
  })
})

describe('connectors attach to the compiled (grown) block (2026-10-24)', () => {
  it('a connector from a grown hero number starts past the grown number, not the authored one', () => {
    const hero = (id: string, value: string): BlockSpec => ({ id, type: 'tls.t.hero-number', props: { value, unit: 'students' } })
    const s = {
      id: 's',
      layout: 'title-content',
      valign: 'auto',
      regions: { title: [T], content: [{ id: 'row', type: 'tls.l.row', props: { gap: 'xl', children: [hero('a', '6.000'), hero('b', '84%'), hero('c', '300')] } }] },
      connectors: [{ id: 'k1', from: { block: 'a', side: 'right' }, to: { block: 'b', side: 'left' } }],
    } as unknown as SlideSpec
    const fromW = (r: ReturnType<typeof compileSlide>) => (r.shapes.find((sh) => (sh.props.$block as { id?: string }).id === 'k1')!.props as { fromBox: { width: number } }).fromBox.width
    const grown = compileSlide(s, FRAME, TEST_TOKENS, registry)
    const plain = compileSlide(s, FRAME, TEST_TOKENS, registry, { growText: false })
    expect(grown.shapes.some((sh) => (sh.props.$block as { grown?: number }).grown !== undefined)).toBe(true)
    expect(fromW(grown)).toBeGreaterThan(fromW(plain))
  })
})

describe('an opaque backdrop motif clears the content (2026-10-24)', () => {
  const tl: BlockSpec = { id: 'tl', type: 'tls.g.timeline', props: { alternate: true, nodeStyle: 'icon', events: [{ date: 'Year 1', icon: 'map', title: 'Map risk', text: 'Set up early warning' }, { date: 'Years 2–4', title: 'Restore buffers', text: 'Regulate groundwater' }, { date: 'Year 5+', title: 'Upgrade defences', text: 'Only where density justifies the cost' }, { date: 'Every 5 years', title: 'Review the plan', text: 'Loop back to the start' }] } }
  const at = (shape: string) => {
    const s = { id: 's', layout: 'blank', valign: 'auto', regions: { content: [tl, { id: 'dec', type: 'tls.m.decoration', layer: 'backdrop', anchor: 'bottom-left', props: { shape, opacity: 'soft' } }] } } as unknown as SlideSpec
    const shapes = compileSlide(s, FRAME, TEST_TOKENS, registry).shapes
    return shapes.find((sh) => (sh.props.$block as { id?: string }).id === 'dec')
  }
  it('a cylinder behind a timeline shrinks into the free corner or is left out; a soft blob stays', () => {
    const r = analyzeDeck(deck({ id: 's', layout: 'blank', valign: 'auto', regions: { content: [tl] } } as unknown as SlideSpec))[0]
    const painted = r.blocks.find((b) => b.id === 'tl')!.painted!
    const cyl = at('cylinder')
    if (cyl) {
      const box = { x: cyl.point[0], y: cyl.point[1], width: cyl.size[0], height: cyl.size[1] }
      const ix = Math.max(0, Math.min(box.x + box.width, painted.x + painted.width) - Math.max(box.x, painted.x))
      const iy = Math.max(0, Math.min(box.y + box.height, painted.y + painted.height) - Math.max(box.y, painted.y))
      expect(ix * iy).toBeLessThanOrEqual(0.04 * box.width * box.height)
    }
    const blob = at('blob')!
    expect(blob.size[0]).toBeGreaterThan(300)
  })
})
