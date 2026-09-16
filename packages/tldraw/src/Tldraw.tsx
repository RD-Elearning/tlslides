import * as React from 'react'
import { Renderer } from '@tlslides/core'
import { styled, dark } from '~styles'
import { TDDocument, TDStatus } from '~types'
import type { ComponentShape } from '~types'
import { TldrawApp, TDCallbacks } from '~state'
import {
  TldrawContext,
  useStylesheet,
  useKeyboardShortcuts,
  useTldrawApp,
  TldrawComponentsContext,
  TldrawComponentsRegistry,
  BlockRegistryContext,
} from '~hooks'
import type { BlockRegistry } from '~blocks/registry'
import { shapeUtils } from '~state/shapes'
import { resolveSlideBackground, activeDeckTheme } from '~state/shapes/shared'
import { ToolsPanel } from '~components/ToolsPanel'
import { TopPanel } from '~components/TopPanel'
import { ContextMenu } from '~components/ContextMenu'
import { FocusButton } from '~components/FocusButton'
import { TLDR } from '~state/TLDR'
import { GRID_SIZE } from '~constants'
import { Loading } from '~components/Loading'
import { Deck } from '~components/Deck'
import { LayersPanel } from '~components/LayersPanel'
import { BottomPanel } from '~components/BottomPanel'
import { PresentationRuntime } from '~components/Presentation'

// Stable default so a host that never passes `components` doesn't hand ComponentUtil a "new"
// empty object every render.
const EMPTY_COMPONENTS: TldrawComponentsRegistry = {}

export interface TldrawProps extends TDCallbacks {
  /**
   * (optional) If provided, the component will load / persist state under this key.
   */
  id?: string

  /**
   * (optional) The document to load or update from.
   */
  document?: TDDocument

  /**
   * (optional) The current page id.
   */
  currentPageId?: string

  /**
   * (optional) Whether the editor should immediately receive focus. Defaults to true.
   */
  autofocus?: boolean

  /**
   * (optional) Whether to show the menu UI.
   */
  showMenu?: boolean

  /**
   * (optional) Whether to show the multiplayer menu.
   */
  showMultiplayerMenu?: boolean
  /**
   * (optional) Whether to show the pages UI.
   */
  showPages?: boolean

  /**
   * (optional) Whether to show the styles UI.
   */
  showStyles?: boolean

  /**
   * (optional) Whether to show the zoom UI.
   */
  showZoom?: boolean

  /**
   * (optional) Whether to show the tools UI.
   */
  showTools?: boolean

  /**
   * (optional) Whether to show a sponsor link for Tldraw.
   */
  showSponsorLink?: boolean

  /**
   * (optional) Whether to show the UI.
   */
  showUI?: boolean

  /**
   * (optional) Whether to the document should be read only.
   */
  readOnly?: boolean

  /**
   * (optional) Force the app's dark mode on or off. Omit to leave it alone (the app's own
   * default, or whatever the user has toggled via `toggleDarkMode`/the menu) — this only takes
   * effect when explicitly set to `true` or `false`, and stays reactive to prop changes.
   */
  darkMode?: boolean

  /**
   * (optional) If provided, image/video componnets will be disabled.
   *
   * Warning: Keeping this enabled for multiplayer applications without provifing a storage
   * bucket based solution will cause massive base64 string to be written to the liveblocks room.
   */
  disableAssets?: boolean

  /**
   * (optional) A registry of React components, keyed by the `componentId` a document's
   * `ComponentShape`s reference. This is how a host app renders its own React/Next.js components
   * (charts, KPI tiles, rich text blocks, branded elements, ...) as slide content, without the
   * document ever storing React itself — see reviews/04-custom-component-blocks.md. A
   * `componentId` with no entry here renders a placeholder instead of crashing, so a document can
   * safely outlive, or be opened by, an app with a smaller registry.
   */
  components?: TldrawComponentsRegistry

