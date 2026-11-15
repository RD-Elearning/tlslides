/**
 * spro sprint 2026-11b S11-C — every v2 composition pattern is a known-good design in every deck style:
 * grammar-clean (no finding, not even a warning), valid, 0 oracle errors and warnings, quality gate
 * silent, each look a design of its own, and none of them in the picker's designs.
 */
import { registerBuiltInBlocks } from './library'
import { BlockRegistry } from './registry'
import { COMPOSITION_PATTERNS_V2, PATTERN_V2_RECIPES } from './patterns-v2'
import { ALL_DESIGNS, COMPOSITION_PATTERNS } from './patterns'
import { RECIPES, recipeSlide, variantIds } from './recipes'
import { lookSignature } from './pipeline/variety'
import { prefixIds } from './pipeline/dryRun'
import { slideQuality, deckTitleSize } from './pipeline/quality'
import { BUILT_IN_STYLES, getDeckStyle } from './styles'
import { validateDeckSpec } from './validate-deck-spec'
import { analyzeDeck } from './layout-report'
import { checkGrammar } from './composition-grammar'
import type { DeckSpec } from './types'

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)

describe('S11 composition patterns v2', () => {
  it('twelve patterns, ids unique against every design, a slides-skill idiom each, not offered to the picker', () => {
    expect(COMPOSITION_PATTERNS_V2).toHaveLength(12)
    const ids = [...RECIPES.map((r) => r.id), ...COMPOSITION_PATTERNS.map((p) => p.id), ...COMPOSITION_PATTERNS_V2.map((p) => p.id)]
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of COMPOSITION_PATTERNS_V2) expect(p.ref).toMatch(/^slides-skill: /)
    for (const p of COMPOSITION_PATTERNS_V2) expect(ALL_DESIGNS.some((d) => d.id === p.id)).toBe(false)
  })

  for (const recipe of PATTERN_V2_RECIPES) {
    describe(`pattern "${recipe.id}"`, () => {
      it('is grammar-clean in every look', () => {
        for (const look of variantIds(recipe)) {
          const slide = recipeSlide(recipe, registry, look)
          expect([look, checkGrammar(slide, registry).map((f) => `${f.level} ${f.rule} ${f.message}`)]).toEqual([look, []])
        }
      })

      it('every look is a design of its own', () => {
        const sigs = variantIds(recipe).map((look) => lookSignature(recipeSlide(recipe, registry, look), undefined, registry))
        expect(new Set(sigs).size).toBe(sigs.length)
      })

      it('every look is clean in all styles: valid, 0 oracle errors and warnings, quality gate silent', () => {
        const bad: string[] = []
        for (const s of BUILT_IN_STYLES) {
          const style = getDeckStyle(s.id)!
          for (const look of variantIds(recipe)) {
            const slide = { ...prefixIds(recipeSlide(recipe, registry, look, style), 's01'), id: 's01' }
            const deck: DeckSpec = { version: 1, id: `p-${recipe.id}`, title: 'p', theme: style.palettes[0].id, style: style.id, aspect: 'widescreen', slides: [slide] }
            const report = analyzeDeck(deck, { registry, llmAuthored: true })[0]
            const q = slideQuality(report, { titleSize: deckTitleSize(deck) })
            const found = [
              ...validateDeckSpec(deck, registry).filter((f) => f.level === 'error' || f.level === 'warning').map((f) => `validate ${f.rule} ${f.message}`),
              ...report.findings.filter((f) => f.severity !== 'info').map((f) => `${f.severity} ${f.code} ${f.message}`),
              ...q.findings.map((f) => `quality ${f.code} ${f.message}`),
            ]
            for (const f of found) bad.push(`${s.id} ${recipe.id}/${look}: ${f}`)
          }
        }
        expect(bad).toEqual([])
      }, 120000)
    })
  }
})
