import { Polygon, SpeechBubble, Star } from '~state/shapes'
import { ColorStyle, DashStyle, TDPage } from '~types'
import { renderPageToSvg } from './renderPageToSvg'

// Phase 8c — proves the three new shapes render headlessly through `renderPageToSvg`, the way
// `renderPageToSvg.spec.ts` already does for every pre-existing shape type. See that file's
// `pageOf` helper, reproduced here rather than imported (it's a three-line fixture, and importing
// across two spec files for it would be an odd new precedent).
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

describe('renderPageToSvg — Phase 8c shapes', () => {
  it('renders a Polygon (hexagon by default) as a closed <polygon> with six vertices', () => {
    const hex = Polygon.create({ id: 'p1', parentId: 'page1', size: [100, 100] })
    expect(hex.sides).toBe(6)
    const svg = renderPageToSvg(pageOf([hex]))
    const match = svg.match(/<polygon[^>]*points="([^"]+)"/)
    expect(match).toBeTruthy()
    const points = (match as RegExpMatchArray)[1].trim().split(' ')
    expect(points).toHaveLength(6)
  })

  it('renders a filled Star as a filled polygon with ten vertices (5 points x 2)', () => {
    const star = Star.create({
      id: 's1',
      parentId: 'page1',
      size: [120, 120],
      style: { ...Star.getShape({}).style, isFilled: true, fill: '#f5a623', color: ColorStyle.Blue },
    })
    const svg = renderPageToSvg(pageOf([star]))
    expect(svg).toContain('fill="#f5a623"')
    const match = svg.match(/<polygon[^>]*points="([^"]+)"[^>]*fill="#f5a623"/)
    expect(match).toBeTruthy()
    expect((match as RegExpMatchArray)[1].trim().split(' ')).toHaveLength(10)
  })

  it('renders a SpeechBubble with the Draw dash style as a hand-drawn <path>, not a <polygon>', () => {
    const bubble = SpeechBubble.create({
      id: 'b1',
      parentId: 'page1',
      size: [200, 140],
      style: { ...SpeechBubble.getShape({}).style, dash: DashStyle.Draw },
    })
    const svg = renderPageToSvg(pageOf([bubble]))
    expect(svg).toMatch(/<path /)
    expect(svg).not.toMatch(/<polygon/)
  })

  it('renders a Polygon label the same way Rectangle/Ellipse/Triangle labels render', () => {
    const hex = Polygon.create({
      id: 'p2',
      parentId: 'page1',
      size: [200, 100],
      label: 'Hex',
    })
    const svg = renderPageToSvg(pageOf([hex]))
    expect(svg).toContain('>Hex<')
  })

  it('carries a gradient fill on a Star into a real SVG <defs>, exactly like Rectangle/Ellipse', () => {
    const star = Star.create({
      id: 's2',
      parentId: 'page1',
      size: [120, 120],
      style: {
        ...Star.getShape({}).style,
        isFilled: true,
        fillGradient: { type: 'linearGradient', angle: 45, stops: [{ at: 0, color: '#fff' }, { at: 1, color: '#000' }] },
      },
    })
    const svg = renderPageToSvg(pageOf([star]))
    expect(svg).toContain('<linearGradient')
    expect(svg).toMatch(/fill="url\(#[^)]+\)"/)
  })
})
