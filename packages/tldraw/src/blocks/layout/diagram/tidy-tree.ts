/**
 * Tidy tree layout (Reingold–Tilford-lite) for tree and mind-map diagrams. Pure function.
 *
 * Leaves take consecutive slots along the cross axis and every parent is centred over its
 * children, so nodes on one level can never overlap and subtrees never interleave. It is not
 * the full contour-compaction algorithm: sibling subtrees are not packed closer than leaf slots.
 * Capped at 4 levels (root included); deeper trees report `fits: false`.
 */

import type { Box, Size } from '../../types'

export interface TreeNode {
  id: string
  children?: TreeNode[]
}

export const MAX_TREE_LEVELS = 4

export interface TidyTreeResult {
  fits: boolean
  boxes: Record<string, Box>
  /** Parent id -> child ids, for drawing connectors. */
  edges: Array<{ from: string; to: string }>
}

export function tidyTree(
  root: TreeNode,
  direction: 'TB' | 'LR',
  box: Box,
  opts: { nodeSize: Size; minGap?: number }
): TidyTreeResult {
  const minGap = opts.minGap ?? 12
  const horizontal = direction === 'LR'
  const nodeMain = horizontal ? opts.nodeSize.width : opts.nodeSize.height
  const nodeCross = horizontal ? opts.nodeSize.height : opts.nodeSize.width
  const mainExtent = horizontal ? box.width : box.height
  const crossExtent = horizontal ? box.height : box.width

  const seen = new Set<string>()
  let levels = 0
  let leaves = 0
  const slot = new Map<string, number>()
  const level = new Map<string, number>()
  const edges: TidyTreeResult['edges'] = []

  const visit = (node: TreeNode, depth: number): number => {
    seen.add(node.id)
    level.set(node.id, depth)
    levels = Math.max(levels, depth + 1)
    const kids = (node.children ?? []).filter((c) => !seen.has(c.id))
    if (kids.length === 0) {
      slot.set(node.id, leaves++)
      return slot.get(node.id)!
    }
    const centres = kids.map((c) => {
      edges.push({ from: node.id, to: c.id })
      return visit(c, depth + 1)
    })
    const centre = (centres[0] + centres[centres.length - 1]) / 2
    slot.set(node.id, centre)
    return centre
  }
  visit(root, 0)

  const slotPitch = leaves > 0 ? crossExtent / leaves : crossExtent
  const mainPitch = levels > 1 ? (mainExtent - nodeMain) / (levels - 1) : 0
  const fits =
    levels <= MAX_TREE_LEVELS && slotPitch >= nodeCross + minGap && (levels <= 1 || mainPitch >= nodeMain + minGap)

  const boxes: Record<string, Box> = {}
  for (const [id, s] of slot) {
    const crossCentre = (s + 0.5) * slotPitch
    const main = (level.get(id) ?? 0) * mainPitch
    boxes[id] = horizontal
      ? { x: box.x + main, y: box.y + crossCentre - nodeCross / 2, width: nodeMain, height: nodeCross }
      : { x: box.x + crossCentre - nodeCross / 2, y: box.y + main, width: nodeCross, height: nodeMain }
  }
  return { fits, boxes, edges }
}
