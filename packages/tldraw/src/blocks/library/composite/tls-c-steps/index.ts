/**
 * tls.c.steps — process/timeline of steps.
 *
 * A process or timeline of steps, each with a marker (number), a title
 * and a description. Supports horizontal and vertical orientation via
 * the `orientation` prop.
 *
 * Tier-A block: pure `layout()`, exports headlessly, passes parity.
 * Connectors are thin `rect` nodes (B.5 lesson: rects keep DOM/SVG
 * geometry parity by construction).
 *
 * Delegates text rendering to:
 *   - tls.t.title for step titles
 *   - tls.t.body for step descriptions
 * Markers are rendered as numbered text nodes directly.
 */

import type { BlockDefinition, CapacityReport, LayoutContext, Size } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'
import { createLayoutContext } from '../../../layout/layout-child'
import { resolveTokens } from '../../../tokens'
import { BUILT_IN_DECK_THEMES } from '../../../../state/shapes/shared/deck-theme'

/**
 * Summary for the AI: what this block is and when to use it.
 */
const STEPS_SUMMARY =
  'Process or timeline of numbered steps with titles and optional descriptions. ' +
  'Arranges steps horizontally or vertically with thin connectors between them.'

/**
 * Derive `size.preferred` from the layout of the defaults at 1920-wide.
 * Builds a reference LayoutContext and calls layout() to get intrinsic height.
 */
function derivePreferredSize(): [number, number] {
  const REFERENCE_WIDTH = 1920
  const REFERENCE_HEIGHT = 1080
  const theme = BUILT_IN_DECK_THEMES[0]
  const tokens = resolveTokens(theme)
  const ctx = createLayoutContext({
    box: { width: REFERENCE_WIDTH, height: REFERENCE_HEIGHT },
    tokens,
    surface: { behind: { type: 'solid', color: '#ffffff' }, luminance: 1, overImage: false },
  })
  const node = layout(defaults, ctx)
  return [REFERENCE_WIDTH, node.box.height]
}

/**
 * Capacity: how many steps fit at the given box.
 *
 * For horizontal: limited by box width (each step needs a minimum column).
 * For vertical: limited by box height (each step needs a minimum row).
 * Reports the tighter of the two orientations when both are possible,
 * or the actual orientation's limit when specified.
 */
function capacityFn(
  props: import('./schema').StepsProps,
  box: Size,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ctx: LayoutContext,
): CapacityReport {
  const orientation = props.orientation ?? 'horizontal'
  const stepCount = (props.steps ?? []).length

  // Minimum widths/heights for a step column/row
  const minStepWidth = 120
  const minStepHeight = 60
  const connectorSpace = 36 // approximate connector + gap

  let maxSteps: number
  let unit: 'items'

  if (orientation === 'horizontal') {
    // N steps + (N-1) connectors fit in box.width
    // N * minStepWidth + (N-1) * connectorSpace <= box.width
    // N * (minStepWidth + connectorSpace) <= box.width + connectorSpace
    maxSteps = Math.max(
      1,
      Math.floor((box.width + connectorSpace) / (minStepWidth + connectorSpace)),
    )
    unit = 'items' as const
  } else {
    // N steps + (N-1) connectors fit in box.height
    maxSteps = Math.max(
      1,
      Math.floor((box.height + connectorSpace) / (minStepHeight + connectorSpace)),
    )
    unit = 'items' as const
  }

  const fits = stepCount <= maxSteps

  return {
    fits,
    budget: {
      steps: { max: maxSteps, used: stepCount, unit },
    },
    remedy: fits
      ? []
      : [
          { kind: 'reflow', to: 'Reduce the number of steps to fit the available space.' },
          { kind: 'truncate', slot: 'steps' },
        ],
  }
}

export const tlsCSteps: BlockDefinition = {
  type: 'tls.c.steps',
  name: 'Steps',
  family: 'composite',
  tier: 'A',
  summary: STEPS_SUMMARY,
  keywords: [
    'steps',
    'process',
    'timeline',
    'flow',
    'workflow',
    'sequential',
    'phases',
    'roadmap',
    'numbered',
  ],
  describe: {
    when:
      'Use to show a process, workflow, or timeline with 2–8 numbered steps that the audience reads in sequence.',
    avoid:
      'Do not use for a simple list of items — use tls.t.bullets. Do not use for fewer than 2 steps — use tls.t.title.',
    example: {
      id: 'b_steps',
      type: 'tls.c.steps',
      props: {
        steps: [
          { title: 'Plan', desc: 'Define scope and requirements' },
          { title: 'Build', desc: 'Implement the solution' },
          { title: 'Ship', desc: 'Deploy to production' },
        ],
        orientation: 'horizontal',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: derivePreferredSize(), min: [200, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacityFn as BlockDefinition['capacity'],
}
