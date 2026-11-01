import * as React from 'react'
import type { TldrawApp } from '~state'
import type { BlockSelection } from '~state/block-edit/BlockEdit'

/**
 * Editor E04 — tells the host what is selected and where it is on screen, so it can draw its own
 * floating bars: on every store change (selection, item, edits, camera, page) and on resize,
 * throttled to one animation frame and deduplicated.
 */
export function useBlockSelectionReport(
  app: TldrawApp,
  onBlockSelection?: (app: TldrawApp, sel: BlockSelection | null) => void,
  onCameraChange?: (app: TldrawApp, camera: { point: number[]; zoom: number }) => void
): void {
  const cbs = React.useRef({ onBlockSelection, onCameraChange })
  cbs.current = { onBlockSelection, onCameraChange }
  const enabled = !!onBlockSelection || !!onCameraChange

  React.useEffect(() => {
    if (!enabled) return
    let frame = 0
    let lastSel = ''
    let lastCam = ''
    const run = () => {
      frame = 0
      const { onBlockSelection: onSel, onCameraChange: onCam } = cbs.current
      if (onSel) {
        const sel = app.blockEdit.selection()
        const key = JSON.stringify(sel)
        if (key !== lastSel) {
          lastSel = key
          onSel(app, sel)
        }
      }
      if (onCam) {
        const cam = app.pageState?.camera
        const key = cam ? `${cam.point.join(',')}:${cam.zoom}` : ''
        if (cam && key !== lastCam) {
          lastCam = key
          onCam(app, { point: [...cam.point], zoom: cam.zoom })
        }
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run)
    }
    const unsub = (app.useStore as unknown as { subscribe: (fn: () => void) => () => void }).subscribe(schedule)
    window.addEventListener('resize', schedule)
    // layout settles after fonts load and after a block re-renders its DOM
    const t = setInterval(schedule, 500)
    schedule()
    return () => {
      unsub()
      window.removeEventListener('resize', schedule)
      clearInterval(t)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [app, enabled])
}
