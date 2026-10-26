/**
 * spro creative PLAN §6.8 (CR7a) — gate profiles. `SlideSpec.intent` (from the design move) sets
 * how the quality gate judges a slide: `poster` skips `sparse` / `thin-region` but wants the lead
 * at title size and the space balanced, `diagram` wants the diagram to fill its region, `dense`
 * keeps today's checks. A diagram's internal labels count as one size group everywhere.
 */
import { analyzeDeck } from '../layout-report'
import type { BlockSpec, DeckSpec, SlideSpec } from '../types'
import { deckTitleSize, slideQuality } from './quality'
import { validateDeckSpec } from '../validate-deck-spec'
import { deckSpecToDocument } from '../deck-document'
import { documentToDeckSpec } from '../slide-decompiler'
import { deckSpecJsonSchema } from '../deck-spec-json-schema'
import { BlockRegistry } from '../registry'
import { registerBuiltInBlocks } from '../library'

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)

const T = (text: string): BlockSpec => ({ id: 't', type: 'tls.t.title', props: { text } })
const deck = (slide: SlideSpec): DeckSpec => ({ version: 1, id: 'q', title: 'q', theme: 'minimal-white', style: 'minimal', aspect: 'widescreen', slides: [slide] }) as DeckSpec
const quality = (slide: SlideSpec) => {
  const d = deck(slide)
  return slideQuality(analyzeDeck(d)[0], { titleSize: deckTitleSize(d) })
}
const codes = (slide: SlideSpec) => quality(slide).findings.map((f) => f.code)
const statement = (size?: string): BlockSpec => ({ id: 'st', type: 'tls.t.statement', props: { text: 'One idea.', ...(size ? { size } : {}) } })
const flow: BlockSpec = { id: 'f', type: 'tls.g.flow', props: { direction: 'LR', nodes: [{ id: 'a', label: 'Plan' }, { id: 'b', label: 'Build' }], edges: [{ from: 'a', to: 'b' }] } }

describe('gate profiles', () => {
  it('SlideSpec.intent: validated, kept by the round trip, in the JSON schema', () => {
    const ok = deck({ id: 's', layout: 'blank', intent: 'poster', regions: { content: [statement()] } })
    expect(validateDeckSpec(ok).filter((f) => f.rule === 'slide/unknown-intent')).toHaveLength(0)
    const bad = deck({ id: 's', layout: 'blank', intent: 'postr' as never, regions: { content: [statement()] } })
    expect(validateDeckSpec(bad).find((f) => f.rule === 'slide/unknown-intent')?.suggestion).toBe('poster')
    expect(documentToDeckSpec(deckSpecToDocument(ok).document).spec.slides[0].intent).toBe('poster')
    const slide = (deckSpecJsonSchema() as any).properties.slides.items.properties
    expect(slide.intent.enum).toEqual(['poster', 'diagram', 'dense'])
  })

  it('the report names the profile used', () => {
    expect(quality({ id: 's', layout: 'blank', regions: { content: [statement()] } }).profile).toBe('default')
    expect(quality({ id: 's', layout: 'blank', intent: 'poster', regions: { content: [statement()] } }).profile).toBe('poster')
  })

  it('poster: no sparse / thin-region, but the lead must reach the title size', () => {
    const slide: SlideSpec = { id: 's', layout: 'two-column', regions: { title: [T('A question')], left: [statement('md')], right: [] } }
    expect(codes(slide)).toEqual(expect.arrayContaining(['quality/thin-region']))
    const poster = codes({ ...slide, intent: 'poster' })
    expect(poster).not.toContain('quality/sparse')
    expect(poster).not.toContain('quality/thin-region')
    expect(codes({ id: 's', layout: 'blank', intent: 'poster', regions: { content: [{ id: 'b', type: 'tls.t.body', props: { text: 'Small words.' } }] } })).toContain('quality/small-type')
  })

  it('diagram: the diagram must fill 45 % of its region', () => {
    const slide: SlideSpec = { id: 's', layout: 'two-column', regions: { title: [T('Two steps')], left: [flow], right: [{ id: 'b', type: 'tls.t.body', props: { text: 'Why the order matters, in a few words for the audience.' } }] } }
    const q = quality({ ...slide, intent: 'diagram' })
    // two LR nodes paint a strip across the column
    expect(q.diagramFill).toBeLessThan(0.45)
    expect(q.findings.map((f) => f.code)).toContain('quality/thin-diagram')
    const def = registry.get('tls.g.matrix-2x2')!
    const matrix: BlockSpec = { id: 'm', type: 'tls.g.matrix-2x2', props: { ...(def.describe?.example?.props ?? {}) } as Record<string, unknown> }
    const full = quality({ ...slide, intent: 'diagram', regions: { ...slide.regions, left: [matrix] } })
    expect(full.diagramFill).toBeGreaterThanOrEqual(0.45)
    expect(full.findings.map((f) => f.code)).not.toContain('quality/thin-diagram')
    expect(codes(slide)).not.toContain('quality/thin-diagram')
  })

  it("a diagram's internal labels count as one size group (§2.4: progress ring + icon list)", () => {
    const ex = (type: string) => ({ ...((registry.get(type)!.describe?.example?.props ?? {}) as Record<string, unknown>) })
    const slide: SlideSpec = {
      id: 's',
      layout: 'two-column',
      regions: {
        title: [T('Where we are')],
        left: [{ id: 'r', type: 'tls.d.progress-ring', props: ex('tls.d.progress-ring') }],
        right: [{ id: 'k', type: 'tls.t.subtitle', props: { text: 'Three of five goals met' } }, { id: 'l', type: 'tls.m.icon-list', props: ex('tls.m.icon-list') }, { id: 'c', type: 'tls.t.caption', props: { text: 'Source: the 2026 survey.' } }],
      },
    }
    const report = analyzeDeck(deck(slide))[0]
    const sizes = new Set(report.blocks.flatMap((b) => b.text.map((t) => Math.round(t.fontSize * (t.scale || 1)))))
    expect(sizes.size).toBeGreaterThan(5)
    expect(report.findings.map((f) => f.code)).not.toContain('type/too-many-sizes')
  })
})
