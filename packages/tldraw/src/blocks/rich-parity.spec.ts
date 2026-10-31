/**
 * Rich-text parity: a `richText` slot draws the same characters whether it holds a markdown string
 * (`'**Mảng**: truy cập…'`) or a RichText object (`{ runs: [{ text: 'Mảng', bold: true }, …] }`).
 *
 * Both are valid values — the AI check tells the model to bold with runs — yet `tls.c.recap`
 * filtered its points with `strings()` and dropped every RichText point, so a recap the model had
 * bolded drew only its takeaway (spro deck 63550faa, slide 12). Every built-in is laid out with its
 * example and with its defaults, each twice — the second time with each richText value (top level,
 * in lists, in object fields) turned into runs — at the slide level and as the child of a
 * `tls.l.stack` (how a composed slide nests it), and the drawn text must match.
 */

import { BlockRegistry } from './registry'
import { registerBuiltInBlocks, BUILT_IN_BLOCKS } from './library'
import { createLayoutContext, layoutBlock } from './layout/layout-child'
import { TEST_TOKENS, TEST_SURFACE } from './library/layout/test-helpers'
import { allNodes } from './library/text/standard-suite'
import { parseStrong } from './library/text/_engine/rich'
import type { BlockDefinition, LayoutNode, SlotType } from './types'

const reg = new BlockRegistry()
registerBuiltInBlocks(reg)

const ctx = (w: number, h: number) =>
  createLayoutContext({ box: { width: w, height: h }, tokens: TEST_TOKENS, surface: TEST_SURFACE, registry: reg, resolveAsset: (id: string) => id })

const toRuns = (v: string) => ({ runs: parseStrong(v).map((s) => (s.strong ? { text: s.text, bold: true } : { text: s.text })) })

/** `value` with every string at a richText position of `type` turned into runs; whether one was. */
function enrich(type: SlotType, value: unknown): [unknown, boolean] {
  if (type.kind === 'richText') return typeof value === 'string' && value.trim() ? [toRuns(value), true] : [value, false]
  if (type.kind === 'list' && Array.isArray(value)) {
    let any = false
    const out = value.map((v) => {
      const [nv, changed] = enrich(type.of, v)
      any ||= changed
      return nv
    })
    return [out, any]
  }
  if (type.kind === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    let any = false
    const out: Record<string, unknown> = { ...(value as Record<string, unknown>) }
    for (const [name, slot] of Object.entries(type.fields)) {
      if (!(name in out)) continue
      const [nv, changed] = enrich(slot.type, out[name])
      out[name] = nv
      any ||= changed
    }
    return [out, any]
  }
  return [value, false]
}

/** All characters the tree draws, whitespace removed (line breaks may fall elsewhere with bold runs). */
const drawn = (tree: LayoutNode) =>
  allNodes(tree)
    .flatMap((n) => (n.k === 'text' ? n.lines.map((l) => l.text) : []))
    .join('')
    .replace(/\s+/g, '')

function enrichProps(def: BlockDefinition, props: Record<string, unknown>): Record<string, unknown> | undefined {
  let any = false
  const rich: Record<string, unknown> = { ...props }
  for (const [name, slot] of Object.entries(def.schema ?? {})) {
    if (!(name in rich)) continue
    const [nv, changed] = enrich(slot.type, rich[name])
    rich[name] = nv
    any ||= changed
  }
  return any ? rich : undefined
}

const copy = (v: unknown) => JSON.parse(JSON.stringify(v ?? {})) as Record<string, unknown>

const cases = BUILT_IN_BLOCKS.flatMap((def: BlockDefinition) => {
  if (typeof def.layout !== 'function') return []
  const sources = { example: def.describe?.example?.props, defaults: def.defaults }
  return Object.entries(sources).flatMap(([source, raw]) => {
    if (!raw) return []
    const props = copy(raw)
    const rich = enrichProps(def, props)
    return rich ? [{ name: `${def.type} (${source})`, def, props, rich }] : []
  })
})

const top = (def: BlockDefinition, props: Record<string, unknown>) => {
  const [w, h] = def.size.preferred
  return def.layout!({ ...(def.defaults as object), ...props } as any, ctx(w, h))
}

/** The block as the only child of a `tls.l.stack` at its preferred size. */
const nested = (def: BlockDefinition, props: Record<string, unknown>) => {
  const [w, h] = def.size.preferred
  return layoutBlock(reg.get('tls.l.stack')!, { gap: 'md', children: [{ id: 'b', type: def.type, props }] }, ctx(w, h))
}

describe('rich-text parity: a richText slot draws the same text as a string or as runs', () => {
  it('finds blocks with richText slots', () => {
    expect(cases.length).toBeGreaterThan(10)
  })
  for (const { name, def, props, rich } of cases) {
    it(`${name} at the slide level`, () => {
      expect(drawn(top(def, rich))).toBe(drawn(top(def, props)))
    })
    it(`${name} nested in a stack`, () => {
      expect(drawn(nested(def, rich))).toBe(drawn(nested(def, props)))
    })
  }
})
