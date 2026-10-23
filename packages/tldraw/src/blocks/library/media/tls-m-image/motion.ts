/**
 * Motion recipe for tls.m.image — the photo fades in calmly in place (no rise, no scale from
 * small), then its caption rises in under it.
 *
 * RVM5: was `fade-up` on both parts at once (the photo slid 24 px with its caption).
 */

import type { AmbientRecipe, MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['image', 'caption'],
  preset: 'fade-up',
  partMotion: {
    image: { preset: 'sweep-nodes', delay: 0 },
    caption: { preset: 'fade-up', delay: 250 },
  },
  // V2: a backdrop photo (cover, unframed) pushes in slowly in the viewer, clipped to its box
  ambient: (p, block): AmbientRecipe | null =>
    block.layer === 'backdrop' && (p.fit ?? 'cover') === 'cover' && (!p.frame || p.frame === 'none') ? { preset: 'zoom', part: 'image', clip: true } : null,
}
