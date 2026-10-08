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
import { AnimationEffect, AnimationTrigger, ColorStyle, DashStyle, Decoration, TDAssetType, TDPage } from '~types'
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

  // A5 — headless block rendering. The placeholder contract is the most important acceptance
  // criterion: with NO `blocks` option, output must be byte-identical to the pre-A5 snapshot.
  it('ComponentShape placeholder is byte-identical without blocks option (A5 placeholder contract)', () => {
    const block = Component.create({ id: 'c1', parentId: 'page1', size: [100, 60], componentId: 'kpi-tile' })
    const without = renderPageToSvg(pageOf([block]))
    const withUndefined = renderPageToSvg(pageOf([block]), { blocks: undefined })
    expect(without).toBe(withUndefined)
    // Spot-check the placeholder markers to catch accidental regressions.
    expect(without).toContain('Component: kpi-tile')
    expect(without).toContain('stroke-dasharray="8 6"')
    expect(without).toContain('stroke="#a1a1aa"')
  })

  it('renders custom SVG from blocks callback instead of the placeholder', () => {
    const block = Component.create({ id: 'c2', parentId: 'page1', size: [200, 120], componentId: 'bar-chart' })
    const customSvg = '<g class="block-bar"><rect width="200" height="120" fill="red" /></g>'
    const svg = renderPageToSvg(pageOf([block]), {
      blocks: (shape) => (shape.componentId === 'bar-chart' ? customSvg : undefined),
    })
    expect(svg).toContain(customSvg)
    expect(svg).not.toContain('Component: bar-chart')
    expect(svg).not.toContain('stroke-dasharray="8 6"')
  })

  it('falls through to placeholder when blocks callback returns undefined', () => {
    const block = Component.create({ id: 'c3', parentId: 'page1', size: [100, 60], componentId: 'unknown' })
    const svg = renderPageToSvg(pageOf([block]), {
      blocks: () => undefined,
    })
    expect(svg).toContain('Component: unknown')
    expect(svg).toContain('stroke-dasharray="8 6"')
  })

  it('blocks callback only applies to ComponentShapes, not other shapes', () => {
    const rect = Rectangle.create({ id: 'r1', parentId: 'page1', size: [100, 50] })
    const called = jest.fn(() => '<g/>')
    const svg = renderPageToSvg(pageOf([rect]), { blocks: called })
    expect(called).not.toHaveBeenCalled()
    // Rectangle renders normally.
    expect(svg).toContain('translate(0, 0)')
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

  // T16.1 — a hard requirement of the phase, checked directly rather than assumed: presentation
  // build-step playback is purely a live-DOM, presentation-mode-only effect (`PresentationRuntime`)
  // that this function has never heard of. A shape with a `fadeIn`/`onClick` animation must export
  // exactly as if it had none — full opacity, no clip-path, no transform beyond its own position.
  it('ignores a shape animation entirely — exports at full opacity, not "as if hidden"', () => {
    const rect = Rectangle.create({
      id: 'animated1',
      parentId: 'page1',
      point: [0, 0],
      size: [100, 50],
      animation: {
        effect: AnimationEffect.FadeIn,
        trigger: AnimationTrigger.OnClick,
        order: 0,
        durationMs: 400,
        delayMs: 0,
      },
    })
    const svg = renderPageToSvg(pageOf([rect]))
    expect(svg).toContain('<g opacity="1">')
    expect(svg).not.toContain('opacity="0"')
    expect(svg).not.toContain('clip-path')
  })
})

