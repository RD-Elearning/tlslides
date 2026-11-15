import * as React from 'react'
import { useTldrawApp, useEditorProfile } from '~hooks'
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

const inspectorSelector = (s: TDSnapshot) => ({
  id: s.appState.inspectorFor,
  tab: s.appState.inspectorTab,
  field: s.appState.inspectorField,
})

/** Editor E01 — width of the panel; the canvas fits the slide beside it while it is open. */
const INSPECTOR_WIDTH = 380

export const BlockInspectorPanel = React.memo(function BlockInspectorPanel() {
  const app = useTldrawApp()
  const basic = useEditorProfile() === 'basic'
  const selected = app.useStore(selectedComponentSelector)
  const inspector = app.useStore(inspectorSelector, shallowEqual)

  // Editor E01: in basic the inspector opens only through `app.blockEdit.openInspector` and
  // closes when the selection moves to another block.
  const open = !!selected && (!basic || inspector.id === selected.id)
  React.useEffect(() => {
    if (basic && inspector.id && inspector.id !== selected?.id) app.blockEdit.closeInspector()
  }, [app, basic, inspector.id, selected?.id])

  // Editor E01: the slide is fitted beside the panel instead of under it.
  React.useEffect(() => {
    if (!basic || !open) return
    const before = app.fitInsets.right
    app.setFitInsets({ right: INSPECTOR_WIDTH + 16 })
    app.zoomToFit()
    return () => {
      app.setFitInsets({ right: before })
      app.zoomToFit()
    }
  }, [app, basic, open])

  if (!selected || !open) return null

  return (
    <StyledPanelPosition id="TD-BlockInspector">
      <BlockInspector
        key={`${selected.id}:${inspector.tab ?? ''}:${inspector.field ?? ''}`}
        selectedShapeId={selected.id}
        initialTab={basic ? inspector.tab : undefined}
        hideMotion={basic}
        focusField={basic ? inspector.field : undefined}
        onClose={basic ? () => app.blockEdit.closeInspector() : undefined}
      />
    </StyledPanelPosition>
  )
})

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return a.id === b.id && a.tab === b.tab && a.field === b.field
}

const StyledPanelPosition = styled('div', {
  position: 'absolute',
  top: 60,
  right: 0,
  bottom: 0,
  zIndex: 200,
  boxShadow: '$panel',
})
