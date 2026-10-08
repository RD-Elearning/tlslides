/**
 * The standard test suite every L1 (P1) block runs, written once.
 *
 * Covers (see reviews/blocks/block-library/P1-text-lists.md "Standard tests"): the example
 * validates, defaults lay out cleanly at `size.preferred` and `size.min`, every toggle removes its
 * part, `capacity()` flips to `fits: false` past the limit, no part leaves its box at preferred
 * size, layout is pure and never throws on hostile input, the block is wired into
 * `BUILT_IN_BLOCKS`, and DOM and SVG agree at medium size.
 *
 * Lives next to `test-helpers.ts` (not a `.spec.ts`) so `library/media` can reuse it.
 */

import type { BlockDefinition, LayoutNode, Size } from '../../types'
import { BlockRegistry } from '../../registry'
import { validateDeckSpec } from '../../validate-deck-spec'
import { BUILT_IN_BLOCKS, registerBuiltInBlocks } from '../index'
import { makeCtx, collectParts, TEST_TOKENS } from '../layout/test-helpers'

export { TEST_TOKENS }

export interface AbsBox {
  part?: string
  k: LayoutNode['k']
  x: number
  y: number
  width: number
  height: number
  node: LayoutNode
}

/**
 * Walk a tree and return every leaf with its absolute box. Nested groups follow the DOM rule
 * (children are relative to the group origin).
 */
export function absoluteLeaves(root: LayoutNode): AbsBox[] {
  const out: AbsBox[] = []
  const walk = (n: LayoutNode, ox: number, oy: number) => {
    const x = n.box.x + ox
    const y = n.box.y + oy
    if (n.k === 'group') {
      for (const c of n.children) walk(c, x, y)
      return
    }
    out.push({ part: n.part, k: n.k, x, y, width: n.box.width, height: n.box.height, node: n })
  }
  walk(root, 0, 0)
  return out
}

/** Every node (group, leaf) in a tree. */
export function allNodes(root: LayoutNode): LayoutNode[] {
  const out: LayoutNode[] = []
  const walk = (n: LayoutNode) => {
    out.push(n)
    if (n.k === 'group') n.children.forEach(walk)
  }
  walk(root)
  return out
}

/** Leaves whose part is `part` or `part[...]`/`part.…`. */
export function leavesOf(root: LayoutNode, part: string): AbsBox[] {
  return absoluteLeaves(root).filter(
    (l) => l.part === part || l.part?.startsWith(part + '[') || l.part?.startsWith(part + '.')
  )
}

/** Assert every box is finite and non-negative, and nothing is an error placeholder. */
export function assertWellFormed(root: LayoutNode): void {
  for (const n of allNodes(root)) {
    for (const v of [n.box.x, n.box.y, n.box.width, n.box.height]) {
      expect(Number.isFinite(v)).toBe(true)
    }
    expect(n.box.width).toBeGreaterThanOrEqual(0)
    expect(n.box.height).toBeGreaterThanOrEqual(0)
    expect(String(n.part ?? '')).not.toMatch(/error/i)
  }
}

/** Assert no leaf escapes `[0,width] x [0,height]` (±tol). */
export function assertContained(root: LayoutNode, box: Size, tol = 2): void {
  for (const l of absoluteLeaves(root)) {
    const where = `${l.part ?? l.k} @ (${Math.round(l.x)},${Math.round(l.y)} ${Math.round(l.width)}x${Math.round(l.height)}) in ${box.width}x${box.height}`
    expect([where, l.x >= -tol]).toEqual([where, true])
    expect([where, l.y >= -tol]).toEqual([where, true])
    expect([where, l.x + l.width <= box.width + tol]).toEqual([where, true])
    expect([where, l.y + l.height <= box.height + tol]).toEqual([where, true])
  }
}

/** Assert no two *text* leaves intersect (the F1-class guard). */
export function assertNoTextOverlap(root: LayoutNode, tol = 1): void {
  const leaves = absoluteLeaves(root).filter((l) => l.k === 'text')
  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i]
      const b = leaves[j]
      const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) - tol
      const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) - tol
      if (w > 0 && h > 0) {
        throw new Error(`text overlap: ${a.part} and ${b.part} (${w.toFixed(1)}x${h.toFixed(1)})`)
      }
    }
  }
}

function registry(): BlockRegistry {
  const r = new BlockRegistry()
  registerBuiltInBlocks(r)
  return r
}

export interface SuiteOpts {
  /** Props that must overflow the preferred box (capacity must say `fits: false`). */
  overflowProps?: Record<string, unknown>
  /** Skip the capacity block for blocks without a list slot. */
  noCapacity?: boolean
  /** Skip the browser parity probe. */
  noParity?: boolean
  /** Give the parity probe a registry (needed by composites that use `ctx.layoutChild`). */
  withRegistry?: boolean
  /** Props merged over defaults for the containment check (defaults to none). */
  containProps?: Record<string, unknown>
}

