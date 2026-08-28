import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { FilePlusIcon } from '@radix-ui/react-icons'
import { useTldrawApp } from '~hooks'
import { DMContent } from '~components/Primitives/DropdownMenu'
import { IconButton } from '~components/Primitives/IconButton'
import { Divider } from '~components/Primitives/Divider'
import { styled } from '~styles'
import { BUILT_IN_TEMPLATES } from '~state/templates'
import type { TDSnapshot } from '~types'
import { TemplateThumbnail } from './TemplateThumbnail'

const documentThemeSelector = (s: TDSnapshot) => s.document.theme

/**
 * Template gallery (Phase 13), opened from the "+" button at the end of the slide strip — the
 * same button that used to call `app.createPage()` directly. This is "a gallery when adding a
 * slide is the natural place" from the brief: adding a slide is already the one moment every user
 * passes through in the deck panel, it's already anchored next to the slide list a new one lands
 * in, and it keeps "start from a layout" and "start blank" as two options behind the same button
 * instead of a second, competing entry point elsewhere in the UI (a new toolbar menu, a command
 * palette) that most users would never find.
 *
 * "Blank" stays the first, most prominent choice — a template picker should speed up starting a
 * deck, not force a detour through it every time.
 */
export const TemplatePicker = React.memo(function TemplatePicker({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const app = useTldrawApp()
  const activeTheme = app.useStore(documentThemeSelector)

  const handleBlank = React.useCallback(() => {
    app.createPage()
  }, [app])

  const handleTemplate = React.useCallback(
    (templateId: string) => {
      app.addSlideFromTemplate(templateId)
    },
    [app]
  )

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger asChild id="TD-AddSlide">
        {children}
      </DropdownMenu.Trigger>
      <DMContent id="TD-AddSlide-Content" align="end">
        <DropdownMenu.Item asChild>
          <BlankRow onClick={handleBlank} id="TD-AddSlide-Blank">
            <BlankSwatch>
              <FilePlusIcon />
            </BlankSwatch>
            <span>Blank slide</span>
          </BlankRow>
        </DropdownMenu.Item>
        <Divider />
        <Label>Layouts</Label>
        <TemplateGrid>
          {BUILT_IN_TEMPLATES.map((template) => (
            <DropdownMenu.Item key={template.id} asChild>
              <TemplateCard
                id={`TD-AddSlide-Template-${template.id}`}
                title={template.name}
                onClick={() => handleTemplate(template.id)}
              >
                <ThumbnailFrame>
                  <TemplateThumbnail template={template} theme={activeTheme} />
                </ThumbnailFrame>
                <TemplateName>{template.name}</TemplateName>
              </TemplateCard>
            </DropdownMenu.Item>
          ))}
        </TemplateGrid>
      </DMContent>
    </DropdownMenu.Root>
  )
})

/* -------------------- styles -------------------- */

const Label = styled('span', {
  display: 'block',
  padding: '$2 $3 0',
  color: '$text',
  opacity: 0.6,
  fontFamily: '$ui',
  fontSize: '$1',
})

const BlankRow = styled('button', {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$3',
  width: '100%',
  padding: '$2 $3',
  border: 'none',
  background: 'transparent',
  color: '$text',
  fontFamily: '$ui',
  fontSize: '$1',
  cursor: 'pointer',
  '&:hover': { background: '$hover' },
})

const BlankSwatch = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: '$1',
  border: '1px dashed $hover',
  color: '$text',
  flexShrink: 0,
})

const TemplateGrid = styled('div', {
  display: 'grid',
  // Fixed tracks, not `1fr` — see the identical note on `BackgroundMenu`'s `PresetGrid`: this
  // menu's width is itself derived from its content (`DMContent` is `width: fit-content`), so a
  // flexible track has nothing stable to resolve against and collapses the grid to its minimum.
  gridTemplateColumns: 'repeat(3, 128px)',
  gridAutoRows: 'auto',
  gap: '$2',
  padding: '$2 $3 $3',
  maxHeight: 360,
  overflowY: 'auto',
})

const TemplateCard = styled('button', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$1',
  padding: 0,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: '$text',
  fontFamily: '$ui',
})

const ThumbnailFrame = styled('div', {
  width: '100%',
  aspectRatio: '16 / 9',
  borderRadius: '$1',
  overflow: 'hidden',
  border: '1px solid $hover',
  '& svg': { display: 'block' },
})

const TemplateName = styled('span', {
  fontSize: '$1',
  textAlign: 'left',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})
