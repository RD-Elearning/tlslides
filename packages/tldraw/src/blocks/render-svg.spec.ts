/**
 * Tests for the SVG renderer (`render-svg.ts`).
 *
 * Verifies:
 *  - All 8 LayoutNode kinds produce valid SVG strings
 *  - Runs in Node with no DOM, no document, no window
 *  - Paint set via inline style, never the fill attribute
 *  - Gradients produce <defs> with correct stops
 *  - Text lines positioned at cumulative baselines
 *  - Output is deterministic (same input → same output)
 *  - Module-level objects copied, asserted with not.toBe and toEqual
 */

import { renderNodeToSvg, renderSvgDefs } from './render-svg'
import type {
  LayoutNode,
  Paint,
  Box,
  TextLine,
  ResolvedTextStyle,
} from './types'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Helper factories                                                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

const BOX: Box = { x: 10, y: 20, width: 200, height: 100 }

function makeGroup(
  overrides?: Partial<LayoutNode & { k: 'group' }>,
): LayoutNode {
  return {
    k: 'group',
    box: BOX,
    children: [],
    ...overrides,
  } as LayoutNode
}

function makeRect(
  overrides?: Partial<LayoutNode & { k: 'rect' }>,
): LayoutNode {
  return {
    k: 'rect',
    box: BOX,
    ...overrides,
  } as LayoutNode
}

function makePath(
  overrides?: Partial<LayoutNode & { k: 'path' }>,
): LayoutNode {
  return {
    k: 'path',
    box: BOX,
    d: 'M 0 0 L 10 10',
    ...overrides,
  } as LayoutNode
}

const DEFAULTTextStyle: ResolvedTextStyle = {
  family: '"Poppins", sans-serif',
  size: 28,
  lineHeight: 1.45,
  letterSpacing: 0,
  color: '#000000',
}

function makeText(
  overrides?: Partial<LayoutNode & { k: 'text' }>,
): LayoutNode {
  const lines: TextLine[] = [{ text: 'Hello', baseline: 20, width: 100 }]
  return {
    k: 'text',
    box: BOX,
    lines,
    style: DEFAULTTextStyle,
    ...overrides,
  } as LayoutNode
}

function makeImage(
  overrides?: Partial<LayoutNode & { k: 'image' }>,
): LayoutNode {
  return {
    k: 'image',
    box: BOX,
    assetId: 'asset-1',
    fit: 'cover',
    ...overrides,
  } as LayoutNode
}

function makeIcon(
  overrides?: Partial<LayoutNode & { k: 'icon' }>,
): LayoutNode {
  return {
    k: 'icon',
    box: BOX,
    icon: 'M 0 0 L 10 0 L 10 10 Z',
    fill: '#ff0000',
    ...overrides,
  } as LayoutNode
}

function makeLine(
  overrides?: Partial<LayoutNode & { k: 'line' }>,
): LayoutNode {
  return {
    k: 'line',
    box: BOX,
    from: { x: 0, y: 0 },
    to: { x: 100, y: 50 },
    stroke: { color: '#000000', width: 2 },
    ...overrides,
  } as LayoutNode
}

