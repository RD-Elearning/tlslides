/**
 * tls.c.feature-reveal — 3-6 icon cards that flip in with a staggered 3D tilt (P7).
 * `kind: 'html'`; motion in `animate.ts`.
 */

import type { BlockDefinition, CapacityReport, LayoutContext, LayoutNode, MotionRecipe, Size } from '../../../types'
import { htmlHostNode } from '../../../html-block'
import { schema, defaults, MAX_ITEMS } from './schema'
import type { FeatureRevealProps } from './schema'
import { template } from './template'
import { poster } from './poster'
import { animate, FEATURE_REVEAL_MS } from './animate'

export const motion: MotionRecipe = {
  parts: ['card[*]', 'icon[*]', 'title[*]', 'text[*]'],
  preset: 'stagger-grid',
  expressiveMs: FEATURE_REVEAL_MS,
}

function layout(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  return htmlHostNode(poster as (p: Record<string, unknown>, c: LayoutContext) => LayoutNode, 'tls.c.feature-reveal', props, ctx, { posterGeometry: true })
}

function capacity(props: FeatureRevealProps, _box: Size, _ctx: LayoutContext): CapacityReport {
  const used = Array.isArray(props?.items) ? props.items.length : 0
  const fits = used <= MAX_ITEMS
  return { fits, budget: { items: { used, max: MAX_ITEMS, unit: 'items' } }, remedy: fits ? [] : [{ kind: 'paginate' }] }
}

export const tlsCFeatureReveal: BlockDefinition = {
  type: 'tls.c.feature-reveal',
  name: 'Feature reveal',
  family: 'composite',
  tier: 'B',
  kind: 'html',
  summary: 'Grid of 3-6 icon cards (title + one line) that flip in one after another.',
  keywords: ['features', 'cards', 'benefits', 'skills', 'grid', 'icons', 'animated'],
  category: 'list',
  scope: 'group',
  shortDescription: 'Icon cards in a grid that flip up one after another with a 3D tilt',
  related: ['tls.c.feature-grid', 'tls.c.cards'],
  describe: {
    when: 'Key benefits, skills or pillars (3-6) as icon cards with a title and one line each, on a showcase slide with motionStyle expressive. Cards stay compact and centre in a tall region.',
    avoid: 'Dense or printed slides (use tls.c.feature-grid); steps in order (use tls.g.chevrons).',
    example: {
      id: 'b_reveal',
      type: 'tls.c.feature-reveal',
      props: {
        items: [
          { icon: 'rocket', title: 'Nhanh', text: 'Dựng xong bài trình bày trong vài phút.' },
          { icon: 'shield', title: 'An toàn', text: 'Dữ liệu được mã hóa mặc định.' },
          { icon: 'heart', title: 'Thân thiện', text: 'Giao diện dễ dùng cho mọi người.' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 340], min: [640, 300] },
  layout: layout as BlockDefinition['layout'],
  capacity: capacity as BlockDefinition['capacity'],
  poster,
  html: { template, animate },
  motion,
}
