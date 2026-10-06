/**
 * RV03 — the list blocks' example fits size.preferred and size.min, preferred is not a mostly
 * empty box (the card/drop preview shows the list, not a list in a void), and 8 items still
 * lay out inside the width.
 */

import { makeCtx } from './layout/test-helpers'
import { assertMotionTargetsExist } from './diagram/diagram-test'
import { tlsTBullets } from './text/tls-t-bullets'
import { tlsTNumbered } from './text/tls-t-numbered'
import { tlsTChecklist } from './text/tls-t-checklist'
import { tlsTKvList } from './text/tls-t-kv-list'
import { tlsTTags } from './text/tls-t-tags'
import { tlsMIconList } from './media/tls-m-icon-list'

const BLOCKS = [tlsTBullets, tlsTNumbered, tlsTChecklist, tlsTKvList, tlsTTags, tlsMIconList] as const

const leaves = (n: any, ox = 0, oy = 0, out: any[] = []): any[] => {
  const x = ox + n.box.x
  const y = oy + n.box.y
  if (n.k !== 'group') out.push({ x, y, w: n.box.width, h: n.box.height })
  for (const c of n.children ?? []) leaves(c, x, y, out)
  return out
}

describe.each(BLOCKS.map((b) => [b.type, b] as const))('RV03 %s', (_t, def) => {
  const ex = def.describe!.example.props as any
  const at = (w: number, h: number, props = ex) => def.layout(props, makeCtx({ width: w, height: h }))

  it.each([
    ['preferred', def.size.preferred],
    ['min', def.size.min],
  ])('the example fits size.%s with nothing escaping it', (_l, [w, h]) => {
    const node = at(w, h)
    expect(node.box.height).toBeLessThanOrEqual(h + 0.5)
    for (const l of leaves(node)) {
      expect(l.x + l.w).toBeLessThanOrEqual(w + 0.5)
      expect(l.y + l.h).toBeLessThanOrEqual(h + 0.5)
    }
  })

  it('size.preferred hugs the example (no mostly empty box)', () => {
    const [w, h] = def.size.preferred
    // the taller of the example and the defaults (a drop inserts the example, a new block the defaults)
    const used = Math.max(at(w, h).box.height, def.layout(def.defaults as any, makeCtx({ width: w, height: 2000 })).box.height)
    expect(used).toBeLessThanOrEqual(h + 0.5)
    expect(used).toBeGreaterThanOrEqual(h * 0.6)
  })

  it('every motion part exists and every drawn leaf is animated', () => {
    assertMotionTargetsExist(def as any, { optional: /badge|strike|leader|rule|marker|iconbg|text\[/, staticParts: /^value\[\d+\]\.l\d+$/ })
  })

  it('eight items stay inside the width', () => {
    const items = Array.from({ length: 8 }, (_, i) => ex.items[i % ex.items.length])
    const [w, h] = def.size.preferred
    const node = at(w, h * 4, { ...ex, items })
    for (const l of leaves(node)) expect(l.x + l.w).toBeLessThanOrEqual(w + 0.5)
  })
})
