/**
 * AC7 — the scripted pipeline dry run (`pipeline/dryRun.ts`, CLI `tools/layout-report/dry-run.js`)
 * yields clean decks and a S2a prompt inside the 16k ceiling (`reviews/blocks/ai-curation/README.md` §5.2).
 */
import { DRY_RUN_OUTLINE, PROMPT_BUDGET, runDryRun, runStyle, shortenHeadline } from './pipeline/dryRun'
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
