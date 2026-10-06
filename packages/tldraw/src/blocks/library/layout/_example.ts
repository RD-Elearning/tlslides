/**
 * Example children for the structure containers (RV01). A container is invisible without
 * children, so its `describe.example` carries a few labelled tiles: the gallery card, the drop
 * and the AI's example then show the arrangement the block makes.
 */

import type { BlockSpec } from '../../types'

/** A filled panel with a one-word label (a callout, one level deep): the smallest thing that shows where a slot is. */
export function tile(id: string, label: string): BlockSpec {
  return { id, type: 'tls.t.callout', props: { text: label, showIcon: false } }
}

/** A plain text child (no panel) for containers that draw their own surface. */
export function label(id: string, text: string, size: 'heading' | 'subheading' = 'subheading'): BlockSpec {
  return { id, type: 'tls.t.title', props: { text, size } }
}
