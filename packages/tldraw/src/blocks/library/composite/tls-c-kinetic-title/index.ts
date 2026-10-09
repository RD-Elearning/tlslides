/**
 * tls.c.kinetic-title — cover or section opener whose title words rise in one by one (P7).
 *
 * `kind: 'html'`: the template is the live block, the poster is the still for SVG export and the
 * compiler's height. Motion: `animate.ts` (GSAP timeline when the host passes GSAP, the motion
 * driver otherwise; calm fade under `motionStyle: subtle`).
 */

import type { BlockDefinition, LayoutContext, LayoutNode, MotionRecipe } from '../../../types'
import { htmlHostNode } from '../../../html-block'
import { schema, defaults } from './schema'
import { template } from './template'
import { poster } from './poster'
import { animate, KINETIC_TITLE_MS } from './animate'

export const motion: MotionRecipe = {
  parts: ['decor', 'kicker', 'title', 'rule', 'subtitle'],
  preset: 'fade-up',
  expressiveMs: KINETIC_TITLE_MS,
}

function layout(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  return htmlHostNode(poster as (p: Record<string, unknown>, c: LayoutContext) => LayoutNode, 'tls.c.kinetic-title', props, ctx, { posterGeometry: true })
}

export const tlsCKineticTitle: BlockDefinition = {
  type: 'tls.c.kinetic-title',
  name: 'Kinetic title',
  family: 'composite',
  tier: 'B',
  kind: 'html',
  summary: 'Big animated title: words rise in one by one, accent rule draws, subtitle last.',
  keywords: ['title', 'cover', 'opener', 'section', 'animated', 'kinetic'],
  category: 'cover',
  scope: 'slide',
  shortDescription: 'Huge title whose words rise in one by one over drifting accent orbs',
  related: ['tls.c.hero', 'tls.c.cover', 'tls.c.divider'],
  describe: {
    when: 'Deck cover or section opener that should feel energetic; pair with motionStyle expressive.',
    avoid: 'Content slides (use tls.t.title); a cover with photo or logo (use tls.c.cover).',
    example: {
      id: 'b_kinetic',
      type: 'tls.c.kinetic-title',
      props: { kicker: 'TUẦN 1', title: 'Dữ liệu kể chuyện', highlight: 'kể chuyện', subtitle: 'Nhập môn khoa học dữ liệu' },
    },
  },
  schema,
  defaults,
  size: { preferred: [1728, 888], min: [1040, 530] },
  layout: layout as BlockDefinition['layout'],
  poster,
  html: { template, animate },
  motion,
}