describe('renderPageToSvg — Phase 17 typography', () => {
  it('renders bullet markers on every line of a TextShape with style.list = bullet', () => {
    const text = Text.create({
      id: 'list1',
      parentId: 'page1',
      text: 'First\nSecond',
      style: { ...Text.getShape({}).style, list: 'bullet' },
    })
    const svg = renderPageToSvg(pageOf([text]))
    expect(svg).toContain('•  First')
    expect(svg).toContain('•  Second')
  })

  it('renders incrementing numbers for style.list = number', () => {
    const text = Text.create({
      id: 'list2',
      parentId: 'page1',
      text: 'First\nSecond',
      style: { ...Text.getShape({}).style, list: 'number' },
    })
    const svg = renderPageToSvg(pageOf([text]))
    expect(svg).toContain('1.  First')
    expect(svg).toContain('2.  Second')
  })

  it('an arbitrary fontFamily override reaches the exported font-family attribute', () => {
    const text = Text.create({
      id: 'font1',
      parentId: 'page1',
      text: 'Hi',
      style: { ...Text.getShape({}).style, fontFamily: 'Georgia, serif' },
    })
    const svg = renderPageToSvg(pageOf([text]))
    expect(svg).toContain('font-family="Georgia, serif"')
  })

  it('a shape label auto-fits: text wider than the box renders at a shrunk, but never zero, scale', () => {
    const rect = Rectangle.create({
      id: 'fit1',
      parentId: 'page1',
      point: [0, 0],
      size: [40, 40], // deliberately tiny — the label's natural size will not fit
      label: 'A rather long label that will not fit',
      style: { ...Rectangle.getShape({}).style, autoFit: true },
    })
    const withoutFit = renderPageToSvg(
      pageOf([{ ...rect, style: { ...rect.style, autoFit: false } } as typeof rect])
    )
    const withFit = renderPageToSvg(pageOf([rect]))
    // Both render *something* (autoFit never produces empty/invisible text)...
    expect(withFit).toContain('<text')
    // ...but the fitted version uses a visibly smaller font-size than the unfitted one, since the
    // label cannot possibly fit an unshrunk font into a 40x40 box.
    const sizeOf = (svg: string) => Number(svg.match(/font-size="([\d.]+)"/)?.[1])
    expect(sizeOf(withFit)).toBeLessThan(sizeOf(withoutFit))
  })

  it('verticalAlign shifts a label to the top/bottom of its box instead of dead-center', () => {
    const base = {
      id: 'valign1',
      parentId: 'page1',
      point: [0, 0],
      size: [200, 200],
      label: 'Hi',
    }
    const top = Rectangle.create({
      ...base,
      style: { ...Rectangle.getShape({}).style, verticalAlign: 'start' as const },
    })
    const bottom = Rectangle.create({
      ...base,
      id: 'valign2',
      style: { ...Rectangle.getShape({}).style, verticalAlign: 'end' as const },
    })
    const topSvg = renderPageToSvg(pageOf([top]))
    const bottomSvg = renderPageToSvg(pageOf([bottom]))
    const tyOf = (svg: string) => Number(svg.match(/translate\(([\d.-]+), ([\d.-]+)\)">.*?<text/)?.[2])
    expect(tyOf(topSvg)).toBe(0)
    expect(tyOf(bottomSvg)).toBeGreaterThan(0)
  })

  it('a fontToken resolves against the active theme for a shape label', () => {
    const rect = Rectangle.create({
      id: 'tok1',
      parentId: 'page1',
      point: [0, 0],
      size: [200, 100],
      label: 'Heading',
      style: { ...Rectangle.getShape({}).style, fontToken: 'heading' as const },
    })
    const svg = renderPageToSvg(pageOf([rect]), { theme })
    // ivory-editorial's heading face is Serif ("Crimson Pro").
    expect(svg).toContain('font-family="Crimson Pro"')
  })

  it('a fontToken has NO effect on a bare TextShape — see TextUtil/renderText\'s own comment for why', () => {
    const text = Text.create({
      id: 'tok2',
      parentId: 'page1',
      text: 'Body copy',
      style: { ...Text.getShape({}).style, font: undefined, fontToken: 'heading' as const },
    })
    const svg = renderPageToSvg(pageOf([text]), { theme })
    // Falls back to the plain Script default, not the theme's Serif heading face.
    expect(svg).not.toContain('font-family="Crimson Pro"')
  })
})

describe('resolvePageSize', () => {
  it('prefers page.size, then defaultPageSize, then DEFAULT_SLIDE_SIZE', () => {
    expect(resolvePageSize({ size: [10, 20] } as TDPage)).toEqual([10, 20])
    expect(resolvePageSize({} as TDPage, [30, 40])).toEqual([30, 40])
    expect(resolvePageSize({} as TDPage)).toEqual([1920, 1080])
  })
})
