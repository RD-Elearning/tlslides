/**
 * AC0 — every slide recipe is a known-good starting point: real layout, real regions, tier-1
 * blocks, valid knobs, and filled from each block's `describe.example` it validates and
 * `analyzeSlide` reports 0 errors and 0 warnings (`reviews/blocks/ai-curation/README.md` §5.1).
 */

import { registerBuiltInBlocks } from './library'
import { BlockRegistry } from './registry'
import { RECIPES, RECIPE_ROLES, recipeLine, recipeSlide, recipesFor } from './recipes'
import { SLIDE_LAYOUTS } from './slide-layouts'
import { resolveTokens } from './tokens'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import { validateDeckSpec } from './validate-deck-spec'
import { analyzeSlide } from './layout-report'
import type { DeckSpec } from './types'

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)
const tokens = resolveTokens(DEFAULT_DECK_THEME)

describe('AC0 slide recipes', () => {
  it('has unique ids and covers every planner role', () => {
    const ids = RECIPES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const role of RECIPE_ROLES) expect(recipesFor(role).length).toBeGreaterThan(0)
    expect(RECIPES.length).toBeGreaterThanOrEqual(24)
  })

  for (const recipe of RECIPES) {
    describe(`recipe "${recipe.id}"`, () => {
      const slide = recipeSlide(recipe, registry)

      it('names a real layout and only its regions', () => {
        const layout = SLIDE_LAYOUTS.find((l) => l.id === recipe.layout)
        expect(layout).toBeDefined()
        const regions = Object.keys(layout!.compile({ width: 1920, height: 1080 }, tokens))
        for (const r of Object.keys(recipe.regions)) expect(regions).toContain(r)
      })

      it('uses tier-1 blocks with enum/boolean look knobs', () => {
        for (const blocks of Object.values(recipe.regions)) {
          for (const blk of blocks) {
            const def = registry.get(blk.type)
            expect(def?.aiTier).toBe(1)
            for (const k of Object.keys(blk.knobs ?? {})) {
              const kind = def!.schema[k]?.type.kind
              expect(['enum', 'boolean']).toContain(kind)
            }
          }
        }
      })

      it('validates as a deck with no errors', () => {
        const deck: DeckSpec = { version: 1, id: `recipe-${recipe.id}`, title: recipe.id, theme: 'mono-grid', aspect: 'widescreen', slides: [slide] }
        expect(validateDeckSpec(deck, registry).filter((f) => f.level === 'error')).toEqual([])
      })

      it('analyzeSlide reports 0 errors and 0 warnings with the examples', () => {
        const report = analyzeSlide(slide, { registry })
        const bad = report.findings.filter((f) => f.severity !== 'info').map((f) => `${f.severity} ${f.code}: ${f.message}`)
        expect(bad).toEqual([])
      })
    })
  }

  // AC1.5 — a recipe is the AI's starting point, so it must also be balanced: no big empty band
  // below the content (`layout/unbalanced`) and no large declared region left empty
  // (`region/empty`). A left-aligned single number may leave the right side open by design; that
  // recipe is named here and may only carry the side variant.
  const SIDE_OPEN_BY_DESIGN = new Set(['data-big-stat'])
  for (const recipe of RECIPES) {
    it(`recipe "${recipe.id}" is balanced with the examples (no layout/unbalanced, no region/empty)`, () => {
      const report = analyzeSlide(recipeSlide(recipe, registry), { registry })
      const bad = report.findings
        .filter((f) => f.code === 'region/empty' || f.code === 'layout/unbalanced')
        .filter((f) => !(SIDE_OPEN_BY_DESIGN.has(recipe.id) && f.code === 'layout/unbalanced' && f.message.startsWith('content ends at x')))
        .map((f) => `${f.code}: ${f.message}`)
      expect(bad).toEqual([])
    })
  }

  // AC2 part 2 — the centred `timeline` region (AC1.5) hides a slide whose stack is small for its
  // region: no band below, but title, empty band, a thin block, empty band. `layout/unbalanced`
  // cannot see it, so the recipes gate measures how much of its region the stack paints (first
  // painted top to last painted bottom ÷ region height). Recipes whose blocks size to the room
  // (kpi-row display tier, roadmap roomy tier, …) must fill ≥ 55%; before AC2 part 2 kpi-row and
  // roadmap with their takeaways painted ~51% and failed. The rest is a ratchet: the named sparse
  // recipes may not grow in number and nothing else may drop below 50%.
  const regionFill = (id: string): number => {
    const recipe = RECIPES.find((r) => r.id === id)!
    const report = analyzeSlide(recipeSlide(recipe, registry), { registry })
    const main = Object.keys(recipe.regions).filter((r) => r !== 'title')
    let best = 0
    for (const name of main) {
      const box = report.regions[name]
      const painted = report.blocks.filter((b) => b.region === name && b.painted && b.layer !== 'backdrop').map((b) => b.painted!)
      if (!box || painted.length === 0) continue
      const top = Math.min(...painted.map((p) => p.y))
      const bottom = Math.max(...painted.map((p) => p.y + p.height))
      best = Math.max(best, (bottom - top) / box.height)
    }
    return best
  }
  const FILLS_ITS_REGION = ['data-kpi-row', 'process-roadmap', 'content-cards', 'comparison-pricing', 'data-chart-insight', 'data-stat-spotlight']
  for (const id of FILLS_ITS_REGION) {
    it(`recipe "${id}" fills at least 55% of its region`, () => {
      expect(regionFill(id)).toBeGreaterThanOrEqual(0.55)
    })
  }
  it('sparse titled recipes (stack < 50% of its region) do not grow in number', () => {
    const KNOWN_SPARSE = [
      'agenda-full', 'content-feature-grid', 'data-table', 'comparison-options', 'comparison-pros-cons', 'comparison-before-after',
      'comparison-table', 'process-steps', 'process-chevrons', 'process-timeline', 'people-team',
    ]
    const titled = RECIPES.filter((r) => r.regions.title && r.layout === 'timeline')
    const sparse = titled.filter((r) => regionFill(r.id) < 0.5).map((r) => r.id)
    for (const id of sparse) expect(KNOWN_SPARSE).toContain(id)
  })

  it('recipeLine is compact and names the knobs', () => {
    const line = recipeLine(RECIPES.find((r) => r.id === 'cover-split-image')!)
    expect(line).toBe('cover-split-image · blank — content: tls.c.cover(variant=split,showImage=true) — opener with a photo or product shot')
    expect(recipeLine(RECIPES.find((r) => r.id === 'data-table')!)).toBe(
      'data-table · timeline+title — timeline: tls.d.table + tls.t.footnote — exact values in rows, with a source'
    )
    expect(recipeLine(RECIPES.find((r) => r.id === 'section-title')!)).toBe('section-title · section+title — title only — quiet section break')
  })
})
