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

describe('AC2 — look knobs (visual, statsPlacement)', () => {
  const { makeCtx } = require('../../text/test-helpers')
  const { absoluteLeaves } = require('../../text/standard-suite')
  const DEF = tlsCStatSpotlight
  const props = { ...(DEF.defaults as any), ...(DEF.describe!.example.props as any) }
  const full = { ...(DEF.defaults as any) } // three stats
  const VARIANTS: Array<[string, Record<string, unknown>]> = [
    ['visual: plain', { visual: 'plain' }],
    ['statsPlacement: side', { statsPlacement: 'side' }],
    ['plain + side', { visual: 'plain', statsPlacement: 'side' }],
  ]

  it('declares the knobs as enums', () => {
    expect((DEF.schema.visual.type as any).values).toEqual(['ring', 'plain'])
    expect((DEF.schema.statsPlacement.type as any).values).toEqual(['below', 'side'])
  })

  for (const [name, knobs] of VARIANTS) {
    for (const base of [props, full]) {
      it.each([
        ['preferred', DEF.size.preferred],
        ['min', DEF.size.min],
      ])(`${name} (${base.stats.length} stats) fits size.%s with nothing escaping it`, (_l, [w, h]) => {
        const tree = DEF.poster!({ ...base, ...knobs }, makeCtx({ width: w, height: h }))
        expect(tree.box.height).toBeLessThanOrEqual(h + 0.5)
        for (const l of absoluteLeaves(tree)) {
          const where = `${l.part ?? l.k} @${Math.round(l.x)},${Math.round(l.y)} ${Math.round(l.width)}x${Math.round(l.height)} in ${w}x${h}`
          expect([where, l.x + l.width <= w + 1 && l.y + l.height <= h + 1]).toEqual([where, true])
        }
      })
    }
  }

  it('plain paints no ring and a bigger number; template and poster agree', () => {
    const ring = geometry(1728, 752, full)
    const plain = geometry(1728, 752, { ...full, visual: 'plain' })
    expect(plain.ring).toBe(false)
    expect(plain.valueSize).toBeGreaterThan(ring.valueSize)
    const { makeCtx } = require('../../text/test-helpers')
    const parts = absoluteLeaves(DEF.poster!({ ...full, visual: 'plain' }, makeCtx({ width: 1728, height: 752 }))).map((l: any) => l.part)
    expect(parts).not.toContain('ring')
    expect(DEF.html!.template({ ...full, visual: 'plain' } as any, tplCtx())).not.toContain('data-part="ring"')
  })

  it('side stacks the stats in a right column at preferred; a box too short for it keeps them below', () => {
    const side = geometry(1728, 752, { ...full, statsPlacement: 'side' })
    expect(side.statsH).toBe(0)
    expect(new Set(side.stats.map((s) => s.x)).size).toBe(1)
    expect(side.stats[0].x).toBeGreaterThan(side.colX)
    expect(side.colX + side.colW).toBeLessThanOrEqual(side.stats[0].x)
    const html = DEF.html!.template({ ...full, statsPlacement: 'side' } as any, tplCtx(1728, 752))
    expect(html).toContain(`left:${side.stats[0].x}px;top:${side.stats[1].y}px;`)
    const short = geometry(640, 360, { ...full, statsPlacement: 'side' })
    expect(short.statsH).toBeGreaterThan(0)
  })
})
