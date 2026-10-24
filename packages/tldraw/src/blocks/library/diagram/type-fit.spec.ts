/**
 * 2026-10-24 corpus review: diagram blocks set their type by the box (tiers or `promoteToFit`), so a
 * diagram alone on a slide reads at slide size, and a quarter-slide one keeps its compact type.
 */
import { BlockRegistry } from '../../registry'
import { registerBuiltInBlocks } from '..'
import { makeCtx } from '../text/test-helpers'
import { promoteType } from './_kit'
import type { LayoutNode } from '../../types'

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)
const texts = (n: LayoutNode): Array<{ size: number; cut: boolean }> =>
  n.k === 'group' ? n.children.flatMap(texts) : n.k === 'text' ? [{ size: n.style.size, cut: !!(n as { truncated?: boolean }).truncated }] : []

describe('diagram type fits the box', () => {
  it.each(['tls.g.matrix-2x2', 'tls.g.cycle', 'tls.g.flow', 'tls.g.venn', 'tls.g.pyramid', 'tls.g.mindmap', 'tls.g.breakdown', 'tls.g.layers', 'tls.g.timeline', 'tls.g.tree'])('%s: at least body-plus type in a whole-slide box, never smaller than in a small one, nothing cut', (type) => {
    const def = registry.get(type)!
    const props = { ...(def.defaults as object), ...((def.describe?.example?.props ?? {}) as object) }
    const big = texts(def.layout(props as never, makeCtx({ width: 1728, height: 888 }, registry)))
    const small = texts(def.layout(props as never, makeCtx({ width: 640, height: 400 }, registry)))
    const max = (t: typeof big) => Math.max(...t.map((x) => x.size))
    expect(max(big)).toBeGreaterThanOrEqual(max(small))
    expect(max(big)).toBeGreaterThan(28)
    expect(big.some((t) => t.cut)).toBe(false)
  })

  it('promoteType steps every token up the ladder and stops at heading', () => {
    const ctx = makeCtx({ width: 100, height: 100 }, registry)
    expect(promoteType(ctx, 1).resolveText('caption').size).toBe(ctx.resolveText('body').size)
    expect(promoteType(ctx, 9).resolveText('footnote').size).toBe(ctx.resolveText('heading').size)
  })
})
