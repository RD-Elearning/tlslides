import * as React from 'react'
import type { TLBackgroundFill } from '@tlslides/core'

/**
 * Renders the `<defs>` for a resolved gradient fill (`getShapeStyle`'s `fillGradientDef`) so that
 * the `fill="url(#id)"` attribute `getShapeStyle` also returns has something to point at.
 *
 * T11.3's critical placement constraint: this must be rendered *inside* the same
 * `<g id={shape.id + '_svg'}>` that `SVGContainer` creates — `TDShapeUtil.getSvgElement`'s SVG
 * export clones only that `<g>` (`document.getElementById(shape.id + '_svg').cloneNode(true)`), so
 * a `<defs>` rendered anywhere else (e.g. a page-level `<defs>`) would be present live but silently
 * missing from the exported SVG/PNG — the exact class of bug the background system as a whole
 * exists to avoid (see the Phase 11 report / `Frame`'s comment). `<defs>` is valid as a child of
 * `<g>`, not just `<svg>`, and `url(#id)` IRI references resolve against the whole document
 * regardless of where the `<defs>` sits in it, so nesting it here costs nothing live and fixes
 * export.
 */
export function GradientDef({ gradient }: { gradient: TLBackgroundFill }): JSX.Element | null {
  if (gradient.type === 'linearGradient') {
    return (
      <defs>
        <linearGradient id={gradient.id} x1={gradient.x1} y1={gradient.y1} x2={gradient.x2} y2={gradient.y2}>
          {gradient.stops.map((stop, i) => (
            <stop key={i} offset={stop.offset} stopColor={stop.color} />
          ))}
        </linearGradient>
      </defs>
    )
  }
  if (gradient.type === 'radialGradient') {
    return (
      <defs>
        <radialGradient id={gradient.id} cx={gradient.cx} cy={gradient.cy} r={gradient.r}>
          {gradient.stops.map((stop, i) => (
            <stop key={i} offset={stop.offset} stopColor={stop.color} />
          ))}
        </radialGradient>
      </defs>
    )
  }
  return null
}
