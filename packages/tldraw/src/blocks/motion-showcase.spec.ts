/**
 * P7 — the "motion showcase" demo deck: validates, the Next sample ships a byte-identical copy,
 * and it really exercises the three motion styles (compiled, not just declared).
 */
import * as fs from 'fs'
import * as path from 'path'
import { AnimationTrigger } from '~types'
import type { DeckSpec } from './types'
import { validateDeckSpec } from './validate-deck-spec'
import { BlockRegistry } from './registry'
import { registerBuiltInBlocks } from './library'
import { deckSpecToDocument } from './deck-document'
import { computeBuildSteps } from '~state/deck/presentation'

const FIXTURE = path.resolve(__dirname, '__fixtures__/motion-showcase.json')
const SAMPLE = path.resolve(__dirname, '../../../../examples/nextjs-sample/data/decks/motion-showcase.json')

describe('motion-showcase deck', () => {
  const reg = new BlockRegistry()
  registerBuiltInBlocks(reg)
  const deck = JSON.parse(fs.readFileSync(FIXTURE, 'utf-8')) as DeckSpec
  const { document } = deckSpecToDocument(deck)

  it('validates with 0 errors and 0 motion warnings', () => {
    const findings = validateDeckSpec(deck, reg)
    expect(findings.filter((f) => f.level === 'error')).toEqual([])
    expect(findings.filter((f) => f.rule.startsWith('motion/'))).toEqual([])
  })

  it('the Next sample copy is byte-identical', () => {
    expect(fs.readFileSync(SAMPLE, 'utf-8')).toBe(fs.readFileSync(FIXTURE, 'utf-8'))
  })

  it('uses the four showcase blocks and all three styles, with no per-block motion', () => {
    const used = new Set<string>()
    for (const s of deck.slides) for (const list of Object.values(s.regions)) for (const b of list) {
      used.add(b.type)
      expect(b.motion).toBeUndefined()
    }
    for (const t of ['kinetic-title', 'stat-spotlight', 'journey', 'feature-reveal']) expect(used.has(`tls.c.${t}`)).toBe(true)
    expect(new Set(deck.slides.map((s) => s.motionStyle))).toEqual(new Set(['expressive', 'subtle', 'static']))
  })

  it('compiles: expressive slides chain without clicks, subtle is one step, static has none', () => {
    for (const s of deck.slides) {
      const page = document.pages[s.id]
      const steps = computeBuildSteps(page)
      const anims = Object.values(page.shapes).map((sh) => sh.animation)
      if (s.motionStyle === 'static') {
        expect(anims.every((a) => a === undefined)).toBe(true)
      } else if (s.motionStyle === 'subtle') {
        expect(steps).toHaveLength(1)
        expect(steps[0].auto).toBe(true)
      } else {
        expect(steps.length).toBe(Object.keys(page.shapes).length)
        expect(steps.every((st) => st.auto)).toBe(true)
        expect(anims.filter((a) => a!.trigger === AnimationTrigger.OnClick)).toEqual([])
      }
    }
  })

  it('each "— expressive" slide has a "— subtle" twin with the same blocks and props', () => {
    const titleOf = (s: DeckSpec['slides'][number]) => String((s.regions.title?.[0]?.props as any)?.text ?? '')
    const strip = (s: DeckSpec['slides'][number]) =>
      JSON.stringify(Object.entries(s.regions).filter(([r]) => r !== 'title').map(([r, l]) => [r, l.map((b) => [b.type, b.props])]))
    const pairs = deck.slides.filter((s) => titleOf(s).endsWith('— expressive'))
    expect(pairs.length).toBeGreaterThanOrEqual(3)
    for (const e of pairs) {
      const twin = deck.slides.find((s) => titleOf(s) === titleOf(e).replace('— expressive', '— subtle'))
      // the feature-reveal slide has no subtle twin on purpose; every other pair must exist
      if (!twin) {
        expect(e.regions.timeline?.[0]?.type).toBe('tls.c.feature-reveal')
        continue
      }
      expect(twin.motionStyle).toBe('subtle')
      expect(strip(twin)).toBe(strip(e))
    }
  })
})
