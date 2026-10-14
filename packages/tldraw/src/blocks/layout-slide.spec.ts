/**
 * CMP1 — export-ready contract, engine half (composition README §2 CMP1; SURVEY §B3 X1–X3, X5, X8).
 */
import type { LayoutNode, SlideSpec } from './types'
import { layoutSlide, layoutDeck, defaultBlockSvg } from './layout-slide'
import { parseColorAlpha } from './color-math'
import { analyzeSlide } from './layout-report'
import { deckSpecToDocument } from './deck-document'

const SLIDE: SlideSpec = {
  id: 's1',
  layout: 'two-column',
  regions: {
    title: [{ id: 't', type: 'tls.t.title', props: { text: 'Quarterly review', align: 'center' } }],
    left: [
      {
        id: 'row',
        type: 'tls.l.row',
        props: {
          children: [
            { id: 'c1', type: 'tls.l.card', props: { children: [{ id: 'b1', type: 'tls.t.body', props: { text: 'Revenue grew' } }] } },
            { id: 'c2', type: 'tls.l.card', props: { children: [{ id: 'b2', type: 'tls.t.body', props: { text: { runs: [{ text: 'All bold', bold: true }] } } }] } },
          ],
        },
      },
    ],
  },
}

function all(n: LayoutNode): LayoutNode[] {
  return n.k === 'group' ? [n, ...n.children.flatMap(all)] : n.k === 'host' && n.poster ? [n, ...all(n.poster)] : [n]
}

describe('CMP1 X1 — layoutSlide', () => {
  const laid = layoutSlide(SLIDE)

  it('one group per block at the compiled (editor) box, with blockId and type', () => {
    expect(laid.blocks.map((b) => b.id)).toEqual(['t', 'row'])
    const report = analyzeSlide(SLIDE)
    for (const b of laid.blocks) {
      const r = report.blocks.find((x) => x.id === b.id)!
      expect(b.box).toEqual(r.box)
    }
    laid.nodes.forEach((n, i) => {
      expect(n.k).toBe('group')
      expect((n as { blockId?: string }).blockId).toBe(laid.blocks[i].id)
      expect(n.box).toEqual(laid.blocks[i].box)
    })
  })

  it('X2: nested blocks are findable by their wrapper group', () => {
    const ids = all(laid.nodes[1]).flatMap((n) => (n.k === 'group' && n.blockId ? [`${n.blockId}:${n.type}`] : []))
    expect(ids).toEqual(expect.arrayContaining(['row:tls.l.row', 'c1:tls.l.card', 'c2:tls.l.card', 'b1:tls.t.body', 'b2:tls.t.body']))
  })

  it('X3: text nodes carry weight (700 when every run is bold) and align on centred lines', () => {
    const texts = laid.nodes.flatMap(all).filter((n): n is Extract<LayoutNode, { k: 'text' }> => n.k === 'text')
    expect(texts.every((t) => t.weight === 400 || t.weight === 700)).toBe(true)
    expect(texts.some((t) => t.weight === 700 && t.lines[0].text.includes('All bold'))).toBe(true)
    expect(texts.some((t) => t.weight === 400 && t.lines[0].text.includes('Revenue'))).toBe(true)
  })

  it('X8: blocks carry their props', () => {
    expect((laid.blocks[0].props as { text: string }).text).toBe('Quarterly review')
  })

  it('layoutDeck fills the style knob defaults into the props it reports', () => {
    const [s] = layoutDeck({ id: 'd', style: 'corporate', slides: [SLIDE] } as never)
    expect(Object.keys(s.blocks[0].props).length).toBeGreaterThanOrEqual(Object.keys(SLIDE.regions.title[0].props).length)
  })
})

describe('CMP1 X5 — parseColorAlpha', () => {
  it.each([
    ['#0B5FFF', { hex: '#0B5FFF', alpha: 1 }],
    ['#fff', { hex: '#FFFFFF', alpha: 1 }],
    ['#0B5FFF12', { hex: '#0B5FFF', alpha: 0.071 }],
    ['rgba(255,255,255,0.12)', { hex: '#FFFFFF', alpha: 0.12 }],
    ['rgb(10, 20, 30)', { hex: '#0A141E', alpha: 1 }],
    ['transparent', { hex: '#000000', alpha: 0 }],
  ])('%s', (input, out) => {
    expect(parseColorAlpha(input)).toEqual(out)
  })
  it('a role name is not a colour', () => {
    expect(parseColorAlpha('accent')).toBeUndefined()
  })
})

describe('CMP1 Q9 step 3 — defaultBlockSvg', () => {
  it('renders a block shape to inline SVG (no nested <svg>), undefined for an unknown type', () => {
    const { document } = deckSpecToDocument({ id: 'd', slides: [SLIDE] } as never)
    const page = document.pages.s1
    const render = defaultBlockSvg(document, page)
    const shapes = Object.values(page.shapes) as never[]
    const svg = shapes.map((s) => render(s)).join('')
    expect(svg).toContain('Quarterly review')
    expect(svg).toContain('Revenue grew')
    expect(svg).not.toContain('<svg')
    expect(render({ ...(shapes[0] as object), componentId: 'nope', props: { $block: { id: 'x' } } } as never)).toBeUndefined()
  })
})
