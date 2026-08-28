import { Renderer, TLPageState } from '@tlslides/core'
import React from 'react'
import { Tldraw } from '../../Tldraw'
import { useTldrawApp } from '~hooks'
import { shapeUtils } from '~state/shapes'
import { resolveSlideBackground, activeDeckTheme } from '~state/shapes/shared'
import { styled } from '~styles'
import { TDPage } from '~types'
import { TldrawApp } from '~state'

interface ReadOnlyEditorProps {
  page: TDPage
  pageState: TLPageState
}

export function ReadOnlyEditor({ page, pageState }: ReadOnlyEditorProps) {
  const app = useTldrawApp()
  const state = app.useStore()

  const { settings, appState, document } = state

  // Custom rendering meta, with dark mode for shapes. Phase 12 — `deckTheme` rides along here too:
  // Deck thumbnails render through this same component (see the Phase 11 comment just below), so a
  // slide's theme-tokened colours need to resolve here exactly as they do in the main canvas.
  const meta = React.useMemo(() => {
    return { isDarkMode: settings.isDarkMode, deckTheme: activeDeckTheme(document.theme) }
  }, [settings.isDarkMode, document.theme])

  // Phase 11 — Deck thumbnails render through this same component, so a slide's background must
  // resolve here too, not just in the main `Tldraw.tsx` canvas — see the Phase 11 report for how
  // this was verified.
  const frameBackground = React.useMemo(
    () => resolveSlideBackground(page.background, page.id, document.assets, activeDeckTheme(document.theme)),
    [page.background, page.id, document.assets, document.theme]
  )

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

  const handleOpenPage = React.useCallback(() => {
    app.changePage(page.id)
  }, [app])

  return (
    <StyledLayout
      tabIndex={-0}
      onPointerDown={(e) => e.preventDefault}
      onPointerUp={(e) => {
        if (e.button === 0) {
          e.preventDefault()
          handleOpenPage()
        }
      }}
    >
      <Renderer
        shapeUtils={shapeUtils}
        page={page}
        pageState={pageState}
        theme={theme}
        meta={meta}
        frame={page.size}
        frameBackground={frameBackground}
      />
    </StyledLayout>
  )
}

const StyledLayout = styled('div', {
  position: 'relative',
  borderRadius: '$3',
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

  '& .tl-canvas': {
    pointerEvents: 'none',
  },

  '& input, textarea, button, select, label, button': {
    webkitTouchCallout: 'none',
    webkitUserSelect: 'none',
    '-webkit-tap-highlight-color': 'transparent',
    'tap-highlight-color': 'transparent',
  },
})
