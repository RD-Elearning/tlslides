/**
 * spro creative CR8 — the shared spec of a wave-1 block: the standard suite (registry, example,
 * defaults at preferred/min size, purity, hostile input, capacity, DOM/SVG parity), then every
 * variant at a wide and a narrow box with long content: the named parts shown, contained, no text
 * overlap, depth capped; and a slide-scope compile.
 */
import type { BlockDefinition, BlockSpec } from '../../types'
import { standardBlockSuite, assertContained, assertNoTextOverlap } from '../text/standard-suite'
import { depthOk, layoutAt, hasPart, slideScopeCompiles } from './composite-test'

export interface Wave1Case {
  def: BlockDefinition
  build: (props: any) => BlockSpec
  /** Props that break capacity (the standard suite's overflow). */
  overflow: Record<string, unknown>
  /** The variant slot and its values. */
  variants?: { slot: string; values: string[] }
  /** Long but valid content, laid out in every variant. */
  long: Record<string, unknown>
  /** Parts every variant shows. */
  parts: string[]
  category: string
  scope?: string
}

export function wave1Suite(c: Wave1Case): void {
  standardBlockSuite(c.def, { withRegistry: true, overflowProps: c.overflow })
  const EX = c.def.describe!.example.props as Record<string, unknown>
  describe(`${c.def.type} (wave 1)`, () => {
    it('is a slide-scope composite of its category', () => {
      expect(c.def.scope).toBe(c.scope ?? 'slide')
      expect(c.def.category).toBe(c.category)
    })
    it('every variant shows its parts, contained, with no text overlap, at two sizes', () => {
      for (const v of c.variants?.values ?? ['']) {
        for (const [w, h] of [[1600, 800], [960, 540]]) {
          const props = { ...EX, ...c.long, ...(c.variants ? { [c.variants.slot]: v } : {}) }
          const t = layoutAt(c.def, props, w, h)
          for (const p of c.parts) expect([v, p, hasPart(t, p)]).toEqual([v, p, true])
          assertContained(t, { width: w, height: Math.max(h, t.box.height) })
          assertNoTextOverlap(t)
          depthOk(c.def, c.build, props, w, h)
        }
      }
    })
    if ((c.scope ?? 'slide') === 'slide') {
      it('the example compiles in a blank region, inside the frame', () => {
        slideScopeCompiles(c.def, 'blank', 'content')
      })
    }
  })
}
