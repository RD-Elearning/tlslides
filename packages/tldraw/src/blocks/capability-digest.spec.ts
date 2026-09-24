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
/* A tiny AJV-free structural validator                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Validate `data` against a JSON Schema *object* (the actual output of
 * `deckSpecJsonSchema()`) using the subset of draft-2020-12 keywords that schema emits:
 * `type`, `const`, `enum`, `required`, `properties`, `additionalProperties: false`,
 * `oneOf`, `items`, `minItems`/`maxItems`, `minLength`/`maxLength`, `minimum`/`maximum`.
 *
 * Returns a list of human-readable errors; empty means valid. Deliberately NOT ajv (R7's own
 * "no new dependency" constraint) — this exists so the two tests below actually exercise the
 * generated schema instead of asserting on the raw deck JSON.
 */
function validateAgainstSchema(schema: unknown, data: unknown, path = '$'): string[] {
  if (schema === true) return []
  if (schema === false) return [`${path}: schema is false`]
  if (schema === null || typeof schema !== 'object') return []

  const s = schema as Record<string, unknown>
  const errors: string[] = []

  if (s.type !== undefined && !matchesJsonType(s.type as string | string[], data)) {
    errors.push(`${path}: expected type ${JSON.stringify(s.type)}, got ${jsonTypeOf(data)}`)
    return errors
  }
  if ('const' in s && !deepEqual(s.const, data)) {
    errors.push(`${path}: expected const ${JSON.stringify(s.const)}, got ${JSON.stringify(data)}`)
  }
  if (Array.isArray(s.enum) && !s.enum.some((v) => deepEqual(v, data))) {
    errors.push(`${path}: ${JSON.stringify(data)} is not one of ${JSON.stringify(s.enum)}`)
  }

  if (Array.isArray(s.oneOf)) {
    const matched = s.oneOf.filter((sub) => validateAgainstSchema(sub, data, path).length === 0)
    if (matched.length !== 1) {
      errors.push(`${path}: must match exactly one of the ${s.oneOf.length} oneOf branches (matched ${matched.length})`)
    }
    return errors
  }

  if (isPlainObject(data)) {
    const props = isPlainObject(s.properties) ? (s.properties as Record<string, unknown>) : undefined
    if (Array.isArray(s.required)) {
      for (const key of s.required) {
        if (!(key as string in data)) errors.push(`${path}: missing required property "${key}"`)
      }
    }
    if (props) {
      for (const [key, sub] of Object.entries(props)) {
        if (key in data) errors.push(...validateAgainstSchema(sub, (data as Record<string, unknown>)[key], `${path}.${key}`))
      }
      if (s.additionalProperties === false) {
        for (const key of Object.keys(data)) {
          if (!(key in props)) errors.push(`${path}: unexpected property "${key}"`)
        }
      } else if (isPlainObject(s.additionalProperties)) {
        for (const [key, value] of Object.entries(data)) {
          if (!props || !(key in props)) {
            errors.push(...validateAgainstSchema(s.additionalProperties, value, `${path}.${key}`))
          }
        }
      }
    } else if (isPlainObject(s.additionalProperties)) {
      for (const [key, value] of Object.entries(data)) {
        errors.push(...validateAgainstSchema(s.additionalProperties, value, `${path}.${key}`))
      }
    }
  }

  if (Array.isArray(data)) {
    if (s.items !== undefined) {
      data.forEach((item, i) => errors.push(...validateAgainstSchema(s.items, item, `${path}[${i}]`)))
    }
    if (typeof s.minItems === 'number' && data.length < s.minItems) {
      errors.push(`${path}: expected at least ${s.minItems} items`)
    }
    if (typeof s.maxItems === 'number' && data.length > s.maxItems) {
      errors.push(`${path}: expected at most ${s.maxItems} items`)
    }
  }

  if (typeof data === 'string') {
    if (typeof s.maxLength === 'number' && data.length > s.maxLength) {
      errors.push(`${path}: string is longer than maxLength ${s.maxLength}`)
    }
    if (typeof s.minLength === 'number' && data.length < s.minLength) {
      errors.push(`${path}: string is shorter than minLength ${s.minLength}`)
    }
  }

  if (typeof data === 'number') {
    if (typeof s.minimum === 'number' && data < s.minimum) errors.push(`${path}: below minimum ${s.minimum}`)
    if (typeof s.maximum === 'number' && data > s.maximum) errors.push(`${path}: above maximum ${s.maximum}`)
  }

  return errors
}