  /**
   * (optional) When supplied, `ComponentShape`s are rendered through this callback during
   * headless export (`Deck.getThumbnail`, `Deck.exportSlidePng`). The callback receives the
   * `ComponentShape` and returns either a complete SVG fragment or `undefined` (fall through to
   * the dashed placeholder). Stored on `Deck.blocks` so every subsequent thumbnail/export call
   * uses it without the host having to pass it per-call. A host renders Tier-B blocks by looking
   * up the block by `shape.componentId`, calling `poster()`, rendering the result to SVG, and
   * returning the markup here.
   */
  blocks?: (shape: ComponentShape) => string | undefined

  /**
   * (optional) A BlockRegistry containing block definitions with layout() functions.
   * When a ComponentShape's componentId matches a definition in this registry,
   * ComponentUtil renders through renderNodeToDom (the real layout engine) instead of
   * the createBlockComponents placeholder. The host app typically builds this registry
   * from its block definitions and passes it alongside the `components` prop.
   */
  blockRegistry?: BlockRegistry
}

export function Tldraw({
  id,
  document,
  currentPageId,
  autofocus = true,
  showMenu = true,
  showMultiplayerMenu = true,
  showPages = true,
  showTools = true,
  showZoom = true,
  showStyles = true,
  showUI = true,
  readOnly = false,
  darkMode,
  showSponsorLink = false,
  disableAssets = false,
  components = EMPTY_COMPONENTS,
  blocks,
  blockRegistry,
  onMount,
  onChange,
  onChangePresence,
  onNewProject,
  onSaveProject,
  onSaveProjectAs,
  onOpenProject,
  onOpenMedia,
  onSignOut,
  onSignIn,
  onUndo,
  onRedo,
  onPersist,
  onPatch,
  onCommand,
  onChangePage,
  onAssetCreate,
  onAssetDelete,
  onExport,
}: TldrawProps) {
  const [sId, setSId] = React.useState(id)

  // Create a new app when the component mounts.
  const [app, setApp] = React.useState(() => {
    const app = new TldrawApp(id, {
      onMount,
      onChange,
      onChangePresence,
      onNewProject,
      onSaveProject,
      onSaveProjectAs,
      onOpenProject,
      onOpenMedia,
      onSignOut,
      onSignIn,
      onUndo,
      onRedo,
      onPersist,
      onPatch,
      onCommand,
      onChangePage,
      onAssetDelete,
      onAssetCreate,
    })
    return app
  })

  // Create a new app if the `id` prop changes.
  React.useLayoutEffect(() => {
    if (id === sId) return
    const newApp = new TldrawApp(id, {
      onMount,
      onChange,
      onChangePresence,
      onNewProject,
      onSaveProject,
      onSaveProjectAs,
      onOpenProject,
      onOpenMedia,
      onSignOut,
      onSignIn,
      onUndo,
      onRedo,
      onPersist,
      onPatch,
      onCommand,
      onChangePage,
      onAssetDelete,
      onAssetCreate,
      onExport,
    })
    setSId(id)

    setApp(newApp)
  }, [sId, id])

  // Fire onMount for the instance React actually kept. Under StrictMode the `useState`
  // initializer above runs twice and constructs two apps; only one is retained and rendered, but
  // both would otherwise reach `onReady` and call back, leaving a host app's ref pointing at a
  // detached store whose mutations never reach the DOM. Effects only run for the retained
  // instance, so firing here is safe.
  React.useEffect(() => {
    let cancelled = false
    app.ready.then(() => {
      if (!cancelled) app.callbacks.onMount?.(app)
    })
    return () => {
      cancelled = true
    }
  }, [app])

  // Update the document if the `document` prop changes but the ids,
  // are the same, or else load a new document if the ids are different.
  React.useEffect(() => {
    if (!document) return
    if (document.id === app.document.id) {
      app.updateDocument(document)
    } else {
      app.loadDocument(document)
    }
  }, [document, app])

  // Disable assets when the `disableAssets` prop changes.
  React.useEffect(() => {
    app.setDisableAssets(disableAssets)
  }, [app, disableAssets])

  // Change the page when the `currentPageId` prop changes.
  React.useEffect(() => {
    if (!currentPageId) return
    app.changePage(currentPageId)
  }, [currentPageId, app])

  // Toggle the app's readOnly mode when the `readOnly` prop changes.
  React.useEffect(() => {
    app.readOnly = readOnly
  }, [app, readOnly])

  // Phase 14 — `darkMode` used to be declared here but never read anywhere in this component, a
  // silent no-op for any caller that passed it (found while building `DeckViewer`, which needs
  // exactly this). `undefined` (the default — no prop passed) deliberately does nothing, so a
  // host that never sets it keeps today's behaviour (the app's own persisted/toggled state);
  // passing an explicit `true`/`false` now actually forces it, and stays reactive to prop changes
  // the same way `readOnly` above does.
  React.useEffect(() => {
    if (darkMode === undefined) return
    app.setSetting('isDarkMode', darkMode)
  }, [app, darkMode])

  // A5 — headless block rendering. The `blocks` callback is stored on the `Deck` instance so
  // every subsequent `getThumbnail`/`exportSlidePng` call uses it without the host having to pass
  // it per-call. `undefined` (no prop) clears the callback, restoring the default placeholder
  // behaviour — same contract as every other optional prop here.
  React.useEffect(() => {
    app.deck.blocks = blocks
  }, [app, blocks])

  // Keep presentation mode in sync with the browser's actual fullscreen state. The user can
  // leave fullscreen without going through `togglePresentationMode` at all — Esc (handled
  // natively by the browser, independent of our own Escape shortcut), F11, a mobile gesture, or
  // another tab taking fullscreen — so this is the source of truth for "did we actually leave
  // fullscreen", not just a mirror of our own toggle calls. `exitPresentationMode` is idempotent
  // (a no-op if presentation mode is already off), so this can't race the Escape shortcut into
  // toggling presentation mode back on.
  React.useEffect(() => {
    // `document` here is the `TDDocument` prop, not the DOM global — reach it via `window`.
    if (typeof window === 'undefined') return
    const doc = window.document
    const handleFullscreenChange = () => {
      if (!doc.fullscreenElement) {
        // T16.5 — opening the presenter-view popup also triggers this (see
        // `TldrawApp.suppressNextFullscreenExit`'s doc comment); skip exiting presentation mode
        // for exactly that one, explicitly-flagged loss.
        if (app.consumeFullscreenExitSuppression()) return
        app.exitPresentationMode()
      }
    }
    doc.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => doc.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [app])

  // Update the app's callbacks when any callback changes.
  React.useEffect(() => {
    app.callbacks = {
      onMount,
      onChange,
      onChangePresence,
      onNewProject,
      onSaveProject,
      onSaveProjectAs,
      onOpenProject,
      onOpenMedia,
      onSignOut,
      onSignIn,
      onUndo,
      onRedo,
      onPersist,
      onPatch,
      onCommand,
      onChangePage,
      onAssetDelete,
      onAssetCreate,
      onExport,
    }
  }, [
    onMount,
    onChange,
    onChangePresence,
    onNewProject,
    onSaveProject,
    onSaveProjectAs,
    onOpenProject,
    onOpenMedia,
    onSignOut,
    onSignIn,
    onUndo,
    onRedo,
    onPersist,
    onPatch,
    onCommand,
    onChangePage,
    onAssetDelete,
    onAssetCreate,
    onExport,
  ])

  React.useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.document?.fonts) return

    function refreshBoundingBoxes() {
      app.refreshBoundingBoxes()
    }
    window.document.fonts.addEventListener('loadingdone', refreshBoundingBoxes)
    return () => {
      window.document.fonts.removeEventListener('loadingdone', refreshBoundingBoxes)
    }
  }, [app])

  // Use the `key` to ensure that new selector hooks are made when the id changes
  return (
    <TldrawContext.Provider value={app}>
      <BlockRegistryContext.Provider value={blockRegistry}>
        <TldrawComponentsContext.Provider value={components}>
          <InnerTldraw
            key={sId || 'Tldraw'}
            id={sId}
            autofocus={autofocus}
            showPages={showPages}
            showMenu={showMenu}
            showMultiplayerMenu={showMultiplayerMenu}
            showStyles={showStyles}
            showZoom={showZoom}
            showTools={showTools}
            showUI={showUI}
            showSponsorLink={showSponsorLink}
            readOnly={readOnly}
          />
        </TldrawComponentsContext.Provider>
      </BlockRegistryContext.Provider>
    </TldrawContext.Provider>
  )
}

