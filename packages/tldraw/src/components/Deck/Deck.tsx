import { CopyIcon, PlusIcon } from '@radix-ui/react-icons'
import { TLPageState } from '@tlslides/core'
import * as React from 'react'
import { DeckContextMenu } from '~components/DeckContextMenu'
import { TrashIcon } from '~components/Primitives/icons'
import { Panel } from '~components/Primitives/Panel'
import { RowButton } from '~components/Primitives/RowButton'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { ReadOnlyEditor } from '~components/ReadOnlyEditor'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'
import { TDPage, TDSnapshot } from '~types'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { IconButton } from '~components/Primitives/IconButton'
import { DEFAULT_SLIDE_SIZE } from '~constants'

const DECK_WIDTH = 200
// Matches StyledSlideContainer's horizontal padding below: the two must agree so that the
// thumbnail's aspect ratio (computed from this width) is the aspect ratio it's actually
// rendered at.
const DECK_SLIDE_PADDING_X = 20
const DECK_SLIDE_PADDING_Y = 5
const DECK_SLIDE_WIDTH = DECK_WIDTH - DECK_SLIDE_PADDING_X * 2

const sortedSelector = (s: TDSnapshot) =>
  Object.values(s.document.pages).sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))

// The container is border-box, so its height must include the vertical padding on top of the
// thumbnail itself — otherwise the canvas is taller than its content box and gets clipped.
function getSlideHeight(page: TDPage): number {
  const [width, height] = page.size ?? DEFAULT_SLIDE_SIZE
  return (DECK_SLIDE_WIDTH * height) / width + DECK_SLIDE_PADDING_Y * 2
}

