/**
 * tls.t.callout — variants x fills pass contrast on light and dark themes, toggles, icon override.
 */

import { tlsTCallout } from './index'
import { makeCtx as rv02Ctx } from '../test-helpers'
import { VARIANTS, variantOf } from './layout'
import { makeCtx, makeRegistry } from '../test-helpers'
import { standardBlockSuite, leavesOf } from '../standard-suite'
import { createLayoutContext } from '../../../layout/layout-child'
import { resolveTokens } from '../../../tokens'
import { contrastRatio, relativeLuminance, hexToRgb } from '../../../color-math'
import { getIcon } from '../../../icons'

const THEME = (colors: Record<string, string>) =>
  ({ colors, fonts: { script: 'script', sans: 'sans', serif: 'serif', mono: 'mono', heading: 'sans', body: 'sans' } }) as any

const LIGHT = THEME({ background: '#ffffff', surface: '#ffffff', text: '#1a1a1a', textMuted: '#6b7280', accent1: '#3b82f6', accent2: '#8b5cf6' })
const DARK = THEME({ background: '#0f1115', surface: '#0f1115', text: '#f3f4f6', textMuted: '#9ca3af', accent1: '#60a5fa', accent2: '#a78bfa' })

function ctxFor(theme: any, bg: string) {
  return createLayoutContext({
    box: { width: 800, height: 240 },
    tokens: resolveTokens(theme),
    surface: { behind: { type: 'solid', color: bg }, luminance: relativeLuminance(hexToRgb(bg)), overImage: false },
    registry: makeRegistry(),
  })
}
const lum = (hex: string) => relativeLuminance(hexToRgb(hex))
const base = () => makeCtx({ width: 800, height: 240 }, makeRegistry())
const lay = (props: Record<string, unknown>, ctx = base()) =>
  tlsTCallout.layout({ ...(tlsTCallout.defaults as any), ...props } as any, ctx)

standardBlockSuite(tlsTCallout, { noCapacity: true, containProps: {} })

describe('tls.t.callout', () => {
  const variants = Object.keys(VARIANTS)
  const fills = ['tint', 'outline', 'solid']

  for (const [themeName, theme, bg] of [['light', LIGHT, '#ffffff'], ['dark', DARK, '#0f1115']] as const) {
    describe(`${themeName} theme`, () => {
      for (const variant of variants) {
        for (const fill of fills) {
          it(`${variant} / ${fill}: text >= 4.5:1, title >= 4.5:1, icon >= 3:1 on the box`, () => {
            const ctx = ctxFor(theme, bg)
            const tree = lay({ variant, fill }, ctx)
            const box = leavesOf(tree, 'box')[0].node as any
            const behind = box.fill ? box.fill.color : bg
            const colorOf = (part: string) => (leavesOf(tree, part)[0].node as any)
            expect(contrastRatio(lum(colorOf('text').style.color), lum(behind))).toBeGreaterThanOrEqual(4.5)
            expect(contrastRatio(lum(colorOf('title').style.color), lum(behind))).toBeGreaterThanOrEqual(4.5)
            expect(contrastRatio(lum(colorOf('icon').fill), lum(behind))).toBeGreaterThanOrEqual(3)
          })
        }
      }
    })
  }

  it('variant picks the colour role: box tint/stroke/fill derive from it', () => {
    const c = base()
    const solid = (v: string) => (leavesOf(lay({ variant: v, fill: 'solid' }), 'box')[0].node as any).fill.color
    expect(solid('info')).toBe(c.resolveColor('accent').color)
    expect(solid('tip')).toBe(c.resolveColor('accent2').color)
    expect(solid('warning')).toBe(c.resolveColor('warning').color)
    expect(solid('danger')).toBe(c.resolveColor('negative').color)
    expect(solid('success')).toBe(c.resolveColor('positive').color)
    const outline = leavesOf(lay({ variant: 'danger', fill: 'outline' }), 'box')[0].node as any
    expect(outline.fill).toBeUndefined()
    expect(outline.stroke.color).toBe(c.resolveColor('negative').color)
  })

  it('unknown variant/fill fall back to info/tint', () => {
    expect(variantOf('nope')).toBe('info')
    const box = leavesOf(lay({ variant: 'nope', fill: 'nope' }), 'box')[0].node as any
    expect(box.fill).toBeDefined()
    expect(box.stroke).toBeUndefined()
  })

  it('each variant has a distinct default icon that exists in the set; icon prop overrides it', () => {
    const names = Object.values(VARIANTS).map((v) => v.icon)
    expect(new Set(names).size).toBe(5)
    for (const n of names) expect(getIcon(n)).toBeDefined()
    const raw = (v: string, icon = '') => (leavesOf(lay({ variant: v, icon }), 'icon')[0].node as any).icon
    expect(raw('info')).not.toBe(raw('tip'))
    expect(raw('info', 'star')).not.toBe(raw('info'))
  })

  it('showTitle:false and showIcon:false reflow the text to the left edge', () => {
    const full = lay({})
    const noIcon = lay({ showIcon: false })
    const x = (t: any) => leavesOf(t, 'text')[0].x
    expect(x(noIcon)).toBeLessThan(x(full))
    const noTitle = lay({ showTitle: false }) as any
    expect(noTitle.box.height).toBeLessThan((full as any).box.height)
  })

  it('the box encloses its content with padding on every side', () => {
    const tree = lay({})
    const box = leavesOf(tree, 'box')[0]
    for (const l of leavesOf(tree, 'text').concat(leavesOf(tree, 'title'), leavesOf(tree, 'icon'))) {
      expect(l.x).toBeGreaterThan(box.x)
      expect(l.y + l.height).toBeLessThan(box.y + box.height)
    }
  })
})

describe('RV02 — honest size (review G02)', () => {
  const DEF = tlsTCallout
  const leaves = (n: any, ox = 0, oy = 0, out: any[] = []): any[] => {
    const x = ox + n.box.x
    const y = oy + n.box.y
    if (n.k !== 'group') out.push({ x, y, w: n.box.width, h: n.box.height })
    for (const c of n.children ?? []) leaves(c, x, y, out)
    return out
  }

  it.each([
    ['preferred', DEF.size.preferred],
    ['min', DEF.size.min],
  ])('the example fits size.%s with nothing escaping it', (_label, [w, h]) => {
    const node = DEF.layout(DEF.describe!.example.props as any, rv02Ctx({ width: w, height: h }))
    expect(node.box.height).toBeLessThanOrEqual(h + 0.5)
    for (const l of leaves(node)) {
      expect(l.x + l.w).toBeLessThanOrEqual(w + 0.5)
      expect(l.y + l.h).toBeLessThanOrEqual(h + 0.5)
    }
  })
})
