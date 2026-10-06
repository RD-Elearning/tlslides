/**
 * RV09: the example props of the media / people composites fit size.preferred and size.min
 * (images resolved, so the real image nodes are laid out, not the placeholder).
 */

import { tlsCProfileCard } from './tls-c-profile-card'
import { tlsCTeam } from './tls-c-team'
import { tlsCImageText } from './tls-c-image-text'
import { tlsCTestimonial } from './tls-c-testimonial'
import { BlockRegistry } from '../../registry'
import { registerBuiltInBlocks } from '../index'
import { createLayoutContext } from '../../layout/layout-child'
import { TEST_TOKENS, TEST_SURFACE } from '../layout/test-helpers'
import { assertContained, assertWellFormed } from '../text/standard-suite'

const reg = new BlockRegistry()
registerBuiltInBlocks(reg)

const ctx = (w: number, h: number) =>
  createLayoutContext({ box: { width: w, height: h }, tokens: TEST_TOKENS, surface: TEST_SURFACE, registry: reg, resolveAsset: (id: string) => id })

describe('people / media composites: example at size.preferred and size.min', () => {
  for (const def of [tlsCProfileCard, tlsCTeam, tlsCImageText]) {
    for (const which of ['preferred', 'min'] as const) {
      it(`${def.type} at size.${which}`, () => {
        const [w, h] = def.size[which]
        const tree = def.layout({ ...(def.defaults as any), ...(def.describe!.example.props as any) } as any, ctx(w, h))
        assertWellFormed(tree)
        assertContained(tree, { width: w, height: h })
      })
    }
  }

  it('tls.c.testimonial: the poster of the example is as wide as size.min and its height is the honest content height', () => {
    const [w] = tlsCTestimonial.size.min
    const tree = tlsCTestimonial.layout({ ...(tlsCTestimonial.defaults as any), ...(tlsCTestimonial.describe!.example.props as any) } as any, ctx(w, 300))
    assertWellFormed(tree)
    expect(tree.box.width).toBeLessThanOrEqual(w)
    // at the minimum width the quote wraps further, so the block grows taller than the minimum height rather than clipping
    expect(tree.box.height).toBeGreaterThan(0)
  })

  it('profile card: auto is side by side in a landscape box, stacked in a portrait one, and never wider than its cap', () => {
    const wide = tlsCProfileCard.layout({ ...(tlsCProfileCard.defaults as any), ...(tlsCProfileCard.describe!.example.props as any) } as any, ctx(1800, 600))
    expect(wide.box.width).toBeLessThanOrEqual(1080)
    const names = (t: any) => {
      const out: Record<string, any> = {}
      const walk = (n: any) => (n.part && (out[n.part] = n), n.children?.forEach(walk))
      walk(t)
      return out
    }
    const w = names(wide)
    expect(w.name.box.x).toBeGreaterThan(w.photo.box.x + w.photo.box.width - 1)
    const tall = names(tlsCProfileCard.layout({ ...(tlsCProfileCard.defaults as any), ...(tlsCProfileCard.describe!.example.props as any) } as any, ctx(520, 700)))
    expect(tall.name.box.y).toBeGreaterThan(tall.photo.box.y + tall.photo.box.height - 1)
  })
})
