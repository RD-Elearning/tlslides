/**
 * Test helpers shared by the P3 diagram specs (not a spec itself).
 */

import type { BlockDefinition, LayoutNode, Size } from '../../types'
import { absoluteLeaves } from '../text/standard-suite'
import { chartCtx } from '../data/_chart/chart-test'
import { pathBounds } from './_kit'

export interface Rect {
  part: string
  x: number
  y: number
  width: number
  height: number
}

export { chartCtx }

export function layoutOf(def: BlockDefinition, props: Record<string, unknown>, size: Size): LayoutNode {
  return def.layout({ ...(def.defaults as any), ...props } as any, chartCtx(size))
}

/** Leaves whose part matches `re`, as rects. A `path` leaf is measured by its path data, not its box. */
export function rectsOf(tree: LayoutNode, re: RegExp): Rect[] {
  return absoluteLeaves(tree)
    .filter((l) => re.test(l.part ?? ''))
    .map((l) => {
      if (l.k === 'path') {
        const b = pathBounds((l.node as any).d)
        return { part: l.part ?? '', ...b }
      }
      return { part: l.part ?? '', x: l.x, y: l.y, width: l.width, height: l.height }
    })
}

export function overlap(a: Rect, b: Rect, tol = 1): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) - tol
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) - tol
  return w > 0 && h > 0 ? w * h : 0
}

/** Throws when two of `rects` overlap (more than `tol` px in both axes). */
export function assertNoOverlap(rects: Rect[], tol = 1): void {
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (overlap(rects[i], rects[j], tol) > 0) {
        const a = rects[i]
        const b = rects[j]
        throw new Error(`overlap: ${a.part} (${Math.round(a.x)},${Math.round(a.y)} ${Math.round(a.width)}x${Math.round(a.height)}) and ${b.part} (${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)})`)
      }
    }
  }
}

export const within = (inner: Rect, outer: Rect, tol = 1) =>
  inner.x >= outer.x - tol && inner.y >= outer.y - tol && inner.x + inner.width <= outer.x + outer.width + tol && inner.y + inner.height <= outer.y + outer.height + tol

/** Every text of the tree, one string per node. */
export function allText(tree: LayoutNode): string[] {
  return absoluteLeaves(tree)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(' '))
}

export const words = (n: number, len = 6) => Array.from({ length: n }, (_, i) => 'w'.repeat(len - 1) + String.fromCharCode(97 + (i % 26))).join(' ')
