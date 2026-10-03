/**
 * Test helpers shared by the P4 media specs (not a spec itself).
 */

import type { LayoutContext, LayoutNode } from '../../types'
import { makeCtx, makeRegistry } from '../layout/test-helpers'
import { absoluteLeaves, type AbsBox } from '../text/standard-suite'

/** A context whose asset resolver maps every id to `/assets/<id>.png`. */
export function ctxWithAssets(w: number, h: number): LayoutContext {
  return { ...makeCtx({ width: w, height: h }, makeRegistry()), resolveAsset: (id: string) => `/assets/${id}.png` }
}

/** A context with no resolver: every image is "missing" and renders the placeholder. */
export function ctxNoAssets(w: number, h: number): LayoutContext {
  return makeCtx({ width: w, height: h }, makeRegistry())
}

export const imagesOf = (tree: LayoutNode): AbsBox[] => absoluteLeaves(tree).filter((l) => l.k === 'image')

/** Throws when two of the boxes intersect by more than `tol` in both axes. */
export function assertDisjoint(boxes: Array<{ part?: string; x: number; y: number; width: number; height: number }>, tol = 1): void {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) - tol
      const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) - tol
      if (w > 0 && h > 0) throw new Error(`overlap: ${a.part} and ${b.part} (${w.toFixed(1)}x${h.toFixed(1)})`)
    }
  }
}
