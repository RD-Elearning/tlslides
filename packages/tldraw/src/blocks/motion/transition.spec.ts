/** S15-b — the five new slide transitions: keyframes, durations by personality, reduced motion, `morph` detection. */
import { TRANSITION_KINDS, canMorph, transitionPlan } from './transition'

describe('transitionPlan (S15-b)', () => {
  it('knows the new kinds', () => {
    for (const k of ['zoom', 'cover', 'reveal', 'split', 'morph']) expect(TRANSITION_KINDS as readonly string[]).toContain(k)
  })

  it.each(['zoom', 'cover', 'reveal', 'split', 'morph'] as const)('%s has two keyframes that end fully visible', (kind) => {
    const plan = transitionPlan({ kind }, 'calm')!
    expect(plan.keyframes).toHaveLength(2)
    expect(plan.durationMs).toBeGreaterThan(0)
    const last = plan.keyframes[1] as Record<string, unknown>
    if ('opacity' in last) expect(last.opacity).toBe(1)
    if ('clipPath' in last) expect(last.clipPath).toBe('inset(0% 0% 0% 0%)')
    if ('translate' in last) expect(last.translate).toBe('0 0')
    if ('scale' in last) expect(last.scale).toBe(1)
  })

  it('zoom: 1.04 in, 0.96 with dir down; cover travels 60 % from dir; split opens vertically for up/down', () => {
    expect((transitionPlan({ kind: 'zoom' })!.keyframes[0] as { scale: number }).scale).toBe(1.04)
    expect((transitionPlan({ kind: 'zoom', dir: 'down' })!.keyframes[0] as { scale: number }).scale).toBe(0.96)
    expect((transitionPlan({ kind: 'cover', dir: 'left' })!.keyframes[0] as { translate: string }).translate).toBe('-60% 0')
    expect((transitionPlan({ kind: 'split' })!.keyframes[0] as { clipPath: string }).clipPath).toBe('inset(0% 50% 0% 50%)')
    expect((transitionPlan({ kind: 'split', dir: 'up' })!.keyframes[0] as { clipPath: string }).clipPath).toBe('inset(50% 0% 50% 0%)')
  })

  it('morph is the quickest; cinematic is slower than lively; reduced motion and none cut', () => {
    const d = (k: 'morph' | 'fade', p?: 'calm' | 'lively' | 'cinematic') => transitionPlan({ kind: k }, p)!.durationMs
    expect(d('morph')).toBeLessThan(d('fade'))
    expect(d('fade', 'cinematic')).toBeGreaterThan(d('fade', 'lively'))
    expect(transitionPlan({ kind: 'split' }, 'calm', true)).toBeUndefined()
    expect(transitionPlan({ kind: 'none' })).toBeUndefined()
  })

  it('canMorph: same layout and a title within 2 units', () => {
    const t = { x: 100, y: 80, w: 900, h: 120 }
    expect(canMorph({ layout: 'title-top', title: t }, { layout: 'title-top', title: { ...t, y: 81 } })).toBe(true)
    expect(canMorph({ layout: 'title-top', title: t }, { layout: 'poster', title: t })).toBe(false)
    expect(canMorph({ layout: 'title-top', title: t }, { layout: 'title-top', title: { ...t, y: 90 } })).toBe(false)
    expect(canMorph({ layout: 'title-top' }, { layout: 'title-top', title: t })).toBe(false)
  })
})
