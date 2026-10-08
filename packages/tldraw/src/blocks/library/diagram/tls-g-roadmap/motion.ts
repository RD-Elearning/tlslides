import type { MotionRecipe } from '../../../types'

/** Bars stagger this much (6 lanes × 5 items = 30 bars still end inside the 2.5 s budget). */
const BAR_STEP = 60

/**
 * Motion for tls.g.roadmap — the frame (lanes, grid, lane names) rides the block fade with the
 * period header and legend; then the bars grow from their start date, lane by lane in reading
 * order, each label fading in once its bar is mostly drawn, and the today line wipes down the
 * chart.
 *
 * RVM4: bars rose with a fade (RV07 left `grow-bars-x` for S14); M1 grows one axis from the part's
 * origin. The origin is written as `left center` on purpose: the engine re-plans bars whose
 * origin equals the preset's `0% 50%` around a shared zero line (charts, waterfalls), and a
 * roadmap bar ending where most bars start would then grow backwards.
 */
export const motion: MotionRecipe = {
  parts: ['period[*]', 'legend[*]', 'legend[*].label', 'bar[*][*]', 'bar[*][*].label', 'today', 'today.dot'],
  preset: 'stagger-children',
  partMotion: {
    'period[*]': { preset: 'sweep-nodes', delay: 0, stagger: 30 },
    'legend[*]': { preset: 'sweep-nodes', delay: 0, stagger: 40 },
    'legend[*].label': { preset: 'sweep-nodes', delay: 0, stagger: 40 },
    'bar[*][*]': { preset: 'grow-bars-x', origin: 'left center', delay: 100, stagger: BAR_STEP },
    'bar[*][*].label': { preset: 'sweep-nodes', delay: 300, stagger: BAR_STEP },
    today: { preset: 'wipe-down', delay: 300 },
    'today.dot': { preset: 'sweep-nodes', delay: 300 },
  },
}
