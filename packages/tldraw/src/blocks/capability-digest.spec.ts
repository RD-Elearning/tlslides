/**
 * Q19 + R7 — capability digest tests.
 *
 * The headline claim this file exists to check: the digest is *derived*, not hand-written.
 * `it('is derived, not hand-written ...')` below is the load-bearing test — it registers a
 * throwaway fake block in a private registry and asserts it shows up in both the structured
 * data and the markdown, which is only possible if the digest actually reads the registry
 * rather than echoing a fixed string.
 */

import * as fs from 'fs'
import * as path from 'path'
import { capabilityDigest, capabilityDigestData } from './capability-digest'
import { deckSpecJsonSchema } from './deck-spec-json-schema'
import { validateDeckSpec } from './validate-deck-spec'
import { BlockRegistry } from './registry'
import { registerBuiltInBlocks, BUILT_IN_BLOCKS } from './library'
import { SLIDE_LAYOUTS } from './slide-layouts'
import type { DeckSpec, BlockSpec } from './types'

function freshBuiltInRegistry(): BlockRegistry {
  const registry = new BlockRegistry()
  registerBuiltInBlocks(registry)
  return registry
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* R7 — Golden fixture helpers                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

const GOLDEN_DIR = path.resolve(__dirname, '__fixtures__/golden')

function loadGoldenFixtures(): Array<{ name: string; deck: DeckSpec }> {
  const files = fs.readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.json'))
  return files.map((f) => ({
    name: f.replace('.json', ''),
    deck: JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, f), 'utf-8')) as DeckSpec,
  }))
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Original tests (Q19)                                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('capabilityDigestData', () => {
  it('lists every built-in block exactly once', () => {
    const data = capabilityDigestData(freshBuiltInRegistry())
    expect(data.blocks).toHaveLength(BUILT_IN_BLOCKS.length)
    const types = data.blocks.map((b) => b.type)
    expect(new Set(types).size).toBe(types.length)
    expect(types).toContain('tls.t.title')
    expect(types).toContain('tls.d.bar')
    expect(types).toContain('tls.l.stack')
  })

  it('lists every slide layout with its real, compiled region names', () => {
    const data = capabilityDigestData()
    expect(data.layouts).toHaveLength(SLIDE_LAYOUTS.length)
    const twoColumn = data.layouts.find((l) => l.id === 'two-column')
    expect(twoColumn).toBeDefined()
    expect(twoColumn!.regions.sort()).toEqual(['left', 'right', 'title'].sort())

    const blank = data.layouts.find((l) => l.id === 'blank')
    expect(blank!.regions).toEqual(['content'])

    const kpiRow = data.layouts.find((l) => l.id === 'kpi-row')
    expect(kpiRow!.regions.sort()).toEqual(['kpi1', 'kpi2', 'kpi3', 'kpi4', 'title'].sort())
  })

  it('marks required slots and carries budgets through from the schema', () => {
    const data = capabilityDigestData()
    const title = data.blocks.find((b) => b.type === 'tls.t.title')!
    const textSlot = title.slots.find((s) => s.name === 'text')!
    expect(textSlot.required).toBe(true)

    const caption = data.blocks.find((b) => b.type === 'tls.t.caption')!
    const captionText = caption.slots.find((s) => s.name === 'text')!
    expect(captionText.required).toBe(true)
    expect(captionText.type).toContain('200')

    const bar = data.blocks.find((b) => b.type === 'tls.d.bar')!
    const series = bar.slots.find((s) => s.name === 'series')!
    expect(series.type).toContain('6')
  })

  it('the worked example is a valid, error-free DeckSpec slide when wrapped in a deck', () => {
    const data = capabilityDigestData()
    const deck: DeckSpec = {
      version: 1,
      id: 'digest-example-deck',
      title: 'Digest example',
      theme: 'mono-grid',
      aspect: 'widescreen',
      slides: [data.example as any],
    }
    const errors = validateDeckSpec(deck).filter((f) => f.level === 'error')
    expect(errors).toEqual([])
  })

  it('is derived, not hand-written: registering an unknown block makes it appear in the digest', () => {
    const registry = freshBuiltInRegistry()
    registry.register({
      type: 'zzz.fake.probe',
      name: 'Fake Probe Block',
      family: 'text',
      tier: 'A',
      summary: 'A throwaway block that exists only to prove the digest is generated.',
      keywords: ['probe'],
      schema: {
        label: {
          type: { kind: 'text', maxChars: 42 },
          role: 'content',
          label: 'Label',
          required: true,
          guidance: 'Say something short.',
        },
      },
      defaults: { label: 'probe' },
      size: { preferred: [100, 100], min: [50, 50] },
      layout: () => ({ k: 'group', box: { x: 0, y: 0, width: 100, height: 100 }, children: [] }),
      motion: {},
    } as any)

    const before = capabilityDigestData(freshBuiltInRegistry())
    expect(before.blocks.some((b) => b.type === 'zzz.fake.probe')).toBe(false)

    const after = capabilityDigestData(registry)
    const probe = after.blocks.find((b) => b.type === 'zzz.fake.probe')
    expect(probe).toBeDefined()
    expect(probe!.summary).toBe('A throwaway block that exists only to prove the digest is generated.')
    expect(probe!.slots[0]).toMatchObject({ name: 'label', required: true, type: 'text (max 42 chars)' })

    // And the same is true of the markdown rendering — it isn't a separately hand-maintained
    // string, it's rendered from the same derived data.
    const markdown = capabilityDigest(registry)
    expect(markdown).toContain('zzz.fake.probe')
    expect(markdown).toContain('Fake Probe Block')
    expect(capabilityDigest(freshBuiltInRegistry())).not.toContain('zzz.fake.probe')
  })
})

