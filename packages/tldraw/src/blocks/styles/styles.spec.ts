/**
 * AC1 — deck styles (`reviews/blocks/ai-curation/README.md` §3.2, §6 AC1 "Done when").
 */
import * as fs from 'fs'
import * as path from 'path'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'
import { BUILT_IN_STYLES, getDeckStyle, mergeDeckTokens, styleCard, applyStyleBlockDefaults } from './index'
import { deckSpecToDocument } from '../deck-document'
import { documentToDeckSpec } from '../slide-decompiler'
import { validateDeckSpec } from '../validate-deck-spec'
import { deckSpecJsonSchema } from '../deck-spec-json-schema'
import { analyzeDeck } from '../layout-report'
import { BUILT_IN_BLOCKS } from '../library'
import { contrastRatio, hexToRgb, relativeLuminance } from '../color-math'
import { BLOCK_PROP_KEY, shapeToAuthoredBlock, shapeToBlock } from '../shape-bridge'
import type { ComponentShape } from '~types'
import type { DeckSpec } from '../types'
import { buildBlockMetrics } from '../block-metrics'
import { resolveTokens } from '../tokens'
import { deckSpecTokens, resolveDeckTheme } from '../index'

const FIX = path.resolve(__dirname, '../__fixtures__/styles')
const DECKS: DeckSpec[] = BUILT_IN_STYLES.map((s) => JSON.parse(fs.readFileSync(path.join(FIX, `${s.id}.json`), 'utf8')))
const lum = (hex: string) => relativeLuminance(hexToRgb(hex))
const byType = new Map(BUILT_IN_BLOCKS.map((d) => [d.type, d]))

describe('BUILT_IN_STYLES data', () => {
  it.each(BUILT_IN_STYLES.map((s) => [s.id, s] as const))('%s is well-formed', (_id, style) => {
    expect(style.palettes.length).toBeGreaterThanOrEqual(1)
    expect(style.palettes.length).toBeLessThanOrEqual(3)
    expect(style.brief.length).toBeLessThanOrEqual(240)
    expect(style.rules.length).toBeLessThanOrEqual(4)
    for (const p of style.palettes) {
      const builtIn = BUILT_IN_DECK_THEMES.some((t) => t.id === p.id)
      expect(builtIn || p.id.startsWith(`${style.id}-`)).toBe(true)
      // text ≥ 4.5:1 on background and surface
      for (const bg of [p.colors.background, p.colors.surface]) {
        expect(contrastRatio(lum(p.colors.text), lum(bg))).toBeGreaterThanOrEqual(4.5)
      }
    }
    for (const t of [...style.prefer, ...style.avoid]) expect(byType.has(t)).toBe(true)
    for (const [type, knobs] of Object.entries(style.blockDefaults)) {
      const def = byType.get(type)
      expect(def).toBeDefined()
      for (const [slot, value] of Object.entries(knobs)) {
        const spec = def!.schema[slot]
        expect(spec).toBeDefined()
        const kind = spec.type.kind
        expect(['enum', 'boolean']).toContain(kind)
        if (spec.type.kind === 'enum') expect(spec.type.values).toContain(value)
        else expect(typeof value).toBe('boolean')
      }
    }
    expect(styleCard(style).length).toBeLessThanOrEqual(1200)
  })

  it('palette ids are unique across styles and built-in themes (a reused built-in is the same object)', () => {
    const seen = new Map<string, unknown>()
    for (const t of BUILT_IN_DECK_THEMES) seen.set(t.id, t)
    for (const s of BUILT_IN_STYLES)
      for (const p of s.palettes) {
        if (seen.has(p.id)) expect(seen.get(p.id)).toBe(p)
        seen.set(p.id, p)
      }
  })
})

describe('resolution order (§3.2)', () => {
  const base: DeckSpec = DECKS[0]

  it('theme: a palette of the style is used; any other id falls back to palettes[0]', () => {
    const corp = getDeckStyle('corporate')!
    expect(deckSpecToDocument({ ...base, theme: 'midnight' }).document.theme?.id).toBe('midnight')
    expect(deckSpecToDocument({ ...base, theme: 'forest' }).document.theme?.id).toBe(corp.palettes[0].id)
  })

  it('tokens: DeckSpec.tokens win over the style tokens', () => {
    const merged = mergeDeckTokens({ radius: { md: 8 }, density: 'roomy', type: { title: { size: 72, lineHeight: 1.1 } } }, { radius: { md: 20 }, type: { title: { size: 90 } } })
    expect(merged).toEqual({ radius: { md: 20 }, density: 'roomy', type: { title: { size: 90, lineHeight: 1.1 } } })
  })

  it('blockDefaults fill only unauthored knobs; authored props win', () => {
    const defaults = { 'tls.c.cover': { variant: 'split', decoration: 'none' } }
    const block = { id: 'b', type: 'tls.c.cover', props: { title: 'x', variant: 'centered' } }
    const { block: out, filled } = applyStyleBlockDefaults(block, defaults)
    expect(out.props).toEqual({ decoration: 'none', title: 'x', variant: 'centered' })
    expect(filled).toEqual({ decoration: 'none' })
    expect(block.props).toEqual({ title: 'x', variant: 'centered' })
  })

  it('compile: the shape carries the style knobs and $block.styleDefaults; masters, motion and styleId resolve', () => {
    const { document } = deckSpecToDocument(base)
    const cover = Object.values(document.pages.st_01.shapes)[0] as ComponentShape
    expect(cover.props.variant).toBe('centered')
    expect((cover.props[BLOCK_PROP_KEY] as any).styleDefaults).toEqual({ variant: 'centered', decoration: 'none' })
    expect(document.styleId).toBe('corporate')
    expect(document.pages.st_01.masterId).toBe('style:cover')
    expect(document.pages.st_03.masterId).toBe('style:section')
    expect(document.pages.st_04.masterId).toBe('style:content')
    expect(document.masters?.['style:cover']).toBeDefined()
    expect(document.tokens).toBeUndefined()
    expect(document.motionStyle).toBeUndefined()
    // style motion (subtle) animates blocks with no own motion
    expect(cover.animation).toBeDefined()
    // renderers read the look through shapeToBlock; the decompiler drops it again
    expect(shapeToBlock(cover)?.props.decoration).toBe('none')
    expect(shapeToAuthoredBlock(cover)?.props.decoration).toBeUndefined()
  })
})

