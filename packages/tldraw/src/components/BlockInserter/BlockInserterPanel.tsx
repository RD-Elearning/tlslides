import * as React from 'react'
import { useTldrawApp, useBlockRegistry } from '~hooks'
import { styled } from '~styles'
import { BlockInserter } from './BlockInserter'
import { useInsertBlock } from './useInsertBlock'

// B7 — the "+" trigger button plus the gallery panel it opens. Click a block card
// or drag one onto the canvas to insert it; the gallery stays open so users can
// add several blocks in a row.
export const BlockInserterPanel = React.memo(function BlockInserterPanel() {
  const app = useTldrawApp()
  const blockRegistry = useBlockRegistry()
  const [open, setOpen] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const insertBlock = useInsertBlock()

  const handleOpen = () => {
    setOpen(true)
  }

  const handleInsert = (type: string) => {
    insertBlock(type)
    // B7 step 4: gallery stays open after insert (docked mode).
  }

  const handleClose = () => setOpen(false)

  // Keyboard shortcut: "+" or "p" opens the gallery
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === '+' || e.key === '=') && e.ctrlKey) {
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // B7 H5: wire the drop callback onto the app so onDrop can reach us.
  // The app calls this with canvas screen-space coords ([clientX - rect.left, clientY - rect.top]);
  // we convert to page-space via app.getPagePoint.
  React.useEffect(() => {
    app.onBlockDrop = (type, screenPoint) => {
      const pagePoint = app.getPagePoint(screenPoint, app.currentPageId)
      insertBlock(type, pagePoint as [number, number])
    }
    return () => {
      app.onBlockDrop = null
    }
  }, [app, insertBlock])

  if (!blockRegistry) return null

  return (
    <>
      <TriggerButton
        ref={buttonRef}
        id="TD-BlockInserter-Trigger"
        onClick={handleOpen}
        title="Insert block"
      >
        +
      </TriggerButton>
      {open && (
        <BlockInserter onInsert={handleInsert} onClose={handleClose} visible={open} />
      )}
    </>
  )
})

const TriggerButton = styled('button', {
  position: 'absolute',
  left: 16,
  bottom: 16,
  zIndex: 200,
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: '1px solid $border',
  backgroundColor: '$bg',
  color: '$text',
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
  boxShadow: '$panel',
  '&:hover': { backgroundColor: '$bgHover' },
})
