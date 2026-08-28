/**
 * @jest-environment node
 *
 * Phase 15 — the phase's real acceptance criterion. Every other spec in this package runs under
 * `testEnvironment: jsdom` (see `package.json`), which means `document`/`window` are always
 * present whether or not a given module actually needs them — a passing jsdom test proves
 * nothing about headlessness. This file forces a genuine Node environment (no `document`, no
 * `window`, no `XMLSerializer`) via the `@jest-environment node` docblock above, so if
 * `renderPageToSvg` — or anything it transitively imports — ever starts reaching for a DOM
 * global, this fails with a `ReferenceError` instead of silently passing. That is the proof
 * T15.1 asks for "rather than asserting it": nothing below asserts `typeof document ===
 * 'undefined'` as a substitute for the real test, which is simply calling the function and
 * getting correct output back.
 */
import { activeDeckTheme, BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'
import { buildTemplateShapes, getTemplate } from '~state/templates'
import { ColorStyle, DashStyle, SizeStyle, TDShapeType } from '~types'
import type { RectangleShape, TDPage } from '~types'
import { renderPageToSvg } from './renderPageToSvg'

const theme = BUILT_IN_DECK_THEMES.find((t) => t.id === 'coral-pop')!

/** A deck page built the same way `TldrawApp.addSlideFromTemplate` builds one — from a real
 *  starter-pack template, resolved against a real theme — plus one hand-added shape carrying a
 *  gradient fill (no built-in template uses `fillGradient`, so the gradient-defs assertion below
 *  needs a shape added for the purpose) and a gradient page background mixing a theme token with
 *  a literal hex, so both resolution paths (`resolveThemeColor` inside a gradient stop, and a
 *  plain hex passed through unchanged) are exercised in the same render. */
function buildTestPage(): TDPage {
  const pageId = 'page1'
  const template = getTemplate('title-subtitle')!
  const templateShapes = buildTemplateShapes(template, { title: 'Q3 Report', subtitle: 'Node-rendered' }, theme, pageId)

  const gradientRect: RectangleShape = {
    id: 'gradient-rect',
    type: TDShapeType.Rectangle,
    name: 'Rectangle',
    parentId: pageId,
    childIndex: templateShapes.length + 1,
    point: [200, 700],
    size: [400, 120],
    rotation: 0,
    style: {
      color: ColorStyle.Black,
      size: SizeStyle.Small,
      dash: DashStyle.Solid,
      isFilled: true,
      fillGradient: {
        type: 'linearGradient',
        angle: 90,
        stops: [
          { color: 'theme:accent2', at: 0 },
          { color: '#123456', at: 1 },
        ],
      },
    },
  }

  const shapes: TDPage['shapes'] = {}
  ;[...templateShapes, gradientRect].forEach((shape) => {
    shapes[shape.id] = shape
  })

  return {
    id: pageId,
    name: 'Test slide',
    childIndex: 1,
    shapes,
    bindings: {},
    size: template.size,
    background: {
      type: 'linearGradient',
      angle: 135,
      stops: [
        { color: 'theme:background', at: 0 },
        { color: '#ffffff', at: 1 },
      ],
    },
  }
}

describe('renderPageToSvg — headless, in a real Node environment', () => {
  it('has no DOM globals available in this test file at all', () => {
    // If this ever fails, the test file itself stopped proving anything — it would mean jsdom
    // globals leaked into a `@jest-environment node` file, not that the module under test is
    // broken.
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
  })

  it('renders a template-built, theme-resolved, gradient-carrying slide to a complete SVG string', () => {
    const page = buildTestPage()
    const svg = renderPageToSvg(page, { theme })

    // It's a real, well-formed SVG document.
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain(`viewBox="0 0 ${page.size![0]} ${page.size![1]}"`)
    expect(svg.endsWith('</svg>')).toBe(true)

    // The page background's gradient — one stop a theme token, one a literal hex — came through
    // as a real `<linearGradient>` `<defs>` node, not a CSS gradient and not a literal
    // `"theme:background"` string leaking into the output.
    expect(svg).toContain('<linearGradient')
    expect(svg).toContain(`${page.id}-bg-gradient`)
    expect(svg).not.toContain('theme:background')
    expect(svg).not.toContain('theme:accent')
    expect(svg).toContain(theme.colors.background)
    expect(svg).toContain('#ffffff')

    // The shape's own gradient fill resolved too (a *second* gradient, Phase 11's shape-fill
    // path, distinct from the page background's).
    expect(svg).toContain('gradient-rect-fill-gradient')
    expect(svg).toContain(theme.colors.accent2)
    expect(svg).toContain('#123456')

    // Theme colours resolved to real hex on ordinary (non-gradient) template shapes too — every
    // template shape's colour is a `theme:` token (see `state/templates.ts`), so if resolution
    // silently failed anywhere in this path, a raw `theme:` string would show up in the output.
    expect(svg).not.toMatch(/theme:[a-zA-Z0-9]+/)
    expect(svg).toContain(theme.colors.text)

    // Real shape geometry, not placeholders: the template's own title/subtitle text and the
    // hand-drawn gradient rectangle's stroke-free filled body both produced actual markup.
    expect(svg).toContain('Q3 Report')
    expect(svg).toContain('Node-rendered')
    expect(svg).toContain('<rect')
  })

  it('renders every built-in template, under every built-in theme, without throwing', () => {
    for (const builtInTheme of BUILT_IN_DECK_THEMES) {
      for (const id of ['title', 'bullets', 'quote', 'stat-row', 'closing']) {
        const template = getTemplate(id)
        if (!template) continue
        const pageId = `${id}-${builtInTheme.id}`
        const shapes: TDPage['shapes'] = {}
        buildTemplateShapes(template, undefined, builtInTheme, pageId).forEach((shape) => {
          shapes[shape.id] = shape
        })
        const page: TDPage = {
          id: pageId,
          name: id,
          childIndex: 1,
          shapes,
          bindings: {},
          size: template.size,
          background: template.background,
        }
        const svg = renderPageToSvg(page, { theme: builtInTheme })
        expect(svg).toContain('<svg')
        expect(svg).not.toMatch(/theme:[a-zA-Z0-9]+/)
      }
    }
  })

  it('falls back to the default theme, exactly like every other render path, when none is given', () => {
    const page = buildTestPage()
    const svg = renderPageToSvg(page) // no `theme` in opts
    expect(svg).toContain(activeDeckTheme(undefined).colors.background)
  })
})
