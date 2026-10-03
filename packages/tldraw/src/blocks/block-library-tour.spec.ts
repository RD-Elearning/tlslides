/**
 * The "block library tour" demo deck: validates with no errors, and the Next sample ships a
 * byte-identical copy (edit the fixture, then `cp` it; never edit both).
 */
import * as fs from 'fs'
import * as path from 'path'
import { validateDeckSpec } from './validate-deck-spec'
import { BlockRegistry } from './registry'
import { registerBuiltInBlocks } from './library'

const FIXTURE = path.resolve(__dirname, '__fixtures__/block-library-tour.json')
const SAMPLE = path.resolve(__dirname, '../../../../examples/nextjs-sample/data/decks/block-library-tour.json')

describe('block-library-tour deck', () => {
  const reg = new BlockRegistry()
  registerBuiltInBlocks(reg)
  const deck = JSON.parse(fs.readFileSync(FIXTURE, 'utf-8'))

  it('validates with 0 errors', () => {
    const findings = validateDeckSpec(deck, reg)
    expect(findings.filter((f) => f.level === 'error')).toEqual([])
  })

  it('the Next sample copy is byte-identical', () => {
    expect(fs.readFileSync(SAMPLE, 'utf-8')).toBe(fs.readFileSync(FIXTURE, 'utf-8'))
  })

  it('uses every shipped P5 part A composite at least once', () => {
    const used = new Set<string>()
    for (const s of deck.slides) for (const list of Object.values<any[]>(s.regions)) for (const b of list) used.add(b.type)
    for (const t of ['cover', 'divider', 'closing', 'cards', 'chart-insight', 'dashboard', 'team', 'objectives']) expect(used.has(`tls.c.${t}`)).toBe(true)
  })
})
