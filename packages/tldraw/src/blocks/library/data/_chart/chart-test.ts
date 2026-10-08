/**
 * Test helpers shared by the P2 chart specs (not a spec itself).
 */

import type { BlockDefinition, LayoutNode, Size } from '../../../types'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { BlockRegistry } from '../../../registry'
import { registerBuiltInBlocks } from '../../index'
import { absoluteLeaves, assertContained, assertNoTextOverlap, assertWellFormed } from '../../text/standard-suite'
import { realWidth } from './inter-width'

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

/**
 * Every single-line text node is wide enough for its glyphs as the browser draws them (measured
 * Inter table), so the DOM never wraps or clips it, and nothing leaves `size`. The default
 * estimator is 20-30% off on figures, so `assertContained` alone cannot see a right-aligned value
 * overshooting its bar (RV04, review G04).
 */
export function assertInkFits(tree: LayoutNode, size: Size, tol = 1.03): void {
  for (const l of absoluteLeaves(tree)) {
    if (l.k !== 'text') continue
    const n = l.node as any
    const lines: Array<{ text: string }> = n.lines ?? []
    if (lines.length !== 1) continue
    const real = realWidth(lines[0].text, n.style)
    const where = `${l.part} "${lines[0].text}" real ${Math.round(real)} in box ${Math.round(l.width)} @${Math.round(l.x)}`
    expect([where, real <= l.width * tol + 1]).toEqual([where, true])
    expect([where, l.x + Math.min(real, l.width) <= size.width + 1]).toEqual([where, true])
  }
}

/** The block's own example, laid out at size.preferred and size.min, fits both (RV04). */
export function assertExampleFits(def: BlockDefinition, opts: { tol?: number; skipInk?: boolean } = {}): void {
  const reg = new BlockRegistry()
  registerBuiltInBlocks(reg)
  const props = { ...(def.defaults as any), ...((def.describe?.example?.props ?? {}) as any) }
  for (const [label, [w, h]] of [['preferred', def.size.preferred], ['min', def.size.min]] as const) {
    const size = { width: w, height: h }
    const tree = def.layout(props, makeCtx(size, reg))
    const tag = `${def.type} example at size.${label} ${w}x${h}`
    expect([tag, tree.box.height <= h + 0.5]).toEqual([tag, true])
    assertWellFormed(tree)
    assertContained(tree, size)
    assertJsonClean(tree)
    if (!opts.skipInk) assertInkFits(tree, size, opts.tol)
  }
}
