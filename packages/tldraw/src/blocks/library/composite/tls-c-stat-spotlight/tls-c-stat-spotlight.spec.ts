import { tlsCStatSpotlight } from './index'
import { showcaseSuite, tplCtx, recordingDriver } from '../showcase-test'
import { geometry, parseCount } from './schema'
import { arcPath } from './poster'

showcaseSuite(tlsCStatSpotlight, {
  textProp: 'label',
  escapeProps: (h) => ({ stats: [{ value: '1', label: h }] }),
  noCapacity: true,
})

describe('tls.c.stat-spotlight — specifics', () => {
  it('parses count-up numbers in Vietnamese and English formats', () => {
    expect(parseCount('92%')!.format(46)).toBe('46%')
    expect(parseCount('1.250')!.value).toBe(1250)
    expect(parseCount('1.250')!.format(625)).toBe('625')
    expect(parseCount('12,500')!.format(12500)).toBe('12,500')
    expect(parseCount('4,6/5')!.value).toBeCloseTo(4.6)
    expect(parseCount('4,6/5')!.format(2.3)).toBe('2,3/5')
    expect(parseCount('+18%')!.format(9)).toBe('+9%')
    expect(parseCount('n/a')).toBeUndefined()
  })

  it('the arc in the template runs from 12 o’clock to the progress, dashed to its own length and fully drawn at rest (RVM3)', () => {
    const html = tlsCStatSpotlight.html!.template({ value: '50%', progress: 50, label: 'L' } as any, tplCtx())
    const len = Number(/data-length="([\d.]+)"/.exec(html)![1])
    const d = /data-arc[^>]* d="([^"]+)"/.exec(html)![1]
    const [, r] = /A ([\d.]+) /.exec(d)!
    expect(len).toBeCloseTo(Math.PI * Number(r), 1) // half of the circumference
    expect(d).toContain(' 0 0 1 ') // a half arc, clockwise
    expect(html).toContain(`stroke-dasharray="${len} ${len}"`)
    expect(Number(/stroke-dashoffset:([\d.]+)/.exec(html)![1])).toBe(0)
  })

  it('arcPath draws a full ring as two halves and a partial arc with the right sweep', () => {
    expect(arcPath(50, 50, 40, 1).match(/A /g)).toHaveLength(2)
    expect(arcPath(50, 50, 40, 0.75)).toContain(' 0 1 1 ')
    expect(arcPath(50, 50, 40, 0.25)).toContain(' 0 0 1 ')
  })

  it('without stats the ring takes the full height', () => {
    const g = geometry(1728, 752, { value: '1', label: 'x' })
    expect(g.statsH).toBe(0)
    expect(g.d).toBeLessThanOrEqual(752)
  })

  it('the driver path counts the number up and ends on the exact text', async () => {
    const root = document.createElement('div')
    root.innerHTML = tlsCStatSpotlight.html!.template(tlsCStatSpotlight.defaults as any, tplCtx())
    const { driver } = recordingDriver()
    tlsCStatSpotlight.html!.animate!(root, {
      driver, reducedMotion: false, onComplete: () => undefined, timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'ease' },
    })
    expect(root.querySelector('[data-part="value"]')!.textContent).toBe('92%')
    expect(root.querySelector('[data-stat-value]')!.textContent).toBe('1.250')
  })
})

describe('RV04 — example fits its box (review G04)', () => {
  it('the poster of the example lies inside size.preferred and size.min', () => {
    const { makeCtx } = require('../../text/test-helpers')
    const { absoluteLeaves } = require('../../text/standard-suite')
    const props = { ...(tlsCStatSpotlight.defaults as any), ...(tlsCStatSpotlight.describe!.example.props as any) }
    for (const [w, h] of [tlsCStatSpotlight.size.preferred, tlsCStatSpotlight.size.min]) {
      const tree = tlsCStatSpotlight.poster!(props, makeCtx({ width: w, height: h }))
      expect([w, h, tree.box.height <= h + 0.5]).toEqual([w, h, true])
      for (const l of absoluteLeaves(tree)) {
        const where = `${l.part ?? l.k} @${Math.round(l.x)},${Math.round(l.y)} ${Math.round(l.width)}x${Math.round(l.height)} in ${w}x${h}`
        expect([where, l.x + l.width <= w + 1 && l.y + l.height <= h + 1]).toEqual([where, true])
      }
    }
  })
})
