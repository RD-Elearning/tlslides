/**
 * Motion for tls.g.steps — step-by-step reveal animation.
 */

import type { BlockMotion, BlockMotionRuntime } from '../../../types'

export const motion: BlockMotion = {
  name: 'tls.g.steps',
  parts: ['step[*].number', 'step[*].connector', 'step[*].title'],
  animate(
    { duration, ease, stagger }: BlockMotionRuntime,
    { onComplete }: { onComplete: () => void }
  ) {
    const tl = duration()
    
    // Staggered reveal of each step
    sliceEvery([
      ['step[0].number', 'step[0].connector', 'step[0].title'],
      ['step[1].number', 'step[1].connector', 'step[1].title'],
      ['step[2].number', 'step[2].connector', 'step[2].title'],
      ['step[3].number', 'step[3].connector', 'step[3].title'],
      ['step[4].number', 'step[4].connector', 'step[4].title'],
    ], {
      from: 0,
      to: 1,
      duration: 200,
      ease: ease('ease-out'),
      stagger: stagger * 100,
    }, tl)
    
    tl.call(onComplete, [], duration())
    
    return () => tl
  },
}

// Helper for staggering animations
function sliceEvery(
  groups: string[][],
  opts: { from: number; to: number; duration: number; ease: (s: string) => string; stagger: number },
  tl: { to: (updates: Record<string, number>) => void; call: (fn: () => void, args: unknown[], delay?: number) => void }
) {
  let currentDelay = opts.from * opts.duration
  for (const parts of groups) {
    for (const part of parts) {
      // In real implementation, this would animate the specific part
      tl.to({ [part]: opts.to }, { duration: opts.duration, ease: opts.ease('ease-out'), delay: currentDelay })
    }
    currentDelay += opts.stagger
  }
}