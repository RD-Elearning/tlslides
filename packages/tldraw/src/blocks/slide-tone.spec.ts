/** spro sprint 2026-11b S13-a — slide tone: every palette's `deep` / `accent` derivation reads (body
 *  4.5:1 on the ground and on a card, accents 3:1), a toned slide paints light text on a dark ground,
 *  and a spec without `tone` analyses exactly as before. */
import * as fs from 'fs'
import * as path from 'path'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'
import type { DeckTheme } from '~types'
import { BUILT_IN_STYLES } from './styles'
import { hexContrast, slideTheme } from './palettes'
import { analyzeDeck } from './layout-report'
import { resolveDeckTheme } from './deck-document'
import { documentToDeckSpec } from './slide-decompiler'
import { deckSpecToDocument } from './deck-document'
import { contextForBlock } from './deck-context'
import { resolveTokens } from './tokens'
import type { DeckSpec } from './types'

const ALL: DeckTheme[] = [...BUILT_IN_DECK_THEMES, ...BUILT_IN_STYLES.flatMap((s) => s.palettes as unknown as DeckTheme[])]

describe.each(['deep', 'accent'] as const)('slideTheme %s', (tone) => {
  test.each(ALL.map((t) => [t.id, t] as const))('%s reads', (_id, theme) => {
    const t = slideTheme(theme, tone)
    const c = t.colors
    expect(hexContrast(c.text, c.background)).toBeGreaterThanOrEqual(4.5)
    expect(hexContrast(c.text, c.surface)).toBeGreaterThanOrEqual(4.5)
    expect(hexContrast(c.textMuted, c.background)).toBeGreaterThanOrEqual(4.5)
    expect(hexContrast(c.accent1, c.background)).toBeGreaterThanOrEqual(3)
    expect(hexContrast(c.accent2, c.background)).toBeGreaterThanOrEqual(3)
    // a deep ground carries small accent text (kickers): accents read as body text there
    if (tone === 'deep') {
      expect(hexContrast(c.accent1, c.background)).toBeGreaterThanOrEqual(4.5)
      expect(hexContrast(c.accent2, c.background)).toBeGreaterThanOrEqual(4.5)
    }
    expect(t.tone).toBe(tone)
    // the resolved roles follow the ground (no deck colour override leaks in)
    const tokens = resolveTokens(t, { color: { surface: '#FFFFFF', accent: '#FFFF00' } })
    expect(tokens.color.surface).toBe(c.surface)
    expect(tokens.color.accent).toBe(c.accent1)
  })
})

test('deep is dark on a light deck; base / absent is the theme itself; memoised', () => {
  const light = BUILT_IN_DECK_THEMES.find((t) => t.id === 'ivory-editorial')!
  const deep = slideTheme(light, 'deep')
  expect(hexContrast(deep.colors.background, '#000000')).toBeLessThan(hexContrast(deep.colors.background, '#FFFFFF'))
  expect(slideTheme(light, 'deep')).toBe(deep)
  expect(slideTheme(light)).toBe(light)
  expect(slideTheme(light, 'base')).toBe(light)
})

const deckOf = (style: string): DeckSpec => JSON.parse(fs.readFileSync(path.join(__dirname, '__fixtures__/styles', `${style}.json`), 'utf8'))

test('a spec without tone analyses byte-identically; `base` is the same', () => {
  const deck = deckOf('corporate')
  const before = JSON.stringify(analyzeDeck(deck))
  expect(JSON.stringify(analyzeDeck({ ...deck, slides: deck.slides.map((s) => ({ ...s, tone: 'base' as const })) }))).toBe(before)
})

test.each(['corporate', 'academic-lecture', 'minimal'])('%s: a deep slide paints light text, its report stays clean of contrast', (style) => {
  const deck = deckOf(style)
  const content = deck.slides.findIndex((s) => s.role !== 'cover' && s.role !== 'section')
  const toned: DeckSpec = { ...deck, slides: deck.slides.map((s, i) => (i === content ? { ...s, tone: 'deep' as const } : s)) }
  const { document } = deckSpecToDocument(toned)
  const page = document.pages[toned.slides[content].id]
  expect(page.tone).toBe('deep')
  const shape = Object.values(page.shapes).find((sh) => !sh.id.startsWith('style:'))! as never
  const ctx = contextForBlock(shape, document, { headless: true, slideBackground: page.background })
  const base = resolveDeckTheme(deck.theme, deck.style)
  expect(ctx.tokens.color.text).toBe(slideTheme(base, 'deep').colors.text)
  expect(hexContrast(ctx.tokens.color.text, '#FFFFFF')).toBeLessThan(hexContrast(ctx.tokens.color.text, '#000000'))
  const findings = analyzeDeck(toned)[content].findings?.filter((f) => String((f as { kind?: string }).kind ?? '').startsWith('contrast')) ?? []
  const baseFindings = analyzeDeck(deck)[content].findings?.filter((f) => String((f as { kind?: string }).kind ?? '').startsWith('contrast')) ?? []
  expect(findings.length).toBeLessThanOrEqual(baseFindings.length)
})

describe('S13-H a toned slide paints its tone ground (the master only when the tone text reads on it)', () => {
  const page = (style: string, tone?: 'deep' | 'accent', slide = 0) => {
    const deck = deckOf(style)
    const toned: DeckSpec = { ...deck, slides: deck.slides.map((s, k) => (k === slide && tone ? { ...s, tone } : s)) }
    const { document } = deckSpecToDocument(toned)
    return { page: document.pages[toned.slides[slide].id], doc: document, toned }
  }
  const ground = (style: string, tone: 'deep' | 'accent') => {
    const { page: p, doc } = page(style, tone)
    return { bg: p.background as { type?: string; color?: string } | undefined, theme: slideTheme(doc.theme as never, tone) }
  }

  it('a masterless style paints the tone ground as a solid page (it painted nothing, so the deck ground showed)', () => {
    const { bg, theme } = ground('minimal', 'deep')
    expect(bg).toEqual({ type: 'solid', color: theme.colors.background })
    expect(hexContrast(theme.colors.text, bg!.color!)).toBeGreaterThanOrEqual(4.5)
  })

  it('no tone: unchanged', () => {
    expect(page('minimal').page.background).toBeUndefined()
  })

  it('a master page the tone text reads on is kept', () => {
    const { page: base } = page('corporate')
    const { bg } = ground('corporate', 'deep')
    if (base.background) expect(bg).toBeDefined()
  })

  it('the compiled solid ground is not written back into the spec', () => {
    const { doc, toned } = page('minimal', 'deep')
    const back = documentToDeckSpec(doc).spec
    expect(back.slides[0].background).toBeUndefined()
    expect(back.slides[0].tone).toBe('deep')
    expect(toned.slides[0].background).toBeUndefined()
  })
})
