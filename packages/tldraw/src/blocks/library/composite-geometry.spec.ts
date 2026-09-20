/**
 * Cross-block geometry guard — catches overlapping leaves and containment
 * violations across the composite blocks added by R9.
 *
 * This test exists because green unit tests hid overlapping text for three
 * phases (the F1 lesson in reviews/blocks/BACKLOG-enhance.md §1.2). A
 * geometry/no-overlap assertion is the guard that catches this class of bug:
 * parity tests compare DOM against SVG for the *same* tree, so a tree that is
 * wrong for both renderers passes parity happily.
 *
 * For each block × variant we:
 *  1. Walk the tree accumulating parent offsets into an ABSOLUTE box per node.
 *  2. Assert every node's absolute box lies within the root box (±tolerance).
 *  3. Assert no two leaves intersect when a text node is involved (strict
 *     overlap) — the F1-class guard.
 *
 * `tls.c.hero` is deliberately excluded: it is `kind: 'html'`, its layout is a
 * host node, and its geometry comes from the poster (covered by its own spec).
 */

import { registerBuiltInBlocks } from './index'
import { BlockRegistry } from '../registry'
import { makeCtx } from './layout/test-helpers'
import type { LayoutNode } from '../types'

import { tlsCKpiTile } from './composite/tls-c-kpi-tile'
import { tlsCKpiRow } from './composite/tls-c-kpi-row'
import { tlsCImageText } from './composite/tls-c-image-text'
import { tlsCComparison } from './composite/tls-c-comparison'
import { tlsCAgenda } from './composite/tls-c-agenda'
import { tlsCSteps } from './composite/tls-c-steps'

/* ── helpers ─────────────────────────────────────────────────────────────── */

/**
 * Build a registry with all built-ins plus the composites under test. The
 * built-ins include `tls.c.hero`; the six R9 blocks are only in the global
 * barrel after the coordinator's integration step, so register them here when
 * absent. `reg.register` throws on a duplicate type, hence the `has` guard.
 */
function makeRegistry(): BlockRegistry {
  const reg = new BlockRegistry()
  registerBuiltInBlocks(reg)
  for (const def of [
    tlsCKpiTile,
    tlsCKpiRow,
    tlsCImageText,
    tlsCComparison,
    tlsCAgenda,
    tlsCSteps,
  ]) {
    if (!reg.has(def.type)) reg.register(def)
  }
  return reg
}

const registry = makeRegistry()

/** Tolerance in slide units for containment checks. */
const TOL = 2

/** Minimum intersection area (sq units) to count as a strict overlap. */
const MIN_OVERLAP_AREA = 1

interface AbsBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface LeafInfo {
  part: string
  blockType: string
  variant: string
  abs: AbsBox
  kind: 'text' | 'image'
}

/** Convert a box {x,y,width,height} to an AbsBox with absolute coords. */
function toAbs(
  box: { x: number; y: number; width: number; height: number },
  ox: number,
  oy: number,
): AbsBox {
  return {
    x1: ox + box.x,
    y1: oy + box.y,
    x2: ox + box.x + box.width,
    y2: oy + box.y + box.height,
  }
}

/** Compute intersection area of two AbsBoxes. */
function intersectionArea(a: AbsBox, b: AbsBox): number {
  const ix = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1))
  const iy = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1))
  return ix * iy
}

/** Is a box zero-sized (not rendered)? */
function isZeroBox(box: { width: number; height: number }): boolean {
  return box.width <= 0 || box.height <= 0
}

/** Recursively collect text and image leaves with their absolute positions. */
function collectLeaves(
  node: LayoutNode,
  ox: number,
  oy: number,
  blockType: string,
  variant: string,
  out: LeafInfo[],
): void {
  const abs = toAbs(node.box, ox, oy)
  if ((node.k === 'text' || node.k === 'image') && !isZeroBox(node.box)) {
    out.push({
      part: node.part ?? '<unnamed>',
      blockType,
      variant,
      abs,
      kind: node.k,
    })
  }
  if (node.k === 'group' && 'children' in node) {
    for (const child of (node as { children: LayoutNode[] }).children) {
      collectLeaves(child, abs.x1, abs.y1, blockType, variant, out)
    }
  }
}

