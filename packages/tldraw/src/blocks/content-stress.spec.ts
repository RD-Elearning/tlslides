/**
 * CS0 — content stress (`pipeline/contentStress.ts`, `reviews/blocks/content-stress/README.md`).
 * The generator is deterministic and follows the schema; the golden-brief run is a ratchet on how
 * many designs break with real-length content in the brief's language.
 */
import * as fs from 'fs'
import * as path from 'path'
import { designCapacity, plainText, runContentStress, soloDeck, soloProblems, stressSlide, STRESS_TEXT } from './pipeline/contentStress'
import type { StressCase } from './pipeline/contentStress'
import { deckLook, applyDeckLook } from './pipeline/variety'
import { findDesign } from './patterns'
import { recipeSlide } from './recipes'
import type { RecipeRole } from './recipes'
import { getDeckStyle } from './styles'
import type { BlockSpec, SlideSpec } from './types'
import { defaultBlockRegistry } from './validate-deck-spec'

const registry = defaultBlockRegistry()

function design(id: string, styleId: string): SlideSpec {
  const style = getDeckStyle(styleId)!
  const [rid, look] = id.split('/')
  const recipe = findDesign(rid)!
  return applyDeckLook(recipeSlide(recipe, registry, look, style), deckLook(style, 0), recipe, look)
}

const blocks = (s: SlideSpec): BlockSpec[] => Object.values(s.regions).flat()

describe('CS0 content stress — generator', () => {
  const bullets = design('content-bullets-image/base', 'corporate')
  const list = (s: SlideSpec) => (blocks(s).find((b) => b.type === 'tls.t.bullets')!.props as { items: Array<{ text: string }> }).items

  it('is deterministic and keeps ids, layout and knobs', () => {
    const a = stressSlide(bullets, registry, 'same', 'vi')
    const b = stressSlide(bullets, registry, 'same', 'vi')
    expect(a).toEqual(b)
    expect(a.layout).toBe(bullets.layout)
    expect(blocks(a).map((x) => x.id)).toEqual(blocks(bullets).map((x) => x.id))
  })

  it('`same` writes the target language at the example length, item counts unchanged', () => {
    const s = stressSlide(bullets, registry, 'same', 'vi')
    expect(list(s).length).toBe(list(bullets).length)
    const before = list(bullets)[0].text.length
    const after = list(s)[0].text
    expect(Math.abs(after.length - before)).toBeLessThanOrEqual(8)
    expect(STRESS_TEXT.vi.some((w) => after.toLowerCase().includes(w.toLowerCase().replace(/[.,]$/, '')))).toBe(true)
  })

  it('`items` and `min` take the guidance range (2–8 items for bullets), `over` goes past it', () => {
    expect(list(stressSlide(bullets, registry, 'items', 'en')).length).toBe(8)
    expect(list(stressSlide(bullets, registry, 'min', 'en')).length).toBe(2)
    expect(list(stressSlide(bullets, registry, 'over', 'en')).length).toBe(10)
  })

  it('`words` writes the guidance maximum: 12 words in a title, 8 in a bullet', () => {
    const s = stressSlide(bullets, registry, 'words', 'en')
    const title = plainText((blocks(s).find((b) => b.type === 'tls.t.title')!.props as { text: unknown }).text)
    expect(title.split(/\s+/).length).toBe(12)
    expect(list(s)[0].text.split(/\s+/).length).toBe(8)
  })

  it('leaves numerals and codes alone', () => {
    const marker = design('section-marker/base', 'corporate')
    const value = (s: SlideSpec) => (blocks(s).find((b) => b.type === 'tls.t.marker')!.props as { value: string }).value
    expect(value(stressSlide(marker, registry, 'same', 'vi'))).toBe(value(marker))
  })
})

describe('CS0 content stress — capacity', () => {
  it('reports the title and list capacity of a design, and the capacity is a promise', () => {
    const style = getDeckStyle('corporate')!
    const steps = design('process-steps/base', 'corporate')
    const cap = designCapacity(steps, style, registry, 'vi')
    expect(cap.baseline).toEqual([])
    expect(cap.title).toBeGreaterThanOrEqual(30)
    expect(cap.title).toBeLessThan(120)
    const l = cap.lists.find((x) => x.type === 'tls.c.steps')!
    // the schema allows 1–12 steps; this design holds fewer — what the fill prompt must say
    expect(l.range).toEqual([1, 12])
    expect(l.max).toBeGreaterThanOrEqual(3)
    expect(l.max).toBeLessThan(12)
    const at = (n: number) => {
      const s = stressSlide(steps, registry, 'same', 'vi')
      const b = blocks(s).find((x) => x.type === 'tls.c.steps')!
      const items = (b.props as { steps: unknown[] }).steps
      ;(b.props as { steps: unknown[] }).steps = Array.from({ length: n }, (_, i) => items[i % items.length])
      return soloProblems(soloDeck(s, style), registry)
    }
    expect(at(l.max)).toEqual([])
    expect(at(l.max + 1).length).toBeGreaterThan(0)
  })
})

describe('CS0 content stress — golden briefs (ratchet)', () => {
  const briefs = JSON.parse(fs.readFileSync(path.join(__dirname, '__fixtures__/golden-briefs.json'), 'utf8')).briefs as Array<{
    id: string
    lang: 'vi' | 'en'
    style: string
    expectedRoles: RecipeRole[]
    assets: Record<string, boolean>
  }>
  const cases: StressCase[] = briefs.map((b) => ({ id: b.id, style: getDeckStyle(b.style)!, lang: b.lang, roles: b.expectedRoles, assets: b.assets }))

  it('real-length content in the brief language: at most the recorded number of designs is not clean', () => {
    const rows = runContentStress(cases, registry, ['same'])
    expect(rows.length).toBeGreaterThan(800)
    const bad = rows.filter((r) => r.levels.same.length).map((r) => `${r.style}/${r.lang} ${r.design}`)
    // CS0 baseline 2026-10-11: 28. Lower it as CS1 fixes land; never raise it.
    expect(bad.length).toBeLessThanOrEqual(28)
  }, 120_000)
})
