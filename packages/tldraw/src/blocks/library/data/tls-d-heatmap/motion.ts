/**
 * Motion recipe for tls.d.heatmap — the cells fade in as a wave in reading order (row by row), each
 * value right after its cell. Row/column headers and the colour legend ride the block fade.
 *
 * RVM3: the recipe listed `cell[*]`, which matched no element (cells are `cell[r].c<k>`), so the
 * whole grid only rode the block fade. The bare family name `cell` matches every cell and value in
 * document order; a short stagger keeps a large grid inside the 2.5 s chain (J5).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['cell'],
  preset: 'stagger-grid',
  partMotion: {
    cell: { preset: 'sweep-nodes', delay: 0, stagger: 20 },
  },
}
