/**
 * tls.c.image-text — image beside/above a text cluster.
 *
 * A Tier-A composite block: pure layout, exports headlessly. Delegates image
 * rendering to `tls.m.image` via `ctx.layoutChild`; text parts (kicker, title,
 * body) are rendered directly for clean part naming.
 *
 * Parts: image, kicker, title, body.
 * Placement: left | right | top (configurable imageRatio).
 */

import type { BlockDefinition, CapacityReport, LayoutContext, Size } from '../../../types'
import type { ImageTextProps } from './schema'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

/**
 * Capacity report: checks whether the body text fits the available box and
 * whether the image has a workable area.
 */
function capacity(
  props: ImageTextProps,
  box: Size,
  ctx: LayoutContext,
): CapacityReport {
  const placement = props.placement ?? 'left'
  const imageRatio = Math.max(0.2, Math.min(0.8, props.imageRatio ?? 0.48))
  const isHorizontal = placement === 'left' || placement === 'right'
  const gutterToken = (props.gutter ?? 'lg') as import('../../../types').SpaceToken
  const gutter = ctx.tokens.space[gutterToken] ?? ctx.tokens.space.lg

  // Compute the text area dimensions — must match layout.ts exactly
  let textWidth: number
  let textHeight: number
  if (isHorizontal) {
    const imageW = Math.max(80, Math.round((box.width - gutter) * imageRatio))
    textWidth = Math.max(80, box.width - gutter - imageW)
    textHeight = box.height
  } else {
    const imageH = Math.max(80, Math.round(box.height * imageRatio))
    textWidth = box.width
    textHeight = Math.max(80, box.height - imageH)
  }

  // Measure body text to check if it fits
  const bodyStyle = ctx.resolveText('body')
  const bodyText = props.body ?? ''
  const bodyMetrics = ctx.measureText(bodyText, bodyStyle, textWidth)

  // Title measurement
  const titleStyle = ctx.resolveText('title', { letterSpacing: -0.03 })
  const titleMetrics = ctx.measureText(props.title ?? '', titleStyle, textWidth)

  // Kicker measurement
  let kickerHeight = 0
  if (props.kicker) {
    const kickerStyle = ctx.resolveText('caption', { letterSpacing: 0.08 })
    const kickerMetrics = ctx.measureText(props.kicker.toUpperCase(), kickerStyle, textWidth)
    kickerHeight = kickerMetrics.height
  }

  const gap = ctx.tokens.space.sm
  const totalTextHeight = kickerHeight
    + (props.title ? titleMetrics.height + gap : 0)
    + (props.body ? bodyMetrics.height : 0)
    + (props.kicker && props.title ? gap : 0)

  const bodyFits = totalTextHeight <= textHeight
  const imageFits = (isHorizontal ? box.width : box.height) >= 80

  return {
    fits: bodyFits && imageFits,
    budget: {
      body: {
        max: textHeight,
        used: totalTextHeight,
        unit: 'lines',
      },
      image: {
        max: isHorizontal ? box.width : box.height,
        used: isHorizontal
          ? Math.round(box.width * imageRatio)
          : Math.round(box.height * imageRatio),
        unit: 'chars',  // using chars as a proxy for available dimension
      },
    },
    remedy: bodyFits
      ? []
      : [{ kind: 'shrink', minScale: 0.75 }],
  }
}

export const tlsCImageText: BlockDefinition = {
  type: 'tls.c.image-text',
  name: 'Image + text',
  family: 'composite',
  tier: 'A',
  summary: 'Image beside or above a text cluster (kicker + title + body). Configurable placement and image ratio.',
  keywords: ['image', 'text', 'photo', 'picture', 'editorial', 'side-by-side', 'layout', 'composite'],
  describe: {
    when: 'Use when a slide needs an image alongside or above explanatory text — editorial layouts, feature descriptions, team slides.',
    avoid: 'Do not use for image-only slides — use tls.m.image. Do not use for text-only slides — use tls.t.title + tls.t.body.',
    example: {
      id: 'b_image_text',
      type: 'tls.c.image-text',
      props: {
        image: 'hero-photo',
        alt: 'Team meeting in conference room',
        placement: 'left',
        kicker: 'OVERVIEW',
        title: 'Our design process',
        body: 'We start with research, prototype rapidly, and validate with users before shipping.',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 600], min: [400, 200] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity,
}