describe('the three pilot decks', () => {
  it.each(DECKS.map((d) => [d.style!, d] as const))('%s round-trips byte-identical (style defaults not leaked)', (_s, deck) => {
    const { spec } = documentToDeckSpec(deckSpecToDocument(deck).document)
    expect(JSON.stringify(spec.slides)).toBe(JSON.stringify(deck.slides))
    expect(spec.style).toBe(deck.style)
    expect(spec.tokens).toBeUndefined()
    expect(spec.masters).toBeUndefined()
    expect(spec.motionStyle).toBeUndefined()
  })

  it.each(DECKS.map((d) => [d.style!, d] as const))('%s validates with 0 errors / 0 warnings', (_s, deck) => {
    expect(validateDeckSpec(deck)).toEqual([])
  })

  it.each(DECKS.map((d) => [d.style!, d] as const))('%s reports clean in analyzeDeck', (_s, deck) => {
    const findings = analyzeDeck(deck).flatMap((r) => r.findings).filter((f) => f.severity !== 'info')
    expect(findings).toEqual([])
  })

  it('share the same content: only id, title, theme and style differ', () => {
    const strip = (d: DeckSpec) => JSON.stringify(d.slides)
    expect(new Set(DECKS.map(strip)).size).toBe(1)
  })
})

describe('validator + JSON schema', () => {
  it('style/unknown is an error with a suggestion', () => {
    const f = validateDeckSpec({ ...DECKS[0], style: 'corprate' })
    expect(f).toEqual([expect.objectContaining({ level: 'error', rule: 'style/unknown', path: 'style', suggestion: 'corporate' })])
  })

  it('style/theme-mismatch warns and names the default palette', () => {
    const f = validateDeckSpec({ ...DECKS[1], theme: 'midnight' })
    expect(f).toEqual([expect.objectContaining({ level: 'warning', rule: 'style/theme-mismatch', suggestion: 'minimal-white' })])
  })

  it('a style palette id is a valid theme id', () => {
    expect(validateDeckSpec({ ...DECKS[2], theme: 'gradient-dawn' })).toEqual([])
  })

  it('the JSON schema knows style and the palette ids', () => {
    const schema = deckSpecJsonSchema() as any
    expect(schema.properties.style.enum).toEqual(BUILT_IN_STYLES.map((s) => s.id))
    expect(schema.properties.theme.oneOf[0].enum).toContain('gradient-night')
  })
})

describe('AC5 — oracle validity per style (§3.5)', () => {
  const tier1 = BUILT_IN_BLOCKS.filter((d) => d.aiTier === 1).map((d) => d.type)
  // Every palette: a style whose type scale or font breaks a block's size.min is a wrong style.
  const cases = BUILT_IN_STYLES.flatMap((s) => s.palettes.map((p) => [`${s.id}/${p.id}`, s, p.id] as const))
  it.each(cases)('%s: every tier-1 example still fits its size.min', (_n, style, palette) => {
    const tokens = resolveTokens(resolveDeckTheme(palette, style.id), deckSpecTokens({ style: style.id }))
    const file = buildBlockMetrics(undefined, { types: tier1, tokens, blockDefaults: style.blockDefaults, themeName: `${style.id}/${palette}` })
    const broken = Object.entries(file.blocks)
      .filter(([, c]) => c.atMin && !c.atMin.fits)
      .map(([t, c]) => `${t} h=${c.atMin!.h}`)
    expect(broken).toEqual([])
  })
})

describe('AC5 — every palette passes the contrast spec', () => {
  // text ≥ 4.5:1 on background and surface (above, per style) and textMuted ≥ 3:1 on both
  it.each(BUILT_IN_STYLES.flatMap((s) => s.palettes.map((p) => [p.id, p] as const)))('%s', (_id, p) => {
    for (const bg of [p.colors.background, p.colors.surface]) {
      expect(contrastRatio(lum(p.colors.text), lum(bg))).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(lum(p.colors.textMuted), lum(bg))).toBeGreaterThanOrEqual(3)
    }
  })
})