interface InnerTldrawProps {
  id?: string
  autofocus: boolean
  showPages: boolean
  showMenu: boolean
  showMultiplayerMenu: boolean
  showZoom: boolean
  showStyles: boolean
  showUI: boolean
  showTools: boolean
  showSponsorLink: boolean
  readOnly: boolean
}

const InnerTldraw = React.memo(function InnerTldraw({
  id,
  autofocus,
  showPages,
  showMenu,
  showMultiplayerMenu,
  showZoom,
  showStyles,
  showTools,
  showSponsorLink,
  readOnly,
  showUI,
}: InnerTldrawProps) {
  const app = useTldrawApp()

  const rWrapper = React.useRef<HTMLDivElement>(null)

  const state = app.useStore()

  const { document, settings, appState, room } = state

  React.useEffect(() => {
    if (!rWrapper.current) return
    rWrapper.current.focus()
  }, [settings])

  const isSelecting = state.appState.activeTool === 'select'

  const page = document.pages[appState.currentPageId]
  const pageState = document.pageStates[page.id]
  const assets = document.assets
  const { selectedIds } = pageState

  // Phase 11 — resolve the page's `background` (the document's own data model, angle convention
  // and all) into the generic paint spec `@tlslides/core`'s `Frame` renders. Recomputed only when
  // the background or the asset table actually changes, not on every render (a gradient's `stops`
  // array would otherwise get a fresh `<defs>` id-stable-but-object-unstable prop each frame).
  const frameBackground = React.useMemo(
    () => resolveSlideBackground(page.background, page.id, assets, activeDeckTheme(document.theme)),
    [page.background, page.id, assets, document.theme]
  )

  const isHideBoundsShape =
    selectedIds.length === 1 &&
    page.shapes[selectedIds[0]] &&
    TLDR.getShapeUtil(page.shapes[selectedIds[0]].type).hideBounds

  const isHideResizeHandlesShape =
    selectedIds.length === 1 &&
    page.shapes[selectedIds[0]] &&
    TLDR.getShapeUtil(page.shapes[selectedIds[0]].type).hideResizeHandles

  // Custom rendering meta, with dark mode for shapes. Phase 12 — `deckTheme` rides along here too,
  // the same way `isDarkMode` already does: every shape util already receives `meta`, so this is
  // the one place a document-level theme needs to be threaded for every shape to resolve its own
  // colour tokens (see `getShapeStyle`'s `deckTheme` parameter).
  const meta = React.useMemo(() => {
    return { isDarkMode: settings.isDarkMode, deckTheme: activeDeckTheme(document.theme) }
  }, [settings.isDarkMode, document.theme])

  const showDashedBrush = settings.isCadSelectMode
    ? !appState.selectByContain
    : appState.selectByContain

  // Custom theme, based on darkmode
  const theme = React.useMemo(() => {
    const { selectByContain } = appState
    const { isDarkMode, isCadSelectMode } = settings

    if (isDarkMode) {
      const brushBase = isCadSelectMode
        ? selectByContain
          ? '69, 155, 255'
          : '105, 209, 73'
        : '180, 180, 180'
      return {
        brushFill: `rgba(${brushBase}, ${isCadSelectMode ? 0.08 : 0.05})`,
        brushStroke: `rgba(${brushBase}, ${isCadSelectMode ? 0.5 : 0.25})`,
        brushDashStroke: `rgba(${brushBase}, .6)`,
        selected: 'rgba(38, 150, 255, 1.000)',
        selectFill: 'rgba(38, 150, 255, 0.05)',
        background: '#212529',
        foreground: '#49555f',
        // A stronger scrim than the light-mode default: the dark canvas background is already
        // dim on its own, so a subtler scrim wouldn't read as a visible difference next to it.
        // The slide surface follows the app theme rather than staying paper-white. In dark mode
        // the shape palette inverts (ColorStyle.Black strokes render as #cecece), so a white
        // slide would make its own contents nearly invisible. Kept a step lighter than the
        // canvas background so the slide still reads as a distinct surface.
        frameFill: '#2b3035',
        frameBorder: 'rgba(255, 255, 255, 0.13)',
        frameDim: 'rgba(0, 0, 0, 0.35)',
      }
    }

    const brushBase = isCadSelectMode ? (selectByContain ? '0, 89, 242' : '51, 163, 23') : '0,0,0'

    return {
      brushFill: `rgba(${brushBase}, ${isCadSelectMode ? 0.08 : 0.05})`,
      brushStroke: `rgba(${brushBase}, ${isCadSelectMode ? 0.4 : 0.25})`,
      brushDashStroke: `rgba(${brushBase}, .6)`,
    }
  }, [settings.isDarkMode, settings.isCadSelectMode, appState.selectByContain])

  const isInSession = app.session !== undefined

  // Hide bounds when not using the select tool, or when the only selected shape has handles
  const hideBounds =
    (isInSession && app.session?.constructor.name !== 'BrushSession') ||
    !isSelecting ||
    isHideBoundsShape ||
    !!pageState.editingId

  // Hide bounds when not using the select tool, or when in session
  const hideHandles = isInSession || !isSelecting

  // Hide indicators when not using the select tool, or when in session
  const hideIndicators =
    (isInSession && state.appState.status !== TDStatus.Brushing) || !isSelecting

  const hideCloneHandles =
    isInSession || !isSelecting || !settings.showCloneHandles || pageState.camera.zoom < 0.2

  return (
    <StyledLayout ref={rWrapper} tabIndex={-0} className={settings.isDarkMode ? dark : ''}>
      <Loading />
      <OneOff focusableRef={rWrapper} autofocus={autofocus} />
      <ContextMenu>
        <Renderer
          id={id}
          shapeUtils={shapeUtils}
          page={page}
          pageState={pageState}
          assets={assets}
          snapLines={appState.snapLines}
          grid={GRID_SIZE}
          frame={page.size}
          frameBackground={frameBackground}
          users={room?.users}
          userId={room?.userId}
          theme={theme}
          meta={meta}
          hideBounds={hideBounds}
          hideHandles={hideHandles}
          hideResizeHandles={isHideResizeHandlesShape}
          hideIndicators={hideIndicators}
          hideBindingHandles={!settings.showBindingHandles}
          hideCloneHandles={hideCloneHandles}
          hideRotateHandles={!settings.showRotateHandles}
          hideGrid={!settings.showGrid}
          showDashedBrush={showDashedBrush}
          performanceMode={app.session?.performanceMode}
          onPinchStart={app.onPinchStart}
          onPinchEnd={app.onPinchEnd}
          onPinch={app.onPinch}
          onPan={app.onPan}
          onZoom={app.onZoom}
          onPointerDown={app.onPointerDown}
          onPointerMove={app.onPointerMove}
          onPointerUp={app.onPointerUp}
          onPointCanvas={app.onPointCanvas}
          onDoubleClickCanvas={app.onDoubleClickCanvas}
          onRightPointCanvas={app.onRightPointCanvas}
          onDragCanvas={app.onDragCanvas}
          onReleaseCanvas={app.onReleaseCanvas}
          onPointShape={app.onPointShape}
          onDoubleClickShape={app.onDoubleClickShape}
          onRightPointShape={app.onRightPointShape}
          onDragShape={app.onDragShape}
          onHoverShape={app.onHoverShape}
          onUnhoverShape={app.onUnhoverShape}
          onReleaseShape={app.onReleaseShape}
          onPointBounds={app.onPointBounds}
          onDoubleClickBounds={app.onDoubleClickBounds}
          onRightPointBounds={app.onRightPointBounds}
          onDragBounds={app.onDragBounds}
          onHoverBounds={app.onHoverBounds}
          onUnhoverBounds={app.onUnhoverBounds}
          onReleaseBounds={app.onReleaseBounds}
          onPointBoundsHandle={app.onPointBoundsHandle}
          onDoubleClickBoundsHandle={app.onDoubleClickBoundsHandle}
          onRightPointBoundsHandle={app.onRightPointBoundsHandle}
          onDragBoundsHandle={app.onDragBoundsHandle}
          onHoverBoundsHandle={app.onHoverBoundsHandle}
          onUnhoverBoundsHandle={app.onUnhoverBoundsHandle}
          onReleaseBoundsHandle={app.onReleaseBoundsHandle}
          onPointHandle={app.onPointHandle}
          onDoubleClickHandle={app.onDoubleClickHandle}
          onRightPointHandle={app.onRightPointHandle}
          onDragHandle={app.onDragHandle}
          onHoverHandle={app.onHoverHandle}
          onUnhoverHandle={app.onUnhoverHandle}
          onReleaseHandle={app.onReleaseHandle}
          onError={app.onError}
          onRenderCountChange={app.onRenderCountChange}
          onShapeChange={app.onShapeChange}
          onShapeBlur={app.onShapeBlur}
          onShapeClone={app.onShapeClone}
          onBoundsChange={app.updateBounds}
          onKeyDown={app.onKeyDown}
          onKeyUp={app.onKeyUp}
          onDragOver={app.onDragOver}
          onDrop={app.onDrop}
        />
      </ContextMenu>
      {showUI && (
        <>
          <StyledUI>
            {settings.isFocusMode ? (
              !settings.isPresentationMode && <FocusButton onSelect={app.toggleFocusMode} />
            ) : (
              <>
                <TopPanel
                  readOnly={readOnly}
                  showPages={showPages}
                  showMenu={showMenu}
                  showMultiplayerMenu={showMultiplayerMenu}
                  showStyles={showStyles}
                  showZoom={showZoom}
                  showSponsorLink={showSponsorLink}
                />
                <StyledSpacer />
                {showTools && !readOnly && <ToolsPanel />}
              </>
            )}
          </StyledUI>
          {!settings.isFocusMode &&
            !settings.isPresentationMode &&
            settings.showDeck &&
            showPages && <Deck />}
          {!settings.isFocusMode &&
            !settings.isPresentationMode &&
            settings.showLayers &&
            showPages &&
            !readOnly && <LayersPanel />}
          {settings.isPresentationMode && (
            <>
              {/* Phase 16 — mounted only while presenting, so a shape's `animation` and the
                  slide-transition setting have literally no code path outside presentation mode:
                  see `PresentationRuntime`'s own doc comment. */}
              <PresentationRuntime />
              <BottomPanel />
            </>
          )}
        </>
      )}
    </StyledLayout>
  )
})

