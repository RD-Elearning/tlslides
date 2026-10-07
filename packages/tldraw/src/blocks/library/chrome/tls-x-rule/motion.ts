/**
 * Motion recipe for tls.x.rule — the line draws along its length: a horizontal rule wipes in
 * from its start (`wipe-x`), a vertical one (part `rule-v`) from its top edge down (`wipe-down`,
 * M1b/E7). Both are clip-only wipes with four equal-unit inset terms.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['rule', 'rule-v'],
  preset: 'wipe-x',
  partMotion: { 'rule-v': { preset: 'wipe-down' } },
}
