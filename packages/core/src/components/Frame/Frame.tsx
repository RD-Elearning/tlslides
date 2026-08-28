import * as React from 'react'
import type { TLPageState, TLBackgroundFill } from '~types'

/**
 * Renders a slide-shaped "paper" rectangle at `[0, 0, frame[0], frame[1]]` in page space, plus a
 * dimming scrim over everything outside of it.
 *
 * This lives alongside `Grid`, outside `.tl-layer`, and does its own camera math (screen =
 * (page + camera.point) * camera.zoom) rather than rendering inside `.tl-layer` and relying on
 * its CSS transform. `.tl-layer` would happily position the frame's own "paper" rectangle for
 * free, but the dimming scrim also needs to cover the parts of the (infinite, unbounded) canvas
 * that fall outside the frame — including areas the frame's own bounds don't reach — so it needs
 * a full-viewport surface to paint on. Doing both pieces the same way, in one component, keeps
 * the paper and the scrim pixel-aligned without a second source of truth for the camera math.
 *
 * Phase 11 — `background`, when given, replaces the CSS-driven `var(--tl-frameFill)` paint with
 * an explicit SVG `fill`: a plain hex for `solid`, or `url(#id)` pointing at a `<linearGradient>`/
 * `<radialGradient>`/pattern this component renders into its own `<defs>`. This has to be a real
 * SVG paint, not a CSS `background-image` gradient on `.tl-frame-paper` — a CSS gradient would
 * look identical in the live editor and then simply not exist in `copySvg`'s exported markup
 * (which assembles its own `<svg>` from shape nodes and never touches this component's DOM at
 * all). Defining it here as `<defs>` means the exact same node can be cloned into that exported
 * document (see `TldrawApp.copySvg`'s `useFrame` branch) instead of being reimplemented for
 * export.
 */
export function Frame({
  frame,
  camera,
  background,
}: {
  frame: number[]
  camera: TLPageState['camera']
  background?: TLBackgroundFill
}) {
  const x = camera.point[0] * camera.zoom
  const y = camera.point[1] * camera.zoom
  const width = frame[0] * camera.zoom
  const height = frame[1] * camera.zoom

  // No override: fall back to the theme's plain CSS fill exactly as before this phase existed.
  const paperFill = background ? backgroundToFill(background) : undefined

  return (
    <svg className="tl-frame">
      {background && <defs>{backgroundDefs(background)}</defs>}
      <rect className="tl-frame-dim" x={0} y={0} width="100%" height="100%" />
      <rect
        className="tl-frame-paper"
        x={x}
        y={y}
        width={width}
        height={height}
        // A plain `fill="..."` attribute loses to `.tl-frame-paper { fill: var(--tl-frameFill) }`
        // (useStyle.tsx): SVG presentation attributes carry effectively zero CSS specificity, so
        // ANY stylesheet rule for the element — even this unrelated-looking class selector —
        // overrides them outright. Caught only by looking at the screenshot: the live DOM had the
        // correct `fill="url(#...)"` attribute and the right `<defs>`, and still rendered plain
        // theme grey. An inline `style` property, by contrast, beats any external stylesheet rule
        // short of `!important`, so that's what actually paints the override.
        style={paperFill ? { fill: paperFill } : undefined}
      />
    </svg>
  )
}

/** The `fill` attribute value for the paper rect: a literal color, or an `url(#id)` reference into
 *  the `<defs>` this same component renders. */
function backgroundToFill(background: TLBackgroundFill): string {
  switch (background.type) {
    case 'solid':
      return background.color
    case 'linearGradient':
    case 'radialGradient':
    case 'image':
      return `url(#${background.id})`
  }
}

function backgroundDefs(background: TLBackgroundFill): React.ReactNode {
  switch (background.type) {
    case 'solid':
      return null
    case 'linearGradient':
      return (
        <linearGradient id={background.id} x1={background.x1} y1={background.y1} x2={background.x2} y2={background.y2}>
          {background.stops.map((stop, i) => (
            <stop key={i} offset={stop.offset} stopColor={stop.color} />
          ))}
        </linearGradient>
      )
    case 'radialGradient':
      return (
        <radialGradient id={background.id} cx={background.cx} cy={background.cy} r={background.r}>
          {background.stops.map((stop, i) => (
            <stop key={i} offset={stop.offset} stopColor={stop.color} />
          ))}
        </radialGradient>
      )
    case 'image':
      // `tile` repeats the image at a fixed base tile size (in objectBoundingBox-relative pattern
      // space, one quarter of the frame per tile) rather than at the image's own natural pixel
      // size, which this generic component has no way to know without loading the image itself.
      // `cover`/`contain` render straightforwardly via `preserveAspectRatio`. No UI currently
      // creates an `image` background (see the Phase 11 report), so this exists to keep the type
      // resolvable rather than to be pixel-perfect.
      if (background.fit === 'tile') {
        return (
          <pattern
            id={background.id}
            patternUnits="objectBoundingBox"
            width={0.25}
            height={0.25}
          >
            <image
              href={background.href}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid slice"
              opacity={background.opacity}
            />
          </pattern>
        )
      }
      return (
        <pattern id={background.id} patternUnits="objectBoundingBox" width={1} height={1}>
          <image
            href={background.href}
            width="100%"
            height="100%"
            preserveAspectRatio={background.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}
            opacity={background.opacity}
          />
        </pattern>
      )
  }
}