export const Deck = React.memo(function Deck(): JSX.Element {
  const app = useTldrawApp()

  const handleCreatePage = React.useCallback(() => {
    app.createPage()
  }, [app])

  const handleDuplicatePage = React.useCallback(() => {
    app.duplicatePage(app.currentPageId)
  }, [app])

  const handleDeletePage = React.useCallback(() => {
    app.deletePage(app.currentPageId)
  }, [app])

  // Frame the slide rectangle itself, rather than scaling whatever camera the author happens to
  // have left the page at (which used to make thumbnails show arbitrary, inconsistent framing).
  // The camera is zoomed so that `page.size` exactly fills the thumbnail box, with its origin
  // (top-left of the frame) pinned to the thumbnail's own top-left corner.
  const boringPageState = React.useCallback((page: TDPage): TLPageState => {
    const [frameWidth] = page.size ?? DEFAULT_SLIDE_SIZE
    return {
      id: page.id,
      camera: {
        point: [0, 0],
        zoom: DECK_SLIDE_WIDTH / frameWidth,
      },
      selectedIds: [],
    }
  }, [])

  const sortedPages = app.useStore(sortedSelector)

  return (
    <StyledDeckContainer>
      <StyledCenterWrap id="TD-Deck">
        {/* Slide Island */}
        <StyledPanel side="lr" id="TD-DeckPanel">
          {/* Slide Strips Container */}
          <StyledScrollArea>
            <StyledViewport>
              <StyledSlideStripContainer>
                {sortedPages.map((page) => (
                  // Slide Strip
                  <StyledSlideContainer key={page.id} style={{ height: getSlideHeight(page) }}>
                    <StyledSlideContainerInner active={page.id === app.currentPageId}>
                      <DeckContextMenu page={page}>
                        <ReadOnlyEditor page={page} pageState={boringPageState(page)} />
                      </DeckContextMenu>
                    </StyledSlideContainerInner>
                  </StyledSlideContainer>
                ))}
                <StyledSlideContainer
                  style={{
                    height:
                      (DECK_SLIDE_WIDTH * DEFAULT_SLIDE_SIZE[1]) / DEFAULT_SLIDE_SIZE[0] +
                      DECK_SLIDE_PADDING_Y * 2,
                  }}
                >
                  <StyledAddPage>
                    <IconButton
                      onClick={handleCreatePage}
                      css={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
                    >
                      <PlusIcon />
                    </IconButton>
                  </StyledAddPage>
                </StyledSlideContainer>
              </StyledSlideStripContainer>
            </StyledViewport>
            <StyledScrollbar orientation="vertical">
              <StyledThumb />
            </StyledScrollbar>
          </StyledScrollArea>

          {/* Slide Controls */}
          <StyledControls>
            <RowButton onClick={handleDuplicatePage}>
              <span>Duplicate Slide</span>
              <SmallIcon>
                <CopyIcon />
              </SmallIcon>
            </RowButton>
            <RowButton onClick={handleDeletePage}>
              <span>Delete Slide</span>
              <SmallIcon>
                <TrashIcon />
              </SmallIcon>
            </RowButton>
          </StyledControls>
        </StyledPanel>
      </StyledCenterWrap>
    </StyledDeckContainer>
  )
})

const StyledDeckContainer = styled('div', {
  display: 'grid',
  position: 'absolute',
  top: 70,
  right: 0,
  justifyContent: 'flex-end',
  alignSelf: 'center',
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  padding: '15 0',
  zIndex: 200,
  pointerEvents: 'none',
  '& > div > *': {
    pointerEvents: 'all',
  },
})

const StyledSlideContainerInner = styled('div', {
  position: 'relative',
  height: '100%',
  width: '100%',
  borderRadius: 'inherit',
  variants: {
    active: {
      true: {
        boxShadow: 'rgb(3 102 214 / 60%) 0px 0px 0px 2px',
      },
      false: {
        boxShadow: '$colors$lightgray 0px 0px 0px 2px',
      },
    },
  },

  defaultVariants: {
    active: 'false',
  },
})

const StyledSlideContainer = styled('div', {
  position: 'relative',
  width: '100%',
  // Height is set inline per-page (see getSlideHeight), from the slide's own aspect ratio,
  // rather than a fixed box that would crop or letterbox it.
  overflow: 'hidden',
  borderRadius: '$3',
  padding: `${DECK_SLIDE_PADDING_Y}px ${DECK_SLIDE_PADDING_X}px`,
  // Needed so that `width: 100%` above already nets out the horizontal padding, matching
  // DECK_SLIDE_WIDTH (what getSlideHeight and boringPageState assume the rendered canvas width
  // to be).
  boxSizing: 'border-box',
})

const StyledAddPage = styled(StyledSlideContainerInner, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

const StyledCenterWrap = styled('div', {
  gridRow: 1,
  gridColumn: 2,
  display: 'flex',
  width: 'fit-content',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
})

const StyledPanel = styled(Panel, {
  flexDirection: 'column',
  gap: '$3',
  width: DECK_WIDTH,

  '@micro': {
    width: 150,
  },
})

const StyledSlideStripContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$3',
})

const StyledControls = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$2',
  padding: '0px 15px',
})

const StyledScrollArea = styled(ScrollAreaPrimitive.Root, {
  maxHeight: 370,
  overflow: 'hidden',
})

const StyledViewport = styled(ScrollAreaPrimitive.Viewport, {
  width: '100%',
  height: '100%',
  borderRadius: 'inherit',
})

const SCROLLBAR_SIZE = 12

const StyledScrollbar = styled(ScrollAreaPrimitive.Scrollbar, {
  display: 'flex',
  // ensures no selection
  userSelect: 'none',
  // disable browser handling of all panning and zooming gestures on touch devices
  touchAction: 'none',
  padding: 4,
  background: 'transparent',
  transition: 'background 160ms ease-out',
  // '&:hover': { background: '$hover' },
  '&[data-orientation="vertical"]': { width: SCROLLBAR_SIZE },
  '&[data-orientation="horizontal"]': {
    flexDirection: 'column',
    height: SCROLLBAR_SIZE,
  },
})

const StyledThumb = styled(ScrollAreaPrimitive.Thumb, {
  flex: 1,
  background: '$darkgray',
  borderRadius: SCROLLBAR_SIZE,
  // increase target size for touch devices https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    height: '100%',
    minWidth: 30,
    minHeight: 20,
  },
})