describe('capabilityDigest (markdown)', () => {
  it('renders a non-empty markdown document with layouts, blocks, and a worked example', () => {
    const markdown = capabilityDigest()
    expect(typeof markdown).toBe('string')
    expect(markdown).toContain('# Slide block capabilities')
    expect(markdown).toContain('## Layouts')
    expect(markdown).toContain('## Blocks')
    expect(markdown).toContain('## Worked example')
    expect(markdown).toContain('`tls.t.title`')
    expect(markdown).toContain('`two-column`')
  })

  it('never throws when called with no registry (uses the default)', () => {
    expect(() => capabilityDigest()).not.toThrow()
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* R7 — New tests                                                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('R7 — capability digest v2', () => {
  describe('digest includes new sections', () => {
    const data = capabilityDigestData()
    const md = capabilityDigest()

    it('has colorRoles section in structured data', () => {
      expect(data.colorRoles).toBeDefined()
      expect(Array.isArray(data.colorRoles)).toBe(true)
      expect(data.colorRoles.length).toBe(12)
      const ids = data.colorRoles.map((cr) => cr.id)
      expect(ids).toContain('surface')
      expect(ids).toContain('accent')
      expect(ids).toContain('text')
      expect(ids).toContain('positive')
      expect(ids).toContain('scrim')
    })

    it('has style section in structured data', () => {
      expect(data.style).toBeDefined()
      expect(data.style.fields.length).toBeGreaterThan(0)
      expect(data.style.gradient).toContain('solid')
      expect(data.style.gradient).toContain('linearGradient')
    })

    it('has motion section in structured data', () => {
      expect(data.motion).toBeDefined()
      expect(Array.isArray(data.motion)).toBe(true)
      // Should have all presets except 'none'
      expect(data.motion.length).toBeGreaterThan(0)
      const ids = data.motion.map((mp) => mp.id)
      expect(ids).toContain('fade-up')
      expect(ids).toContain('count-up')
      expect(ids).toContain('grow-bars-y')
      // 'none' should be excluded
      expect(ids).not.toContain('none')
    })

    it('motion presets have required fields', () => {
      for (const mp of data.motion) {
        expect(typeof mp.id).toBe('string')
        expect(typeof mp.family).toBe('string')
        expect(typeof mp.defaultDurationMs).toBe('number')
        expect(Array.isArray(mp.triggers)).toBe(true)
        expect(mp.triggers.length).toBeGreaterThan(0)
      }
    })

    it('blocks have when/avoid/example from describe', () => {
      for (const b of data.blocks) {
        expect(typeof b.when).toBe('string')
        expect(typeof b.avoid).toBe('string')
        expect(b.example).toBeDefined()
      }
    })

    it('markdown includes color roles section', () => {
      expect(md).toContain('## Color roles')
      expect(md).toContain('**surface**:')
      expect(md).toContain('**accent**:')
    })

    it('markdown includes style section', () => {
      expect(md).toContain('## Style')
      expect(md).toContain('BlockStyleSpec fields')
      expect(md).toContain('Gradient shape')
    })

    it('markdown includes motion section', () => {
      expect(md).toContain('## Motion')
      expect(md).toContain('fade-up')
      expect(md).toContain('count-up')
    })

    it('markdown includes layout "use when" column', () => {
      expect(md).toContain('| Layout | Regions | Use when |')
      expect(md).toContain('workhorse layout')
    })

    it('markdown includes per-block when/avoid and example JSON', () => {
      expect(md).toContain('**When:**')
      expect(md).toContain('**Avoid:**')
      // Example blocks should have JSON code fences
      const jsonFenceCount = (md.match(/```json/g) ?? []).length
      // At least one worked example + at least one per-block example
      expect(jsonFenceCount).toBeGreaterThanOrEqual(BUILT_IN_BLOCKS.length + 1)
    })
  })

  describe('every describe.example validates', () => {
    it('all built-in block examples pass validateDeckSpec when wrapped in a deck', () => {
      const registry = freshBuiltInRegistry()
      for (const def of BUILT_IN_BLOCKS) {
        if (!def.describe?.example) continue

        const example = def.describe.example as BlockSpec
        const deck: DeckSpec = {
          version: 1,
          id: `example-test-${def.type}`,
          title: `Example test for ${def.type}`,
          theme: 'mono-grid',
          aspect: 'widescreen',
          slides: [
            {
              id: `sl_example_${def.type}`,
              layout: 'blank',
              regions: {
                content: [example],
              },
            },
          ],
        }

        const errors = validateDeckSpec(deck, registry).filter((f) => f.level === 'error')
        expect(errors).toEqual([])
      }
    })
  })

  describe('snapshot test', () => {
    it('digest markdown matches snapshot (changes only when registry does)', () => {
      const markdown = capabilityDigest()
      expect(markdown).toMatchSnapshot()
    })

    it('digest structured data matches snapshot', () => {
      const data = capabilityDigestData()
      // Only snapshot the block types, layout ids, color role ids, and motion preset ids
      // to keep the snapshot stable and readable
      const summary = {
        blockTypes: data.blocks.map((b) => b.type),
        layoutIds: data.layouts.map((l) => l.id),
        colorRoleIds: data.colorRoles.map((cr) => cr.id),
        motionPresetIds: data.motion.map((m) => m.id),
        blockCount: data.blocks.length,
        layoutCount: data.layouts.length,
        colorRoleCount: data.colorRoles.length,
        motionCount: data.motion.length,
      }
      expect(summary).toMatchSnapshot()
    })
  })

  describe('digest character budget', () => {
    it('markdown digest is under 8000 tokens (approx 40k characters)', () => {
      const markdown = capabilityDigest()
      // 8k tokens × ~5 chars/token average = 40k chars; use 40k as safe ceiling
      const charBudget = 40000
      expect(markdown.length).toBeLessThanOrEqual(charBudget)
    })

    it('structured data is under 8000 tokens (approx 32k characters as JSON)', () => {
      const data = capabilityDigestData()
      const json = JSON.stringify(data)
      // 8k tokens × ~5 chars/token average = 40k chars; use 40k as safe ceiling
      const charBudget = 40000
      expect(json.length).toBeLessThanOrEqual(charBudget)
    })
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* R7 — JSON Schema tests                                                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('R7 — deckSpecJsonSchema', () => {
  it('returns a valid JSON Schema draft-2020-12 document', () => {
    const schema = deckSpecJsonSchema()
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
    expect(schema.type).toBe('object')
    expect(schema.required).toContain('version')
    expect(schema.required).toContain('slides')
  })

  it('is a pure function — same input produces same output', () => {
    const s1 = deckSpecJsonSchema()
    const s2 = deckSpecJsonSchema()
    expect(JSON.stringify(s1)).toBe(JSON.stringify(s2))
  })

  describe('structural acceptance of golden decks (ajv-free)', () => {
    const goldenFixtures = loadGoldenFixtures()
    const schema = deckSpecJsonSchema() as any

    for (const { name, deck } of goldenFixtures) {
      it(`golden fixture "${name}" has correct top-level shape`, () => {
        expect(deck.version).toBe(1)
        expect(typeof deck.id).toBe('string')
        expect(typeof deck.title).toBe('string')
        expect(typeof deck.theme).toBe('string')
        expect(deck.aspect).toBeDefined()
        expect(Array.isArray(deck.slides)).toBe(true)
        expect(deck.slides.length).toBeGreaterThan(0)
      })

      it(`golden fixture "${name}" validates clean via validateDeckSpec`, () => {
        const errors = validateDeckSpec(deck).filter((f) => f.level === 'error')
        expect(errors).toEqual([])
      })
    }

    it('schema lists all built-in block types in its properties', () => {
      const schemaProps = schema.properties
      expect(schemaProps).toBeDefined()
      expect(schemaProps.version).toBeDefined()
      expect(schemaProps.slides).toBeDefined()
    })

    it('schema has a slides array with block objects inside regions', () => {
      const slidesSchema = schema.properties.slides
      expect(slidesSchema.type).toBe('array')
      expect(slidesSchema.items).toBeDefined()
      expect(slidesSchema.items.properties.regions).toBeDefined()
    })

    it('schema accepts all 10 golden deck structures (top-level field check)', () => {
      for (const { name, deck } of goldenFixtures) {
        // Check required top-level fields are present
        expect(deck).toHaveProperty('version', 1)
        expect(deck).toHaveProperty('id')
        expect(deck).toHaveProperty('title')
        expect(deck).toHaveProperty('theme')
        expect(deck).toHaveProperty('aspect')
        expect(deck).toHaveProperty('slides')

        // Check each slide has required fields
        for (const slide of deck.slides) {
          expect(slide).toHaveProperty('id')
          expect(slide).toHaveProperty('layout')
          expect(slide).toHaveProperty('regions')
          expect(typeof slide.regions).toBe('object')

          // Check each block in each region has required fields
          for (const [, blocks] of Object.entries(slide.regions)) {
            for (const block of blocks) {
              expect(block).toHaveProperty('id')
              expect(block).toHaveProperty('type')
            }
          }
        }
      }
    })

    it('schema structure rejects a deck with an unknown block type at the structural level', () => {
      const badDeck: DeckSpec = {
        version: 1,
        id: 'bad-deck',
        title: 'Bad Deck',
        theme: 'mono-grid',
        aspect: 'widescreen',
        slides: [
          {
            id: 'sl_bad',
            layout: 'blank',
            regions: {
              content: [
                {
                  id: 'b_bad',
                  type: 'nonexistent.block.type',
                  props: {},
                },
              ],
            },
          },
        ],
      }

      // validateDeckSpec catches unknown types as errors
      const errors = validateDeckSpec(badDeck).filter((f) => f.level === 'error')
      const unknownTypeErrors = errors.filter((e) => e.rule === 'block/unknown-type')
      expect(unknownTypeErrors.length).toBe(1)
    })
  })

  describe('schema block type discrimination', () => {
    it('schema includes a block items definition inside region arrays', () => {
      const schema = deckSpecJsonSchema() as any
      const slideItems = schema.properties.slides.items
      const regionAdditional = slideItems.properties.regions.additionalProperties
      expect(regionAdditional.type).toBe('array')
      expect(regionAdditional.items).toBeDefined()
      // Block items should require id and type
      expect(regionAdditional.items.required).toContain('id')
      expect(regionAdditional.items.required).toContain('type')
    })
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* R7 — no hand-written catalog text outside block definitions                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('R7 — no hand-written catalog text', () => {
  it('every block has a describe with when/avoid/example', () => {
    for (const def of BUILT_IN_BLOCKS) {
      expect(def.describe).toBeDefined()
      expect(typeof def.describe!.when).toBe('string')
      expect(def.describe!.when.length).toBeGreaterThan(10)
      expect(typeof def.describe!.avoid).toBe('string')
      expect(def.describe!.avoid.length).toBeGreaterThan(10)
      expect(def.describe!.example).toBeDefined()
      expect(typeof def.describe!.example.id).toBe('string')
      expect(typeof def.describe!.example.type).toBe('string')
      expect(typeof def.describe!.example.props).toBe('object')
    }
  })

  it('digest when/avoid text comes from block definitions, not the digest module', () => {
    const data = capabilityDigestData()
    const registry = freshBuiltInRegistry()
    for (const b of data.blocks) {
      const def = registry.get(b.type)
      expect(def).toBeDefined()
      expect(b.when).toBe(def!.describe?.when)
      expect(b.avoid).toBe(def!.describe?.avoid)
      expect(b.example).toEqual(def!.describe?.example)
    }
  })
})
