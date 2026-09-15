import { resolveTokens } from './tokens'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared'
import { SPACE_SCALE, TYPE_SCALE } from './scales'
import type { TDDocument, DeckTheme } from '~types'

const midnight = BUILT_IN_DECK_THEMES.find((t) => t.id === 'midnight')!
const monoGrid = BUILT_IN_DECK_THEMES.find((t) => t.id === 'mono-grid')!

describe('resolveTokens', () => {
  it('derives every ColorRole from the theme when no DeckTokens are given', () => {
    const tokens = resolveTokens(midnight)
    const roles = [
      'surface',
      'surfaceAlt',
      'accent',
      'accent2',
      'text',
      'textMuted',
      'positive',
      'negative',
      'warning',
      'neutral',
      'line',
      'scrim',
    ] as const
    for (const role of roles) {
      expect(typeof tokens.color[role]).toBe('string')
      expect(tokens.color[role].length).toBeGreaterThan(0)
    }
  })

  it('uses a theme override for positive/negative/warning when present', () => {
    const tokens = resolveTokens(midnight)
    expect(tokens.color.positive).toBe(midnight.colors.positive)
    expect(tokens.color.negative).toBe(midnight.colors.negative)
    expect(tokens.color.warning).toBe(midnight.colors.warning)
  })

  it('falls back to a generic status family for a theme that predates Phase 19', () => {
    const legacyTheme: DeckTheme = {
      ...midnight,
      colors: {
        background: midnight.colors.background,
        surface: midnight.colors.surface,
        text: midnight.colors.text,
        textMuted: midnight.colors.textMuted,
        accent1: midnight.colors.accent1,
        accent2: midnight.colors.accent2,
        // no positive/negative/warning — simulates a host brand kit written before this phase
      },
    }
    const tokens = resolveTokens(legacyTheme)
    expect(tokens.color.positive).toBe('#0CA30C')
    expect(tokens.color.negative).toBe('#D03B3B')
    expect(tokens.color.warning).toBe('#D97706')
  })

  it('picks a DIFFERENT positive/negative/warning per theme (not one global set)', () => {
    const palettes = BUILT_IN_DECK_THEMES.map((theme) => resolveTokens(theme).color)
    const positives = new Set(palettes.map((c) => c.positive))
    const negatives = new Set(palettes.map((c) => c.negative))
    const warnings = new Set(palettes.map((c) => c.warning))
    // 5 built-in themes: every one of these sets should have more than one distinct value.
    expect(positives.size).toBeGreaterThan(1)
    expect(negatives.size).toBeGreaterThan(1)
    expect(warnings.size).toBeGreaterThan(1)
  })

  it('generates a 6-colour categorical ramp from the theme accents by default', () => {
    const tokens = resolveTokens(midnight)
    expect(tokens.categorical).toHaveLength(6)
  })

  it('overrides the categorical ramp wholesale when DeckTokens.categorical is given', () => {
    const custom = ['#111111', '#222222']
    const tokens = resolveTokens(midnight, { categorical: custom })
    expect(tokens.categorical).toEqual(custom)
    expect(tokens.categorical).not.toBe(custom) // copied, not aliased
  })

  it('fills the type scale from TYPE_SCALE by default, copied not aliased', () => {
    const tokens = resolveTokens(midnight)
    expect(tokens.type).toEqual(TYPE_SCALE)
    expect(tokens.type).not.toBe(TYPE_SCALE)
    expect(tokens.type.body).not.toBe(TYPE_SCALE.body)
  })

  it('merges a partial type-scale override without discarding the rest of that token', () => {
    const tokens = resolveTokens(midnight, { type: { title: { size: 100 } } })
    expect(tokens.type.title).toEqual({ size: 100, lineHeight: TYPE_SCALE.title.lineHeight })
    // Untouched tokens are unaffected.
    expect(tokens.type.body).toEqual(TYPE_SCALE.body)
  })

  it('applies density to the spacing scale, and only after merging space overrides', () => {
    const defaultTokens = resolveTokens(midnight)
    expect(defaultTokens.space).toEqual(SPACE_SCALE)

    const compact = resolveTokens(midnight, { density: 'compact' })
    expect(compact.space.md).toBe(SPACE_SCALE.sm)
    expect(compact.density).toBe('compact')

    const roomy = resolveTokens(midnight, { density: 'roomy' })
    expect(roomy.space.md).toBe(SPACE_SCALE.lg)

    // A space override is shifted by density too, not bypassed by it.
    const customCompact = resolveTokens(midnight, { space: { md: 999 }, density: 'compact' })
    expect(customCompact.space.lg).toBe(999)
  })

  it('merges radius overrides over RADIUS_SCALE', () => {
    const tokens = resolveTokens(midnight, { radius: { md: 20 } })
    expect(tokens.radius.md).toBe(20)
    expect(tokens.radius.sm).toBe(8) // untouched default
  })

  it('merges elevation overrides per level, forcing `level` to stay correct', () => {
    const tokens = resolveTokens(midnight, { elevation: { 1: { blur: 999 } } })
    expect(tokens.elevation[1].blur).toBe(999)
    expect(tokens.elevation[1].level).toBe(1)
    expect(tokens.elevation[2].blur).not.toBe(999) // untouched
  })

  it('merges motion overrides without dropping the rest of the scale', () => {
    const tokens = resolveTokens(midnight, { motion: { duration: { fast: 50 } } })
    expect(tokens.motion.duration.fast).toBe(50)
    expect(tokens.motion.duration.slow).toBeGreaterThan(50)
    expect(typeof tokens.motion.ease.linear).toBe('string')
  })

  it('does not alias BUILT_IN_DECK_THEMES colours into the resolved output', () => {
    // Regression guard for the class of bug this repo has shipped twice (`DEFAULT_SLIDE_SIZE`,
    // Phase 18's `style: defaultStyle`): resolving tokens must never hand back a reference into
    // a shared, mutable, module-level object.
    const tokens = resolveTokens(monoGrid)
    expect(tokens.color).not.toBe(monoGrid.colors)
    expect(tokens.color.text).toEqual(monoGrid.colors.text) // same value...
    // ...but the containing color-role map itself is a fresh object, not `theme.colors` itself:
    expect(Object.keys(tokens.color)).not.toEqual(Object.keys(monoGrid.colors))
  })

  it('two calls with the same theme never share the same categorical/space/type object', () => {
    const a = resolveTokens(midnight)
    const b = resolveTokens(midnight)
    expect(a.categorical).toEqual(b.categorical)
    expect(a.categorical).not.toBe(b.categorical)
    expect(a.space).not.toBe(b.space)
    expect(a.type).not.toBe(b.type)
  })
})

// Acceptance §6 — "No migration": a TDDocument with no `tokens` field resolves to theme-derived
// defaults, and adding the optional field costs nothing structurally.
describe('TDDocument.tokens is optional and additive', () => {
  it('a TDDocument with no tokens field type-checks and resolves to theme defaults', () => {
    const doc: TDDocument = {
      id: 'doc-1',
      name: 'Untouched deck',
      version: 16,
      pages: {},
      pageStates: {},
      assets: {},
      // no `tokens`, no `theme` — the pre-Phase-19, pre-Phase-12 shape of every real document
    }
    expect(doc.tokens).toBeUndefined()
    const tokens = resolveTokens(midnight, doc.tokens)
    expect(tokens.color.text).toBe(midnight.colors.text)
  })

  it('TldrawApp.version stays 16 — this phase bumps nothing', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TldrawApp } = require('~state')
    expect(TldrawApp.version).toBe(16)
  })
})
