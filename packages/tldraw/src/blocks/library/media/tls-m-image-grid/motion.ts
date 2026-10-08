/**
 * Motion recipe for tls.m.image-grid — the photos fade in calmly in place, one after another in
 * reading order (120 ms apart), and each caption (pill and text: slot `caption[i]`, emitted for
 * every image) rises in a beat after its own photo.
 *
 * RVM5: was `stagger-grid` (every photo slid 24 px; captions were indexed on their own, so with a
 * caption missing a later caption came before its photo, and overlay pills were in no part).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['img[*]', 'caption[*]'],
  preset: 'stagger-grid',
  partMotion: {
    'img[*]': { preset: 'sweep-nodes', delay: 0, stagger: 120 },
    'caption[*]': { preset: 'fade-up', delay: 250, stagger: 120 },
  },
}
