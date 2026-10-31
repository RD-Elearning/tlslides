import { BlockRegistry } from '../registry'
import { registerBuiltInBlocks } from '../library'
import { isActivitySlide } from './is-activity-slide'

const reg = new BlockRegistry()
registerBuiltInBlocks(reg)

describe('isActivitySlide', () => {
  it('is true for a slide with an activity block, nested ones and free layers included', () => {
    expect(isActivitySlide({ regions: { content: [{ id: 'a', type: 'tls.a.choice', props: {} }] } }, reg)).toBe(true)
    expect(isActivitySlide({ regions: { content: [{ id: 'c', type: 'tls.l.container', props: { children: [{ id: 'a', type: 'tls.a.timer', props: {} }] } }] } }, reg)).toBe(true)
    expect(isActivitySlide({ regions: {}, free: [{ id: 'f', type: 'tls.a.order', props: {} }] }, reg)).toBe(true)
  })
  it('is false for ordinary slides and for nothing', () => {
    expect(isActivitySlide({ regions: { content: [{ id: 'a', type: 'tls.c.quiz', props: {} }] } }, reg)).toBe(false)
    expect(isActivitySlide(undefined, reg)).toBe(false)
    expect(isActivitySlide({ regions: { content: [{ id: 'a', type: 'tls.t.title', props: { text: 'tls.a.choice' } }] } }, reg)).toBe(false)
  })
})
