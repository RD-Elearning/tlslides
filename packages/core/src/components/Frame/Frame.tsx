import * as React from 'react'
import type { TLPageState } from '~types'

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
 */
export function Frame({ frame, camera }: { frame: number[]; camera: TLPageState['camera'] }) {
  const x = camera.point[0] * camera.zoom
  const y = camera.point[1] * camera.zoom
  const width = frame[0] * camera.zoom
  const height = frame[1] * camera.zoom

  return (
    <svg className="tl-frame">
      <rect className="tl-frame-dim" x={0} y={0} width="100%" height="100%" />
      <rect className="tl-frame-paper" x={x} y={y} width={width} height={height} />
    </svg>
  )
}
