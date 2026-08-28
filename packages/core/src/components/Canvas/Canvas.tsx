/* eslint-disable @typescript-eslint/no-explicit-any */
import { observer } from 'mobx-react-lite'
import * as React from 'react'
import {
  usePreventNavigationCss,
  useZoomEvents,
  useSafariFocusOutFix,
  useCanvasEvents,
  useCameraCss,
  useKeyEvents,
  usePerformanceCss,
} from '~hooks'
import type {
  TLAssets,
  TLBackgroundFill,
  TLBinding,
  TLBounds,
  TLPage,
  TLPageState,
  TLPerformanceMode,
  TLShape,
  TLSnapLine,
  TLUsers,
} from '~types'
import { Brush } from '~components/Brush'
import { Page } from '~components/Page'
import { Users } from '~components/Users'
import { useResizeObserver } from '~hooks/useResizeObserver'
import { inputs } from '~inputs'
import { UsersIndicators } from '~components/UsersIndicators'
import { SnapLines } from '~components/SnapLines/SnapLines'
import { Grid } from '~components/Grid'
import { Frame } from '~components/Frame'
import { Overlay } from '~components/Overlay'

interface CanvasProps<T extends TLShape, M extends Record<string, unknown>> {
  page: TLPage<T, TLBinding>
  pageState: TLPageState
  assets: TLAssets
  snapLines?: TLSnapLine[]
  grid?: number
  /**
   * (optional) The dimensions, [width, height], of a slide-shaped frame to render behind the
   * page's shapes, dimming everything outside of it. Generic on purpose: core has no concept of
   * a "slide", just an optional rectangle to frame.
   */
  frame?: number[]
  /**
   * (optional) A resolved paint spec for the `frame` background — see `Frame` and
   * `@tlslides/tldraw`'s `SlideBackground`/`resolveSlideBackground`. Has no effect without
   * `frame` also being set. Generic on purpose, same reasoning as `frame` itself: core renders
   * whatever paint it's handed and has no opinion on where it came from.
   */
  frameBackground?: TLBackgroundFill
  users?: TLUsers<T>
  userId?: string
  hideBounds: boolean
  hideHandles: boolean
  hideIndicators: boolean
  hideBindingHandles: boolean
  hideCloneHandles: boolean
  hideResizeHandles: boolean
  hideRotateHandle: boolean
  hideGrid: boolean
  showDashedBrush: boolean
  externalContainerRef?: React.RefObject<HTMLElement>
  performanceMode?: TLPerformanceMode
  meta?: M
  id?: string
  onBoundsChange: (bounds: TLBounds) => void
}

export const Canvas = observer(function _Canvas<
  T extends TLShape,
  M extends Record<string, unknown>
>({
  id,
  page,
  pageState,
  assets,
  snapLines,
  grid,
  frame,
  frameBackground,
  users,
  userId,
  meta,
  performanceMode,
  externalContainerRef,
  showDashedBrush,
  hideHandles,
  hideBounds,
  hideIndicators,
  hideBindingHandles,
  hideCloneHandles,
  hideResizeHandles,
  hideRotateHandle,
  hideGrid,
  onBoundsChange,
}: CanvasProps<T, M>): JSX.Element {
  const rCanvas = React.useRef<HTMLDivElement>(null)
  const rContainer = React.useRef<HTMLDivElement>(null)
  const rLayer = React.useRef<HTMLDivElement>(null)

  inputs.zoom = pageState.camera.zoom

  useResizeObserver(rCanvas, onBoundsChange)

  useZoomEvents(pageState.camera.zoom, externalContainerRef || rCanvas)

  useSafariFocusOutFix()

  usePreventNavigationCss(rCanvas)

  useCameraCss(rLayer, rContainer, pageState)

  usePerformanceCss(performanceMode, rContainer)

  useKeyEvents()

  const events = useCanvasEvents()

  return (
    <div id={id} className="tl-container" ref={rContainer}>
      <div id="canvas" className="tl-absolute tl-canvas" ref={rCanvas} {...events}>
        {!hideGrid && grid && <Grid grid={grid} camera={pageState.camera} />}
        {frame && (
          <Frame frame={frame} camera={pageState.camera} background={frameBackground} />
        )}
        <div ref={rLayer} className="tl-absolute tl-layer" data-testid="layer">
          <Page
            page={page}
            pageState={pageState}
            assets={assets}
            hideBounds={hideBounds}
            hideIndicators={hideIndicators}
            hideHandles={hideHandles}
            hideBindingHandles={hideBindingHandles}
            hideCloneHandles={hideCloneHandles}
            hideResizeHandles={hideResizeHandles}
            hideRotateHandle={hideRotateHandle}
            meta={meta}
          />
          {users && userId && (
            <UsersIndicators userId={userId} users={users} page={page} meta={meta} />
          )}
          {pageState.brush && (
            <Brush brush={pageState.brush} dashed={showDashedBrush} zoom={pageState.camera.zoom} />
          )}
          {users && <Users userId={userId} users={users} />}
        </div>
        <Overlay camera={pageState.camera}>
          {snapLines && <SnapLines snapLines={snapLines} />}
        </Overlay>
      </div>
    </div>
  )
})
