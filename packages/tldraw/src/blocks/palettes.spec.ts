/** spro v2 V3.1 — palettes around one colour: readable on light and dark styles, roles kept. */
import { BUILT_IN_STYLES } from './styles'
import { deckSpecTokens } from './styles'
import { resolveDeckTheme } from './deck-document'
import { derivePalettes, groundFor, hexContrast, hexToOklch, oklchToHex, paletteColors, partnerPalettes } from './palettes'

const baseOf = (id: string) => paletteColors(BUILT_IN_STYLES.find((s) => s.id === id)!.palettes[0] as unknown as { colors: Record<string, string> })

test('OKLCH round trip keeps a colour', () => {
  for (const hex of ['#16A34A', '#0B5FFF', '#F59E0B', '#111827', '#FFFFFF']) {
    const [L, C, H] = hexToOklch(hex)
    expect(hexContrast(oklchToHex(L, C, H), hex)).toBeLessThan(1.05)
  }
})

test.each([
  ['corporate', '#16A34A'],
  ['gradient', '#F59E0B'],
  ['doodle-chalkboard', '#FDE047'],
  ['minimal', '#FFFFFF'],
])('derive on %s: four harmonies, readable, background kept', (style, seed) => {
  const base = baseOf(style)
  const ps = derivePalettes(base, seed)
  expect(ps.map((p) => p.harmony)).toEqual(['analogous', 'complementary', 'split', 'mono'])
  for (const p of ps) {
    expect(p.contrast.text).toBeGreaterThanOrEqual(4.5)
    expect(Math.min(p.contrast.accent, p.contrast.accent2)).toBeGreaterThanOrEqual(3)
    expect(p.swatch.background).toBe(base.background)
    expect(p.categorical.length).toBeGreaterThanOrEqual(4)
  }
})

test('partners keep the changed colour', () => {
  const ps = partnerPalettes(baseOf('corporate'), { accent: '#0B5FFF', accent2: '#E11D48' }, 'accent2')
  expect(ps).toHaveLength(3)
  for (const p of ps) expect(hexContrast(p.tokens.accent2, '#E11D48')).toBeLessThan(1.3)
})

/* spro sprint 2026-11c S21-c — a ground from the document or the theme. The 8 cases' colours on every style:
   each derived palette either carries a ground its text reads on, or keeps the style's background. */
const CASE_COLOURS = [
  '#E94B35', '#FFC83D', '#F7F0E3', // MĂM tomato, mustard, cream
  '#D9C7A8', '#8FB8AD', '#C4623A', '#1F2A44', '#F6F1E7', // Linen & Tide sand, sea glass, terracotta, ink navy, chalk
  '#2E7D32', '#9E9E9E', '#FFFFFF', // waste bags green, grey, white
  '#6B2D5C', '#0F172A', '#B8860B', // ha-giang plum, lumo ink, coffee ochre
]

test('every style × the 8 cases: a ground reads or the background stays; text is never recoloured', () => {
  for (const style of BUILT_IN_STYLES) {
    for (const p of style.palettes) {
      const base = paletteColors(p as unknown as { colors: Record<string, string> })
      for (const g of CASE_COLOURS) {
        for (const d of derivePalettes(base, '#E94B35', ['analogous'], { ground: g })) {
          const bg = d.tokens.ground ?? base.background
          expect(d.swatch.background).toBe(bg)
          expect(d.swatch.text).toBe(base.text)
          if (d.tokens.ground) {
            expect(hexContrast(base.text, bg)).toBeGreaterThanOrEqual(4.5)
            expect(hexContrast(base.textMuted, bg)).toBeGreaterThanOrEqual(3)
          }
          expect(hexContrast(d.tokens.accent, bg)).toBeGreaterThanOrEqual(2.95)
        }
      }
    }
  }
})

test('a pale document colour becomes the ground of a light style, kept as given when it reads', () => {
  const base = baseOf('minimal')
  for (const g of ['#F7F0E3', '#F6F1E7', '#D9C7A8']) {
    const [d] = derivePalettes(base, '#1F2A44', ['analogous'], { ground: g })
    expect(d.tokens.ground).toBeDefined()
    // same hue family: the ground is the colour or a lighter step of it
    expect(Math.abs(hexToOklch(d.tokens.ground!)[2] - hexToOklch(g)[2]) < 25 || hexToOklch(g)[1] < 0.02).toBe(true)
  }
  expect(groundFor(base, '#F7F0E3')).toBe('#F7F0E3')
})

test('a deep colour under a dark-text style is refused, not a dark page with dark text', () => {
  const base = baseOf('minimal')
  expect(groundFor(base, '#0F172A')).toBeUndefined()
  const [d] = derivePalettes(base, '#E94B35', ['analogous'], { ground: '#0F172A' })
  expect(d.tokens.ground).toBeUndefined()
  expect(d.swatch.background).toBe(base.background)
})

test('a spec ground reaches the page background through the style tokens', () => {
  const tokens = deckSpecTokens({ style: 'minimal', tokens: { ground: '#F7F0E3', color: { accent: '#E94B35' } } } as never)
  expect(tokens?.ground).toBe('#F7F0E3')
  const theme = resolveDeckTheme(undefined as never, 'minimal', tokens)
  expect(theme.colors.background).toBe('#F7F0E3')
  expect(theme.colors.accent1).toBe('#E94B35')
  expect(resolveDeckTheme(undefined as never, 'minimal', deckSpecTokens({ style: 'minimal' } as never)).colors.background).not.toBe('#F7F0E3')
})
