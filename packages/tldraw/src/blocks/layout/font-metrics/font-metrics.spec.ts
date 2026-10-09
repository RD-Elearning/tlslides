/**
 * AC3 — measured font families (`reviews/blocks/ai-curation/README.md` §6 AC3): the registry, the
 * family-stack resolution that replaced `tableFaceKey`'s name sniffing (F5), heading/body families
 * on the tokens and in text leaves, and the style fonts' consistency.
 */

import { FONT_FACES, faceByKey, faceCharEm, faceForFamily, faceKernEm, INTER_METRICS, textWidthRatio } from './index'
import { tableFaceFor, tableMetrics } from '../measure'
import { resolveTokens } from '../../tokens'
import { createLayoutContext } from '../layout-child'
import { posterTextCss } from '../../html-block'
import { BUILT_IN_STYLES } from '../../styles'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'

const SURFACE = { behind: { type: 'solid' as const, color: '#ffffff' }, luminance: 1, overImage: false }
const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i))

describe('AC3 font-metrics registry', () => {
  it('every face has every ASCII glyph at 400 and 700 (Inter: its LO5 table + bold factor), plus đ/Đ', () => {
    for (const face of FONT_FACES) {
      for (const ch of [...ASCII, 'đ', 'Đ']) {
        expect(face.regular[ch]).toBeGreaterThan(0)
        if (face !== INTER_METRICS) expect(face.bold[ch]).toBeGreaterThan(0)
      }
    }
    expect(new Set(FONT_FACES.map((f) => f.key)).size).toBe(FONT_FACES.length)
  })

  it('a Vietnamese letter falls back to its NFD base letter when it has no own entry', () => {
    const face = faceByKey('fraunces')!
    for (const ch of ['ạ', 'ể', 'ố', 'ừ', 'Ậ']) {
      const own = face.regular[ch]
      expect(faceCharEm(face, ch)).toBe(own ?? face.regular[ch.normalize('NFD')[0]])
    }
  })

  it('F5: a family stack resolves to its first measured family, never by substrings of the name', () => {
    expect(tableFaceFor('"Crimson Pro"')).toBe(faceByKey('crimson-pro'))
    expect(tableFaceFor('"Source Code Pro"')).toBe(faceByKey('source-code-pro'))
    expect(tableFaceFor('"Fraunces Variable", serif')).toBe(faceByKey('fraunces'))
    expect(tableFaceFor('"Plus Jakarta Sans", "Plus Jakarta Sans Variable", sans-serif')).toBe(faceByKey('plus-jakarta-sans'))
    expect(tableFaceFor('"Inter"')).toBe(INTER_METRICS)
    // no measured family: the stack's generic family picks the old hand table, else Inter
    expect(tableFaceFor('"Some Serif Face", serif')).toBe('serif')
    expect(tableFaceFor('Menlo, monospace')).toBe('mono')
    expect(tableFaceFor('"Source Sans Pro", sans-serif')).toBe(INTER_METRICS)
    expect(faceForFamily('"Nope"')).toBeUndefined()
  })

  it('tableMetrics measures with the family: a wide face wraps sooner than Inter', () => {
    const m = tableMetrics()
    const style = (family: string) => ({ family, size: 64, lineHeight: 1.2, letterSpacing: 0, color: '#000' })
    const inter = m('Where we win next', style('"Inter"')).width
    const mono = m('Where we win next', style('"Source Code Pro"')).width
    const hand = m('Where we win next', style('"Patrick Hand"')).width
    expect(mono).toBeGreaterThan(inter * 1.05)
    expect(hand).toBeLessThan(inter)
    // bold runs read the 700 table
    const boldW = m({ runs: [{ text: 'Where we win next', bold: true }] } as any, style('"Fraunces"')).width
    expect(boldW).toBeGreaterThan(m('Where we win next', style('"Fraunces"')).width)
  })

  it('kerning: measured pairs narrow the line as the browser does (Inter "Wo" -0.05 em, "8." / ".1")', () => {
    expect(faceKernEm(INTER_METRICS, 'W', 'o')).toBeCloseTo(-0.05, 3)
    expect(faceKernEm(INTER_METRICS, undefined, 'o')).toBe(0)
    expect(faceKernEm(INTER_METRICS, ' ', 'W')).toBe(0)
    // accented letters kern as their base letters
    expect(faceKernEm(INTER_METRICS, 'W', 'ố')).toBe(faceKernEm(INTER_METRICS, 'W', 'o'))
    const m = tableMetrics()
    const st = { family: '"Inter"', size: 100, lineHeight: 1.2, letterSpacing: 0, color: '#000' }
    const sum = [...'8.1'].reduce((a, ch) => a + faceCharEm(INTER_METRICS, ch) * 100, 0)
    expect(m('8.1', st).width).toBeLessThan(sum - 5)
    // every measured face except the monospace one has kerning pairs
    for (const face of FONT_FACES) if (face.key !== 'source-code-pro') expect(Object.keys(face.kern ?? {}).length).toBeGreaterThan(0)
  })

  it('textWidthRatio: Inter is 1, a mono face is wider, Patrick Hand narrower', () => {
    expect(textWidthRatio('inter')).toBe(1)
    expect(textWidthRatio('source-code-pro')).toBeGreaterThan(1)
    expect(textWidthRatio('patrick-hand')).toBeLessThan(1)
    expect(textWidthRatio('nope')).toBe(1)
  })
})

describe('AC3 heading / body families (F4)', () => {
  const ivory = BUILT_IN_DECK_THEMES.find((t) => t.id === 'ivory-editorial')!

  it('resolveTokens sets headingFamily and bodyFamily; fontFamily stays the heading family', () => {
    const t = resolveTokens(ivory)
    expect(t.headingFamily).toBe('"Crimson Pro"')
    expect(t.bodyFamily).toBe('"Inter"')
    expect(t.fontFamily).toBe(t.headingFamily)
  })

  it('heading tokens take the heading family, the rest the body family', () => {
    const ctx = createLayoutContext({ box: { width: 100, height: 100 }, tokens: resolveTokens(ivory), surface: SURFACE })
    for (const tok of ['display', 'title', 'heading', 'subheading'] as const) expect(ctx.resolveText(tok).family).toBe('"Crimson Pro"')
    for (const tok of ['lead', 'body', 'caption', 'footnote'] as const) expect(ctx.resolveText(tok).family).toBe('"Inter"')
    expect(ctx.resolveText('body', { family: 'X' }).family).toBe('X')
  })

  it('a poster leaf carries its family into the template css (single-quoted)', () => {
    expect(posterTextCss({ size: 10, lineHeight: 1, letterSpacing: 0, family: '"Crimson Pro", serif' })).toContain("font-family:'Crimson Pro', serif;")
    expect(posterTextCss({ size: 10, lineHeight: 1, letterSpacing: 0 })).not.toContain('font-family')
  })

  it('every style font has a table, and its own palettes name the same family first', () => {
    // (a reused built-in theme, e.g. corporate's mono-grid, keeps its own fonts)
    for (const style of BUILT_IN_STYLES) {
      for (const role of ['heading', 'body'] as const) {
        const ref = style.fonts[role]
        expect(faceByKey(ref.metricsKey)).toBeDefined()
        for (const p of style.palettes.filter((x) => x.id.startsWith(`${style.id}-`))) {
          const fam = role === 'heading' ? p.fonts?.headingFamily : p.fonts?.bodyFamily
          expect(faceForFamily(fam ?? '')?.key).toBe(ref.metricsKey)
        }
      }
    }
  })
})
