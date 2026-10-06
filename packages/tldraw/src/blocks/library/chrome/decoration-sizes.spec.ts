/**
 * RV11 — decoration blocks: the example fits size.preferred and size.min with nothing escaping
 * the box, and a field honours a gradient surface.
 */

import { makeCtx } from '../layout/test-helpers'
import { tlsLField } from '../layout/tls-l-field'
import { tlsGArrow } from '../diagram/tls-g-arrow'
import { tlsMDecoration } from '../media/tls-m-decoration'
import { tlsMPattern } from '../media/tls-m-pattern'
import { tlsXRule } from './tls-x-rule'

const leaves = (n: any, ox = 0, oy = 0, out: any[] = []): any[] => {
  const x = ox + n.box.x
  const y = oy + n.box.y
  if (n.k !== 'group') out.push({ x, y, w: n.box.width, h: n.box.height })
  for (const c of n.children ?? []) leaves(c, x, y, out)
  return out
}

describe.each([tlsLField, tlsGArrow, tlsMDecoration, tlsMPattern, tlsXRule].map((d) => [d.type, d] as const))('RV11 %s', (_t, def) => {
  it.each([
    ['preferred', def.size.preferred],
    ['min', def.size.min],
    ['half-width', [860, 480]],
  ])('the example fits size.%s with nothing escaping it', (_l, [w, h]) => {
    const node = def.layout({ ...(def.defaults as any), ...(def.describe!.example.props as any) }, makeCtx({ width: w, height: h }))
    for (const l of leaves(node)) {
      expect(l.x + l.w).toBeLessThanOrEqual(w + 0.5)
      expect(l.y + l.h).toBeLessThanOrEqual(h + 0.5)
    }
  })
})

describe('RV11 tls.l.field', () => {
  it('uses the instance gradient when the block style carries one', () => {
    const paint = { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#ff0000' }, { offset: 1, color: '#0000ff' }] } as any
    const node = tlsLField.layout({} as any, makeCtx({ width: 400, height: 300 }, undefined, { surface: paint } as any)) as any
    expect(node.children[0].fill).toEqual(paint)
  })
})
