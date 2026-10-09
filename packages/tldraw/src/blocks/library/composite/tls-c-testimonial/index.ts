/**
 * tls.c.testimonial — pull-quote testimonial with attribution (kind: 'html').
 *
 * A block author writes an HTML template plus a schema and a short description,
 * and gets a block that the editor and the viewer render as real DOM, the SVG
 * path renders as a still (via poster), the digest describes, and
 * validateDeckSpec checks.
 *
 * The `layout()` function is auto-generated: it returns a single host node
 * filling the box with `render: def.type` and `poster: def.poster(props, ctx)`.
 * The host renderer is derived from the `html` object.
 */

import type { BlockDefinition, LayoutContext, LayoutNode } from '../../../types'
import { schema, defaults } from './schema'
import { poster } from './poster'
import { template } from './template'
import { motion } from './motion'
import { animate } from './animate'
import { createLayoutContext } from '../../../layout/layout-child'
import { resolveTokens } from '../../../tokens'
import { BUILT_IN_DECK_THEMES } from '../../../../state/shapes/shared/deck-theme'
import { htmlHostNode } from '../../../html-block'

/** Summary for the AI: what this block is and when to use it. */
const TESTIMONIAL_SUMMARY =
  'Pull-quote testimonial with attribution. ' +
  'Quote text with speaker name, role, and optional avatar. ' +
  'Use for social proof, customer quotes, or endorsements.'

/**
 * Auto-generated `layout()` for `kind: 'html'` blocks. Returns a single host
 * node filling the box. The poster supplies geometry for the compiler and SVG
 * export; the host renderer supplies the live DOM.
 */
function testimonialLayout(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  return htmlHostNode(poster as (p: Record<string, unknown>, c: LayoutContext) => LayoutNode, 'tls.c.testimonial', props, ctx, { posterGeometry: true })
}

/**
 * Derive `size.preferred` from the poster of the defaults. Builds a reference
 * LayoutContext at 1920-wide with the default theme's tokens and calls poster()
 * to get the real intrinsic height.
 */
function derivePreferredSize(): [number, number] {
  const REFERENCE_WIDTH = 1920
  const REFERENCE_HEIGHT = 1080
  const theme = BUILT_IN_DECK_THEMES[0] // mono-grid (the demo's default)
  const tokens = resolveTokens(theme)
  const ctx = createLayoutContext({
    box: { width: REFERENCE_WIDTH, height: REFERENCE_HEIGHT },
    tokens,
    surface: { behind: { type: 'solid', color: '#ffffff' }, luminance: 1, overImage: false },
  })
  const posterNode = poster(defaults, ctx)
  return [REFERENCE_WIDTH, Math.max(MIN_SIZE[1], posterNode.box.height)]
}

/** LO8: the smallest box the example fits without growing: at 840 (a half column) its quote takes
 *  4 lines and the block is 554 tall (458 painted + the 48-unit padding top and bottom). The old
 *  min (400 × 300) was a guess: the example was 950 tall there (an html poster does not shrink its
 *  type), so the size card's min lied by 650. `preferred` is raised to it (min ≤ preferred). */
const MIN_SIZE: [number, number] = [840, 554]

export const tlsCTestimonial: BlockDefinition = {
  type: 'tls.c.testimonial',
  name: 'Testimonial',
  family: 'composite',
  tier: 'B',
  kind: 'html',
  summary: TESTIMONIAL_SUMMARY,
  keywords: ['testimonial', 'quote', 'pull-quote', 'endorsement', 'social-proof', 'attribution'],
  category: 'people',
  scope: 'group',
  shortDescription: 'Customer quote with name, role and avatar',
  related: ['tls.t.quote', 'tls.m.avatar', 'tls.c.case-study', 'tls.c.quote-image'],
  describe: {
    when: 'Use for a customer quote, testimonial, or endorsement — quote text with speaker name, role, and optional avatar.',
    avoid: 'Do not use for a plain pull quote without a named person (use tls.t.quote) or for an unattributed insight (use tls.t.takeaway).',
    example: {
      id: 'b_testimonial',
      type: 'tls.c.testimonial',
      props: {
        quote: 'This product transformed how our team works. We shipped 3× faster in the first quarter.',
        name: 'Jane Doe',
        role: 'VP of Engineering',
        avatar: '',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: derivePreferredSize(), min: MIN_SIZE },
  layout: testimonialLayout as BlockDefinition['layout'],
  poster,
  html: { template, animate },
  motion,
}
