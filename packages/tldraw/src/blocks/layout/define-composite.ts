/**
 * `defineCompositeBlock()` — build a Tier A block from a spec tree of existing
 * registered blocks, with zero hand-written layout math.
 *
 * A composite block is purely compositional: its content is a tree of *existing*
 * blocks laid out by containers (tls.l.stack / tls.l.card / tls.l.grid …). The
 * author supplies a pure `build(props)` function that returns one `BlockSpec`
 * (which may itself be a container with `children`). The generated `layout()`
 * delegates to `ctx.layoutChild()` and the generated `intrinsicSize()` delegates
 * to `ctx.measureIntrinsicSize()`.
 *
 * This satisfies B5: "a card with an icon, a title and a number" becomes a 20-line
 * file — a schema and `build()` returning a spec tree.
 *
 * Motion: the composite animates as a single unit (`part: 'root'` only). Child
 * parts are not surfaced as motion targets (see B5-H1 in the spec).
 */

import type {
  BlockDefinition,
  BlockSpec,
  LayoutContext,
  LayoutNode,
  MotionRecipe,
  Size,
  BlockFamily,
} from '../types'

export interface CompositeBlockConfig<P extends Record<string, unknown>> {
  type: string
  name: string
  summary: string
  keywords: string[]
  family?: BlockFamily // default 'composite'
  /** 'A' = pure layout, exports headlessly. 'B' = DOM-only. Required — see B5-H3. */
  tier: 'A' | 'B'
  schema: Record<string, unknown> // BlockSchema
  defaults: P
  size: { preferred: [number, number]; min: [number, number]; aspect?: number }
  describe?: {
    when: string
    avoid: string
    example: BlockSpec
  }
  motion?: MotionRecipe
  /** Pure: props → one BlockSpec tree built from registered blocks. No geometry. */
  build(props: P): BlockSpec
}

/**
 * Build a complete BlockDefinition from a composite config.
 *
 * The generated `layout()` delegates to `ctx.layoutChild(cfg.build(props), box)`
 * then re-tags the returned root group's `part` to `'root'`.
 *
 * The generated `intrinsicSize()` delegates to `ctx.measureIntrinsicSize(cfg.build(props))`
 * so the composite participates in `sizing: 'content'` reflow.
 */
export function defineCompositeBlock<P extends Record<string, unknown>>(
  cfg: CompositeBlockConfig<P>
): BlockDefinition {
  const family = cfg.family ?? 'composite'

  // Generated layout: delegate to layoutChild, re-tag root part.
  function layout(props: P, ctx: LayoutContext): LayoutNode {
    const spec = cfg.build(props)
    const box = { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height }
    const node = ctx.layoutChild(spec, box)

    // Re-tag the root group's part to 'root' — layoutChild wraps in a group
    // without a part name, so we set it here.
    if (node.k === 'group') {
      return { ...node, part: 'root' }
    }
    return node
  }

  // Generated intrinsicSize: delegate to measureIntrinsicSize if available.
  function intrinsicSize(props: P, ctx: LayoutContext): Size {
    const spec = cfg.build(props)
    if (ctx.measureIntrinsicSize) {
      return ctx.measureIntrinsicSize(spec)
    }
    // Fallback: use the probe approach from measureIntrinsicSize.
    const node = ctx.layoutChild(spec, { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height })
    return { width: node.box.width, height: node.box.height }
  }

  return {
    type: cfg.type,
    name: cfg.name,
    family: family as BlockFamily,
    tier: cfg.tier,
    summary: cfg.summary,
    keywords: cfg.keywords,
    describe: cfg.describe,
    schema: cfg.schema as BlockDefinition['schema'],
    defaults: cfg.defaults,
    size: cfg.size,
    layout: layout as BlockDefinition['layout'],
    intrinsicSize: intrinsicSize as BlockDefinition['intrinsicSize'],
    motion: cfg.motion ?? { parts: ['root'] },
  }
}
