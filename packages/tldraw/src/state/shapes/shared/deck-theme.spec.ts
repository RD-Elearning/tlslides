import { BUILT_IN_DECK_THEMES, isThemeToken, resolveThemeColor, themeToken } from './deck-theme'
import type { DeckTheme } from '~types'

const theme: DeckTheme = BUILT_IN_DECK_THEMES[0]

describe('resolveThemeColor — the one place a theme token resolves', () => {
  it('passes undefined through unchanged', () => {
    expect(resolveThemeColor(undefined, theme)).toBeUndefined()
  })

  it('passes a literal hex through unchanged, theme or no theme', () => {
    expect(resolveThemeColor('#43CEA2', theme)).toBe('#43CEA2')
    expect(resolveThemeColor('#43CEA2', undefined)).toBe('#43CEA2')
  })

  it('resolves a token against the active theme', () => {
    expect(resolveThemeColor(themeToken('accent1'), theme)).toBe(theme.colors.accent1)
    expect(resolveThemeColor(themeToken('background'), theme)).toBe(theme.colors.background)
  })

  it('degrades to undefined — not a hardcoded colour — when no theme is active', () => {
    expect(resolveThemeColor(themeToken('accent1'), undefined)).toBeUndefined()
  })

  it('degrades to undefined for an unknown token key, same as no theme at all', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(resolveThemeColor('theme:notAColor' as any, theme)).toBeUndefined()
  })

  it('round-trips through themeToken/isThemeToken', () => {
    const token = themeToken('accent2')
    expect(token).toBe('theme:accent2')
    expect(isThemeToken(token)).toBe(true)
    expect(isThemeToken('#ffffff')).toBe(false)
    expect(isThemeToken(undefined)).toBe(false)
  })
})

describe('BUILT_IN_DECK_THEMES', () => {
  it('ships between 4 and 6 themes, per the brief', () => {
    expect(BUILT_IN_DECK_THEMES.length).toBeGreaterThanOrEqual(4)
    expect(BUILT_IN_DECK_THEMES.length).toBeLessThanOrEqual(6)
  })

  it('every theme has a unique id and a full colour set', () => {
    const ids = BUILT_IN_DECK_THEMES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const t of BUILT_IN_DECK_THEMES) {
      expect(t.colors.background).toMatch(/^#/)
      expect(t.colors.surface).toMatch(/^#/)
      expect(t.colors.text).toMatch(/^#/)
      expect(t.colors.textMuted).toMatch(/^#/)
      expect(t.colors.accent1).toMatch(/^#/)
      expect(t.colors.accent2).toMatch(/^#/)
      // text and background must not be the same colour, or every template built from this
      // theme would render invisible text.
      expect(t.colors.text.toLowerCase()).not.toBe(t.colors.background.toLowerCase())
    }
  })

  it('round-trips through JSON — a theme is plain data too', () => {
    for (const t of BUILT_IN_DECK_THEMES) {
      expect(JSON.parse(JSON.stringify(t))).toEqual(t)
    }
  })
})
