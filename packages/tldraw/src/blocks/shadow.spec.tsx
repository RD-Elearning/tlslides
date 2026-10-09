/**
 * AC4 — `rect.shadow` in both renderers (ai-curation §6 AC4): CSS `box-shadow` in the DOM, an
 * `feDropShadow` filter in SVG; `'hard'` is a solid offset in the stroke colour; geometry unchanged.
 * Also the radial-gradient parity fix the mesh backdrop relies on.
 */
import { render } from '@testing-library/react'
import { renderNodeToDom, paintToCSS } from './render-dom'
import { renderNodeToSvg } from './render-svg'
import { HARD_SHADOW_OFFSET, rectShadowSpec, shadowCss } from './shadow'
import { ELEVATION_SCALE } from './scales'
import type { LayoutNode } from './types'

const rect = (shadow?: 0 | 1 | 2 | 'hard', stroke?: { color: string; width: number }): LayoutNode => ({
  k: 'rect',
  part: 'card',
  box: { x: 10, y: 20, width: 300, height: 200 },
  fill: { type: 'solid', color: '#ffffff' },
  radius: 12,
  ...(stroke ? { stroke } : {}),
  ...(shadow !== undefined ? { shadow } : {}),
})

const domStyle = (node: LayoutNode) => {
  const { container } = render(renderNodeToDom(node) as any)
  return (container.querySelector('[data-part="card"]') as HTMLElement).style
}

describe('AC4 rect.shadow', () => {
  it('levels 1 and 2 are the elevation scale; 0 / absent draw none', () => {
    for (const lvl of [1, 2] as const) {
      const s = rectShadowSpec(lvl)!
      expect([s.dx, s.dy, s.blur]).toEqual([ELEVATION_SCALE[lvl].dx, ELEVATION_SCALE[lvl].dy, ELEVATION_SCALE[lvl].blur])
      expect(s.opacity).toBeLessThan(1)
    }
    expect(rectShadowSpec(0)).toBeUndefined()
    expect(rectShadowSpec(undefined)).toBeUndefined()
  })

  it('hard: unblurred, offset, in the stroke colour (else near-black)', () => {
    expect(rectShadowSpec('hard', '#1B1B1B')).toEqual({ dx: HARD_SHADOW_OFFSET, dy: HARD_SHADOW_OFFSET, blur: 0, color: '#1B1B1B', opacity: 1 })
    expect(rectShadowSpec('hard')!.color).toBe('#111111')
  })

  it('DOM: box-shadow, box unchanged', () => {
    const st = domStyle(rect(1))
    expect(st.boxShadow).toContain('6px 8px')
    expect(st.left).toBe('10px')
    expect(st.width).toBe('300px')
    expect(domStyle(rect('hard', { color: '#ff0000', width: 3 })).boxShadow).toBe(`${HARD_SHADOW_OFFSET}px ${HARD_SHADOW_OFFSET}px 0px #ff0000`)
    expect(domStyle(rect()).boxShadow).toBe('')
    expect(domStyle(rect(0)).boxShadow).toBe('')
  })

  it('SVG: an feDropShadow filter referenced by the rect, rect attributes unchanged', () => {
    const svg = renderNodeToSvg(rect(2))
    expect(svg).toMatch(/<filter id="svgsh\d+"[^>]*><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="rgb\(0,0,0\)" flood-opacity="0.18"\/><\/filter>/)
    expect(svg).toMatch(/<rect x="10" y="20" width="300" height="200" rx="12" ry="12" style="[^"]*" filter="url\(#svgsh\d+\)"\/>/)
    const hard = renderNodeToSvg(rect('hard', { color: '#00ff00', width: 3 }))
    expect(hard).toContain(`<feDropShadow dx="${HARD_SHADOW_OFFSET}" dy="${HARD_SHADOW_OFFSET}" stdDeviation="0" flood-color="#00ff00" flood-opacity="1"/>`)
    expect(renderNodeToSvg(rect())).not.toContain('<filter')
    expect(renderNodeToSvg(rect(0))).not.toContain('<filter')
  })

  it('css string round-trips the alpha', () => {
    expect(shadowCss(rectShadowSpec(1)!)).toBe('0px 6px 8px rgba(0,0,0,0.1)')
  })
})

describe('AC4 radial gradient parity', () => {
  it('DOM radial is the SVG objectBoundingBox ellipse (radii 50% of width and height)', () => {
    const css = paintToCSS({ type: 'radialGradient', cx: 0.2, cy: 0.7, stops: [{ color: '#fff', at: 0 }, { color: 'rgba(255,255,255,0)', at: 1 }] })
    expect(css.background).toBe('radial-gradient(ellipse 50% 50% at 20% 70%, #fff 0%, rgba(255,255,255,0) 100%)')
  })
})
