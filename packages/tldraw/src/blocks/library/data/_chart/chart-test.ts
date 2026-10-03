/**
 * Test helpers shared by the P2 chart specs (not a spec itself).
 */

import type { BlockDefinition, LayoutNode, Size } from '../../../types'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { absoluteLeaves, assertContained, assertNoTextOverlap, assertWellFormed } from '../../text/standard-suite'

export const chartCtx = (size: Size) => makeCtx(size, makeRegistry())

export function layoutOf(def: BlockDefinition, props: Record<string, unknown>, size: Size): LayoutNode {
  return def.layout({ ...(def.defaults as any), ...props } as any, chartCtx(size))
}

/** Texts of all text leaves, one string per node. */
export function textsOf(tree: LayoutNode): string[] {
  return absoluteLeaves(tree)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(' '))
}

/** True when the tree is the "No data" empty state: one text, no marks. */
export function isNoData(tree: LayoutNode): boolean {
  const leaves = absoluteLeaves(tree)
  return leaves.length >= 1 && leaves.every((l) => l.k === 'text') && textsOf(tree).join(' ').includes('No data')
}

export function fillOf(l: { node: LayoutNode }): string | undefined {
  const n = l.node as any
  return n.fill?.color ?? n.stroke?.color
}

/** The colours (fill or stroke) of leaves whose part matches `re`, in tree order. */
export function coloursOf(tree: LayoutNode, re: RegExp): string[] {
  return absoluteLeaves(tree)
    .filter((l) => re.test(l.part ?? ''))
    .map((l) => fillOf(l) as string)
}

export function assertJsonClean(tree: LayoutNode): void {
  expect(JSON.stringify(tree)).not.toMatch(/NaN|Infinity|undefined/)
}

/** The checks every chart repeats: well-formed, contained, no text overlap, finite JSON. */
export function assertChartSane(tree: LayoutNode, size: Size): void {
  assertWellFormed(tree)
  assertContained(tree, size)
  assertNoTextOverlap(tree)
  assertJsonClean(tree)
}

export function seriesOf(n: number, len = 4): Array<{ name: string; values: number[] }> {
  return Array.from({ length: n }, (_, s) => ({ name: `Series ${s + 1}`, values: Array.from({ length: len }, (_, i) => 10 + s * 3 + i * 5 + ((s * 7 + i * 3) % 9)) }))
}
