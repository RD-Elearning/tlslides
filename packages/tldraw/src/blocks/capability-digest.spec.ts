/**
 * Q19 — capability digest tests.
 *
 * The headline claim this file exists to check: the digest is *derived*, not hand-written.
 * `it('is derived, not hand-written ...')` below is the load-bearing test — it registers a
 * throwaway fake block in a private registry and asserts it shows up in both the structured
 * data and the markdown, which is only possible if the digest actually reads the registry
 * rather than echoing a fixed string.
 */

import { capabilityDigest, capabilityDigestData } from './capability-digest'
import { validateDeckSpec } from './validate-deck-spec'
import { BlockRegistry } from './registry'
import { registerBuiltInBlocks, BUILT_IN_BLOCKS } from './library'
import { SLIDE_LAYOUTS } from './slide-layouts'
import type { DeckSpec } from './types'

function freshBuiltInRegistry(): BlockRegistry {
  const registry = new BlockRegistry()
  registerBuiltInBlocks(registry)
  return registry
}

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
