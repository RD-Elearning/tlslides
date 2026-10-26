/**
 * CR7a (spro creative PLAN §6.9): list blocks (bullets, checklist, kv-list, qa, numbered, tags,
 * icon-list) set fixed body type and drew it the same in a whole slide and in a quarter one. A
 * list laid out through `growText` steps its type up the ladder (at most `GROW_STEPS`, less any
 * `style.typeStep`) while the larger text still shows whole in its box (nothing cut or dropped, no
 * text on text, at most twice its lines); a list that does not fit at its authored size keeps it.
 */
import type { LayoutContext, LayoutNode } from '../../../types'
import { promoteType, showsWhole } from '../../diagram/_kit'
import { DEFAULT_PROBE_HEIGHT } from '../../../layout/measure-block'

export const GROW_STEPS = 2

export type GrowOptions = {
  /** Parts whose leaves may not wrap to more lines than at the authored size (a kv key, a tag). */
  keepLines?: (part: string) => boolean
}

type Leaf = { part: string; lines: number; chars: number }
function leaves(n: LayoutNode): Leaf[] {
  if (n.k === 'group') return n.children.flatMap(leaves)
  if (n.k !== 'text') return []
  return [{ part: n.part ?? '', lines: n.lines.length, chars: n.lines.reduce((s, l) => s + l.text.replace(/[\s…]/g, '').length, 0) }]
}

/** How many ladder steps `lay` can grow in `ctx`'s box (0 = keep the authored type). */
export function growStep(ctx: LayoutContext, lay: (c: LayoutContext) => LayoutNode, opts: GrowOptions = {}): number {
  // a natural-size measure (an intrinsic size, a size card, `measureBlock`'s tall probe) is the
  // authored type: a list grows only in the room a slide gives it
  if (ctx.tokens.measuring || ctx.box.height >= DEFAULT_PROBE_HEIGHT) return 0
  const base = lay(ctx)
  if (!showsWhole(ctx, base)) return 0
  const b = leaves(base)
  const chars = b.reduce((s, l) => s + l.chars, 0)
  const lines = b.reduce((s, l) => s + l.lines, 0)
  if (!chars) return 0
  for (let n = GROW_STEPS - (ctx.tokens.typeStep ?? 0); n >= 1; n--) {
    const node = lay(promoteType(ctx, n))
    if (!showsWhole(ctx, node)) continue
    const s = leaves(node)
    if (s.reduce((t, l) => t + l.chars, 0) < chars || s.reduce((t, l) => t + l.lines, 0) > 2 * lines + 1) continue
    if (opts.keepLines && s.some((l, i) => opts.keepLines!(l.part) && b[i] && l.lines > b[i].lines)) continue
    return n
  }
  return 0
}

export function growText(ctx: LayoutContext, lay: (c: LayoutContext) => LayoutNode, opts: GrowOptions = {}): LayoutNode {
  const n = growStep(ctx, lay, opts)
  return lay(n ? promoteType(ctx, n) : ctx)
}
