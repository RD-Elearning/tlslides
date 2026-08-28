import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { CheckIcon, ColorWheelIcon } from '@radix-ui/react-icons'
import { useTldrawApp } from '~hooks'
import { DMContent } from '~components/Primitives/DropdownMenu'
import { ToolButton } from '~components/Primitives/ToolButton'
import { Divider } from '~components/Primitives/Divider'
import { styled } from '~styles'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'
import type { DeckTheme, TDSnapshot } from '~types'

const documentThemeSelector = (s: TDSnapshot) => s.document.theme

/**
 * The deck theme / brand kit picker (Phase 12). Lives in `TopPanel` next to `BackgroundMenu`, for
 * the exact same reason that menu does: a `DeckTheme` is document-scoped, not tied to the current
 * selection, so it needs to be reachable with nothing selected — unlike `StyleMenu`, which is
 * about the current selection/tool. Unlike `BackgroundMenu`, there is no free-typed field here (no
 * hex input, no angle field) — every choice is one of the curated built-ins, or "No theme" — so
 * this menu doesn't need `stopKeyPropagationUnlessEscape`'s Tab-clones-the-shape guard at all.
 *
 * Every click goes straight through `app.setDeckTheme`, a proper command, so switching (or
 * clearing) the theme is undoable exactly like every other document-level change.
 */
export const ThemeMenu = React.memo(function ThemeMenu(): JSX.Element {
  const app = useTldrawApp()
  const activeTheme = app.useStore(documentThemeSelector)

  const handleSelect = React.useCallback(
    (theme: DeckTheme) => {
      app.setDeckTheme(theme)
    },
    [app]
  )

  const handleClear = React.useCallback(() => {
    app.setDeckTheme(undefined)
  }, [app])

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger asChild id="TD-Theme">
        <ToolButton variant="text">
          <ColorWheelIcon />
          Theme
        </ToolButton>
      </DropdownMenu.Trigger>
      <DMContent id="TD-Theme-Content">
        <ThemeList>
          {BUILT_IN_DECK_THEMES.map((theme) => (
            <DropdownMenu.Item key={theme.id} asChild>
              <ThemeCard
                id={`TD-Theme-${theme.id}`}
                isActive={activeTheme?.id === theme.id}
                onClick={() => handleSelect(theme)}
              >
                <Swatches>
                  <Swatch style={{ background: theme.colors.background }} />
                  <Swatch style={{ background: theme.colors.accent1 }} />
                  <Swatch style={{ background: theme.colors.accent2 }} />
                  <Swatch style={{ background: theme.colors.text }} />
                </Swatches>
                <ThemeName>{theme.name}</ThemeName>
                {activeTheme?.id === theme.id && (
                  <CheckWrap>
                    <CheckIcon />
                  </CheckWrap>
                )}
              </ThemeCard>
            </DropdownMenu.Item>
          ))}
        </ThemeList>
        <Divider />
        <DropdownMenu.Item asChild>
          <ToolButton variant="text" onClick={handleClear} id="TD-Theme-Clear">
            No theme
          </ToolButton>
        </DropdownMenu.Item>
      </DMContent>
    </DropdownMenu.Root>
  )
})

/* -------------------- styles -------------------- */

const ThemeList = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$1',
  padding: '$2 $3',
})

const ThemeCard = styled('button', {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$3',
  width: '100%',
  padding: '$2',
  border: '1px solid $hover',
  borderRadius: '$2',
  background: 'transparent',
  color: '$text',
  fontFamily: '$ui',
  fontSize: '$1',
  cursor: 'pointer',
  variants: {
    isActive: {
      true: { borderColor: '$selected', background: '$hover' },
      false: {},
    },
  },
})

const Swatches = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  flexShrink: 0,
})

const Swatch = styled('div', {
  width: 18,
  height: 18,
  borderRadius: '50%',
  border: '1px solid rgba(0,0,0,0.15)',
  marginLeft: -6,
  '&:first-of-type': { marginLeft: 0 },
})

const ThemeName = styled('span', {
  flex: 1,
  textAlign: 'left',
})

const CheckWrap = styled('div', {
  display: 'flex',
  alignItems: 'center',
  color: '$selected',
})