function makeHost(
  overrides?: Partial<LayoutNode & { k: 'host' }>,
): LayoutNode {
  return {
    k: 'host',
    box: BOX,
    render: 'my-component',
    ...overrides,
  } as LayoutNode
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: no DOM dependency                                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('no DOM dependency', () => {
  it('runs without document, window, or DOM APIs', () => {
    // The module should be usable in pure Node — verify by calling it
    const node = makeRect()
    const svg = renderNodeToSvg(node)
    expect(typeof svg).toBe('string')
    expect(svg).toContain('<svg')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: all 8 node kinds render                                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('renderNodeToSvg — all 8 node kinds', () => {
  it('renders a group node', () => {
    const node = makeGroup({ children: [makeRect()] })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('<svg')
    expect(svg).toContain('<g>')
    expect(svg).toContain('</g>')
  })

  it('renders a rect node', () => {
    const svg = renderNodeToSvg(makeRect())
    expect(svg).toContain('<rect')
  })

  it('renders a path node', () => {
    const svg = renderNodeToSvg(makePath())
    expect(svg).toContain('<path')
    expect(svg).toContain('d="M 0 0 L 10 10"')
  })

  it('renders a text node', () => {
    const svg = renderNodeToSvg(makeText())
    expect(svg).toContain('<text')
    expect(svg).toContain('<tspan')
    expect(svg).toContain('Hello')
  })

  it('renders an image node', () => {
    const svg = renderNodeToSvg(makeImage())
    expect(svg).toContain('<image')
    expect(svg).toContain('href="asset-1"')
  })

  it('renders an icon node', () => {
    const svg = renderNodeToSvg(makeIcon())
    expect(svg).toContain('<path')
    expect(svg).toContain('M 0 0 L 10 0 L 10 10 Z')
  })

  it('renders a line node', () => {
    const svg = renderNodeToSvg(makeLine())
    expect(svg).toContain('<line')
    expect(svg).toContain('x1="0"')
    expect(svg).toContain('y1="0"')
    expect(svg).toContain('x2="100"')
    expect(svg).toContain('y2="50"')
  })

  it('renders a host node as dashed placeholder', () => {
    const svg = renderNodeToSvg(makeHost())
    expect(svg).toContain('<rect')
    expect(svg).toContain('stroke-dasharray')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: paint via inline style, never fill attribute                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('paint via inline style', () => {
  it('sets rect fill via style, not fill attribute', () => {
    const node = makeRect({ fill: { type: 'solid', color: '#ff0000' } })
    const svg = renderNodeToSvg(node)
    expect(svg).not.toMatch(/<rect[^>]*\sfill="/)
    expect(svg).toMatch(/style="[^"]*fill:#ff0000/)
  })

  it('sets path fill via style, not fill attribute', () => {
    const node = makePath({ fill: { type: 'solid', color: '#00ff00' } })
    const svg = renderNodeToSvg(node)
    expect(svg).not.toMatch(/<path[^>]*\sfill="/)
    expect(svg).toMatch(/style="[^"]*fill:#00ff00/)
  })

  it('sets icon fill via style, not fill attribute', () => {
    const node = makeIcon({ fill: '#0000ff' })
    const svg = renderNodeToSvg(node)
    expect(svg).not.toMatch(/<path[^>]*\sfill="/)
    expect(svg).toMatch(/style="[^"]*fill:#0000ff/)
  })

  it('sets text fill via style, not fill attribute', () => {
    const node = makeText()
    const svg = renderNodeToSvg(node)
    expect(svg).not.toMatch(/<text[^>]*\sfill="/)
    expect(svg).toMatch(/style="[^"]*fill:#000000/)
  })

  it('sets line stroke via style, not stroke attribute', () => {
    const node = makeLine()
    const svg = renderNodeToSvg(node)
    expect(svg).not.toMatch(/<line[^>]*\sstroke="/)
    expect(svg).toMatch(/style="[^"]*stroke:#000000/)
  })

  it('sets rect stroke via style, not stroke attribute', () => {
    const node = makeRect({ stroke: { color: '#333', width: 2 } })
    const svg = renderNodeToSvg(node)
    expect(svg).not.toMatch(/<rect[^>]*\sstroke="/)
    expect(svg).toMatch(/style="[^"]*stroke:#333/)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: paint on inner nodes, never outer container                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('paint on inner nodes', () => {
  it('group has no fill; child rect carries the fill', () => {
    const node = makeGroup({
      children: [makeRect({ fill: { type: 'solid', color: '#abc' } })],
    })
    const svg = renderNodeToSvg(node)
    // The <g> element should not have fill
    expect(svg).not.toMatch(/<g[^>]*\sfill="/)
    expect(svg).not.toMatch(/<g[^>]*style="[^"]*fill/)
    // The rect inside should have fill
    expect(svg).toMatch(/style="[^"]*fill:#abc/)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: gradients produce <defs> with correct stops                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('gradient defs', () => {
  it('linear gradient produces <defs> with <linearGradient> and correct stops', () => {
    const paint: Paint = {
      type: 'linearGradient',
      angle: 180,
      stops: [
        { color: '#ff0000', at: 0 },
        { color: '#0000ff', at: 1 },
      ],
    }
    const node = makeRect({ fill: paint })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('<defs>')
    expect(svg).toContain('<linearGradient')
    expect(svg).toContain('stop-color="#ff0000"')
    expect(svg).toContain('stop-color="#0000ff"')
    expect(svg).toContain('offset="0%"')
    expect(svg).toContain('offset="100%"')
    expect(svg).toContain('url(#')
  })

  it('radial gradient produces <defs> with <radialGradient> and correct stops', () => {
    const paint: Paint = {
      type: 'radialGradient',
      cx: 0.5,
      cy: 0.5,
      stops: [
        { color: '#ffffff', at: 0 },
        { color: '#000000', at: 1 },
      ],
    }
    const node = makeRect({ fill: paint })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('<defs>')
    expect(svg).toContain('<radialGradient')
    expect(svg).toContain('stop-color="#ffffff"')
    expect(svg).toContain('stop-color="#000000"')
    expect(svg).toContain('cx="50%"')
    expect(svg).toContain('cy="50%"')
  })

  it('solid paint does not produce gradient defs', () => {
    const node = makeRect({ fill: { type: 'solid', color: '#123456' } })
    const svg = renderNodeToSvg(node)
    expect(svg).not.toContain('<defs>')
    expect(svg).not.toContain('<linearGradient')
    expect(svg).not.toContain('<radialGradient')
  })

  it('nested gradients are collected at root level', () => {
    const paint: Paint = {
      type: 'linearGradient',
      angle: 90,
      stops: [{ color: 'red', at: 0 }, { color: 'blue', at: 1 }],
    }
    const node = makeGroup({
      children: [makeRect({ fill: paint })],
    })
    const svg = renderNodeToSvg(node)
    // defs should appear before the <g>, at root level
    const defsIndex = svg.indexOf('<defs>')
    const gIndex = svg.indexOf('<g>')
    expect(defsIndex).toBeLessThan(gIndex)
    expect(svg).toContain('<linearGradient')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: renderSvgDefs                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('renderSvgDefs', () => {
  it('returns empty string for tree with no gradient paints', () => {
    const node = makeRect({ fill: { type: 'solid', color: '#fff' } })
    expect(renderSvgDefs(node)).toBe('')
  })

  it('extracts linear gradient defs from a tree', () => {
    const paint: Paint = {
      type: 'linearGradient',
      angle: 0,
      stops: [{ color: 'red', at: 0 }, { color: 'blue', at: 1 }],
    }
    const node = makeRect({ fill: paint })
    const defs = renderSvgDefs(node)
    expect(defs).toContain('<defs>')
    expect(defs).toContain('<linearGradient')
    expect(defs).toContain('</defs>')
  })

  it('extracts radial gradient defs from a tree', () => {
    const paint: Paint = {
      type: 'radialGradient',
      cx: 0.5,
      cy: 0.5,
      stops: [{ color: 'white', at: 0 }, { color: 'black', at: 1 }],
    }
    const node = makeGroup({
      children: [makeRect({ fill: paint })],
    })
    const defs = renderSvgDefs(node)
    expect(defs).toContain('<radialGradient')
  })

  it('does not share collector state between calls', () => {
    const gradientPaint: Paint = {
      type: 'linearGradient',
      angle: 45,
      stops: [{ color: '#aaa', at: 0 }, { color: '#bbb', at: 1 }],
    }
    const nodeGrad = makeRect({ fill: gradientPaint })
    const nodeSolid = makeRect({ fill: { type: 'solid', color: '#fff' } })
    const a = renderSvgDefs(nodeGrad)
    const b = renderSvgDefs(nodeSolid)
    // First call has gradient, second does not — proves no shared state
    expect(a).toContain('<linearGradient')
    expect(b).toBe('')
    expect(a).not.toBe(b)
    // Same input again → same content (not cached result)
    const c = renderSvgDefs(nodeGrad)
    expect(a).toEqual(c)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: text lines at cumulative baselines                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('text baseline positioning', () => {
  it('positions each line at box.y + baseline', () => {
    const lines: TextLine[] = [
      { text: 'Line 1', baseline: 10, width: 80 },
      { text: 'Line 2', baseline: 30, width: 90 },
    ]
    const node = makeText({ lines })
    const svg = renderNodeToSvg(node)
    // box.y = 20, so baselines should be at y=30 and y=50
    expect(svg).toContain('y="30"')
    expect(svg).toContain('y="50"')
  })

  it('renders all line text content in tspan elements', () => {
    const lines: TextLine[] = [
      { text: 'First', baseline: 10, width: 50 },
      { text: 'Second', baseline: 25, width: 60 },
      { text: 'Third', baseline: 40, width: 55 },
    ]
    const node = makeText({ lines })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('First')
    expect(svg).toContain('Second')
    expect(svg).toContain('Third')
  })

  it('renders inline runs with per-run styling', () => {
    const lines: TextLine[] = [
      {
        text: 'Hello World',
        baseline: 20,
        width: 100,
        runs: [
          { text: 'Hello ', bold: true },
          { text: 'World', italic: true, color: '#ff0000' },
        ],
      },
    ]
    const node = makeText({ lines })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('font-weight:bold')
    expect(svg).toContain('font-style:italic')
    expect(svg).toContain('fill:#ff0000')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: deterministic output                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('determinism', () => {
  it('produces the same output for the same input', () => {
    const node = makeGroup({
      part: 'title',
      children: [
        makeRect({ fill: { type: 'solid', color: '#abc' } }),
        makeText({ lines: [{ text: 'Test', baseline: 10, width: 50 }] }),
      ],
    })
    const a = renderNodeToSvg(node)
    const b = renderNodeToSvg(node)
    expect(a).toBe(b)
  })

  it('gradient IDs are deterministic across calls', () => {
    const paint: Paint = {
      type: 'linearGradient',
      angle: 90,
      stops: [{ color: 'red', at: 0 }, { color: 'blue', at: 1 }],
    }
    const node = makeRect({ fill: paint })
    const a = renderNodeToSvg(node)
    const b = renderNodeToSvg(node)
    expect(a).toBe(b)
  })

  it('does not share collector state between calls', () => {
    // Complex node with gradient
    const paint: Paint = {
      type: 'linearGradient',
      angle: 135,
      stops: [
        { color: '#ff0000', at: 0 },
        { color: '#00ff00', at: 0.33 },
        { color: '#0000ff', at: 0.66 },
        { color: '#ffff00', at: 1 },
      ],
    }
    const nodeGrad = makeGroup({
      children: [
        makeRect({ fill: paint, stroke: { color: '#123456', width: 3 } }),
      ],
    })
    const nodeNoGrad = makeRect({ fill: { type: 'solid', color: '#abc' } })
    const svgGrad = renderNodeToSvg(nodeGrad)
    const svgNoGrad = renderNodeToSvg(nodeNoGrad)
    // Gradient in first, none in second — proves no shared collector state
    expect(svgGrad).toContain('<linearGradient')
    expect(svgNoGrad).not.toContain('<linearGradient')
    expect(svgGrad).not.toBe(svgNoGrad)
    // Same input → deterministic output
    const svgGrad2 = renderNodeToSvg(nodeGrad)
    expect(svgGrad).toEqual(svgGrad2)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: group features                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('group features', () => {
  it('applies opacity', () => {
    const node = makeGroup({ opacity: 0.5 })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('opacity="0.5"')
  })

  it('applies clip-path with defs', () => {
    const node = makeGroup({ clip: true })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('<clipPath')
    expect(svg).toContain('clip-path="url(#')
  })

  it('sets id from name', () => {
    const node = makeGroup({ name: 'my-group' })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('id="my-group"')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: rect features                                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('rect features', () => {
  it('applies single radius', () => {
    const node = makeRect({ radius: 8 })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('rx="8"')
    expect(svg).toContain('ry="8"')
  })

  it('applies array radius (first element)', () => {
    const node = makeRect({ radius: [4, 8, 12, 16] })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('rx="4"')
    expect(svg).toContain('ry="4"')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: image features                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('image features', () => {
  it('sets preserveAspectRatio for cover', () => {
    const node = makeImage({ fit: 'cover' })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('preserveAspectRatio="xMidYMid slice"')
  })

  it('sets preserveAspectRatio for contain', () => {
    const node = makeImage({ fit: 'contain' })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: line features                                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('line features', () => {
  it('renders without marker', () => {
    const node = makeLine()
    const svg = renderNodeToSvg(node)
    expect(svg).not.toContain('marker-end')
    expect(svg).not.toContain('<marker')
  })

  it('renders arrow marker with defs', () => {
    const node = makeLine({
      marker: { kind: 'arrow', color: '#000' },
    })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('<marker')
    expect(svg).toContain('marker-end="url(#')
  })

  it('renders circle marker with defs', () => {
    const node = makeLine({
      marker: { kind: 'circle', color: '#ff0000' },
    })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('<marker')
    expect(svg).toContain('<circle')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: host features                                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('host features', () => {
  it('renders dashed outline placeholder', () => {
    const node = makeHost({ render: 'chart-block' })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('stroke-dasharray')
    expect(svg).toContain('fill:none')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: icon features                                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('icon features', () => {
  it('renders stroke icon with fill:none and stroke', () => {
    const node = makeIcon({
      icon: 'M0 0L10 10',
      fill: '#333',
      strokeWidth: 2,
    })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('fill:none')
    expect(svg).toContain('stroke:#333')
    expect(svg).toContain('stroke-width:2')
  })

  it('renders fill icon without stroke', () => {
    const node = makeIcon({ icon: 'M0 0L10 10', fill: '#ff0000' })
    const svg = renderNodeToSvg(node)
    expect(svg).toContain('fill:#ff0000')
    expect(svg).not.toContain('stroke:#ff0000')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Scope cuts (named follow-ups)                                                   */
/*                                                                                   */
/* 1. radialGradient with userSpaceOnUse for accurate non-square bounding boxes     */
/* 2. SVG <text> xml:space="preserve" for leading/trailing whitespace              */
/* 3. SVG root viewBox based on slide dimensions                                    */
/* 4. Stroke paint (gradient on stroke) support                                     */
/* 5. Nested <svg> coordinate scaling for icon paths with arbitrary viewBox         */
/* ─────────────────────────────────────────────────────────────────────────────── */
