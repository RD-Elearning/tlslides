import { capabilityDigest } from './capability-digest'
import { ACCENT_BLOCKS, COMPOSE_LAYOUTS, DECORATION_BLOCKS, SHAPE_FAMILIES, SLIDE_SHAPES, composeKit, styleConcept, styleConceptCard } from './compose-kit'
import { getSlideLayout } from './slide-layouts'
import { BUILT_IN_STYLES } from './styles'
import { defaultBlockRegistry } from './validate-deck-spec'

const registry = defaultBlockRegistry()

describe('compose kit', () => {
  it('names only registered blocks and layouts', () => {
    for (const [shape, types] of Object.entries(SHAPE_FAMILIES)) {
      for (const t of types) expect([shape, registry.get(t) ? t : `missing ${t}`]).toEqual([shape, t])
    }
    for (const t of [...ACCENT_BLOCKS, ...DECORATION_BLOCKS]) expect(registry.get(t)).toBeTruthy()
    for (const l of COMPOSE_LAYOUTS) expect(getSlideLayout(l.id as never)).toBeTruthy()
  })

  it('reaches the teaching blocks no recipe uses', () => {
    const all = new Set(Object.values(SHAPE_FAMILIES).flat())
    for (const t of ['tls.g.tree', 'tls.g.mindmap', 'tls.g.cycle', 'tls.g.pyramid', 'tls.t.definition', 'tls.t.callout', 'tls.t.qa', 'tls.t.checklist', 'tls.c.objectives', 'tls.c.quiz', 'tls.c.recap']) {
      expect(all.has(t)).toBe(true)
    }
  })

  it('every style has a concept whose motifs are real blocks and shapes', () => {
    const shapes = capabilityDigest(registry, { types: ['tls.m.decoration', 'tls.m.pattern'] })
    for (const style of BUILT_IN_STYLES) {
      const c = styleConcept(style)
      expect(style.concept).toBeTruthy()
      for (const m of c.motifs) {
        const [type, variant] = m.split(':')
        expect(registry.get(type)).toBeTruthy()
        if (variant) expect(shapes).toContain(` ${variant} `)
      }
      // a style that avoids decoration offers none
      if (style.avoid.includes('tls.m.decoration')) expect(c.motifs.some((m) => m.startsWith('tls.m.decoration'))).toBe(false)
      const card = styleConceptCard(style)
      expect(card).toContain(style.name)
      expect(card.length).toBeLessThan(1800)
    }
  })

  it('a kit fits its budget and carries the shape\'s blocks first', () => {
    for (const style of BUILT_IN_STYLES) {
      for (const shape of SLIDE_SHAPES) {
        const kit = composeKit({ shape, style }, registry)
        expect(kit.types.length).toBeGreaterThan(0)
        expect(kit.markdown.length).toBeLessThan(18000)
        for (const t of style.avoid) expect(kit.types).not.toContain(t)
      }
    }
    const kit = composeKit({ shape: 'hierarchy', style: BUILT_IN_STYLES[0] }, registry)
    expect(kit.types[0]).toBe('tls.g.tree')
    expect(kit.markdown).toContain('# Composing a slide')
    expect(kit.markdown).toContain('## Style concept')
    expect(kit.markdown).toContain('listed with the slide')
  })
})
