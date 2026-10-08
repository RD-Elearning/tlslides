import '@testing-library/jest-dom/extend-expect'
import 'fake-indexeddb/auto'
global.ResizeObserver = require('resize-observer-polyfill')

// B7 — BlockPreview uses IntersectionObserver for lazy rendering; jsdom doesn't
// implement it, so provide a mock that fires once immediately.
const OBSERVED_ELEMENTS = new WeakMap()

class IntersectionObserverMock {
  readonly root: Element | null
  readonly rootMargin: string
  readonly thresholds: ReadonlyArray<number>
  callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.root = options?.root ?? null
    this.rootMargin = options?.rootMargin ?? ''
    this.thresholds = options?.threshold ?? [0]
    this.callback = callback
  }
  observe(target: Element) {
    OBSERVED_ELEMENTS.set(target, this)
    // Immediately fire intersect so BlockPreview renders its children in tests.
    this.callback(
      [{ isIntersecting: true, target, intersectionRatio: 1, time: Date.now(), boundingClientRect: target.getBoundingClientRect(), intersectionRect: target.getBoundingClientRect(), rootBounds: null }] as IntersectionObserverEntry[],
      this,
    )
  }
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] as IntersectionObserverEntry[] }
}
global.IntersectionObserver = IntersectionObserverMock as any
