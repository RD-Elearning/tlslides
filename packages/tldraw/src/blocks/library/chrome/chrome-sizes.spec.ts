/**
 * RV11 — slide furniture: the example fits size.preferred and size.min with nothing escaping the
 * box, and no label is ellipsised at either size (a footer that reads "Annual rev…" is a bad
 * minimum).
 */

import { makeCtx } from '../layout/test-helpers'
import { tlsXPageNumber } from './tls-x-page-number'
import { tlsXFooterText } from './tls-x-footer-text'
import { tlsXLogoMark } from './tls-x-logo-mark'
import { tlsXHeader } from './tls-x-header'
import { tlsXWatermark } from './tls-x-watermark'
import { tlsXRule } from './tls-x-rule'

const leaves = (n: any, ox = 0, oy = 0, out: any[] = []): any[] => {
  const x = ox + n.box.x
  const y = oy + n.box.y
  if (n.k !== 'group') out.push({ k: n.k, x, y, w: n.box.width, h: n.box.height, lines: n.lines })
  for (const c of n.children ?? []) leaves(c, x, y, out)
  return out
}

describe.each([tlsXPageNumber, tlsXFooterText, tlsXLogoMark, tlsXHeader, tlsXWatermark, tlsXRule].map((d) => [d.type, d] as const))('RV11 %s', (_t, def) => {
  const ex = def.describe!.example.props as any
  it.each([
    ['preferred', def.size.preferred],
    ['min', def.size.min],
  ])('the example fits size.%s, nothing escapes, no ellipsis', (_l, [w, h]) => {
    const node = def.layout({ ...(def.defaults as any), ...ex }, makeCtx({ width: w, height: h }))
    expect(node.box.height).toBeLessThanOrEqual(h + 0.5)
    for (const l of leaves(node)) {
      expect(l.x + l.w).toBeLessThanOrEqual(w + 0.5)
      expect(l.y + l.h).toBeLessThanOrEqual(h + 0.5)
      for (const line of l.lines ?? []) expect(String(line.text)).not.toContain('…')
    }
  })
})

describe('RV11 tls.x.page-number', () => {
  const at = (props: any, w = 160) => tlsXPageNumber.layout({ ...(tlsXPageNumber.defaults as any), ...props }, makeCtx({ width: w, height: 40 })) as any
  const textOf = (n: any) => n.children[0].lines.map((l: any) => l.text).join('')
  it('shows "3 / 24" with total and a bare number without', () => {
    expect(textOf(at({ number: 3, total: 24 }))).toBe('3 / 24')
    expect(textOf(at({ number: 3 }))).toBe('3')
  })
  it('align places the text at the start, centre or end of its box', () => {
    const x = (a: string) => at({ number: 12, total: 30, align: a }).children[0].box.x
    expect(x('start')).toBe(0)
    expect(x('center')).toBeGreaterThan(0)
    expect(x('end')).toBeGreaterThan(x('center'))
    const n = at({ number: 12, total: 30, align: 'end' })
    expect(n.children[0].box.x + n.children[0].box.width).toBeLessThanOrEqual(160.5)
  })
})
