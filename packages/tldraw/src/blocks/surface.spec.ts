import { resolveColor, resolveTokens, surfaceFromBackground, surfaceFromPaint } from './tokens'
import { BUILT_IN_DECK_THEMES, GRADIENT_PRESETS } from '~state/shapes/shared'
import { DEFAULT_SLIDE_SIZE } from '~constants'
import type { Box, ColorRole, Paint } from './types'
import type { DeckTheme, SlideBackground } from '~types'

const [PAGE_W, PAGE_H] = DEFAULT_SLIDE_SIZE
const monoGrid = BUILT_IN_DECK_THEMES.find((t) => t.id === 'mono-grid')!

const smallBox = (x: number, y: number): Box => ({ x, y, width: 100, height: 100 })

// Five page positions spanning the full range any linear/radial gradient can project onto —
// the corners and centre of the slide — standing in for "5 positions along the gradient" from
// a gradient-agnostic angle, since which literal (x, y) lands at t=0/0.25/.../1 depends on the
// gradient's own angle.
const SAMPLE_BOXES: Box[] = [
  smallBox(0, 0),
  smallBox(PAGE_W - 100, 0),
  smallBox(0, PAGE_H - 100),
  smallBox(PAGE_W - 100, PAGE_H - 100),
  smallBox(PAGE_W / 2 - 50, PAGE_H / 2 - 50),
]

