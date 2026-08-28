import {
  Arrow,
  Component,
  Draw,
  Ellipse,
  Group,
  Image,
  Line,
  Rectangle,
  Sticky,
  Text,
  Triangle,
  Video,
} from '~state/shapes'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'
import { ColorStyle, DashStyle, Decoration, TDAssetType, TDPage } from '~types'
import { estimateTextSize, renderPageToSvg, resolvePageSize } from './renderPageToSvg'

const theme = BUILT_IN_DECK_THEMES.find((t) => t.id === 'ivory-editorial')!

/** Wrap a flat list of shapes into a minimal `TDPage`, keyed by id, all direct children of the
 *  page (`parentId: 'page1'`) unless the test overrides it — the same top-level-vs-group
 *  distinction `renderPageToSvg` itself relies on. */
function pageOf(shapes: { id: string }[], overrides: Partial<TDPage> = {}): TDPage {
  const map: TDPage['shapes'] = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shapes.forEach((s) => (map[s.id] = s as any))
  return {
    id: 'page1',
    name: 'Slide',
    childIndex: 1,
    shapes: map,
    bindings: {},
    size: [800, 600],
    ...overrides,
  }
}

describe('renderPageToSvg — per-shape coverage', () => {
  it('renders a solid page background as a plain fill rect, and resolves a theme token', () => {
    const page = pageOf([], { background: { type: 'solid', color: 'theme:surface' } })
    const svg = renderPageToSvg(page, { theme })
    expect(svg).toContain(`fill="${theme.colors.surface}"`)
    expect(svg).not.toContain('theme:surface')
  })

  it('renders a Rectangle (dashed style) filled and stroked, respecting corner radius and opacity', () => {
    const rect = Rectangle.create({
      id: 'r1',
      parentId: 'page1',
      point: [10, 20],
      size: [200, 100],
      style: {
        ...Rectangle.getShape({}).style,
        color: ColorStyle.Blue,
        isFilled: true,
        cornerRadius: 16,
        opacity: 0.5,
      },
    })
    const svg = renderPageToSvg(pageOf([rect]))
    expect(svg).toContain('translate(10, 20)')
    expect(svg).toContain('rx="16"')
    expect(svg).toContain('opacity="0.5"')
  })

  it('renders a Rectangle (Draw style) via the same hand-drawn path helper the live editor uses', () => {
    const rect = Rectangle.create({
      id: 'r2',
      parentId: 'page1',
      size: [150, 80],
      style: { ...Rectangle.getShape({}).style, dash: DashStyle.Draw, isFilled: true },
    })
    const svg = renderPageToSvg(pageOf([rect]))
    expect(svg).toMatch(/<path d="M [\d.-]+,[\d.-]+ Q/)
  })

  it('renders a shape gradient fill as a <defs> the shape body actually references', () => {
    const rect = Rectangle.create({
      id: 'grad',
      parentId: 'page1',
      size: [100, 100],
      style: {
        ...Rectangle.getShape({}).style,
        isFilled: true,
        fillGradient: {
          type: 'linearGradient',
          angle: 45,
          stops: [
            { color: '#ff0000', at: 0 },
            { color: '#0000ff', at: 1 },
          ],
        },
      },
    })
    const svg = renderPageToSvg(pageOf([rect]))
    expect(svg).toContain('<linearGradient id="grad-fill-gradient"')
    expect(svg).toContain('fill="url(#grad-fill-gradient)"')
  })

  it('renders a label centered in the shape bounds (Rectangle/Ellipse/Triangle share this path)', () => {
    const rect = Rectangle.create({
      id: 'labelled',
      parentId: 'page1',
      size: [200, 100],
      label: 'Hello',
    })
    const svg = renderPageToSvg(pageOf([rect]))
    expect(svg).toContain('>Hello<')
  })

  it('renders an Ellipse sized from radius, centered at (rx, ry)', () => {
    const ellipse = Ellipse.create({ id: 'e1', parentId: 'page1', point: [5, 5], radius: [40, 30] })
    const svg = renderPageToSvg(pageOf([ellipse]))
    expect(svg).toContain('cx="40"')
    expect(svg).toContain('cy="30"')
    // The wrapper rotates around the shape's own bounds center — width/height = 2*radius.
    expect(svg).toContain('rotate(0, 40, 30)')
  })

  it('renders a Triangle outline as a closed polygon', () => {
    const tri = Triangle.create({ id: 't1', parentId: 'page1', size: [60, 60] })
    const svg = renderPageToSvg(pageOf([tri]))
    expect(svg).toMatch(/<line /)
  })

  it('renders a Line shaft between its two handle points', () => {
    const line = Line.create({
      id: 'l1',
      parentId: 'page1',
      handles: { start: { id: 'start', index: 0, point: [0, 0] }, end: { id: 'end', index: 1, point: [50, 50] } },
    })
    const svg = renderPageToSvg(pageOf([line]))
    expect(svg).toContain('M0,0L50,50')
  })

  it('renders a Draw shape from its raw points', () => {
    const draw = Draw.create({
      id: 'd1',
      parentId: 'page1',
      points: [
        [0, 0, 0.5],
        [10, 10, 0.5],
        [20, 0, 0.5],
      ],
      isComplete: true,
    })
    const svg = renderPageToSvg(pageOf([draw]))
    expect(svg).toMatch(/<path d="M/)
  })

  it('renders a straight Arrow with a shaft and an end arrowhead', () => {
    const arrow = Arrow.create({
      id: 'a1',
      parentId: 'page1',
      handles: {
        start: { id: 'start', index: 0, point: [0, 0] },
        bend: { id: 'bend', index: 1, point: [50, 50] },
        end: { id: 'end', index: 2, point: [100, 100] },
      },
      decorations: { end: Decoration.Arrow },
    })
    const svg = renderPageToSvg(pageOf([arrow]))
    expect(svg).toContain('M0,0L100,100')
    // An arrowhead is a two-segment `M left L middle right` path with no fill.
    expect(svg).toMatch(/<path d="M [\d.,-]+ L 100,100 [\d.,-]+" fill="none"/)
  })

  it('renders a curved (bent) Arrow via the circular-arc path, not a straight line', () => {
    const arrow = Arrow.create({
      id: 'a2',
      parentId: 'page1',
      bend: 0.5,
      handles: {
        start: { id: 'start', index: 0, point: [0, 0] },
        bend: { id: 'bend', index: 1, point: [80, 0] },
        end: { id: 'end', index: 2, point: [100, 100] },
      },
    })
    const svg = renderPageToSvg(pageOf([arrow]))
    expect(svg).toMatch(/<path d="M \d+ \d+ A/)
  })

  it('renders a bare TextShape using an estimated (not measured) size for its bounds', () => {
    const text = Text.create({ id: 'txt', parentId: 'page1', text: 'Some text' })
    const svg = renderPageToSvg(pageOf([text]))
    expect(svg).toContain('>Some text<')
    const [w, h] = estimateTextSize('Some text', text.style)
    expect(svg).toContain(`rotate(0, ${w / 2}, ${h / 2})`)
  })

  it('renders a Sticky as a filled rounded rect plus its text', () => {
    const sticky = Sticky.create({ id: 's1', parentId: 'page1', size: [200, 200], text: 'Note' })
    const svg = renderPageToSvg(pageOf([sticky]))
    expect(svg).toContain('rx="3"')
    expect(svg).toContain('>Note<')
  })

  it('renders an Image using the resolved asset src, and nothing for a missing asset', () => {
    const image = Image.create({ id: 'img1', parentId: 'page1', size: [50, 50], assetId: 'asset1' })
    const page = pageOf([image])
    const withAsset = renderPageToSvg(page, {
      assets: { asset1: { id: 'asset1', type: TDAssetType.Image, src: 'https://example.com/a.png', size: [50, 50] } },
    })
    expect(withAsset).toContain('xlink:href="https://example.com/a.png"')

    const withoutAsset = renderPageToSvg(page)
    expect(withoutAsset).not.toContain('<image')
  })

  it('renders a Video as an honest neutral placeholder, never a fabricated frame', () => {
    const video = Video.create({ id: 'v1', parentId: 'page1', size: [100, 60], assetId: 'asset1' })
    const svg = renderPageToSvg(pageOf([video]))
    expect(svg).toContain('#d4d4d8')
    expect(svg).not.toContain('<image')
  })

  it('renders a ComponentShape as the same dashed placeholder ComponentUtil.getSvgElement uses live', () => {
    const block = Component.create({ id: 'c1', parentId: 'page1', size: [100, 60], componentId: 'kpi-tile' })
    const svg = renderPageToSvg(pageOf([block]))
    expect(svg).toContain('Component: kpi-tile')
    expect(svg).toContain('stroke-dasharray="8 6"')
  })

  it('renders a Group by recursing into its children with no extra transform on the group itself', () => {
    const child = Rectangle.create({ id: 'child', parentId: 'group1', point: [30, 30], size: [10, 10] })
    const group = Group.create({ id: 'group1', parentId: 'page1', children: ['child'] })
    const svg = renderPageToSvg(pageOf([group, child]))
    // The child's own absolute point is what positions it — not a page-level top-level entry.
    expect(svg).toContain('translate(30, 30)')
    expect((svg.match(/translate\(30, 30\)/g) || []).length).toBe(1) // rendered exactly once
  })

  it('never double-renders a grouped shape as a bare top-level entry too', () => {
    const child = Rectangle.create({ id: 'child2', parentId: 'group2', point: [1, 1], size: [10, 10] })
    const group = Group.create({ id: 'group2', parentId: 'page1', children: ['child2'] })
    const svg = renderPageToSvg(pageOf([group, child]))
    expect((svg.match(/<g transform="translate\(1, 1\)/g) || []).length).toBe(1)
  })
})

describe('resolvePageSize', () => {
  it('prefers page.size, then defaultPageSize, then DEFAULT_SLIDE_SIZE', () => {
    expect(resolvePageSize({ size: [10, 20] } as TDPage)).toEqual([10, 20])
    expect(resolvePageSize({} as TDPage, [30, 40])).toEqual([30, 40])
    expect(resolvePageSize({} as TDPage)).toEqual([1920, 1080])
  })
})