export function standardBlockSuite(def: BlockDefinition, opts: SuiteOpts = {}): void {
  const reg = registry()
  const pref: Size = { width: def.size.preferred[0], height: def.size.preferred[1] }
  const min: Size = { width: def.size.min[0], height: def.size.min[1] }
  const layout = (props: Record<string, unknown>, box: Size) => def.layout(props as any, makeCtx(box, reg))

  describe(`${def.type} — standard suite`, () => {
    it('is wired into BUILT_IN_BLOCKS and resolves in the registry', () => {
      expect(BUILT_IN_BLOCKS.some((b) => b.type === def.type)).toBe(true)
      expect(reg.get(def.type)?.type).toBe(def.type)
    })

    it('describe.example validates with no errors', () => {
      const findings = validateDeckSpec(
        {
          id: 'd',
          title: 'T',
          version: 1,
          aspect: 'widescreen',
          slides: [{ id: 's1', layout: 'blank', role: 'content', regions: { content: [def.describe!.example] } }],
          theme: 'coral-pop',
        } as any,
        reg
      )
      expect(findings.filter((f) => f.level === 'error')).toEqual([])
    })

    it('describe.avoid names an alternative block', () => {
      expect(def.describe!.avoid).toMatch(/tls\.[a-z]\.[a-z0-9-]+/)
      expect(def.describe!.when.length).toBeGreaterThan(10)
    })

    it.each([
      ['preferred', pref],
      ['min', min],
    ])('defaults lay out without error nodes at size.%s', (_label, box) => {
      const tree = layout(def.defaults as any, box as Size)
      assertWellFormed(tree)
    })

    it('defaults and the example fit the preferred box with no part overflowing it', () => {
      const tree = layout({ ...(def.defaults as any), ...(opts.containProps ?? {}) }, pref)
      assertWellFormed(tree)
      assertContained(tree, pref)
      assertNoTextOverlap(tree)
      const ex = layout(def.describe!.example.props as any, pref)
      assertContained(ex, pref)
      assertNoTextOverlap(ex)
    })

    it('is pure: two calls with identical input give identical trees', () => {
      const a = JSON.stringify(layout(def.defaults as any, pref))
      const b = JSON.stringify(layout(def.defaults as any, pref))
      expect(a).toBe(b)
    })

    it('never throws on hostile input (empty props, wrong types, huge text, tiny box)', () => {
      const long = 'w'.repeat(500)
      const cases: Array<Record<string, unknown>> = [
        {},
        { items: null, text: null },
        { items: [] },
        { items: [null, undefined, 7, {}] },
        { items: [long, long], text: long, term: long, definition: long, title: long },
        ...(Object.keys(def.schema)
          .filter((k) => def.schema[k].type.kind === 'enum')
          .map((k) => ({ ...(def.defaults as any), [k]: 'nonsense' })) as Array<Record<string, unknown>>),
      ]
      for (const props of cases) {
        for (const box of [pref, min, { width: 1, height: 1 }, { width: 0, height: 0 }]) {
          expect(() => assertWellFormed(layout(props, box))).not.toThrow()
        }
      }
    })

    const toggles = Object.entries(def.schema).filter(([, s]) => s.toggles)
    if (toggles.length > 0) {
      it.each(toggles.map(([key, s]) => [key, s.toggles!]))('toggle %s removes part "%s"', (key, part) => {
        const on = collectParts(layout({ ...(def.describe!.example.props as any), [key]: true }, pref))
        const off = collectParts(layout({ ...(def.describe!.example.props as any), [key]: false }, pref))
        const has = (list: string[]) => list.some((p) => p === part || p.startsWith(part + '[') || p.startsWith(part + '.'))
        expect(has(on)).toBe(true)
        expect(has(off)).toBe(false)
      })
    }

    if (!opts.noCapacity) {
      it('capacity() exists, fits for defaults, and reports fits:false past the limit', () => {
        expect(def.capacity).toBeDefined()
        const ctx = makeCtx(pref, reg)
        const ok = def.capacity!(def.defaults as any, pref, ctx)
        expect(ok.fits).toBe(true)
        expect(ok.remedy).toEqual([])
        const bad = def.capacity!({ ...(def.defaults as any), ...(opts.overflowProps ?? {}) } as any, pref, ctx)
        expect(bad.fits).toBe(false)
        expect(bad.remedy.length).toBeGreaterThan(0)
        for (const b of Object.values(bad.budget)) expect(b.used).toBeGreaterThan(0)
      })

      it('capacity() never throws on hostile input', () => {
        const ctx = makeCtx(pref, reg)
        for (const props of [{}, { items: null }, { items: [null, 3] }]) {
          expect(() => def.capacity!(props as any, pref, ctx)).not.toThrow()
        }
      })
    }

    if (!opts.noParity) {
      it('DOM and SVG agree at medium size (parity probe)', async () => {
        const { assertParity } = await import('../../parity-harness')
        // `withRegistry`: composites lay children out through `ctx.layoutChild`, empty without a registry.
        await assertParity(def, def.defaults as any, { width: 960, height: 540 }, undefined, opts.withRegistry ? { registry: reg } : undefined)
        await assertParity(def, def.describe!.example.props as any, { width: 960, height: 540 }, undefined, opts.withRegistry ? { registry: reg } : undefined)
      }, 60000)
    }
  })
}
