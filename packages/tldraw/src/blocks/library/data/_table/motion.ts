/**
 * RVM3 — the shared motion of the table blocks (table, scorecard, compare-table): the header comes
 * first, then the body rows rise in in reading order (one stagger apart, within the J5 cap of
 * 120 ms), each row rule drawing across with its row, and the footer (totals) last: its row is the
 * next `row[n]` inside the `footer` group, so it follows the last body row at the same pace. Header
 * and zebra backgrounds, emphasis tints and the footer rule ride the block fade.
 */

import type { MotionRecipe } from '../../../types'

/** When the first body row starts, and the stagger between rows, in ms. */
export const ROW_AT = 100
export const ROW_STAGGER = 80

export function tableMotion(): MotionRecipe {
  return {
    parts: ['head', 'row[*]', 'rule[*]'],
    preset: 'stagger-lines',
    partMotion: {
      head: { preset: 'sweep-nodes', delay: 0 },
      'row[*]': { preset: 'fade-up', delay: ROW_AT, stagger: ROW_STAGGER },
      'rule[*]': { preset: 'wipe-x', delay: ROW_AT, stagger: ROW_STAGGER },
    },
  }
}
