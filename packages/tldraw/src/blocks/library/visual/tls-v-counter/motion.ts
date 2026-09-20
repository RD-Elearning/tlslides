/**
 * Motion for tls.v.counter — animated counter.
 *
 * Phase 7: Interpolate from -> to over duration.
 */

import type { BlockMotion, BlockMotionRuntime } from '../../../types'

export const motion: BlockMotion = {
  name: 'tls.v.counter',
  parts: ['counter-value'],
  animate(
    { duration, ease }: BlockMotionRuntime,
    { onComplete }: { onComplete: () => void }
  ) {
    const tl = duration()
    
    // Animate value from -> to
    tl.to(
      { value: 1 }, // This would be consumed by the renderer
      {
        value: 0,
        duration: duration() * 1000,
        ease: ease('ease-out'),
      },
      0
    )
    
    tl.call(onComplete, [], duration() * 1000)
    
    return () => tl
  },
}