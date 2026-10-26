/**
 * spro creative CR2 — every variant preset (`block-variants.ts`) is a working design: the block's
 * own example with the preset's knobs, alone on a slide, validates and the layout oracle reports
 * no error, in four styles of different families (minimal, doodle, editorial, gradient).
 */

import { BUILT_IN_BLOCKS, registerBuiltInBlocks } from './index'
import { BlockRegistry } from '../registry'
import { validateDeckSpec } from '../validate-deck-spec'
import { analyzeDeck } from '../layout-report'
import { getDeckStyle } from '../styles'
import type { DeckSpec, SlideSpec } from '../types'

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)
const STYLES = ['minimal', 'doodle', 'editorial', 'gradient']

function deckOf(style: string, slides: SlideSpec[]): DeckSpec {
  const theme = getDeckStyle(style)!.palettes[0].id
  return { version: 1, id: `variants-${style}`, title: 'Variants', theme, style, aspect: 'widescreen', slides } as DeckSpec
}

describe('creative CR2 variant presets', () => {
  const withVariants = BUILT_IN_BLOCKS.filter((d) => d.variants?.length && d.describe?.example)

  it('covers every block that has presets', () => {
    expect(withVariants.length).toBeGreaterThan(100)
  })

  for (const def of withVariants) {
    it(`"${def.type}": every preset renders clean in ${STYLES.join(', ')}`, () => {
      const ex = def.describe!.example!
      const slides: SlideSpec[] = def.variants!.map((p) => ({
        id: `v-${p.id}`,
        layout: 'blank',
        regions: { content: [{ ...ex, id: `b-${p.id}`, props: { ...ex.props, ...p.knobs } }] },
      }) as SlideSpec)
      const bad: string[] = []
      for (const style of STYLES) {
        const deck = deckOf(style, slides)
        for (const f of validateDeckSpec(deck, registry)) if (f.level === 'error') bad.push(`${style} validate ${f.rule} ${f.path}`)
        analyzeDeck(deck, { registry }).forEach((r) => {
          for (const f of r.findings) if (f.severity === 'error') bad.push(`${style} ${r.slideId} ${f.code}`)
        })
      }
      expect(bad).toEqual([])
    })
  }
})
