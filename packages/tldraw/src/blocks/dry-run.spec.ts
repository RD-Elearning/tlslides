/**
 * AC7 — the scripted pipeline dry run (`pipeline/dryRun.ts`, CLI `tools/layout-report/dry-run.js`)
 * yields clean decks and a S2a prompt inside the 16k ceiling (`reviews/blocks/ai-curation/README.md` §5.2).
 */
import { DRY_RUN_ASSETS, DRY_RUN_OUTLINE, PROMPT_BUDGET, runDryRun, runStyle, runVariety, shortenHeadline, signatureDiffer } from './pipeline/dryRun'
import { QUALITY_GATE, deckQuality, slideQuality } from './pipeline/quality'
import { analyzeDeck } from './layout-report'
import { RECIPES, assetsAllow, composedSlide, designNeeds } from './recipes'
import { findDesign } from './patterns'
import { hashString, lookSignature, seedStride } from './pipeline/variety'
import { defaultBlockRegistry } from './validate-deck-spec'
import { getDeckStyle } from './styles'

describe('AC7 dry run', () => {
  const results = runDryRun(['corporate', 'doodle'])

  for (const r of results) {
    describe(`style ${r.style}`, () => {
      it('builds the 12-slide outline with 0 errors and 0 warnings', () => {
        expect(r.slides).toBe(DRY_RUN_OUTLINE.length)
        expect(r.deck.style).toBe(r.style)
        expect(r.findings).toEqual([])
        expect(r.errors).toBe(0)
        expect(r.warnings).toBe(0)
      })

      it('does not repeat a recipe on neighbouring slides', () => {
        for (let i = 1; i < r.recipes.length; i++) expect(r.recipes[i]).not.toBe(r.recipes[i - 1])
      })

      it('keeps the S2a prompt (recipes of the slide\'s own role) inside the 16k ceiling', () => {
        expect(r.promptPerRole.total).toBeLessThanOrEqual(PROMPT_BUDGET.total)
        expect(r.prompt.total).toBeGreaterThan(r.promptPerRole.total)
      })
    })
  }

  it('shortens a headline to its leading words', () => {
    expect(shortenHeadline('Expanding Pulse analytics to mid-market teams')).toBe('Expanding Pulse analytics to')
    expect(shortenHeadline('Agenda')).toBe('Agenda')
  })

  it('repairs a slide whose headline overflows, and logs it', () => {
    const long = 'word '.repeat(60).trim()
    const outline = DRY_RUN_OUTLINE.map((e, i) => (i === 3 ? { ...e, headline: long } : e))
    // the recipes alone (CMP4: a composition pattern may hold the long headline without a repair)
    const r = runStyle(getDeckStyle('corporate')!, 0, { outline, patterns: false })
    expect(r.repairs.some((x) => x.slide === 4)).toBe(true)
    expect(r.repairs.filter((x) => x.slide === 4).length).toBeLessThanOrEqual(3)
  })
})

