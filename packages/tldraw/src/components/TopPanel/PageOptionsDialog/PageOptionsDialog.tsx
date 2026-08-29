import * as React from 'react'
import * as Dialog from '@radix-ui/react-alert-dialog'
import { MixerVerticalIcon } from '@radix-ui/react-icons'
import type { TDSnapshot, TDPage } from '~types'
import { useTldrawApp } from '~hooks'
import { RowButton, RowButtonProps } from '~components/Primitives/RowButton'
import { styled } from '~styles'
import { Divider } from '~components/Primitives/Divider'
import { IconButton } from '~components/Primitives/IconButton/IconButton'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { breakpoints } from '~components/breakpoints'
import { preventEvent, stopKeyPropagationUnlessEscape } from '~components/preventEvent'

const canDeleteSelector = (s: TDSnapshot) => {
  return Object.keys(s.document.pages).length > 1
}

interface PageOptionsDialogProps {
  page: TDPage
  onOpen?: () => void
  onClose?: () => void
}

export function PageOptionsDialog({ page, onOpen, onClose }: PageOptionsDialogProps): JSX.Element {
  const app = useTldrawApp()

  const [isOpen, setIsOpen] = React.useState(false)

  const canDelete = app.useStore(canDeleteSelector)

  const rInput = React.useRef<HTMLInputElement>(null)

  // T16.3 — speaker notes. A local draft, committed on blur rather than per keystroke: `notes` is
  // written through `app.setPageNotes`, an undoable command (Phase 14), and nobody wants one undo
  // entry per character typed into a paragraph of notes. Re-seeded from `page.notes` whenever the
  // dialog opens for a (possibly different) page — `page` is a prop, so switching which page this
  // dialog is open for without unmounting it would otherwise show stale notes from the last page.
  const [notesDraft, setNotesDraft] = React.useState(page.notes ?? '')
  React.useEffect(() => {
    if (isOpen) setNotesDraft(page.notes ?? '')
  }, [isOpen, page.notes])
  const handleNotesChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotesDraft(e.target.value)
  }, [])
  const handleNotesBlur = React.useCallback(() => {
    app.setPageNotes(page.id, notesDraft.trim() === '' ? undefined : notesDraft)
  }, [app, page.id, notesDraft])

  const handleDuplicate = React.useCallback(() => {
    app.duplicatePage(page.id)
    onClose?.()
  }, [app])

  const handleDelete = React.useCallback(() => {
    if (window.confirm(`Are you sure you want to delete this page?`)) {
      app.deletePage(page.id)
      onClose?.()
    }
  }, [app])

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setIsOpen(isOpen)

      if (isOpen) {
        onOpen?.()
        return
      }
    },
    [app]
  )

  const close = React.useCallback(() => setIsOpen(false), [])

  function stopPropagation(e: React.KeyboardEvent<HTMLDivElement>) {
    e.stopPropagation()
  }

  // TODO: Replace with text input
  function handleRename() {
    const nextName = window.prompt('New name:', page.name)
    app.renamePage(page.id, nextName || page.name || 'Page')
  }

  React.useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        const elm = rInput.current
        if (elm) {
          elm.focus()
          elm.select()
        }
      })
    }
  }, [isOpen])

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild data-shy="true">
        <IconButton bp={breakpoints}>
          <SmallIcon>
            <MixerVerticalIcon />
          </SmallIcon>
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Portal
      // container={the current app's tl-container}
      >
        <StyledDialogOverlay onPointerDown={close} />
        <StyledDialogContent dir="ltr" onKeyDown={stopPropagation} onKeyUp={stopPropagation}>
          <DialogAction onSelect={handleRename}>Rename</DialogAction>
          <DialogAction onSelect={handleDuplicate}>Duplicate</DialogAction>
          <DialogAction disabled={!canDelete} onSelect={handleDelete}>
            Delete
          </DialogAction>
          <Divider />
          <StyledNotesLabel htmlFor="TD-PageOptions-Notes">Speaker notes</StyledNotesLabel>
          <StyledNotesTextarea
            id="TD-PageOptions-Notes"
            placeholder="Notes for the presenter — not shown on the slide itself"
            value={notesDraft}
            onChange={handleNotesChange}
            onBlur={handleNotesBlur}
            onKeyDown={stopKeyPropagationUnlessEscape}
            onKeyUp={stopKeyPropagationUnlessEscape}
          />
          <Divider />
          <Dialog.Cancel asChild>
            <RowButton>Cancel</RowButton>
          </Dialog.Cancel>
        </StyledDialogContent>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* -------------------------------------------------- */
/*                       Dialog                       */
/* -------------------------------------------------- */

export const StyledDialogContent = styled(Dialog.Content, {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  minWidth: 240,
  maxWidth: 'fit-content',
  maxHeight: '85vh',
  marginTop: '-5vh',
  pointerEvents: 'all',
  backgroundColor: '$panel',
  padding: '$0',
  borderRadius: '$2',
  font: '$ui',
  '&:focus': {
    outline: 'none',
  },
})

const StyledNotesLabel = styled('label', {
  display: 'block',
  fontSize: '$1',
  color: '$text',
  opacity: 0.7,
  padding: '$2 $3 0',
})

const StyledNotesTextarea = styled('textarea', {
  display: 'block',
  width: '100%',
  minHeight: 80,
  margin: 0,
  padding: '$2 $3',
  boxSizing: 'border-box',
  border: 'none',
  outline: 'none',
  resize: 'vertical',
  background: 'transparent',
  color: '$text',
  fontFamily: '$ui',
  fontSize: '$1',
  '&:focus': {
    outline: '2px solid $selected',
    outlineOffset: -2,
  },
})

export const StyledDialogOverlay = styled(Dialog.Overlay, {
  backgroundColor: 'rgba(0, 0, 0, .15)',
  position: 'fixed',
  pointerEvents: 'all',
  inset: 0,
})

function DialogAction({
  onSelect,
  ...rest
}: RowButtonProps & { onSelect: (e: React.SyntheticEvent<HTMLButtonElement, Event>) => void }) {
  return (
    <Dialog.Action asChild onClick={onSelect} onSelect={onSelect}>
      <RowButton {...rest} />
    </Dialog.Action>
  )
}
