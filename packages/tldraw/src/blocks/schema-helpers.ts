/**
 * Small, dependency-free helpers shared by block definitions.
 *
 * B4 — element visibility convention (`isShown`) lives here.
 */

import type { BlockSpec } from './types'

/**
 * Check whether an element should be shown, given the block's props.
 *
 * A toggle slot named `showKicker` with `toggles: 'kicker'` in its `SlotSpec`
 * controls the visibility of the `'kicker'` part. Calling `isShown(props, 'showKicker')`:
 * - returns `false` when `props.showKicker === false`
 * - returns `true` otherwise (absent = shown, so existing decks are unchanged)
 *
 * This supports H3 of B4: `shown = isShown(props, 'showKicker') && !!props.kicker`.
 */
export function isShown(props: BlockSpec['props'] | Record<string, unknown>, key: string): boolean {
  const val = (props as Record<string, unknown>)?.[key]
  return val !== false
}