/** Assert containment: all nodes' absolute boxes lie within rootBox ± tolerance. */
function assertContainment(node: LayoutNode, rootW: number, rootH: number): void {
  function walk(n: LayoutNode, ox: number, oy: number): void {
    const abs = toAbs(n.box, ox, oy)
    if (!isZeroBox(n.box)) {
      expect(abs.x1).toBeGreaterThanOrEqual(-TOL)
      expect(abs.y1).toBeGreaterThanOrEqual(-TOL)
      expect(abs.x2).toBeLessThanOrEqual(rootW + TOL)
      expect(abs.y2).toBeLessThanOrEqual(rootH + TOL)
    }
    if (n.k === 'group' && 'children' in n) {
      for (const child of (n as { children: LayoutNode[] }).children) {
        walk(child, abs.x1, abs.y1)
      }
    }
  }
  // Root is at (0,0)
  walk(node, 0, 0)
}

/**
 * Find the first overlapping pair of leaves (strict area > 1) when a text node
 * is involved. Catches text-text AND text-image overlap; image-image and rect
 * overlap are allowed (a plate behind text is a legitimate design).
 */
function findOverlap(leaves: LeafInfo[]): string | null {
  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i]
      const b = leaves[j]
      const involvesText = a.kind === 'text' || b.kind === 'text'
      if (!involvesText) continue

      const area = intersectionArea(a.abs, b.abs)
      if (area > MIN_OVERLAP_AREA) {
        return (
          `Leaf overlap between "${a.part}" (${a.kind}) and "${b.part}" (${b.kind}) ` +
          `(${a.blockType} ${a.variant}): area=${area.toFixed(1)} sq units; ` +
          `[${a.abs.x1.toFixed(1)},${a.abs.y1.toFixed(1)}–${a.abs.x2.toFixed(1)},${a.abs.y2.toFixed(1)}] vs ` +
          `[${b.abs.x1.toFixed(1)},${b.abs.y1.toFixed(1)}–${b.abs.x2.toFixed(1)},${b.abs.y2.toFixed(1)}]`
        )
      }
    }
  }
  return null
}

/* ── block variants ──────────────────────────────────────────────────────── */

interface BlockVariant {
  label: string
  props: Record<string, unknown>
}

interface BlockCase {
  type: string
  layout: (props: Record<string, unknown>, ctx: ReturnType<typeof makeCtx>) => LayoutNode
  variants: BlockVariant[]
}

const defaultVariant = (def: {
  type: string
  defaults: Record<string, unknown>
}): BlockVariant => ({ label: 'defaults', props: { ...def.defaults } })

const cases: BlockCase[] = [
  {
    type: tlsCKpiTile.type,
    layout: tlsCKpiTile.layout as BlockCase['layout'],
    variants: [defaultVariant(tlsCKpiTile)],
  },
  {
    type: tlsCKpiRow.type,
    layout: tlsCKpiRow.layout as BlockCase['layout'],
    variants: [defaultVariant(tlsCKpiRow)],
  },
  {
    type: tlsCImageText.type,
    layout: tlsCImageText.layout as BlockCase['layout'],
    variants: (['left', 'right', 'top'] as const).map((placement) => ({
      label: `placement=${placement}`,
      props: { ...tlsCImageText.defaults, placement },
    })),
  },
  {
    type: tlsCComparison.type,
    layout: tlsCComparison.layout as BlockCase['layout'],
    variants: [defaultVariant(tlsCComparison)],
  },
  {
    type: tlsCAgenda.type,
    layout: tlsCAgenda.layout as BlockCase['layout'],
    variants: [defaultVariant(tlsCAgenda)],
  },
  {
    type: tlsCSteps.type,
    layout: tlsCSteps.layout as BlockCase['layout'],
    variants: (['horizontal', 'vertical'] as const).map((orientation) => ({
      label: `orientation=${orientation}`,
      props: { ...tlsCSteps.defaults, orientation },
    })),
  },
]

/* ── test suite ──────────────────────────────────────────────────────────── */

describe('composite geometry guard', () => {
  const sizes = [
    { label: '1920×1080', width: 1920, height: 1080 },
    { label: '960×540', width: 960, height: 540 },
  ]

  for (const blockCase of cases) {
    for (const variant of blockCase.variants) {
      for (const size of sizes) {
        const testName = `${blockCase.type} × ${variant.label} @ ${size.label}`

        it(`${testName} — all nodes within root`, () => {
          const ctx = makeCtx({ width: size.width, height: size.height }, registry)
          const node = blockCase.layout(variant.props, ctx)
          assertContainment(node, node.box.width, node.box.height)
        })

        it(`${testName} — no text overlap`, () => {
          const ctx = makeCtx({ width: size.width, height: size.height }, registry)
          const node = blockCase.layout(variant.props, ctx)

          const leaves: LeafInfo[] = []
          collectLeaves(node, 0, 0, blockCase.type, variant.label, leaves)

          expect(findOverlap(leaves)).toBeNull()
        })
      }
    }
  }
})
