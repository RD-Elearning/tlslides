/**
 * CMP4 — every composition pattern is a known-good design in every deck style
 * (`reviews/blocks/composition/README.md` CMP4): each look validates, the layout oracle reports 0
 * errors and 0 warnings, the quality gate (fill, regions, lead type, the CMP2 design checks
 * incl. contrast) has nothing to say, and every look is a design of its own (look signature).
 */

import { registerBuiltInBlocks } from './library'
import { BlockRegistry } from './registry'
import { COMPOSITION_PATTERNS, PATTERN_RECIPES, findDesign } from './patterns'
import { RECIPES, RECIPE_ROLES, recipeSlide, variantIds, eachBlock } from './recipes'
import { lookSignature } from './pipeline/variety'
import { eligibleRecipes, prefixIds } from './pipeline/dryRun'
import { slideQuality, deckTitleSize } from './pipeline/quality'
import { BUILT_IN_STYLES, getDeckStyle } from './styles'
import { SLIDE_LAYOUTS } from './slide-layouts'
import { resolveTokens } from './tokens'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import { validateDeckSpec } from './validate-deck-spec'
import { analyzeDeck } from './layout-report'
import { MAX_NESTING_DEPTH } from './types'
import type { DeckSpec } from './types'

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)
const tokens = resolveTokens(DEFAULT_DECK_THEME)

describe('CMP4 composition patterns', () => {
  it('has ids unique across recipes and patterns, a reference rule each, and a pattern for the thin roles', () => {
    const ids = [...RECIPES.map((r) => r.id), ...COMPOSITION_PATTERNS.map((p) => p.id)]
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of COMPOSITION_PATTERNS) {
      expect(p.ref.length).toBeGreaterThan(4)
      expect(RECIPE_ROLES).toContain(p.role)
      expect(findDesign(p.id)?.compose).toBeDefined()
    }
    for (const role of ['cover', 'agenda', 'section', 'people', 'closing'] as const) expect(COMPOSITION_PATTERNS.some((p) => p.role === role)).toBe(true)
  })

  it('every role has at least 8 designs in every style (recipes, patterns, their looks)', () => {
    for (const s of BUILT_IN_STYLES) {
      const style = getDeckStyle(s.id)!
      for (const role of RECIPE_ROLES) {
        const designs = eligibleRecipes(role, style, registry).flatMap((r) => variantIds(r))
        expect([s.id, role, designs.length >= 8]).toEqual([s.id, role, true])
      }
    }
  })

  for (const recipe of PATTERN_RECIPES) {
    describe(`pattern "${recipe.id}"`, () => {
      it('names a real layout, uses only its regions and registered blocks, nests at most 3 levels', () => {
        const layout = SLIDE_LAYOUTS.find((l) => l.id === recipe.layout)
        expect(layout).toBeDefined()
        const regions = Object.keys(layout!.compile({ width: 1920, height: 1080 }, tokens))
        for (const look of variantIds(recipe)) {
          const slide = recipeSlide(recipe, registry, look)
          for (const r of Object.keys(slide.regions ?? {})) expect(regions).toContain(r)
          eachBlock(slide.regions ?? {}, (b) => expect([b.type, !!registry.get(b.type)]).toEqual([b.type, true]))
          // the LLM-authored limit (CMP2 `nesting/too-deep`): region block = level 1
          const depth = (bs: unknown[], d: number): number =>
            Math.max(d, ...(bs as Array<{ props?: { children?: unknown[] } }>).map((b) => (Array.isArray(b.props?.children) ? depth(b.props!.children!, d + 1) : d)))
          for (const bs of Object.values(slide.regions ?? {})) expect(depth(bs, 1)).toBeLessThanOrEqual(Math.min(3, MAX_NESTING_DEPTH))
        }
      })

      it('every look is a design of its own', () => {
        const sigs = variantIds(recipe).map((look) => lookSignature(recipeSlide(recipe, registry, look), undefined, registry))
        expect(new Set(sigs).size).toBe(sigs.length)
      })

      it('every look is clean in all ten styles: valid, 0 oracle errors and warnings, quality gate silent', () => {
        const bad: string[] = []
        for (const s of BUILT_IN_STYLES) {
          const style = getDeckStyle(s.id)!
          for (const look of variantIds(recipe)) {
            const slide = { ...prefixIds(recipeSlide(recipe, registry, look, style), 's01'), id: 's01' }
            const deck: DeckSpec = { version: 1, id: `p-${recipe.id}`, title: 'p', theme: style.palettes[0].id, style: style.id, aspect: 'widescreen', slides: [slide] }
            const report = analyzeDeck(deck, { registry, llmAuthored: true })[0]
            const q = slideQuality(report, { titleSize: deckTitleSize(deck) })
            const found = [
              ...validateDeckSpec(deck, registry).filter((f) => f.level === 'error' || f.level === 'warning').map((f) => `validate ${f.rule}`),
              ...report.findings.filter((f) => f.severity !== 'info').map((f) => `${f.severity} ${f.code}`),
              ...q.findings.map((f) => `quality ${f.code}`),
            ]
            for (const f of found) bad.push(`${s.id} ${recipe.id}/${look}: ${f}`)
          }
        }
        expect(bad).toEqual([])
      }, 60000)
    })
  }
})
