/**
 * CMP1 — defaults sweep (composition README §2 CMP1 "Defaults", SURVEY F4).
 *
 * Schema `defaults` are never filled into a document's props (they are the gallery's sample
 * content), so every block must default its own option props. This sweep lays out every built-in
 * with its option slots removed — at the slide level and nested inside a container — and fails on
 * a throw, a NaN/undefined in the tree (`tls.t.takeaway` painted `fill: "undefined12"` and threw
 * in the report before CMP1), or a nested child that does not look like the same block at the top.
 *
 * It also pins that a deck style's knob defaults (`blockDefaults`) reach a nested child exactly as
 * they reach a slide-level block.
 */

import { BlockRegistry } from './registry'
import { registerBuiltInBlocks, BUILT_IN_BLOCKS } from './library'
import { createLayoutContext, layoutBlock } from './layout/layout-child'
import { resolveTokens } from './tokens'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import { BUILT_IN_STYLES, applyStyleBlockDefaults } from './styles'
import type { BlockDefinition, BlockSpec, LayoutNode, Size, SurfaceContext } from './types'

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)
const tokens = resolveTokens(DEFAULT_DECK_THEME)
const SURFACE: SurfaceContext = { behind: { type: 'solid', color: '#ffffff' }, luminance: 1, overImage: false }

/** The example (else the defaults) with every `option`-role slot removed. */
function withoutOptions(def: BlockDefinition): Record<string, unknown> {
  const base = (def.describe?.example?.props ?? def.defaults ?? {}) as Record<string, unknown>
  const props: Record<string, unknown> = JSON.parse(JSON.stringify(base))
  for (const [name, slot] of Object.entries(def.schema ?? {})) if (slot.role === 'option') delete props[name]
  return props
}

function sizeOf(def: BlockDefinition): Size {
  return { width: def.size.preferred[0], height: def.size.preferred[1] }
}

function badValues(node: LayoutNode): string[] {
  const json = JSON.stringify(node)
  const out: string[] = []
  if (/undefined|NaN|Infinity/.test(json)) out.push(json.match(/.{0,40}(undefined|NaN|Infinity).{0,20}/)?.[0] ?? 'bad value')
  if (json.includes('null')) {
    // `null` only appears for a non-finite number in JSON.stringify of a box.
    const walk = (n: LayoutNode): void => {
      for (const v of [n.box.x, n.box.y, n.box.width, n.box.height]) if (!Number.isFinite(v)) out.push(`non-finite box on ${n.k} ${n.part ?? ''}`)
      if (n.k === 'group') n.children.forEach(walk)
    }
    walk(node)
  }
  return out
}

/** A nested html host emits its colour `vars` by design (`html-block.ts` B1 H2) — compare without. */
function sansHostVars(node: LayoutNode): LayoutNode {
  if (node.k === 'host') {
    const { vars: _vars, ...rest } = node
    return rest as LayoutNode
  }
  if (node.k === 'group') return { ...node, children: node.children.map(sansHostVars) }
  return node
}

function topLevel(def: BlockDefinition, props: Record<string, unknown>, size: Size, blockDefaults?: Record<string, Record<string, unknown>>): LayoutNode {
  const ctx = createLayoutContext({ box: size, tokens, surface: SURFACE, registry, ...(blockDefaults ? { blockDefaults } : {}) })
  return layoutBlock(def, props, ctx)
}

/** The same block as the only child of a `tls.l.stack` at the same size (wrapper group dropped). */
function nested(spec: BlockSpec, size: Size, blockDefaults?: Record<string, Record<string, unknown>>): LayoutNode {
  const stack = registry.get('tls.l.stack')!
  const ctx = createLayoutContext({ box: size, tokens, surface: SURFACE, registry, ...(blockDefaults ? { blockDefaults } : {}) })
  const root = layoutBlock(stack, { gap: 'md', children: [spec] }, ctx)
  const wrapper = (root as Extract<LayoutNode, { k: 'group' }>).children[0] as Extract<LayoutNode, { k: 'group' }>
  return wrapper.children[0]
}

describe('CMP1 defaults sweep — every built-in lays out with its option slots removed', () => {
  const defs = BUILT_IN_BLOCKS.filter((d) => d.layout)

  it('covers every built-in', () => {
    expect(defs.length).toBeGreaterThanOrEqual(120)
  })

  it.each(defs.map((d) => [d.type, d] as const))('%s: top level, no throw, no undefined/NaN', (_type, def) => {
    const props = withoutOptions(def)
    let node: LayoutNode | undefined
    expect(() => {
      node = topLevel(def, props, sizeOf(def))
    }).not.toThrow()
    expect(badValues(node!)).toEqual([])
  })

  it.each(defs.filter((d) => d.scope !== 'slide').map((d) => [d.type, d] as const))(
    '%s: nested in a container lays out like the same block at the top',
    (_type, def) => {
      const props = withoutOptions(def)
      const size = sizeOf(def)
      const spec: BlockSpec = { id: 'sweep', type: def.type, props }
      let inner: LayoutNode | undefined
      expect(() => {
        inner = nested(spec, size)
      }).not.toThrow()
      expect(badValues(inner!)).toEqual([])
      expect(sansHostVars(inner!)).toEqual(topLevel(def, props, size))
    }
  )
})

describe('CMP1 — a deck style’s knob defaults reach a nested child as they reach the top', () => {
  const cases: Array<[string, string]> = []
  for (const style of BUILT_IN_STYLES) for (const type of Object.keys(style.blockDefaults)) if (registry.get(type)?.scope !== 'slide') cases.push([style.id, type])

  it('has cases', () => {
    expect(cases.length).toBeGreaterThan(0)
  })

  it.each(cases)('%s / %s', (styleId, type) => {
    const style = BUILT_IN_STYLES.find((s) => s.id === styleId)!
    const def = registry.get(type)!
    const props = withoutOptions(def)
    const size = sizeOf(def)
    const spec: BlockSpec = { id: 'sweep', type, props }
    const filled = applyStyleBlockDefaults(spec, style.blockDefaults).block.props
    expect(sansHostVars(nested(spec, size, style.blockDefaults))).toEqual(topLevel(def, filled, size))
  })
})
