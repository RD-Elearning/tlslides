import { EyeClosedIcon, EyeOpenIcon, LayersIcon, LockClosedIcon, LockOpen1Icon } from '@radix-ui/react-icons'
import * as React from 'react'
import { Panel } from '~components/Primitives/Panel'
import { IconButton } from '~components/Primitives/IconButton'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'
import { TDShape, TDSnapshot } from '~types'

// T8c.3 — the layers panel. Lists the *current slide's* top-level shapes (`parentId === pageId`,
// the same scope `moveShapeToIndex` reorders — see its doc comment for why group children aren't
// individually addressable rows here) in z-order, front-most first, matching how every mainstream
// layers panel reads top-to-bottom. Reuses `Deck.tsx`'s exact drag-and-drop idiom (plain HTML5 DnD,
// a `dragId`/`dropIndex` pair, the same before/after index conversion in `handleDrop`) rather than
// inventing a second one — see that component's own comment for the full rationale, which applies
// unchanged here.
const shapesSelector = (s: TDSnapshot) => {
  const page = s.document.pages[s.appState.currentPageId]
  return Object.values(page.shapes)
    .filter((shape) => shape.parentId === s.appState.currentPageId)
    .sort((a, b) => (b.childIndex || 0) - (a.childIndex || 0)) // front-most (highest childIndex) first
}

const selectedIdsSelector = (s: TDSnapshot) =>
  s.document.pageStates[s.appState.currentPageId].selectedIds

function labelFor(shape: TDShape): string {
  const text = 'label' in shape ? shape.label : 'text' in shape ? shape.text : undefined
  const trimmed = text?.trim()
  return trimmed ? `${shape.name} — ${trimmed.slice(0, 24)}` : shape.name
}

export const LayersPanel = React.memo(function LayersPanel(): JSX.Element {
  const app = useTldrawApp()
  const shapes = app.useStore(shapesSelector)
  const selectedIds = app.useStore(selectedIdsSelector)

  // Drag-and-drop reordering — see the module comment above. `dropIndex` is an insertion index
  // into `shapes` *as currently rendered* (front-most first), including the dragged row itself;
  // `handleDrop` converts it to `moveShapeToIndex`'s post-removal, back-to-front `toIndex`.
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [dropIndex, setDropIndex] = React.useState<number | null>(null)

  const handleDragStart = React.useCallback((id: string, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    setDragId(id)
  }, [])

  const handleDragOver = React.useCallback(
    (index: number, e: React.DragEvent) => {
      if (!dragId) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const rect = e.currentTarget.getBoundingClientRect()
      const isBelowMidpoint = e.clientY - rect.top > rect.height / 2
      setDropIndex(index + (isBelowMidpoint ? 1 : 0))
    },
    [dragId]
  )

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (dragId && dropIndex !== null) {
        const fromIndex = shapes.findIndex((shape) => shape.id === dragId)
        const uiIndex = dropIndex > fromIndex ? dropIndex - 1 : dropIndex
        // `shapes` is front-most-first; `moveShapeToIndex` (like `movePage`) takes a back-to-front
        // index, so the two orderings are mirror images of each other.
        const toIndex = shapes.length - 1 - uiIndex
        const fromToIndex = shapes.length - 1 - fromIndex
        if (toIndex !== fromToIndex) {
          app.moveShapeToIndex(dragId, toIndex)
        }
      }
      setDragId(null)
      setDropIndex(null)
    },
    [app, dragId, dropIndex, shapes]
  )

  const handleDragEnd = React.useCallback(() => {
    setDragId(null)
    setDropIndex(null)
  }, [])

  if (shapes.length === 0) {
    return (
      <StyledPanel id="TD-LayersPanel">
        <StyledHeader>
          <SmallIcon>
            <LayersIcon />
          </SmallIcon>
          Layers
        </StyledHeader>
        <StyledEmpty>No shapes on this slide</StyledEmpty>
      </StyledPanel>
    )
  }

  return (
    <StyledPanel id="TD-LayersPanel">
      <StyledHeader>
        <SmallIcon>
          <LayersIcon />
        </SmallIcon>
        Layers
      </StyledHeader>
      <StyledScrollArea>
        <ScrollAreaPrimitive.Viewport style={{ width: '100%', height: '100%' }}>
          <StyledRows>
            {shapes.map((shape, index) => (
              <React.Fragment key={shape.id}>
                {dropIndex === index && <StyledDropIndicator />}
                <StyledRow
                  data-shape-id={shape.id}
                  data-dragging={shape.id === dragId || undefined}
                  isSelected={selectedIds.includes(shape.id)}
                  draggable
                  onDragStart={(e) => handleDragStart(shape.id, e)}
                  onDragOver={(e) => handleDragOver(index, e)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  onClick={() => app.select(shape.id)}
                >
                  <StyledLabel>{labelFor(shape)}</StyledLabel>
                  <StyledActions>
                    <IconButton
                      id={`TD-LayersPanel-Hide-${shape.id}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        app.toggleHidden([shape.id])
                      }}
                    >
                      <SmallIcon>{shape.isHidden ? <EyeClosedIcon /> : <EyeOpenIcon />}</SmallIcon>
                    </IconButton>
                    <IconButton
                      id={`TD-LayersPanel-Lock-${shape.id}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        app.toggleLocked([shape.id])
                      }}
                    >
                      <SmallIcon>{shape.isLocked ? <LockClosedIcon /> : <LockOpen1Icon />}</SmallIcon>
                    </IconButton>
                  </StyledActions>
                </StyledRow>
              </React.Fragment>
            ))}
            {dropIndex === shapes.length && <StyledDropIndicator />}
          </StyledRows>
        </ScrollAreaPrimitive.Viewport>
      </StyledScrollArea>
    </StyledPanel>
  )
})

const StyledPanel = styled(Panel, {
  position: 'absolute',
  top: 70,
  left: 60,
  zIndex: 200,
  width: 220,
  flexDirection: 'column',
  padding: '$2 0',
  gap: 0,
})

const StyledHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '$2',
  padding: '$2 $3',
  fontSize: '$1',
  fontWeight: 600,
  color: '$text',
})

const StyledEmpty = styled('div', {
  padding: '$3',
  fontSize: '$1',
  color: '$text',
  opacity: 0.6,
})

const StyledScrollArea = styled(ScrollAreaPrimitive.Root, {
  maxHeight: 320,
  overflow: 'hidden',
})

const StyledRows = styled('div', {
  display: 'flex',
  flexDirection: 'column',
})

const StyledRow = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$2',
  padding: '$2 $3',
  cursor: 'pointer',
  fontSize: '$1',
  color: '$text',
  '&:hover': { background: '$hover' },
  '&[data-dragging]': { opacity: 0.4 },
  variants: {
    isSelected: {
      true: { background: '$selected', color: 'white' },
      false: {},
    },
  },
})

const StyledLabel = styled('span', {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const StyledActions = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '$1',
  flexShrink: 0,
})

const StyledDropIndicator = styled('div', {
  height: 2,
  margin: '0 $3',
  background: '$selected',
})