// AC8 — the variety picker: N = 3 seeds × the ten styles (`reviews/blocks/ai-curation/README.md` §8.4).
describe('AC8 variety', () => {
  const reports = runVariety()

  it('runs every style with three seeds, 0 errors and 0 warnings in every deck', () => {
    expect(reports).toHaveLength(10)
    for (const v of reports) {
      expect(v.runs.map((r) => r.seed)).toEqual([1, 2, 3])
      for (const r of v.runs) expect([v.style, r.seed, r.findings]).toEqual([v.style, r.seed, []])
    }
  })

  it('repeats no look signature inside a deck while the role has another design', () => {
    for (const v of reports) for (const r of v.runs) expect([v.style, r.seed, r.avoidableRepeats]).toEqual([v.style, r.seed, 0])
  })

  it('makes the three seeds of a style differ on at least 70% of the slides', () => {
    for (const v of reports) expect([v.style, v.minDiffer >= 0.7]).toEqual([v.style, true])
  })

  it('is deterministic: the same seed gives the same deck', () => {
    const again = runStyle(getDeckStyle(reports[0].style)!, 0, { seed: 1 })
    expect(again.signatures).toEqual(reports[0].runs[0].signatures)
    expect(again.deck).toEqual(reports[0].runs[0].deck)
  })

  it('keeps one title treatment per deck (the deck look)', () => {
    const registry = defaultBlockRegistry()
    for (const v of reports) {
      for (const r of v.runs) {
        r.deck.slides.forEach((s, i) => {
          // AC8.6: a knob the slide's own design sets wins (applyDeckLook's contract; section-title
          // sets its display title's align and rule) and must then hold the design's value.
          const [rid, vid] = r.designs[i].split('/')
          const recipe = findDesign(rid)!
          const variant = recipe.variants?.find((x) => x.id === vid)
          // CMP4: a pattern's own title props are what it sets
          const composed = recipe.compose ? ((Object.values(composedSlide(recipe, vid).regions).flat().find((b) => b.type === 'tls.t.title')?.props ?? {}) as Record<string, unknown>) : undefined
          const own = composed ?? { ...(Object.values(recipe.regions).flat().find((b) => b.type === 'tls.t.title')?.knobs ?? {}), ...(variant?.knobs?.['tls.t.title'] ?? {}) }
          const titles = Object.values(s.regions ?? {}).flat().filter((b) => b.type === 'tls.t.title')
          for (const t of titles) {
            for (const [k, val] of Object.entries(r.deckLook.title)) expect((t.props as Record<string, unknown>)[k]).toBe(k in own ? own[k] : val)
          }
        })
      }
      expect(registry.get('tls.t.title')).toBeDefined()
    }
  })

  it('honours avoidSignatures: a chained run moves away from the earlier decks', () => {
    const chained = runVariety(['corporate'], { chainAvoid: true })[0]
    const first = new Set(chained.runs[0].signatures)
    const overlap = chained.runs[1].signatures.filter((s) => first.has(s)).length
    expect(overlap).toBe(0)
    expect(chained.runs[1].findings).toEqual([])
  })

  it('signature ignores content and sees knobs and layout', () => {
    const registry = defaultBlockRegistry()
    const a = reports[0].runs[0].deck.slides[3]
    const words = JSON.parse(JSON.stringify(a))
    for (const b of Object.values(words.regions).flat() as Array<{ props: Record<string, unknown> }>) if (typeof b.props.text === 'string') b.props.text = 'Other words'
    expect(lookSignature(words, undefined, registry)).toBe(lookSignature(a, undefined, registry))
    expect(lookSignature({ ...a, layout: 'blank' }, undefined, registry)).not.toBe(lookSignature(a, undefined, registry))
    expect(signatureDiffer(['a', 'b'], ['a', 'c'])).toBe(0.5)
  })

  it('seed stride reaches every candidate and moves seeds 1-3 to other recipes', () => {
    for (let k = 2; k <= 24; k++) {
      const s = seedStride(k, 3)
      const seen = new Set<number>()
      for (let i = 0; i < k; i++) seen.add((i * s) % k)
      expect(seen.size).toBe(k)
    }
    expect(hashString('corporate|cover')).toBe(hashString('corporate|cover'))
  })
})

