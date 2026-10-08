/**
 * RVM4 — shared choreography for the process / timeline / hierarchy / relationship diagrams
 * (reviews/blocks/block-review/MOTION.md, criteria J1–J8). Used only by the G07/G08 blocks.
 *
 * The motion engine staggers the elements one recipe part matches in document order
 * (`delay + index × stagger`), so a diagram controls its choreography by (a) the order it emits
 * its parts and (b) wrapping what must enter together in one numbered "slot" group — a flowchart
 * layer, a tree level, a mind-map branch's twigs — so slot k starts k steps in, whatever the item
 * count (a long diagram stays inside the 2.5 s block budget).
 *
 * Shared timing (ms, relative to the slot's own start):
 * - consecutive items / slots are `STEP` apart (J5: a stagger of at most 120 ms);
 * - a connector starts drawing `WIRE_AFTER` after the node it leaves, so it grows out of a
 *   visible node and reaches its target as the target fades in;
 * - its arrow head follows once the draw is mostly done (`TIP_AFTER`);
 * - a label follows its own shape by `LABEL_AFTER` (never before it).
 */

import type { Box, LayoutNode } from '../../types'
import { pathBounds } from './_kit'

export const STEP = 120
export const WIRE_AFTER = 80
export const TIP_AFTER = WIRE_AFTER + 240
export const LABEL_AFTER = 150

/**
 * A numbered slot: a group with the block's full box (so its children keep their absolute
 * coordinates) that the recipe animates as one element.
 */
export function slot(part: string, box: { width: number; height: number }, children: LayoutNode[]): LayoutNode {
  return { k: 'group', part, box: { x: 0, y: 0, width: Math.max(0, box.width), height: Math.max(0, box.height) }, children }
}

/**
 * A shape wrapped in a group with its own tight box (the path's bounds, padded), named `part`.
 * `pathNode` draws in a full-block box, so a clip wipe or a scale on the path itself would run
 * over the whole block; on this group it runs over the shape. The path keeps its own part name
 * and absolute `d` (its box is shifted back by the group's offset, so it paints where it did).
 */
export function shapeSlot(part: string, node: LayoutNode, pad = 2): LayoutNode {
  if (node.k !== 'path') return node
  const b = pathBounds(node.d)
  if (!(b.width > 0 || b.height > 0)) return node
  const p = pad + (node.stroke ? node.stroke.width / 2 : 0)
  const box: Box = { x: node.box.x + b.x - p, y: node.box.y + b.y - p, width: b.width + 2 * p, height: b.height + 2 * p }
  return {
    k: 'group',
    part,
    box,
    children: [{ ...node, box: { x: node.box.x - box.x, y: node.box.y - box.y, width: node.box.width, height: node.box.height } }],
  }
}

/**
 * Rect / text leaves wrapped in a group named `part` whose box is their union, so a clip wipe on
 * the group runs over them (an axis wipes along its own length). Children keep their positions.
 */
export function around(part: string, children: LayoutNode[]): LayoutNode {
  const boxes = children.map((c) => c.box)
  if (boxes.length === 0) return { k: 'group', part, box: { x: 0, y: 0, width: 0, height: 0 }, children }
  const x = Math.min(...boxes.map((b) => b.x))
  const y = Math.min(...boxes.map((b) => b.y))
  const box: Box = { x, y, width: Math.max(...boxes.map((b) => b.x + b.width)) - x, height: Math.max(...boxes.map((b) => b.y + b.height)) - y }
  return { k: 'group', part, box, children: children.map((c) => ({ ...c, box: { ...c.box, x: c.box.x - x, y: c.box.y - y } }) as LayoutNode) }
}

/**
 * Regroup a flat list of indexed leaves into per-item motion slots. Each slot spec names the
 * leaves it takes (`match`'s first capture group is the item index); for every item i (0..n-1)
 * and every slot, in order, one group `name[i]` is emitted even when empty, so slot i is always
 * item i in the stagger. `tight: true` wraps the item's shape(s) in a tight group (a path via
 * `shapeSlot`, rects / texts via `around`) so it can scale about its own centre or wipe over
 * itself; otherwise the slot has the block's full box. Leaves no spec takes stay first, as they
 * were. Leaf names and positions never change.
 */
export function slotsByIndex(
  nodes: LayoutNode[],
  n: number,
  box: { width: number; height: number },
  specs: Array<{ name: string; match: RegExp; tight?: boolean }>
): LayoutNode[] {
  const idx = (node: LayoutNode, re: RegExp) => {
    const m = re.exec(node.part ?? '')
    return m ? Number(m[1]) : -1
  }
  const taken = new Set<LayoutNode>()
  const buckets = specs.map((sp) => {
    const b: LayoutNode[][] = Array.from({ length: n }, () => [])
    for (const node of nodes) {
      if (taken.has(node)) continue
      const i = idx(node, sp.match)
      if (i >= 0 && i < n) {
        b[i].push(node)
        taken.add(node)
      }
    }
    return b
  })
  const out = nodes.filter((node) => !taken.has(node))
  for (let i = 0; i < n; i++) {
    specs.forEach((sp, k) => {
      const kids = buckets[k][i]
      const part = `${sp.name}[${i}]`
      if (sp.tight && kids.length === 1 && kids[0].k === 'path') out.push(shapeSlot(part, kids[0]))
      else if (sp.tight && kids.length > 0 && kids.every((c) => c.k !== 'path' && c.k !== 'group')) out.push(around(part, kids))
      else out.push(slot(part, box, kids))
    })
  }
  return out
}