const OneOff = React.memo(function OneOff({
  focusableRef,
  autofocus,
}: {
  autofocus?: boolean
  focusableRef: React.RefObject<HTMLDivElement>
}) {
  useKeyboardShortcuts(focusableRef)
  useStylesheet()

  React.useEffect(() => {
    if (autofocus) {
      focusableRef.current?.focus()
    }
  }, [autofocus])

  return null
})

const StyledLayout = styled('div', {
  position: 'absolute',
  height: '100%',
  width: '100%',
  minHeight: 0,
  minWidth: 0,
  maxHeight: '100%',
  maxWidth: '100%',
  overflow: 'hidden',
  boxSizing: 'border-box',
  outline: 'none',

  '& .tl-container': {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: '100%',
    zIndex: 1,
  },

  '& input, textarea, button, select, label, button': {
    webkitTouchCallout: 'none',
    webkitUserSelect: 'none',
    '-webkit-tap-highlight-color': 'transparent',
    'tap-highlight-color': 'transparent',
  },
})

const StyledUI = styled('div', {
  position: 'absolute',
  top: 0,
  left: 0,
  height: '100%',
  width: '100%',
  padding: '8px 8px 0 8px',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  pointerEvents: 'none',
  zIndex: 2,
  '& > *': {
    pointerEvents: 'all',
  },
})

const StyledSpacer = styled('div', {
  flexGrow: 2,
})