// AC8.5 — the deck-level quality gate (`pipeline/quality.ts`, README §8.9) and the content-asset
// input of the picker. The gate runs on the dry-run decks themselves, not only on recipe examples.
describe('AC8.5 quality gate and assets', () => {
  const reports = runVariety(['corporate', 'luxury', 'doodle', 'consulting'])

  it('every slide of 4 styles x 3 seeds passes the quality gate (fill, region fill, lead type)', () => {
    for (const v of reports) {
      for (const r of v.runs) {
        expect([v.style, r.seed, r.qualityFindings]).toEqual([v.style, r.seed, []])
        // the gate the run reports is the one deckQuality computes from the finished deck
        expect(deckQuality(r.deck).flatMap((q) => q.findings)).toEqual([])
        expect(r.quality).toHaveLength(r.slides)
        for (const q of r.quality) expect(q.fill).toBeGreaterThanOrEqual(QUALITY_GATE.displayFill)
      }
    }
  })

  it('variety still holds with the gate: >= 70% of slides differ between seeds, no avoidable repeat', () => {
    for (const v of reports) {
      expect([v.style, v.minDiffer >= 0.7]).toEqual([v.style, true])
      expect([v.style, v.avoidableRepeats]).toEqual([v.style, 0])
    }
  })

  it('flags a sparse slide: a title-size line alone on a blank page', () => {
    const deck = { version: 1 as const, id: 'q', title: 'q', theme: 'corporate-navy', style: 'corporate', aspect: 'widescreen' as const, slides: [
      { id: 'a', layout: 'blank', role: 'content' as const, regions: { content: [{ id: 'a1', type: 'tls.t.statement', props: { text: 'One short line.', size: 'lg' } }] } },
    ] }
    const [q] = deckQuality(deck)
    expect(q.findings.map((f) => f.code)).toContain('quality/sparse')
    expect(q.findings.map((f) => f.code)).toContain('quality/small-type')
  })

  it('flags a thin region: three short bullets beside a full-height photo, body size', () => {
    const slide = { id: 'b', layout: 'two-column', role: 'content' as const, regions: {
      title: [{ id: 'b1', type: 'tls.t.title', props: { text: { runs: [{ text: 'Points' }] } } }],
      left: [{ id: 'b2', type: 'tls.t.bullets', props: { items: [{ text: 'Revenue up 42% YoY' }, { text: 'Enterprise APAC drove growth' }, { text: 'Churn fell to 3.1%' }] } }],
      right: [{ id: 'b3', type: 'tls.m.image', props: { src: '', alt: 'Photo' } }],
    } }
    const deck = { version: 1 as const, id: 'q', title: 'q', theme: 'corporate-navy', style: 'corporate', aspect: 'widescreen' as const, slides: [slide] }
    const q = slideQuality(analyzeDeck(deck)[0])
    expect(q.thinRegion).toBe('left')
    expect(q.findings.map((f) => f.code)).toContain('quality/thin-region')
    // size: fit (what the recipes use) fills the column
    const fit = { ...slide, regions: { ...slide.regions, left: [{ ...slide.regions.left[0], props: { ...slide.regions.left[0].props, size: 'fit' } }] } }
    expect(slideQuality(analyzeDeck({ ...deck, slides: [fit] })[0]).findings).toEqual([])
  })

  it('names what a design needs, and the picker only offers designs the content can fill', () => {
    const find = (id: string) => findDesign(id)!
    expect(designNeeds(find('people-logo-wall'))).toEqual(['logos'])
    expect(designNeeds(find('cover-split-image'))).toEqual(['images'])
    expect(designNeeds(find('quote-pull'), 'image')).toEqual(['images'])
    expect(designNeeds(find('quote-pull'), 'card')).toEqual([])
    expect(designNeeds(find('people-team'))).toEqual([])
    expect(assetsAllow(find('people-logo-wall'), 'base', { logos: false })).toBe(false)
    expect(assetsAllow(find('people-logo-wall'), 'base', undefined)).toBe(true)
    expect(DRY_RUN_ASSETS.logos).toBe(false)
    // the default outline has no logos: no seed of any style picks the logo wall
    for (const v of reports) for (const r of v.runs) expect(r.recipes).not.toContain('people-logo-wall')
    // no images at all: no photo design anywhere in the deck
    const bare = runStyle(getDeckStyle('corporate')!, 0, { seed: 2, assets: { images: false, logos: false, portraits: false, chartData: true } })
    expect(bare.errors + bare.warnings).toBe(0)
    for (let i = 0; i < bare.designs.length; i++) {
      const [rid, vid] = bare.designs[i].split('/')
      expect([bare.designs[i], designNeeds(find(rid), vid).includes('images')]).toEqual([bare.designs[i], false])
    }
    // a per-slide override: logos on the people slide only
    const outline = DRY_RUN_OUTLINE.map((e) => (e.role === 'people' ? { ...e, assets: { logos: true } } : e))
    const withLogos = [1, 2, 3, 4, 5, 6].map((seed) => runStyle(getDeckStyle('corporate')!, 0, { seed, outline }))
    expect(withLogos.some((r) => r.recipes.includes('people-logo-wall'))).toBe(true)
  })
})
