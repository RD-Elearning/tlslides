/**
 * The 6-slide demo deck is a fixture with a contract: it must stay valid against the real block
 * schemas and the real layout region names, not against hand-made test doubles. This is also the
 * coordinator's independent check of Q19 (`validateDeckSpec` + `capabilityDigest`) — written
 * against the deck the product actually ships rather than re-deriving the agent's own fixtures.
 */
import * as fs from 'fs'
import * as path from 'path'
import { validateDeckSpec } from './validate-deck-spec'
import { capabilityDigest, capabilityDigestData } from './capability-digest'
import { SLIDE_LAYOUTS } from './slide-layouts'
import type { DeckSpec } from './types'

const DECK: DeckSpec = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '__fixtures__/demo-deck.json'), 'utf-8')
)

describe('Q19 against the real demo deck', () => {
  it('reports no errors on the shipped 6-slide demo deck', () => {
    const findings = validateDeckSpec(DECK)
    const errors = findings.filter((f) => f.level === 'error')
    if (errors.length > 0) {
      // Surface them in the failure message rather than a bare count.
      throw new Error('unexpected errors:\n' + errors.map((e) => `${e.path}: ${e.message}`).join('\n'))
    }
    expect(errors).toEqual([])
  })

  it('warns that the deck free[] blocks will move if aspect changes', () => {
    const findings = validateDeckSpec(DECK)
    expect(findings.some((f) => f.rule === 'free/aspect-risk')).toBe(true)
  })

  it('does not crash on any single-field corruption of the demo deck', () => {
    const mutations: Array<[string, unknown]> = [
      ['version', 99], ['id', undefined], ['title', null], ['theme', 42],
      ['aspect', 'panorama'], ['slides', {}], ['slides', null], ['masters', 'nope'],
    ]
    for (const [key, value] of mutations) {
      const corrupted = { ...DECK, [key]: value } as unknown as DeckSpec
      expect(() => validateDeckSpec(corrupted)).not.toThrow()
      expect(Array.isArray(validateDeckSpec(corrupted))).toBe(true)
    }
  })

  it('every finding message names the offending value or the fix, never a bare rule id', () => {
    const broken = JSON.parse(JSON.stringify(DECK)) as DeckSpec
    broken.slides[2].regions['lft'] = broken.slides[2].regions['left']
    delete broken.slides[2].regions['left']
    const findings = validateDeckSpec(broken)
    const unknownRegion = findings.find((f) => f.rule === 'region/unknown')
    expect(unknownRegion).toBeDefined()
    expect(unknownRegion!.message).toContain('lft')
    expect(unknownRegion!.message.length).toBeGreaterThan(30)
    expect(unknownRegion!.path).toContain('slides[2]')
  })
})

describe('Q19 capability digest is derived from code', () => {
  it('names every one of the 24 built-in blocks', () => {
    const data = capabilityDigestData()
    expect(data.blocks.length).toBeGreaterThanOrEqual(24)
    const md = capabilityDigest()
    for (const block of data.blocks) expect(md).toContain(block.type)
  })

  it('lists every slide layout with the region names its own compile() returns', () => {
    const data = capabilityDigestData()
    expect(data.layouts.length).toBe(SLIDE_LAYOUTS.length)
    const twoColumn = data.layouts.find((l) => l.id === 'two-column')
    expect(twoColumn).toBeDefined()
    expect(twoColumn!.regions.sort()).toEqual(['left', 'right', 'title'])
    const kpiRow = data.layouts.find((l) => l.id === 'kpi-row')
    expect(kpiRow!.regions.sort()).toEqual(['kpi1', 'kpi2', 'kpi3', 'kpi4', 'title'])
  })
})
