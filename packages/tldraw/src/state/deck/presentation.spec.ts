import { mockDocument } from '~test'
import { AnimationEffect, AnimationTrigger } from '~types'
import type { TDPage, ShapeAnimation } from '~types'
import {
  adjacentPresentableSlideId,
  computeBuildSteps,
  nextBuildOrder,
  stepChainDelayMs,
} from './presentation'

function animate(page: TDPage, shapeId: string, animation: ShapeAnimation): TDPage {
  return { ...page, shapes: { ...page.shapes, [shapeId]: { ...page.shapes[shapeId], animation } } }
}

const basePage = mockDocument.pages.page1

describe('computeBuildSteps', () => {
  it('returns no steps for a page with no animated shapes', () => {
    expect(computeBuildSteps(basePage)).toEqual([])
  })

  it('gives each onClick cue its own step, in order', () => {
    let page = animate(basePage, 'rect1', {
      effect: AnimationEffect.FadeIn,
      trigger: AnimationTrigger.OnClick,
      order: 1,
      durationMs: 300,
      delayMs: 0,
    })
    page = animate(page, 'rect2', {
      effect: AnimationEffect.ZoomIn,
      trigger: AnimationTrigger.OnClick,
      order: 0,
      durationMs: 300,
      delayMs: 0,
    })

    // Sorted by `order`, not by shape insertion order.
    expect(computeBuildSteps(page)).toEqual([
      { shapeIds: ['rect2'], auto: false },
      { shapeIds: ['rect1'], auto: false },
    ])
  })

  it('groups withPrevious into the same step as the cue before it', () => {
    let page = animate(basePage, 'rect1', {
      effect: AnimationEffect.FadeIn,
      trigger: AnimationTrigger.OnClick,
      order: 0,
      durationMs: 300,
      delayMs: 0,
    })
    page = animate(page, 'rect2', {
      effect: AnimationEffect.FadeIn,
      trigger: AnimationTrigger.WithPrevious,
      order: 1,
      durationMs: 300,
      delayMs: 0,
    })

    const steps = computeBuildSteps(page)
    expect(steps).toEqual([{ shapeIds: ['rect1', 'rect2'], auto: false }])
  })

  it('gives afterPrevious its own auto step — the real difference from withPrevious', () => {
    let page = animate(basePage, 'rect1', {
      effect: AnimationEffect.FadeIn,
      trigger: AnimationTrigger.OnClick,
      order: 0,
      durationMs: 300,
      delayMs: 0,
    })
    page = animate(page, 'rect2', {
      effect: AnimationEffect.SlideIn,
      trigger: AnimationTrigger.AfterPrevious,
      order: 1,
      durationMs: 300,
      delayMs: 0,
    })

    const steps = computeBuildSteps(page)
    expect(steps).toEqual([
      { shapeIds: ['rect1'], auto: false },
      { shapeIds: ['rect2'], auto: true },
    ])
  })

  it('a leading withPrevious/afterPrevious (no cue before it) starts its own auto step', () => {
    const page = animate(basePage, 'rect1', {
      effect: AnimationEffect.FadeIn,
      trigger: AnimationTrigger.WithPrevious,
      order: 0,
      durationMs: 300,
      delayMs: 0,
    })
    expect(computeBuildSteps(page)).toEqual([{ shapeIds: ['rect1'], auto: true }])
  })

  it('breaks order ties by shape id, deterministically', () => {
    let page = animate(basePage, 'rect2', {
      effect: AnimationEffect.FadeIn,
      trigger: AnimationTrigger.OnClick,
      order: 0,
      durationMs: 100,
      delayMs: 0,
    })
    page = animate(page, 'rect1', {
      effect: AnimationEffect.FadeIn,
      trigger: AnimationTrigger.OnClick,
      order: 0,
      durationMs: 100,
      delayMs: 0,
    })
    expect(computeBuildSteps(page)).toEqual([
      { shapeIds: ['rect1'], auto: false },
      { shapeIds: ['rect2'], auto: false },
    ])
  })
})

describe('stepChainDelayMs', () => {
  it('is 0 for the first step', () => {
    const page = animate(basePage, 'rect1', {
      effect: AnimationEffect.FadeIn,
      trigger: AnimationTrigger.OnClick,
      order: 0,
      durationMs: 500,
      delayMs: 200,
    })
    const steps = computeBuildSteps(page)
    expect(stepChainDelayMs(page, steps, 0)).toBe(0)
  })

  it('is the previous step\'s longest delay+duration, for chaining an afterPrevious step', () => {
    let page = animate(basePage, 'rect1', {
      effect: AnimationEffect.FadeIn,
      trigger: AnimationTrigger.OnClick,
      order: 0,
      durationMs: 400,
      delayMs: 100,
    })
    page = animate(page, 'rect2', {
      // Same step (withPrevious), longer total — the chain waits for the slower of the two.
      effect: AnimationEffect.FadeIn,
      trigger: AnimationTrigger.WithPrevious,
      order: 1,
      durationMs: 900,
      delayMs: 0,
    })
    page = animate(page, 'rect3', {
      effect: AnimationEffect.SlideIn,
      trigger: AnimationTrigger.AfterPrevious,
      order: 2,
      durationMs: 300,
      delayMs: 0,
    })
    const steps = computeBuildSteps(page)
    expect(steps).toHaveLength(2)
    expect(stepChainDelayMs(page, steps, 1)).toBe(900) // max(100+400, 0+900)
  })
})

describe('nextBuildOrder', () => {
  it('is 0 on a page with no animated shapes', () => {
    expect(nextBuildOrder(basePage)).toBe(0)
  })

  it('is one past the highest existing order', () => {
    const page = animate(basePage, 'rect1', {
      effect: AnimationEffect.FadeIn,
      trigger: AnimationTrigger.OnClick,
      order: 4,
      durationMs: 100,
      delayMs: 0,
    })
    expect(nextBuildOrder(page)).toBe(5)
  })
})

describe('adjacentPresentableSlideId', () => {
  const pages: Record<string, TDPage> = {
    a: { ...basePage, id: 'a', childIndex: 1 },
    b: { ...basePage, id: 'b', childIndex: 2, skipInPresentation: true },
    c: { ...basePage, id: 'c', childIndex: 3 },
  }

  it('skips a skipInPresentation slide in either direction', () => {
    expect(adjacentPresentableSlideId(pages, 'a', 1)).toBe('c')
    expect(adjacentPresentableSlideId(pages, 'c', -1)).toBe('a')
  })

  it('returns undefined at the end of the deck, even if what remains is all skipped', () => {
    const allSkippedAfter: Record<string, TDPage> = {
      a: { ...basePage, id: 'a', childIndex: 1 },
      b: { ...basePage, id: 'b', childIndex: 2, skipInPresentation: true },
    }
    expect(adjacentPresentableSlideId(allSkippedAfter, 'a', 1)).toBeUndefined()
  })

  it('returns undefined for an id not in the deck', () => {
    expect(adjacentPresentableSlideId(pages, 'not-a-page', 1)).toBeUndefined()
  })
})
