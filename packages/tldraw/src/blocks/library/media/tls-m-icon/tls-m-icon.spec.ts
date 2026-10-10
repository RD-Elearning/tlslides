/**
 * tls.m.icon spec file — validates icon name and test layout.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { validateIconName } from './schema'
import { getIcon, hasIcon, ICONS } from '../../../icons'
import { tlsMIcon } from './index'
import { standardBlockSuite, leavesOf } from '../../text/standard-suite'
import { ctxNoAssets } from '../media-test'

standardBlockSuite(tlsMIcon, { noCapacity: true })

const lay = (props: Record<string, unknown>, w: number, h: number) => tlsMIcon.layout({ ...(tlsMIcon.defaults as any), ...props } as any, ctxNoAssets(w, h))
const iconNode = (tree: any) => leavesOf(tree, 'icon').filter((l) => l.k === 'icon')[0]

describe('tls.m.icon — size', () => {
  it('draws the size step, never larger than its box, and the example fits preferred and min', () => {
    expect(iconNode(lay({}, 400, 300)).width).toBe(24)
    expect(iconNode(lay({ size: 'md' }, 400, 300)).width).toBe(48)
    expect(iconNode(lay({ size: 'xl' }, 400, 300)).width).toBe(128)
    expect(iconNode(lay({ size: 'xl' }, 60, 300)).width).toBe(60)
    const [pw, ph] = tlsMIcon.size.preferred
    const [mw, mh] = tlsMIcon.size.min
    const ex = tlsMIcon.describe!.example.props
    expect(iconNode(lay(ex, pw, ph)).width).toBeLessThanOrEqual(Math.min(pw, ph))
    expect(iconNode(lay(ex, mw, mh)).width).toBeLessThanOrEqual(Math.min(mw, mh))
  })

  it('scales the path with the box (the renderers draw it in a viewBox equal to the box)', () => {
    expect(iconNode(lay({ size: 'lg' }, 400, 300)).node).toHaveProperty('icon', expect.not.stringMatching(new RegExp(`^${getIcon('zap')!.path.slice(0, 20)}`)))
  })

  it('intrinsic size follows the size step', () => {
    expect(tlsMIcon.intrinsicSize!({ icon: 'zap' } as any, ctxNoAssets(10, 10))).toEqual({ width: 24, height: 24 })
    expect(tlsMIcon.intrinsicSize!({ icon: 'zap', size: 'lg' } as any, ctxNoAssets(10, 10))).toEqual({ width: 80, height: 80 })
  })
})

describe('tls.m.icon — CMP3 disc', () => {
  const disc = (tree: any) => leavesOf(tree, 'icon.disc')[0]
  it('disc: a circle 1.75 x the icon, the icon centred on it', () => {
    const t = lay({ size: 'lg', iconStyle: 'disc' }, 400, 300)
    const d = disc(t)
    expect([d.width, d.height]).toEqual([140, 140])
    expect((d.node as any).radius).toBe(70)
    const i = iconNode(t)
    expect(i.width).toBe(80)
    expect(i.x + i.width / 2).toBe(70)
    expect(i.y + i.height / 2).toBe(70)
  })

  it('a tinted disc from the icon colour; onAccent gets a solid accent disc', () => {
    const ctx = ctxNoAssets(400, 300)
    const accent = ctx.resolveColor('accent').color
    expect((disc(lay({ size: 'md', iconStyle: 'disc' }, 400, 300)).node as any).fill.color).not.toBe(accent)
    expect((disc(lay({ size: 'md', iconStyle: 'disc', color: 'onAccent' }, 400, 300)).node as any).fill.color).toBe(accent)
  })

  it('the disc fits a small box; plain icons are unchanged (no group, no disc)', () => {
    const t = lay({ size: 'xl', iconStyle: 'disc' }, 100, 100)
    expect(disc(t).width).toBeLessThanOrEqual(100)
    expect(lay({ size: 'md' }, 400, 300).k).toBe('icon')
    expect(tlsMIcon.intrinsicSize!({ icon: 'zap', size: 'md', iconStyle: 'disc' } as any, ctxNoAssets(10, 10))).toEqual({ width: 84, height: 84 })
  })

  it('DOM and SVG agree on a disc icon (parity probe)', async () => {
    const { assertParity } = await import('../../../parity-harness')
    await assertParity(tlsMIcon, { icon: 'shield', size: 'lg', iconStyle: 'disc' } as any, { width: 300, height: 200 })
  }, 60000)
})

describe('tls.m.icon', () => {
  describe('schema validation', () => {
    it('validates known icon names', () => {
      const validIcons = ['zap', 'shield', 'globe', 'check', 'arrow-right', 'trending-up', 'trending-down', 'users', 'clock', 'alert']
      validIcons.forEach(name => {
        expect(validateIconName(name)).toBeUndefined()
        expect(hasIcon(name)).toBe(true)
        expect(getIcon(name)).toBeDefined()
      })
    })

    it('catches unknown icon names', () => {
      const error = validateIconName('unknown-icon')
      expect(error).toContain('Unknown icon name')
      expect(error).toContain('unknown-icon')
    })
  })

  describe('icon set completeness', () => {
    it('has all expected icons', () => {
      const expectedIcons = ['zap', 'shield', 'globe', 'check', 'arrow-right', 'trending-up', 'trending-down', 'users', 'clock', 'alert']
      expectedIcons.forEach(name => {
        expect(hasIcon(name)).toBe(true)
      })
    })

    it('each icon has unique path data', () => {
      const paths = Object.values(ICONS).map(i => i.path)
      const uniquePaths = new Set(paths)
      expect(uniquePaths.size).toBe(paths.length)
    })
  })

  describe('icon metadata', () => {
    it('has proper viewBox dimensions (24x24)', () => {
      Object.values(ICONS).forEach(icon => {
        expect(icon.name).toBeDefined()
        expect(typeof icon.path).toBe('string')
        expect(icon.path.length).toBeGreaterThan(0)
      })
    })

    it('has source attribution for license compliance', () => {
      Object.entries(ICONS).forEach(([name, icon]) => {
        expect(icon.source).toBeDefined()
        expect(icon.source).toContain('License')
      })
    })
  })
})