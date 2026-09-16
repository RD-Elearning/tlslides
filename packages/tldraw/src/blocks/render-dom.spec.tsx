/**
 * Tests for the DOM renderer (`render-dom.tsx`).
 *
 * Verifies:
 *  - All 8 LayoutNode kinds render without throwing
 *  - `data-part` attributes match the parts the tree declares
 *  - Absolute positioning uses slide-unit coordinates
 *  - No layout computation (the renderer doesn't transform coordinates)
 *  - Paint conversion works for solid, linear gradient, radial gradient
 *  - Group with `clip: true` gets `overflow: hidden`
 */

import * as React from 'react'
import { render } from '@testing-library/react'
import {
  renderNodeToDom,
  paintToCSS,
  BlockRenderer,
} from './render-dom'
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

function makeGroup(overrides?: Partial<LayoutNode & { k: 'group' }>): LayoutNode {
  return {
    k: 'group',
    box: BOX,
    children: [],
    ...overrides,
  } as LayoutNode
}

function makeRect(overrides?: Partial<LayoutNode & { k: 'rect' }>): LayoutNode {
  return {
    k: 'rect',
    box: BOX,
    ...overrides,
  } as LayoutNode
}

function makePath(overrides?: Partial<LayoutNode & { k: 'path' }>): LayoutNode {
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

function makeText(overrides?: Partial<LayoutNode & { k: 'text' }>): LayoutNode {
  const lines: TextLine[] = [{ text: 'Hello', baseline: 20, width: 100 }]
  return {
    k: 'text',
    box: BOX,
    lines,
    style: DEFAULTTextStyle,
    ...overrides,
  } as LayoutNode
}

function makeImage(overrides?: Partial<LayoutNode & { k: 'image' }>): LayoutNode {
  return {
    k: 'image',
    box: BOX,
    assetId: 'asset-1',
    fit: 'cover',
    ...overrides,
  } as LayoutNode
}

function makeIcon(overrides?: Partial<LayoutNode & { k: 'icon' }>): LayoutNode {
  return {
    k: 'icon',
    box: BOX,
    icon: 'M 0 0 L 10 0 L 10 10 Z',
    fill: '#ff0000',
    ...overrides,
  } as LayoutNode
}

function makeLine(overrides?: Partial<LayoutNode & { k: 'line' }>): LayoutNode {
  return {
    k: 'line',
    box: BOX,
    from: { x: 0, y: 0 },
    to: { x: 100, y: 50 },
    stroke: { color: '#000000', width: 2 },
    ...overrides,
  } as LayoutNode
}

function makeHost(overrides?: Partial<LayoutNode & { k: 'host' }>): LayoutNode {
  return {
    k: 'host',
    box: BOX,
    render: 'my-component',
    ...overrides,
  } as LayoutNode
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: all 8 node kinds render without throwing                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('renderNodeToDom', () => {
  it('renders a group node without throwing', () => {
    const node = makeGroup({ children: [makeRect()] })
    expect(() => render(renderNodeToDom(node))).not.toThrow()
  })

  it('renders a rect node without throwing', () => {
    const node = makeRect()
    expect(() => render(renderNodeToDom(node))).not.toThrow()
  })

  it('renders a path node without throwing', () => {
    const node = makePath()
    expect(() => render(renderNodeToDom(node))).not.toThrow()
  })

  it('renders a text node without throwing', () => {
    const node = makeText()
    expect(() => render(renderNodeToDom(node))).not.toThrow()
  })

  it('renders an image node without throwing', () => {
    const node = makeImage()
    expect(() => render(renderNodeToDom(node))).not.toThrow()
  })

  it('renders an icon node without throwing', () => {
    const node = makeIcon()
    expect(() => render(renderNodeToDom(node))).not.toThrow()
  })

  it('renders a line node without throwing', () => {
    const node = makeLine()
    expect(() => render(renderNodeToDom(node))).not.toThrow()
  })

  it('renders a host node without throwing', () => {
    const node = makeHost()
    expect(() => render(renderNodeToDom(node))).not.toThrow()
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: data-part attributes match what the tree declares                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('data-part attributes', () => {
  it('stamps data-part on a group node that has a part', () => {
    const node = makeGroup({ part: 'title-group' })
    const { container } = render(renderNodeToDom(node))
    expect(container.querySelector('[data-part="title-group"]')).toBeTruthy()
  })

  it('does not stamp data-part when part is absent', () => {
    const node = makeRect()
    const { container } = render(renderNodeToDom(node))
    expect(container.querySelector('[data-part]')).toBeNull()
  })

  it('stamps data-part on all 8 kinds that carry a part', () => {
    const kinds: LayoutNode[] = [
      makeGroup({ part: 'p-group' }),
      makeRect({ part: 'p-rect' }),
      makePath({ part: 'p-path' }),
      makeText({ part: 'p-text' }),
      makeImage({ part: 'p-image' }),
      makeIcon({ part: 'p-icon' }),
      makeLine({ part: 'p-line' }),
      makeHost({ part: 'p-host' }),
    ]

    for (const node of kinds) {
      const { container } = render(renderNodeToDom(node))
      expect(container.querySelector(`[data-part="p-${node.k}"]`)).toBeTruthy()
    }
  })

  it('stamps data-part on nested children correctly', () => {
    const node = makeGroup({
      part: 'parent',
      children: [
        makeRect({ part: 'child-rect' }),
        makeText({ part: 'child-text' }),
      ],
    })
    const { container } = render(renderNodeToDom(node))
    expect(container.querySelector('[data-part="parent"]')).toBeTruthy()
    expect(container.querySelector('[data-part="child-rect"]')).toBeTruthy()
    expect(container.querySelector('[data-part="child-text"]')).toBeTruthy()
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: absolute positioning uses slide-unit coordinates                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('absolute positioning in slide units', () => {
  it('places a rect at the correct slide-unit coordinates', () => {
    const box: Box = { x: 50, y: 100, width: 300, height: 150 }
    const node = makeRect({ box })
    const { container } = render(renderNodeToDom(node))
    const el = container.firstChild as HTMLElement
    expect(el.style.position).toBe('absolute')
    expect(el.style.left).toBe('50px')
    expect(el.style.top).toBe('100px')
    expect(el.style.width).toBe('300px')
    expect(el.style.height).toBe('150px')
  })

  it('does not transform coordinates (no layout computed)', () => {
    const box: Box = { x: 42, y: 77, width: 100, height: 50 }
    const node = makeRect({ box })
    const { container } = render(renderNodeToDom(node))
    const el = container.firstChild as HTMLElement
    // Coordinates should be placed verbatim — no scaling, no offset
    expect(el.style.left).toBe('42px')
    expect(el.style.top).toBe('77px')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: paint conversion                                                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('paintToCSS', () => {
  it('converts solid paint to backgroundColor', () => {
    const paint: Paint = { type: 'solid', color: '#ff0000' }
    const css = paintToCSS(paint)
    expect(css).toEqual({ backgroundColor: '#ff0000' })
  })

  it('converts linear gradient paint to CSS gradient string', () => {
    const paint: Paint = {
      type: 'linearGradient',
      angle: 180,
      stops: [
        { color: '#ff0000', at: 0 },
        { color: '#0000ff', at: 1 },
      ],
    }
    const css = paintToCSS(paint)
    expect(css.background).toContain('linear-gradient(180deg,')
    expect(css.background).toContain('#ff0000 0%')
    expect(css.background).toContain('#0000ff 100%')
  })

  it('converts radial gradient paint to CSS gradient string', () => {
    const paint: Paint = {
      type: 'radialGradient',
      cx: 0.5,
      cy: 0.5,
      stops: [
        { color: '#ffffff', at: 0 },
        { color: '#000000', at: 1 },
      ],
    }
    const css = paintToCSS(paint)
    expect(css.background).toContain('radial-gradient(')
    expect(css.background).toContain('#ffffff 0%')
    expect(css.background).toContain('#000000 100%')
  })

  it('returns a new object each time (not shared reference)', () => {
    const paint: Paint = { type: 'solid', color: '#abcdef' }
    const a = paintToCSS(paint)
    const b = paintToCSS(paint)
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: group with clip                                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('group clip', () => {
  it('sets overflow: hidden when clip is true', () => {
    const node = makeGroup({ clip: true })
    const { container } = render(renderNodeToDom(node))
    const el = container.firstChild as HTMLElement
    expect(el.style.overflow).toBe('hidden')
  })

  it('does not set overflow when clip is false or absent', () => {
    const node = makeGroup({ clip: false })
    const { container } = render(renderNodeToDom(node))
    const el = container.firstChild as HTMLElement
    expect(el.style.overflow).toBe('')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: group opacity                                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('group opacity', () => {
  it('applies opacity when set', () => {
    const node = makeGroup({ opacity: 0.5 })
    const { container } = render(renderNodeToDom(node))
    const el = container.firstChild as HTMLElement
    expect(el.style.opacity).toBe('0.5')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: rect styling                                                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('rect styling', () => {
  it('applies fill as background', () => {
    const node = makeRect({ fill: { type: 'solid', color: '#00ff00' } })
    const { container } = render(renderNodeToDom(node))
    const el = container.firstChild as HTMLElement
    // jsdom normalizes hex to rgb — verify the property is set at all
    expect(el.style.backgroundColor).toBeTruthy()
    expect(el.style.backgroundColor).not.toBe('')
  })

  it('applies stroke as border', () => {
    const node = makeRect({
      stroke: { color: '#333333', width: 2 },
    })
    const { container } = render(renderNodeToDom(node))
    const el = container.firstChild as HTMLElement
    expect(el.style.borderColor).toBe('#333333')
    expect(el.style.borderWidth).toBe('2px')
  })

  it('applies border-radius for single radius', () => {
    const node = makeRect({ radius: 8 })
    const { container } = render(renderNodeToDom(node))
    const el = container.firstChild as HTMLElement
    expect(el.style.borderRadius).toBe('8px')
  })

  it('applies border-radius for array of radii', () => {
    const node = makeRect({ radius: [4, 8, 12, 16] })
    const { container } = render(renderNodeToDom(node))
    const el = container.firstChild as HTMLElement
    expect(el.style.borderRadius).toBe('4px 8px 12px 16px')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: host node                                                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('host node', () => {
  it('renders a placeholder div with data-render', () => {
    const node = makeHost({ render: 'chart-block' })
    const { container } = render(renderNodeToDom(node))
    const el = container.firstChild as HTMLElement
    expect(el.getAttribute('data-render')).toBe('chart-block')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: image node                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('image node', () => {
  it('renders an img with object-fit', () => {
    const node = makeImage({ fit: 'contain', radius: 8 })
    const { container } = render(renderNodeToDom(node))
    const el = container.querySelector('img') as HTMLImageElement
    expect(el).toBeTruthy()
    expect(el.style.objectFit).toBe('contain')
    expect(el.style.borderRadius).toBe('8px')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: text node                                                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('text node', () => {
  it('renders text lines', () => {
    const node = makeText({
      lines: [
        { text: 'Line 1', baseline: 10, width: 80 },
        { text: 'Line 2', baseline: 20, width: 90 },
      ],
    })
    const { getByText } = render(renderNodeToDom(node))
    expect(getByText('Line 1')).toBeTruthy()
    expect(getByText('Line 2')).toBeTruthy()
  })

  it('applies text style', () => {
    const node = makeText()
    const { container } = render(renderNodeToDom(node))
    const el = container.firstChild as HTMLElement
    expect(el.style.fontFamily).toBe('"Poppins", sans-serif')
    expect(el.style.fontSize).toBe('28px')
    expect(el.style.color).toBeTruthy()
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: BlockRenderer component                                                    */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('BlockRenderer', () => {
  it('renders a LayoutNode tree inside a wrapper div', () => {
    const node = makeGroup({ part: 'root', children: [makeRect({ part: 'inner' })] })
    const { container } = render(
      <BlockRenderer
        node={node}
        className="slide"
        style={{ width: 1920, height: 1080 }}
      />
    )
    const root = container.firstChild as HTMLElement
    expect(root.tagName).toBe('DIV')
    expect(root.className).toBe('slide')
    expect(root.style.width).toBe('1920px')
    expect(root.style.height).toBe('1080px')
    expect(root.querySelector('[data-part="root"]')).toBeTruthy()
    expect(root.querySelector('[data-part="inner"]')).toBeTruthy()
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test: no layout computed — coordinates are placed verbatim                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('no layout computation', () => {
  it('does not add transform or offset to any node', () => {
    const nodes: LayoutNode[] = [
      makeGroup({ box: { x: 100, y: 200, width: 300, height: 400 } }),
      makeRect({ box: { x: 55, y: 77, width: 111, height: 222 } }),
      makeImage({ box: { x: 0, y: 0, width: 1920, height: 1080 } }),
    ]

    for (const node of nodes) {
      const { container } = render(renderNodeToDom(node))
      const el = container.firstChild as HTMLElement
      // Should have no transform property set
      expect(el.style.transform).toBe('')
      // Position should match exactly
      expect(el.style.left).toBe(`${node.box.x}px`)
      expect(el.style.top).toBe(`${node.box.y}px`)
    }
  })
})
