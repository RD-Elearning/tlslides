/**
 * tls.m.ornament — every shape and variant, inside its box, deterministic (spro creative CR13).
 */
import { tlsMOrnament, ORNAMENT_SHAPES } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { makeCtx, makeRegistry } from '../../text/test-helpers'

standardBlockSuite(tlsMOrnament, { noCapacity: true })

const lay = (props: Record<string, unknown>, w = 900, h = 300) => tlsMOrnament.layout({ ...(tlsMOrnament.defaults as object), ...props } as never, makeCtx({ width: w, height: h }, makeRegistry()))
const nums = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)

describe('tls.m.ornament', () => {
  it('every shape and variant draws a stroke path whose points stay inside the box', () => {
    for (const shape of ORNAMENT_SHAPES) {
      for (const variant of ['line', 'filled']) {
        for (const rotation of [0, 90, 180, 270]) {
          for (const [w, h] of [[900, 120], [600, 600], [300, 900]]) {
            const leaves = absoluteLeaves(lay({ shape, variant, rotation }, w, h))
            const stroke = leaves.find((l) => l.part === 'shape')!
            expect([shape, variant, rotation, stroke]).not.toBeUndefined()
            for (const l of leaves) {
              const d = (l.node as any).d as string
              const n = nums(d)
              for (let i = 0; i < n.length; i += 2) {
                expect([shape, rotation, w, h, n[i] >= -0.01 && n[i] <= w + 0.01]).toEqual([shape, rotation, w, h, true])
                expect([shape, rotation, w, h, n[i + 1] >= -0.01 && n[i + 1] <= h + 0.01]).toEqual([shape, rotation, w, h, true])
              }
            }
          }
        }
      }
    }
  })

  it('filled adds an accent path; line does not', () => {
    for (const shape of ORNAMENT_SHAPES) {
      expect(absoluteLeaves(lay({ shape, variant: 'filled' })).some((l) => l.part === 'accent')).toBe(true)
      expect(absoluteLeaves(lay({ shape, variant: 'line' })).some((l) => l.part === 'accent')).toBe(false)
    }
  })

  it('is deterministic and survives hostile props', () => {
    expect(JSON.stringify(lay({ shape: 'fan' }))).toBe(JSON.stringify(lay({ shape: 'fan' })))
    expect(() => lay({ shape: 7 as never, variant: null as never, rotation: 'x' as never }, 0, 0)).not.toThrow()
  })
})