const FOREGROUND_ROLES: ColorRole[] = ['text', 'textMuted', 'line']
const FLOOR: Record<'text' | 'textMuted' | 'line', number> = {
  text: 4.5,
  textMuted: 4.5,
  line: 1.4,
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Acceptance §1 — the known bug reproduces as fixed                               */
/* ─────────────────────────────────────────────────────────────────────────────── */
// reviews/roadmap-slides.md: "a mono-grid stat row on a teal gradient renders muted captions
// that are nearly illegible." `northern-lights` (#43CEA2 → #185A9D) is exactly that teal-to-navy
// gradient; a box in the bottom-right corner (default 135° angle: "to bottom right") sits deep
// in the dark #185A9D end. Against `theme.colors.background` (#FAFAFA, the OLD, wrong comparison)
// `textMuted` (#555555) reads at ~7.1:1 — looks perfectly fine. Against what's actually behind
// it (~0.114 luminance), it's ~1.16:1 — nearly invisible. This test is the fix: `resolveColor`
// must now solve against the real surface and come back legible.
describe('the named bug: mono-grid stat row on a teal gradient', () => {
  const tealGradient: SlideBackground = GRADIENT_PRESETS.find((p) => p.id === 'northern-lights')!
    .background
  const darkEndBox: Box = { x: 1820, y: 980, width: 100, height: 100 } // bottom-right corner

  it('the surface at the dark end is actually dark (confirms the reproduction is real)', () => {
    const ctx = surfaceFromBackground(tealGradient, darkEndBox, [PAGE_W, PAGE_H], monoGrid)
    expect(ctx.luminance).toBeLessThan(0.2)
  })

  it('resolveColor("textMuted", ...) is now legible: ok:true at >= 4.5:1', () => {
    const tokens = resolveTokens(monoGrid)
    const ctx = surfaceFromBackground(tealGradient, darkEndBox, [PAGE_W, PAGE_H], monoGrid)
    const result = resolveColor('textMuted', ctx, tokens, monoGrid)
    expect(result.ok).toBe(true)
    expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    // And it actually moved away from the theme's flat #555555 — proving this isn't accidentally
    // passing because the naive (surface-blind) value already happened to work.
    expect(result.color.toUpperCase()).not.toBe('#555555')
  })

  // P0 regression (coordinator review): the previous [0.04, 0.96]-only clamp reported ok:false
  // for this exact box even though a real, legible answer (pure white, 4.773:1) existed one step
  // further out. Box centre chosen so `surfaceFromBackground` samples this gradient at t ≈
  // 0.7165, which lands on exactly luminance 0.170 — the pinned failing case.
  it('regression: a box sampling this gradient at luminance 0.170 still resolves ok:true', () => {
    const box: Box = { x: 1325.63, y: 723.79, width: 100, height: 100 }
    const ctx = surfaceFromBackground(tealGradient, box, [PAGE_W, PAGE_H], monoGrid)
    expect(ctx.luminance).toBeCloseTo(0.17, 2)
    const result = resolveColor('textMuted', ctx, resolveTokens(monoGrid), monoGrid)
    expect(result.ok).toBe(true)
    expect(result.ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('the OLD (surface-blind) comparison against theme.colors.background would have looked fine — this is why the bug was invisible', () => {
    // Not a call into production code — a deliberate re-derivation of the wrong comparison the
    // bug report describes, to document exactly why nothing caught this before P19.
    const naiveCtx = surfaceFromBackground(undefined, darkEndBox, [PAGE_W, PAGE_H], monoGrid)
    const naiveRatio = resolveColor('textMuted', naiveCtx, resolveTokens(monoGrid), monoGrid).ratio
    const realRatio = resolveColor(
      'textMuted',
      surfaceFromBackground(tealGradient, darkEndBox, [PAGE_W, PAGE_H], monoGrid),
      resolveTokens(monoGrid),
      monoGrid
    ).ratio
    expect(naiveRatio).toBeGreaterThan(4.5)
    expect(realRatio).toBeLessThan(naiveRatio)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Acceptance §3 — box-aware sampling                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */
describe('box-aware gradient sampling', () => {
  const gradient: SlideBackground = GRADIENT_PRESETS.find((p) => p.id === 'northern-lights')!
    .background
  const lightEndBox: Box = { x: 0, y: 0, width: 100, height: 100 } // top-left — near stop 0
  const darkEndBox: Box = { x: 1820, y: 980, width: 100, height: 100 } // bottom-right — near stop 1

  it('the same gradient background yields different luminance at different boxes', () => {
    const lightCtx = surfaceFromBackground(gradient, lightEndBox, [PAGE_W, PAGE_H], monoGrid)
    const darkCtx = surfaceFromBackground(gradient, darkEndBox, [PAGE_W, PAGE_H], monoGrid)
    expect(lightCtx.luminance).not.toBeCloseTo(darkCtx.luminance, 1)
    expect(lightCtx.luminance).toBeGreaterThan(darkCtx.luminance)
  })

  it('and therefore resolves different text colours for the two boxes', () => {
    const tokens = resolveTokens(monoGrid)
    const lightCtx = surfaceFromBackground(gradient, lightEndBox, [PAGE_W, PAGE_H], monoGrid)
    const darkCtx = surfaceFromBackground(gradient, darkEndBox, [PAGE_W, PAGE_H], monoGrid)
    const lightResult = resolveColor('text', lightCtx, tokens, monoGrid)
    const darkResult = resolveColor('text', darkCtx, tokens, monoGrid)
    expect(lightResult.color).not.toBe(darkResult.color)
    // Both still legible — the point isn't that one fails, it's that they solve independently.
    expect(lightResult.ok).toBe(true)
    expect(darkResult.ok).toBe(true)
  })

  it('sampling at the slide centre (the old, wrong reference point) differs from either box', () => {
    const centerBox: Box = { x: PAGE_W / 2 - 50, y: PAGE_H / 2 - 50, width: 100, height: 100 }
    const centerCtx = surfaceFromBackground(gradient, centerBox, [PAGE_W, PAGE_H], monoGrid)
    const darkCtx = surfaceFromBackground(gradient, darkEndBox, [PAGE_W, PAGE_H], monoGrid)
    expect(centerCtx.luminance).not.toBeCloseTo(darkCtx.luminance, 1)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Acceptance §2 — exhaustive sweep                                                */
/* ─────────────────────────────────────────────────────────────────────────────── */
describe('exhaustive sweep: every theme x every surface x every foreground role', () => {
  it('has exactly 24 gradient presets to sweep (sanity on the fixture itself)', () => {
    expect(GRADIENT_PRESETS).toHaveLength(24)
  })

  // Post P0-fix, this sweep's `failed` count is provably 0, not merely "small": both floors this
  // codebase uses (text/textMuted 4.5, line 1.4) are below √21 ≈ 4.583, and WCAG's algebra
  // guarantees max(contrast-to-black, contrast-to-white) ≥ √21 against ANY surface luminance —
  // see `color-math.ts`'s module comment on `solveForContrast`. `ok: false` remains real,
  // correct fallback logic (exercised directly in `color-math.spec.ts` with an artificial
  // floor of 5), just not reachable for the floors actually in use today.
  it('never throws, and every result meets its floor (0 ok:false across the full sweep)', () => {
    let total = 0
    let failed = 0

    for (const theme of BUILT_IN_DECK_THEMES) {
      const tokens = resolveTokens(theme)
      const surfaces: Array<{ label: string; background: SlideBackground | undefined; box: Box }> = [
        { label: 'light bg', background: { type: 'solid', color: '#FFFFFF' }, box: smallBox(0, 0) },
        { label: 'dark bg', background: { type: 'solid', color: '#000000' }, box: smallBox(0, 0) },
      ]
      for (const preset of GRADIENT_PRESETS) {
        for (const box of SAMPLE_BOXES) {
          surfaces.push({ label: `${preset.id}`, background: preset.background, box })
        }
      }

      for (const surface of surfaces) {
        const ctx = surfaceFromBackground(surface.background, surface.box, [PAGE_W, PAGE_H], theme)
        for (const role of FOREGROUND_ROLES) {
          total++
          const result = resolveColor(role, ctx, tokens, theme)
          expect(typeof result.ok).toBe('boolean')
          expect(Number.isFinite(result.ratio)).toBe(true)
          expect(result.color).toMatch(/^#[0-9A-F]{6}$/i)
          const floor = FLOOR[role as 'text' | 'textMuted' | 'line']
          if (result.ok) {
            expect(result.ratio).toBeGreaterThanOrEqual(floor)
          } else {
            failed++
            expect(result.ratio).toBeLessThan(floor)
          }
        }
      }
    }

    // 5 themes x (2 solid + 24 presets x 5 boxes) x 3 roles.
    expect(total).toBe(5 * (2 + 24 * 5) * 3)
    // Provably 0 (see the test's own doc comment) — pin it exactly rather than "a small
    // minority", so a future regression that reintroduces the old too-narrow clamp fails loudly.
    expect(failed).toBe(0)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Acceptance §5 — literals are never adjusted                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */
describe('literal colours and theme tokens are never contrast-adjusted', () => {
  const tokens = resolveTokens(monoGrid)
  const darkCtx = surfaceFromBackground({ type: 'solid', color: '#000000' }, smallBox(0, 0), [
    PAGE_W,
    PAGE_H,
  ])
  const lightCtx = surfaceFromBackground({ type: 'solid', color: '#FFFFFF' }, smallBox(0, 0), [
    PAGE_W,
    PAGE_H,
  ])

  it('an explicit hex literal comes back unchanged on a dark surface', () => {
    expect(resolveColor('#FF0000', darkCtx, tokens).color).toBe('#FF0000')
  })

  it('the same literal comes back unchanged on a light surface (illegible or not)', () => {
    // #FFFF00 (bright yellow) on white is a real legibility problem — and resolveColor must NOT
    // fix it, because a literal is the user's pinned value (Phase 8b's rule, inherited unchanged).
    expect(resolveColor('#FFFF00', lightCtx, tokens).color).toBe('#FFFF00')
  })

  it('a `theme:accent1` token resolves to the theme colour, still unadjusted', () => {
    const result = resolveColor('theme:accent1', darkCtx, tokens, monoGrid)
    expect(result.color).toBe(monoGrid.colors.accent1)
  })

  it('an unresolvable theme token (no active theme) passes through as-is rather than throwing', () => {
    expect(() => resolveColor('theme:accent1', darkCtx, tokens, undefined)).not.toThrow()
    const result = resolveColor('theme:accent1', darkCtx, tokens, undefined)
    expect(result.color).toBe('theme:accent1')
    expect(result.ok).toBe(true)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* surfaceFromBackground — the other cases                                        */
/* ─────────────────────────────────────────────────────────────────────────────── */
describe('surfaceFromBackground', () => {
  it('falls back to the theme background colour when the page has no background set', () => {
    const ctx = surfaceFromBackground(undefined, smallBox(0, 0), [PAGE_W, PAGE_H], monoGrid)
    expect(ctx.behind).toEqual({ type: 'solid', color: monoGrid.colors.background })
    expect(ctx.overImage).toBe(false)
  })

  it('falls back to the same neutral grey TemplateThumbnail.tsx uses when there is no theme either', () => {
    const ctx = surfaceFromBackground(undefined, smallBox(0, 0), [PAGE_W, PAGE_H], undefined)
    expect(ctx.behind).toEqual({ type: 'solid', color: '#e8e8e8' })
  })

  it('accepts the legacy bare-string background shape', () => {
    const ctx = surfaceFromBackground('#123456', smallBox(0, 0), [PAGE_W, PAGE_H])
    expect(ctx.behind).toEqual({ type: 'solid', color: '#123456' })
  })

  it('resolves a theme token in a solid background', () => {
    const ctx = surfaceFromBackground(
      { type: 'solid', color: 'theme:accent1' },
      smallBox(0, 0),
      [PAGE_W, PAGE_H],
      monoGrid
    )
    expect((ctx.behind as Extract<Paint, { type: 'solid' }>).color).toBe(monoGrid.colors.accent1)
  })

  it('reports overImage:true and a neutral mid luminance for an image background', () => {
    const ctx = surfaceFromBackground(
      { type: 'image', assetId: 'a1', fit: 'cover' },
      smallBox(500, 500),
      [PAGE_W, PAGE_H],
      monoGrid
    )
    expect(ctx.overImage).toBe(true)
    expect(ctx.luminance).toBe(0.5)
  })

  it('never throws for a degenerate zero-size page', () => {
    expect(() => surfaceFromBackground(undefined, smallBox(0, 0), [0, 0], monoGrid)).not.toThrow()
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* surfaceFromPaint — a parent block's own fill                                    */
/* ─────────────────────────────────────────────────────────────────────────────── */
describe('surfaceFromPaint', () => {
  const parentBox: Box = { x: 100, y: 100, width: 800, height: 400 }
  const gradientFill: Paint = {
    type: 'linearGradient',
    angle: 90, // "to right": light stop at the left edge, dark stop at the right edge
    stops: [
      { color: '#FFFFFF', at: 0 },
      { color: '#000000', at: 1 },
    ],
  }

  it('a solid fill has the same luminance everywhere in the box', () => {
    const solid: Paint = { type: 'solid', color: '#336699' }
    const left = surfaceFromPaint(solid, { x: 100, y: 100, width: 50, height: 50 }, parentBox)
    const right = surfaceFromPaint(solid, { x: 800, y: 400, width: 50, height: 50 }, parentBox)
    expect(left.luminance).toBe(right.luminance)
  })

  it('samples a gradient fill relative to the PARENT box, not the page', () => {
    const nearLeftEdge: Box = { x: 110, y: 280, width: 20, height: 20 }
    const nearRightEdge: Box = { x: 870, y: 280, width: 20, height: 20 }
    const leftCtx = surfaceFromPaint(gradientFill, nearLeftEdge, parentBox)
    const rightCtx = surfaceFromPaint(gradientFill, nearRightEdge, parentBox)
    expect(leftCtx.luminance).toBeGreaterThan(rightCtx.luminance)
    expect(leftCtx.luminance).toBeGreaterThan(0.8) // near the white stop
    expect(rightCtx.luminance).toBeLessThan(0.2) // near the black stop
  })

  it('never throws for a degenerate zero-size parent box', () => {
    const degenerate: Box = { x: 100, y: 100, width: 0, height: 0 }
    expect(() => surfaceFromPaint(gradientFill, degenerate, degenerate)).not.toThrow()
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Per-theme status colours (P19 deliverable c)                                    */
/* ─────────────────────────────────────────────────────────────────────────────── */
describe('positive/negative/warning are set per built-in theme', () => {
  it.each(BUILT_IN_DECK_THEMES.map((t) => [t.id, t] as [string, DeckTheme]))(
    '%s has its own positive/negative/warning',
    (_id, theme) => {
      expect(theme.colors.positive).toBeDefined()
      expect(theme.colors.negative).toBeDefined()
      expect(theme.colors.warning).toBeDefined()
    }
  )
})
