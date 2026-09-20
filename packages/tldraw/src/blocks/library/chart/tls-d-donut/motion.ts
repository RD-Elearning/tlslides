/**
 * Motion for tls.d.donut — donut chart with slice animation.
 *
 * Phase 6.1: Simple fade-in animation for each slice.
 */

import type { BlockMotion, BlockMotionRuntime } from '../../../types'

export const motion: BlockMotion = {
  name: 'tls.d.donut',
  parts: ['slice[*]'],
  animate(
    { duration, ease, stagger }: BlockMotionRuntime,
    { onComplete }: { onComplete: () => void }
  ) {
    // Fade in each slice with stagger
    const tl = duration()
    
    const sliceParts = ['slice[0]', 'slice[1]', 'slice[2]', 'slice[3]', 'slice[4]']
    
    const animateSlice = (part: string, index: number) => {
      const start = stagger * index * 0.1
      tl.to(
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1,
          scale: 1,
          duration: 300,
          ease: ease('ease-out'),
          delay: start,
        },
        start
      )
    }
    
    sliceParts.forEach((part, index) => {
      animateSlice(part, index)
    })
    
    tl.call(onComplete, [], duration())
    
    return () => tl
  },
}