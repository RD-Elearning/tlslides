/** spro v2 V3.1 — palettes around one colour: readable on light and dark styles, roles kept. */
import { BUILT_IN_STYLES } from './styles'
import { derivePalettes, hexContrast, hexToOklch, oklchToHex, paletteColors, partnerPalettes } from './palettes'

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
