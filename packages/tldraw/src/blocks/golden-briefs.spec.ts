/**
 * CMP5 — the golden briefs (`__fixtures__/golden-briefs.json`): real-shaped requests for the later
 * FastAPI eval (LLM-ARCHITECTURE §10). This spec keeps the data honest and checks the one thing
 * the engine can answer today: every role a brief's outline needs has designs the picker can offer
 * in that brief's style with that brief's assets.
 */
import * as fs from 'fs'
import * as path from 'path'
import { RECIPE_ROLES, assetsAllow, ASSET_KINDS } from './recipes'
import type { RecipeRole } from './recipes'
import { eligibleRecipes } from './pipeline/dryRun'
import { lookCandidates } from './pipeline/variety'
import { getDeckStyle } from './styles'
import { defaultBlockRegistry } from './validate-deck-spec'

/** LLM-ARCHITECTURE §3.1. */
const PROFILES = ['teach-lecture', 'keynote-pitch', 'business-report', 'workshop-training', 'academic-seminar', 'sales-product', 'status-update', 'story-portfolio']

interface Brief {
  id: string
  lang: 'vi' | 'en'
  profile: string
  style: string
  audience: string
  brief: string
  slidesTarget: number
  assets: Record<string, boolean>
  expectedRoles: string[]
  mustHave: string[]
  mustNot: string[]
}
const briefs = JSON.parse(fs.readFileSync(path.join(__dirname, '__fixtures__/golden-briefs.json'), 'utf8')) as { briefs: Brief[] }

describe('CMP5 golden briefs', () => {
  const list = briefs.briefs

  it('ten briefs, unique ids, both languages, every profile', () => {
    expect(list.length).toBe(10)
    expect(new Set(list.map((b) => b.id)).size).toBe(list.length)
    expect(list.filter((b) => b.lang === 'vi').length).toBeGreaterThanOrEqual(4)
    expect(list.filter((b) => b.lang === 'en').length).toBeGreaterThanOrEqual(4)
    for (const p of PROFILES) expect([p, list.some((b) => b.profile === p)]).toEqual([p, true])
  })

  it('each brief is well formed: real profile, style, roles, assets; the outline length is the slide target', () => {
    for (const b of list) {
      expect(PROFILES).toContain(b.profile)
      expect(getDeckStyle(b.style)).toBeDefined()
      expect(b.expectedRoles.length).toBe(b.slidesTarget)
      for (const r of b.expectedRoles) expect(RECIPE_ROLES).toContain(r)
      expect(Object.keys(b.assets).sort()).toEqual([...ASSET_KINDS].sort())
      expect(b.brief.length).toBeGreaterThan(60)
      expect(b.mustHave.length).toBeGreaterThan(0)
    }
  })

  it('every role a brief needs has at least two designs in its style with its assets', () => {
    const registry = defaultBlockRegistry()
    const thin: string[] = []
    for (const b of list) {
      const style = getDeckStyle(b.style)!
      for (const role of new Set(b.expectedRoles as RecipeRole[])) {
        const n = lookCandidates(eligibleRecipes(role, style, registry), style, registry).filter((c) => assetsAllow(c.recipe, c.variant, b.assets)).length
        if (n < 2) thin.push(`${b.id} ${role}: ${n}`)
      }
    }
    expect(thin).toEqual([])
  })
})
