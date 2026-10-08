/**
 * Shared composite checks for the P5 specs: slide-scope compile in a region, lint-free trees,
 * capped depth, and "this toggle removes exactly its child".
 */

import type { BlockDefinition, BlockSpec, LayoutNode } from '../../types'
import { deckSpecToDocument, resolveDeckFrame } from '../../index'
import { makeCtx, collectParts } from '../layout/test-helpers'
import { BlockRegistry } from '../../registry'
import { registerBuiltInBlocks } from '../index'
import { lintParts, specDepth } from './_kit'

export const registry = (): BlockRegistry => {
  const r = new BlockRegistry()
  registerBuiltInBlocks(r)
  return r
}

export const layoutAt = (def: BlockDefinition, props: Record<string, unknown>, w: number, h: number): LayoutNode =>
  def.layout({ ...(def.defaults as any), ...props } as any, makeCtx({ width: w, height: h }, registry()))

export const hasPart = (tree: LayoutNode, part: string): boolean =>
  collectParts(tree).some((p) => p === part || p.startsWith(part + '['))

/** Compile `props` as the only block of a region and return its shape rects plus the frame. */
export function compileInRegion(def: BlockDefinition, props: Record<string, unknown>, layout: string, region: string) {
  const deck: any = {
    id: 'd',
    title: 'T',
    version: 1,
    aspect: 'widescreen',
    theme: 'coral-pop',
    slides: [{ id: 's1', layout, role: 'content', regions: { [region]: [{ id: 'b1', type: def.type, props }] } }],
  }
  const { document } = deckSpecToDocument(deck)
  const frame = resolveDeckFrame(deck.aspect)
  const page: any = Object.values(document.pages)[0]
  const shapes = Object.values(page.shapes).filter((s: any) => s.type === 'component') as any[]
  return { shapes, frame, rects: shapes.map((s) => ({ left: s.point[0], top: s.point[1], right: s.point[0] + s.size[0], bottom: s.point[1] + s.size[1] })) }
}

/** Slide-scope: example compiles to exactly one shape, no collisions, inside the frame. */
export function slideScopeCompiles(def: BlockDefinition, layout: string, region: string): void {
  const { rects, frame } = compileInRegion(def, def.describe!.example.props as any, layout, region)
  expect(rects).toHaveLength(1)
  const r = rects[0]
  expect(r.left).toBeGreaterThanOrEqual(-1)
  expect(r.top).toBeGreaterThanOrEqual(-1)
  expect(r.right).toBeLessThanOrEqual(frame.width + 1)
  expect(r.bottom).toBeLessThanOrEqual(frame.height + 1)
}

/** The build() tree for `props` stays within the depth cap (4) and lays out with no `lint/` marker. */
export function depthOk(def: BlockDefinition, build: (p: any) => BlockSpec, props: Record<string, unknown>, w: number, h: number): void {
  const merged = { ...(def.defaults as any), ...props }
  expect(specDepth(build(merged))).toBeLessThanOrEqual(4)
  expect(lintParts(layoutAt(def, merged, w, h))).toEqual([])
}
