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
