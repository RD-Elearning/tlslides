import * as React from 'react'
import { dark, styled } from '~styles'
import * as RadixContextMenu from '@radix-ui/react-context-menu'
import { useTheme, useTldrawApp } from '~hooks'
import { Divider } from '~components/Primitives/Divider'
import { MenuContent } from '~components/Primitives/MenuContent'
import { RowButton, RowButtonProps } from '~components/Primitives/RowButton'
import { ToolButton, ToolButtonProps } from '~components/Primitives/ToolButton'
import { TDPage } from '~types'

const preventDefault = (e: Event) => e.stopPropagation()

interface ContextMenuProps {
  onBlur?: React.FocusEventHandler
  children: React.ReactNode
  page: TDPage
  /** The page's zero-based position among its siblings, sorted by childIndex. */
  index: number
  /** The total number of pages in the deck. */
  count: number
}

export const DeckContextMenu = ({
  onBlur,
  page,
  index,
  count,
  children,
}: ContextMenuProps): JSX.Element => {
  return (
    <RadixContextMenu.Root dir="ltr">
      <RadixContextMenu.Trigger dir="ltr">{children}</RadixContextMenu.Trigger>
      <InnerMenu onBlur={onBlur} page={page} index={index} count={count} />
    </RadixContextMenu.Root>
  )
}

interface InnerContextMenuProps {
  onBlur?: React.FocusEventHandler
  page: TDPage
  index: number
  count: number
}

const InnerMenu = React.memo(function InnerMenu({
  onBlur,
  page,
  index,
  count,
}: InnerContextMenuProps) {
  const app = useTldrawApp()
  const { theme } = useTheme()

  const handleDelete = React.useCallback(() => {
    app.deletePage(page.id)
  }, [app])

  const handleDuplicate = React.useCallback(() => {
    app.duplicatePage(page.id)
  }, [app])

  // TODO: Replace with text input
  const handleRename = React.useCallback(() => {
    const nextName = window.prompt('New name:', page.name)
    app.renamePage(page.id, nextName || page.name || 'Page')
  }, [app, page])

  // Reordering reachable without dragging (see the deck panel's drag-and-drop) — keyboard/screen
  // reader users and anyone who'd rather not drag a live canvas thumbnail can use these instead.
  const handleMoveUp = React.useCallback(() => {
    app.movePage(page.id, index - 1)
  }, [app, page, index])

  const handleMoveDown = React.useCallback(() => {
    app.movePage(page.id, index + 1)
  }, [app, page, index])

  const rContent = React.useRef<HTMLDivElement>(null)

  return (
    <RadixContextMenu.Content
      dir="ltr"
      ref={rContent}
      onEscapeKeyDown={preventDefault}
      asChild
      tabIndex={-1}
      onBlur={onBlur}
      className={theme === 'dark' ? dark : ''}
    >
      <MenuContent id="TD-ContextMenu">
        <CMRowButton onClick={handleRename} id="TD-Deck-ContextMenu-Rename">
          Rename
        </CMRowButton>
        <CMRowButton onClick={handleDuplicate} id="TD-Deck-ContextMenu-Duplicate">
          Duplicate
        </CMRowButton>
        <CMRowButton
          onClick={handleMoveUp}
          disabled={index === 0}
          id="TD-Deck-ContextMenu-MoveUp"
        >
          Move Up
        </CMRowButton>
        <CMRowButton
          onClick={handleMoveDown}
          disabled={index === count - 1}
          id="TD-Deck-ContextMenu-MoveDown"
        >
          Move Down
        </CMRowButton>
        <CMRowButton onClick={handleDelete} id="TD-Deck-ContextMenu-Delete">
          Delete
        </CMRowButton>
      </MenuContent>
    </RadixContextMenu.Content>
  )
})

/* --------------------- Submenu -------------------- */

export interface ContextMenuSubMenuProps {
  label: string
  size?: 'small'
  children: React.ReactNode
  id?: string
}

export function ContextMenuSubMenu({
  children,
  label,
  size,
  id,
}: ContextMenuSubMenuProps): JSX.Element {
  return (
    <span id={id}>
      <RadixContextMenu.Root dir="ltr">
        <CMTriggerButton isSubmenu>{label}</CMTriggerButton>
        <RadixContextMenu.Content dir="ltr" sideOffset={2} alignOffset={-2} asChild>
          <MenuContent size={size}>
            {children}
            <CMArrow offset={13} />
          </MenuContent>
        </RadixContextMenu.Content>
      </RadixContextMenu.Root>
    </span>
  )
}

/* ---------------------- Arrow --------------------- */

const CMArrow = styled(RadixContextMenu.ContextMenuArrow, {
  fill: '$panel',
})

/* ------------------- IconButton ------------------- */

function CMIconButton({ onSelect, ...rest }: ToolButtonProps): JSX.Element {
  return (
    <RadixContextMenu.ContextMenuItem dir="ltr" onSelect={onSelect} asChild>
      <ToolButton {...rest} />
    </RadixContextMenu.ContextMenuItem>
  )
}

/* -------------------- RowButton ------------------- */

const CMRowButton = ({ id, ...rest }: RowButtonProps) => {
  return (
    <RadixContextMenu.ContextMenuItem asChild id={id}>
      <RowButton {...rest} />
    </RadixContextMenu.ContextMenuItem>
  )
}

/* ----------------- Trigger Button ----------------- */

interface CMTriggerButtonProps extends RowButtonProps {
  isSubmenu?: boolean
}

export const CMTriggerButton = ({ isSubmenu, ...rest }: CMTriggerButtonProps) => {
  return (
    <RadixContextMenu.ContextMenuTriggerItem asChild>
      <RowButton hasArrow={isSubmenu} {...rest} />
    </RadixContextMenu.ContextMenuTriggerItem>
  )
}
