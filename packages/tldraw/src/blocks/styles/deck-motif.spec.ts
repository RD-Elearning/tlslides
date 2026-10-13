/**
 * spro enhance PLAN.md F1 — the deck's motif: a playful style's cover and section masters draw the
 * deck's subject doodle (`DeckSpec.motif`) in place of their signature motif.
 */
import { deckSpecToDocument } from '../deck-document'
import { documentToDeckSpec } from '../slide-decompiler'
import { validateDeckSpec } from '../validate-deck-spec'
import { analyzeDeck } from '../layout-report'
import { BUILT_IN_STYLES, deckMotif, styleMasters } from './index'
import type { DeckSpec } from '../types'

const deck = (style: string, motif?: string): DeckSpec =>
  ({
    version: 1,
    id: 'm',
    title: 'Cây',
    theme: BUILT_IN_STYLES.find((s) => s.id === style)!.palettes[0].id,
    style,
    aspect: 'widescreen',
    ...(motif ? { motif } : {}),
    slides: [
      { id: 's1', role: 'cover', layout: 'blank', regions: { content: [{ id: 'h', type: 'tls.c.hero', props: { title: 'Cấu trúc cây' } }] } },
      { id: 's2', role: 'section', layout: 'blank', regions: { content: [{ id: 'd', type: 'tls.c.divider', props: { title: 'Cây nhị phân' } }] } },
    ],
  }) as DeckSpec

const shapesOf = (value: unknown, out: string[] = []): string[] => {
  if (Array.isArray(value)) value.forEach((v) => shapesOf(v, out))
  else if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>
    if (v.type === 'tls.m.decoration' && typeof (v.props as { shape?: string })?.shape === 'string') out.push((v.props as { shape: string }).shape)
    if (v.componentId === 'tls.m.decoration' && typeof (v.props as { shape?: string })?.shape === 'string') out.push((v.props as { shape: string }).shape)
    Object.values(v).forEach((x) => shapesOf(x, out))
  }
  return out
}

describe('deck motif (F1)', () => {
  it('a playful style draws the motif on its cover and section masters, once each', () => {
    const masters = styleMasters(BUILT_IN_STYLES.find((s) => s.id === 'doodle'), 'tree')
    const cover = masters.find((m) => m.name.endsWith('cover'))!
    const section = masters.find((m) => m.name.endsWith('section'))!
    const content = masters.find((m) => m.name.endsWith('content'))!
    expect(shapesOf(cover.blocks).filter((s) => s === 'tree')).toHaveLength(1)
    expect(shapesOf(section.blocks).filter((s) => s === 'tree')).toHaveLength(1)
    expect(shapesOf(content.blocks)).not.toContain('tree')
    expect(shapesOf(styleMasters(BUILT_IN_STYLES.find((s) => s.id === 'doodle'))[0].blocks)).not.toContain('tree')
  })

  it('every signature names a decoration of its master', () => {
    for (const style of BUILT_IN_STYLES) {
      for (const m of style.masters) {
        if (!m.signature) continue
        expect(style.concept?.subjects).toBe(true)
        expect(shapesOf(m.blocks[m.signature]).length).toBe(1)
      }
    }
  })

  it('a plain style and an unknown motif change nothing', () => {
    expect(deckMotif(BUILT_IN_STYLES.find((s) => s.id === 'minimal'), 'tree')).toBeUndefined()
    expect(deckMotif(BUILT_IN_STYLES.find((s) => s.id === 'doodle'), 'unicorn')).toBeUndefined()
    const findings = validateDeckSpec(deck('doodle', 'unicorn'))
    expect(findings.map((f: { rule: string }) => f.rule)).toContain('deck/unknown-motif')
  })

  it('the document draws it, the round trip keeps it, the report sees it', () => {
    const { document } = deckSpecToDocument(deck('doodle-geo3d', 'tree'))
    expect(document.motif).toBe('tree')
    const pages = Object.values(document.pages)
    expect(shapesOf(pages.map((p) => p.shapes))).toContain('tree')
    expect(documentToDeckSpec(document).spec.motif).toBe('tree')
    const report = analyzeDeck(deck('doodle', 'tree'))
    expect(report[1].blocks.some((b) => b.id.startsWith('style:') && b.type === 'tls.l.split')).toBe(true)
  })
})