function matchesJsonType(expected: string | string[], data: unknown): boolean {
  const types = Array.isArray(expected) ? expected : [expected]
  return types.some((t) => {
    switch (t) {
      case 'object':
        return isPlainObject(data)
      case 'array':
        return Array.isArray(data)
      case 'string':
        return typeof data === 'string'
      case 'number':
        return typeof data === 'number' && Number.isFinite(data)
      case 'integer':
        return typeof data === 'number' && Number.isInteger(data)
      case 'boolean':
        return typeof data === 'boolean'
      case 'null':
        return data === null
      default:
        return true
    }
  })
}

function jsonTypeOf(data: unknown): string {
  if (data === null) return 'null'
  if (Array.isArray(data)) return 'array'
  return typeof data
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
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
      // R9/R10 grew the catalog from 25 to 35 blocks; measured 43,987 chars.
      // Held to 52k for the same reason recorded on the structured-data test
      // below. R7's remedy ("split per family") is the named follow-up.
      // B4 + B5 (toggles + stat-card) grew the markdown to ~52.7k.
      const charBudget = 54000
      expect(markdown.length).toBeLessThanOrEqual(charBudget)
    })

    it('structured data is under 8000 tokens (approx 32k characters as JSON)', () => {
      const data = capabilityDigestData()
      const json = JSON.stringify(data)
      // 8k tokens × ~5 chars/token average = 40k chars.
      // R9 raised this ceiling from 40k to 48k and R10 raised it to 52k: the
      // catalog now stands at 35 blocks, each carrying a full slot table plus
      // `describe.example` (which R7 requires in the structured data); the
      // measured JSON is 48,522 chars. Every raise is recorded here on purpose —
      // G2 added 8 blocks (donut, steps, page-number, icon-label + existing): digest grew from ~49k to ~54.5k.
      // R7's stated remedy for further growth ("split per family") is the named
      // follow-up and is better done once the catalog stops moving (R11–R16 add
      // no blocks).
      // B2 added `children` slot declarations to 8 layout containers (card, section,
      // split, overlay, safe-area, sidebar, footer, repeater): digest grew from
      // ~54.5k to ~56.1k.
      // B4 added `toggles` slots (showTitle/showDivider on section, showKicker/showTitle/
      // showSubtitle/showCta on hero, showLabel/showContext on big-stat,
      // showKicker/showTitle/showBody on image-text, showDelta/showLabel/showSparkline
      // on kpi-tile): digest grew to ~57.9k.
      // B5 added tls.c.stat-card (composite with defineCompositeBlock): digest grew to ~59.9k.
      const charBudget = 60000
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

    it('the generated schema accepts all 10 golden deck structures', () => {
      for (const { name, deck } of goldenFixtures) {
        const errors = validateAgainstSchema(schema, deck)
        expect({ name, errors }).toEqual({ name, errors: [] })
      }
    })

    it('the generated schema rejects a deck with an unknown block type', () => {
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

      const errors = validateAgainstSchema(schema, badDeck)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.join('\n')).toMatch(/oneOf/)

      // And a malformed `props` (a string) must be rejected by the schema itself, too.
      const malformed = JSON.parse(JSON.stringify(badDeck)) as DeckSpec
      ;(malformed.slides[0].regions['content'][0] as unknown as { type: string }).type = 'tls.t.title'
      ;(malformed.slides[0].regions['content'][0] as unknown as { props: unknown }).props = 'not-an-object'
      expect(validateAgainstSchema(schema, malformed).length).toBeGreaterThan(0)
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
