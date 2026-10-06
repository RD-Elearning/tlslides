/**
 * Motion helpers for the structure containers (RVM2).
 *
 * `ctx.layoutChild` wraps every child block in a group with no `part`, so a container's recipe
 * had nothing to address and the whole container rose as one unit under `expressive`. Each
 * container now tags its direct child wrappers `child/0`, `child/1`… in reading order, and its
 * recipe lists the family `child`: the children stagger in (`stagger-children`, 40 ms apart) while
 * the container's own surface leads. A child's own recipe still does not play inside a container
 * (one block, one reveal); the child enters as a unit.
 *
 * Pure: no DOM.
 */

import type { LayoutNode, MotionRecipe } from '../../types'

/** The part family a container's child wrappers carry. */
export const CHILD_PART = 'child'

/** Tag each child wrapper group (as returned by `ctx.layoutChild`) `child/<i>`, in the given order.
 *  A node that already has a part (a lint placeholder) keeps it. */
export function tagChildren(nodes: LayoutNode[]): LayoutNode[] {
  return nodes.map((n, i) => (n.k === 'group' && !n.part ? ({ ...n, part: `${CHILD_PART}/${i}` } as LayoutNode) : n))
}

/** The recipe of a container: its own parts (drawn first) then its children, staggered under
 *  `expressive`; `subtle` stays one calm fade of every part. */
export function containerMotion(ownParts: string[] = [], partMotion?: MotionRecipe['partMotion']): MotionRecipe {
  return {
    parts: [...ownParts, CHILD_PART],
    expressive: 'stagger-children',
    ...(partMotion ? { partMotion } : {}),
  }
}
