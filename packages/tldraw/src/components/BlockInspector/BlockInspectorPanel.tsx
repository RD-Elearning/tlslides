import * as React from 'react'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'
import { ComponentShape, TDShapeType, TDSnapshot } from '~types'
import { BlockInspector } from './BlockInspector'

// R12 — mounts the Block Inspector as a right-hand panel whenever exactly one ComponentShape
// is selected, the same "reactive to the store, self-contained" shape as LayersPanel/
// InspectorMenu. Multi-selection or a non-block shape selected shows nothing rather than an
// empty inspector — there is no single block to describe.
const selectedComponentSelector = (s: TDSnapshot): ComponentShape | null => {
  const pageId = s.appState.currentPageId
  const pageState = s.document.pageStates[pageId]
  if (!pageState || pageState.selectedIds.length !== 1) return null
  const shape = s.document.pages[pageId].shapes[pageState.selectedIds[0]]
  return shape && shape.type === TDShapeType.Component ? (shape as ComponentShape) : null
}

export const BlockInspectorPanel = React.memo(function BlockInspectorPanel() {
  const app = useTldrawApp()
  const selected = app.useStore(selectedComponentSelector)

  if (!selected) return null

  return (
    <StyledPanelPosition id="TD-BlockInspector">
      <BlockInspector key={selected.id} selectedShapeId={selected.id} />
    </StyledPanelPosition>
  )
})

const StyledPanelPosition = styled('div', {
  position: 'absolute',
  top: 60,
  right: 0,
  bottom: 0,
  zIndex: 200,
  boxShadow: '$panel',
})
