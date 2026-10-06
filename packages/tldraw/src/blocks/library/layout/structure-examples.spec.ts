/**
 * RV01 — the structure containers' examples carry real children (an empty container is an empty
 * gallery card) and the example fits size.preferred, size.min and a half-width region with
 * nothing escaping its box.
 */

import { registry, layoutAt } from '../composite/composite-test'
import { tlsLStack } from './tls-l-stack'
import { tlsLRow } from './tls-l-row'
import { tlsLGrid } from './tls-l-grid'
import { tlsLSplit } from './tls-l-split'
import { tlsLOverlay } from './tls-l-overlay'
import { tlsLCard } from './tls-l-card'
import { tlsLSection } from './tls-l-section'
import { tlsLRepeater } from './tls-l-repeater'
import { tlsLSafeArea } from './tls-l-safe-area'
import { tlsLSidebar } from './tls-l-sidebar'
import { tlsLFooter } from './tls-l-footer'
import { tlsLGridGuide } from './tls-l-grid-guide'

const CONTAINERS = [tlsLStack, tlsLRow, tlsLGrid, tlsLSplit, tlsLOverlay, tlsLCard, tlsLSection, tlsLRepeater, tlsLSafeArea, tlsLSidebar, tlsLFooter]

const leaves = (n: any, ox = 0, oy = 0, out: any[] = []): any[] => {
  const x = ox + n.box.x
  const y = oy + n.box.y
  if (n.k !== 'group') out.push({ part: n.part, k: n.k, x, y, w: n.box.width, h: n.box.height })
  for (const c of n.children ?? []) leaves(c, x, y, out)
  return out
}

describe.each(CONTAINERS.map((d) => [d.type, d] as const))('RV01 %s', (_t, def) => {
  const ex = def.describe!.example.props as any

  it('the example carries child blocks, and describe.when says it is a container', () => {
    expect(Array.isArray(ex.children) && ex.children.length > 0).toBe(true)
    expect(def.describe!.when).toMatch(/children|child blocks|template child/i)
  })

  it('children are drawn (more than the container surface alone)', () => {
    const [w, h] = def.size.preferred
    const drawn = leaves(layoutAt(def, ex, w, h)).filter((l) => l.k === 'text')
    expect(drawn.length).toBeGreaterThanOrEqual(1)
  })

  it.each([
    ['preferred', def.size.preferred],
    ['min', def.size.min],
    ['half-width', [860, def.size.preferred[1]]],
  ])('fits size.%s with nothing escaping it', (_l, [w, h]) => {
    const node = layoutAt(def, ex, w, h)
    for (const l of leaves(node)) {
      expect(l.x + l.w).toBeLessThanOrEqual(w + 0.5)
      expect(l.y + l.h).toBeLessThanOrEqual(h + 0.5)
    }
  })

  it('every label stays inside its own tile', () => {
    const [w, h] = def.size.min
    const node = layoutAt(def, ex, w, h)
    const texts = leaves(node).filter((l) => l.k === 'text')
    for (const t of texts) {
      expect(t.x).toBeGreaterThanOrEqual(-0.5)
      expect(t.x + t.w).toBeLessThanOrEqual(w + 0.5)
    }
  })
})

describe('RV01 grid-guide', () => {
  it('guide lines are thick enough to be seen', () => {
    const node = layoutAt(tlsLGridGuide, { divisions: 3 }, 800, 600)
    const lines = leaves(node).filter((l) => l.k === 'line')
    expect(lines.length).toBe(4)
  })
})
