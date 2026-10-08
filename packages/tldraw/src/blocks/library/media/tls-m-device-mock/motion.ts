/**
 * Motion recipe for tls.m.device-mock — the device frame and its shadow fade in in place, the
 * window dots and the address bar follow left to right, then the screenshot fades in on the
 * screen. Nothing moves: the screen sits inside the frame, so a rise on one part would slide it
 * out of its bezel while the other caught up.
 *
 * RVM5: was `fade-up` on every part at once, and the recipe animated the `frame.shadow` group,
 * whose authored opacity (0.16) the entrance overwrote with 1: the shadow ended six times too
 * dark (J3). The inner `frame.shadow.rect` fades instead, so the group keeps its opacity.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['frame.shadow.rect', 'frame', 'frame.dot[*]', 'frame.address', 'frame.url', 'screen'],
  preset: 'fade-up',
  partMotion: {
    'frame.shadow.rect': { preset: 'sweep-nodes', delay: 0 },
    frame: { preset: 'sweep-nodes', delay: 0 },
    'frame.dot[*]': { preset: 'sweep-nodes', delay: 150, stagger: 60 },
    'frame.address': { preset: 'sweep-nodes', delay: 240 },
    'frame.url': { preset: 'sweep-nodes', delay: 300 },
    screen: { preset: 'sweep-nodes', delay: 300 },
  },
}
