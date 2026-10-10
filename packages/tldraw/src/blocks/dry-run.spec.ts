/**
 * AC7 — the scripted pipeline dry run (`pipeline/dryRun.ts`, CLI `tools/layout-report/dry-run.js`)
 * yields clean decks and a S2a prompt inside the 16k ceiling (`reviews/blocks/ai-curation/README.md` §5.2).
 */
import { DRY_RUN_OUTLINE, PROMPT_BUDGET, runDryRun, runStyle, runVariety, shortenHeadline, signatureDiffer } from './pipeline/dryRun'
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
    const r = runStyle(getDeckStyle('corporate')!, 0, { outline })
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
        const titles = r.deck.slides.flatMap((s) => Object.values(s.regions ?? {}).flat()).filter((b) => b.type === 'tls.t.title')
        for (const t of titles) for (const [k, val] of Object.entries(r.deckLook.title)) expect((t.props as Record<string, unknown>)[k]).toBe(val)
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
