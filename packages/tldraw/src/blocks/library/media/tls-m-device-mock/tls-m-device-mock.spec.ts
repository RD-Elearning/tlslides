/**
 * tls.m.device-mock — four devices, fit and centring, screenshot inset, tone, shadow, placeholder.
 */

import { tlsMDeviceMock } from './index'
import { standardBlockSuite, leavesOf, absoluteLeaves } from '../../text/standard-suite'
import { ctxNoAssets, ctxWithAssets } from '../media-test'
import { renderNodeToSvg } from '../../../render-svg'
import { DEVICE_ASPECT, fitDevice } from './layout'

const lay = (props: Record<string, unknown>, w = 960, h = 640, assets = true) =>
  tlsMDeviceMock.layout({ ...(tlsMDeviceMock.defaults as any), image: 'shot', ...props } as any, (assets ? ctxWithAssets : ctxNoAssets)(w, h))
const devices = ['browser', 'laptop', 'phone', 'tablet'] as const
const screen = (t: any) => leavesOf(t, 'screen').find((l) => l.k === 'image')!
const frame = (t: any) => absoluteLeaves(t).find((l) => l.part === 'frame')!

standardBlockSuite(tlsMDeviceMock, { noCapacity: true })

describe('tls.m.device-mock', () => {
  it.each(devices)('%s: fitted inside the box with its aspect, centred', (device) => {
    for (const [w, h] of [[960, 640], [300, 900], [1200, 200]]) {
      const d = fitDevice(device, w, h)
      expect(d.w / d.h).toBeCloseTo(DEVICE_ASPECT[device], 6)
      expect(d.w).toBeLessThanOrEqual(w + 1e-6)
      expect(d.h).toBeLessThanOrEqual(h + 1e-6)
      expect(d.x + d.w / 2).toBeCloseTo(w / 2, 6)
      expect(d.y + d.h / 2).toBeCloseTo(h / 2, 6)
    }
  })

  it.each(devices)('%s: the screenshot is cover-fitted, top-aligned and inside the frame', (device) => {
    const t = lay({ device })
    const s = screen(t) as any
    expect(s.node.fit).toBe('cover')
    expect(s.node.focal).toEqual([0.5, 0])
    const fr = frame(t)
    expect(s.x).toBeGreaterThanOrEqual(fr.x - 0.01)
    expect(s.y).toBeGreaterThanOrEqual(fr.y - 0.01)
    expect(s.x + s.width).toBeLessThanOrEqual(fr.x + fr.width + 0.01)
    expect(s.y + s.height).toBeLessThanOrEqual(fr.y + fr.height + 0.01)
    expect(s.width).toBeGreaterThan(fr.width * 0.5)
  })

  it('phone is tall, laptop and browser are wide, tablet in between', () => {
    const ar = (device: string) => {
      const f = frame(lay({ device }, 1000, 1000))
      return f.width / f.height
    }
    expect(ar('phone')).toBeLessThan(ar('tablet'))
    expect(ar('tablet')).toBeLessThan(1)
    expect(ar('browser')).toBeGreaterThan(1)
  })

  it('browser has three window dots, an address bar and the url text; other devices have none', () => {
    const t = lay({ device: 'browser', url: 'school.edu/portal' })
    expect(leavesOf(t, 'frame.dot')).toHaveLength(3)
    expect(leavesOf(t, 'frame.address')).toHaveLength(1)
    const txt = leavesOf(t, 'frame.url').find((l) => l.k === 'text')!
    expect((txt.node as any).lines.map((x: any) => x.text).join('')).toBe('school.edu/portal')
    const bar = leavesOf(t, 'frame.address')[0]
    expect(txt.x).toBeGreaterThanOrEqual(bar.x)
    expect(txt.x + txt.width).toBeLessThanOrEqual(bar.x + bar.width + 1)
    expect(leavesOf(lay({ device: 'browser', url: '' }), 'frame.url')).toHaveLength(0)
    for (const device of ['laptop', 'phone', 'tablet']) expect(leavesOf(lay({ device }), 'frame.dot')).toHaveLength(0)
  })

  it('laptop has a base wider than its lid; phone has a notch', () => {
    const t = lay({ device: 'laptop' })
    expect(leavesOf(t, 'frame.base')[0].width).toBeGreaterThan(frame(t).width)
    expect(leavesOf(lay({ device: 'phone' }), 'frame.notch').length).toBe(1)
  })

  it('tone dark makes a darker frame than light', () => {
    const lum = (c: string) => {
      const n = parseInt(c.replace('#', '').slice(0, 6), 16)
      return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11
    }
    const fill = (tone: string) => (frame(lay({ tone })).node as any).fill.color
    expect(lum(fill('dark'))).toBeLessThan(lum(fill('light')))
  })

  it('shadow true adds a faded shadow group behind the frame; false removes it', () => {
    expect(leavesOf(lay({ shadow: true }), 'frame.shadow').length).toBeGreaterThan(0)
    expect(leavesOf(lay({ shadow: false }), 'frame.shadow')).toHaveLength(0)
  })

  it('a missing screenshot shows the placeholder inside the frame (no crash)', () => {
    for (const image of ['', 'gone']) {
      const svg = renderNodeToSvg(lay({ image, alt: 'Dashboard' }, 960, 640, false))
      expect(svg).toContain('stroke-dasharray')
      expect(svg).toContain('Dashboard')
    }
  })

  it('lint: empty alt is a warning', () => {
    expect(tlsMDeviceMock.lint!({ image: 'a', alt: '' } as any, {} as any)).toEqual([expect.objectContaining({ rule: 'alt/missing' })])
  })
})
