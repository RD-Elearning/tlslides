import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ImageIcon, PlusIcon, Cross2Icon } from '@radix-ui/react-icons'
import { useTldrawApp } from '~hooks'
import { DMContent } from '~components/Primitives/DropdownMenu'
import { ToolButton } from '~components/Primitives/ToolButton'
import { Divider } from '~components/Primitives/Divider'
import { styled } from '~styles'
import { preventEvent, stopKeyPropagationUnlessEscape } from '~components/preventEvent'
import { GRADIENT_PRESETS } from '~state/shapes/shared/background'
import type { SlideBackground, TDGradientStop, TDSnapshot } from '~types'

const currentPageSelector = (s: TDSnapshot) => s.document.pages[s.appState.currentPageId]

// A background-less page renders with the theme's own default paper color (see Tldraw.tsx's
// `frameFill`), which this menu has no direct access to (it's a UI-only concern, not part of the
// document). This is purely the menu's own starting point for "Solid" when nothing is set yet —
// picking a color from here always writes an explicit `SlideBackground`, it never reads the theme.
const FALLBACK_SOLID_COLOR = '#ffffff'
const FALLBACK_GRADIENT: Extract<SlideBackground, { type: 'linearGradient' }> =
  GRADIENT_PRESETS[0].background

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const isValidHex = (value: string) => HEX_COLOR_RE.test(value.trim())

function cssGradientPreview(bg: Extract<SlideBackground, { type: 'linearGradient' }>): string {
  const stops = bg.stops.map((s) => `${s.color} ${Math.round(s.at * 100)}%`).join(', ')
  return `linear-gradient(${bg.angle}deg, ${stops})`
}

/**
 * A per-slide background picker: solid colour, an arbitrary-angle multi-stop linear gradient, and
 * a curated preset list. Lives in `TopPanel` next to `PageMenu` (T11.4) — a slide's background is
 * exactly as page-scoped a property as its name or size, which `PageMenu`/`PageOptionsDialog`
 * already manage, and it needs to be reachable without first selecting a shape (unlike
 * `StyleMenu`, which is about the current selection/tool's style).
 *
 * Every mutation goes through `app.setPageBackground`, a proper command (see
 * `state/commands/setPageBackground`) — so this participates in undo/redo exactly like
 * `StyleMenu`'s controls do through `app.style`.
 */
export const BackgroundMenu = React.memo(function BackgroundMenu(): JSX.Element {
  const app = useTldrawApp()
  const page = app.useStore(currentPageSelector)

  // Widen the legacy plain-string shape of the old reserved field the same way
  // `resolveSlideBackground` does, so this menu never has to special-case it.
  const background: SlideBackground | undefined = React.useMemo(() => {
    if (page.background === undefined) return undefined
    return typeof page.background === 'string'
      ? { type: 'solid', color: page.background }
      : page.background
  }, [page.background])

  const pageId = page.id

  // Remembers the last value seen for each tab, so switching Solid <-> Gradient and back doesn't
  // throw away what the user had — only committed to the document once a tab is actually clicked,
  // never just by the menu re-rendering.
  const rLastSolid = React.useRef<string>(
    background?.type === 'solid' ? background.color : FALLBACK_SOLID_COLOR
  )
  const rLastGradient = React.useRef<Extract<SlideBackground, { type: 'linearGradient' }>>(
    background?.type === 'linearGradient' ? background : FALLBACK_GRADIENT
  )
  if (background?.type === 'solid') rLastSolid.current = background.color
  if (background?.type === 'linearGradient') rLastGradient.current = background

  const activeTab: 'solid' | 'gradient' =
    background?.type === 'linearGradient' ? 'gradient' : 'solid'

  const handleSelectSolidTab = React.useCallback(() => {
    app.setPageBackground(pageId, { type: 'solid', color: rLastSolid.current })
  }, [app, pageId])

  const handleSelectGradientTab = React.useCallback(() => {
    app.setPageBackground(pageId, rLastGradient.current)
  }, [app, pageId])

  const handleClear = React.useCallback(() => {
    app.setPageBackground(pageId, undefined)
  }, [app, pageId])

  // --- Solid ---------------------------------------------------------------------------------
  const solidColor = background?.type === 'solid' ? background.color : FALLBACK_SOLID_COLOR
  const [solidHexDraft, setSolidHexDraft] = React.useState<string | undefined>(undefined)
  const handleSolidPicker = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      app.setPageBackground(pageId, { type: 'solid', color: e.target.value })
    },
    [app, pageId]
  )
  const handleSolidHexInput = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSolidHexDraft(e.target.value),
    []
  )
  const commitSolidHex = React.useCallback(() => {
    setSolidHexDraft((draft) => {
      if (draft !== undefined && isValidHex(draft)) {
        app.setPageBackground(pageId, { type: 'solid', color: draft.trim() })
      }
      return undefined
    })
  }, [app, pageId])
  const handleHexKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    stopKeyPropagationUnlessEscape(e)
    if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
  }, [])

  // --- Gradient --------------------------------------------------------------------------------
  const gradient =
    background?.type === 'linearGradient' ? background : rLastGradient.current

  const commitGradient = React.useCallback(
    (next: Extract<SlideBackground, { type: 'linearGradient' }>) => {
      app.setPageBackground(pageId, next)
    },
    [app, pageId]
  )

  const [angleDraft, setAngleDraft] = React.useState<string | undefined>(undefined)
  const handleAngleInput = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setAngleDraft(e.target.value),
    []
  )
  const commitAngle = React.useCallback(() => {
    setAngleDraft((draft) => {
      if (draft !== undefined && draft.trim() !== '') {
        const parsed = Number(draft)
        // Normalizing into [0, 360) rather than clamping keeps e.g. -30 and 750 meaningful
        // instead of silently snapping to an endpoint — degrees naturally wrap.
        if (Number.isFinite(parsed)) {
          const angle = ((parsed % 360) + 360) % 360
          commitGradient({ ...gradient, angle })
        }
      }
      return undefined
    })
  }, [gradient, commitGradient])

  const handleStopColorChange = React.useCallback(
    (index: number, color: string) => {
      const stops = gradient.stops.map((s, i) => (i === index ? { ...s, color } : s))
      commitGradient({ ...gradient, stops })
    },
    [gradient, commitGradient]
  )

  const [stopPositionDrafts, setStopPositionDrafts] = React.useState<Record<number, string>>({})
  const handleStopPositionInput = React.useCallback(
    (index: number, value: string) => setStopPositionDrafts((d) => ({ ...d, [index]: value })),
    []
  )
  const commitStopPosition = React.useCallback(
    (index: number) => {
      setStopPositionDrafts((drafts) => {
        const draft = drafts[index]
        if (draft !== undefined && draft.trim() !== '') {
          const parsed = Number(draft)
          if (Number.isFinite(parsed)) {
            const at = Math.max(0, Math.min(100, parsed)) / 100
            const stops = gradient.stops.map((s, i) => (i === index ? { ...s, at } : s))
            commitGradient({ ...gradient, stops })
          }
        }
        const rest = { ...drafts }
        delete rest[index]
        return rest
      })
    },
    [gradient, commitGradient]
  )
  const handleStopPositionKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    stopKeyPropagationUnlessEscape(e)
    if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
  }, [])

  const handleAddStop = React.useCallback(() => {
    // New stop halfway between the last two — a sane default that's visibly distinct from
    // clicking directly on top of an existing stop.
    const sorted = [...gradient.stops].sort((a, b) => a.at - b.at)
    const last = sorted[sorted.length - 1]
    const prev = sorted[sorted.length - 2]
    const at = prev ? (prev.at + last.at) / 2 : Math.min(1, last.at + 0.5)
    const newStop: TDGradientStop = { color: '#ffffff', at }
    commitGradient({ ...gradient, stops: [...gradient.stops, newStop] })
  }, [gradient, commitGradient])

  const handleRemoveStop = React.useCallback(
    (index: number) => {
      if (gradient.stops.length <= 2) return // a gradient needs at least two stops to mean anything
      commitGradient({ ...gradient, stops: gradient.stops.filter((_, i) => i !== index) })
    },
    [gradient, commitGradient]
  )

  const handlePresetClick = React.useCallback(
    (presetBackground: Extract<SlideBackground, { type: 'linearGradient' }>) => {
      app.setPageBackground(pageId, presetBackground)
    },
    [app, pageId]
  )

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger asChild id="TD-Background">
        <ToolButton variant="text">
          <ImageIcon />
          Background
        </ToolButton>
      </DropdownMenu.Trigger>
      <DMContent id="TD-Background-Content">
        <StyledRow>
          <TabGroup>
            <TabButton
              id="TD-Background-Tab-Solid"
              isActive={activeTab === 'solid'}
              onClick={handleSelectSolidTab}
            >
              Solid
            </TabButton>
            <TabButton
              id="TD-Background-Tab-Gradient"
              isActive={activeTab === 'gradient'}
              onClick={handleSelectGradientTab}
            >
              Gradient
            </TabButton>
          </TabGroup>
        </StyledRow>
        {activeTab === 'solid' && (
          <StyledRow id="TD-Background-Solid-Container">
            <ColorFieldGroup>
              <ColorSwatchInput
                type="color"
                id="TD-Background-Solid-Picker"
                value={/^#[0-9a-f]{6}$/i.test(solidColor) ? solidColor : FALLBACK_SOLID_COLOR}
                onChange={handleSolidPicker}
                onKeyDown={stopKeyPropagationUnlessEscape}
                onKeyUp={stopKeyPropagationUnlessEscape}
              />
              <HexTextInput
                id="TD-Background-Solid-Hex"
                type="text"
                placeholder={solidColor}
                value={solidHexDraft ?? ''}
                onChange={handleSolidHexInput}
                onBlur={commitSolidHex}
                onKeyDown={handleHexKeyDown}
                onKeyUp={stopKeyPropagationUnlessEscape}
                spellCheck={false}
              />
            </ColorFieldGroup>
          </StyledRow>
        )}
        {activeTab === 'gradient' && (
          <>
            <StyledRow id="TD-Background-Angle-Container">
              <span>Angle</span>
              <NumberFieldRow>
                <NumberInput
                  id="TD-Background-Angle-Input"
                  type="number"
                  min={0}
                  max={359}
                  step={1}
                  value={angleDraft ?? String(Math.round(gradient.angle))}
                  onChange={handleAngleInput}
                  onBlur={commitAngle}
                  onKeyDown={(e) => {
                    stopKeyPropagationUnlessEscape(e)
                    if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
                  }}
                  onKeyUp={stopKeyPropagationUnlessEscape}
                />
                <NumberReadout>°</NumberReadout>
              </NumberFieldRow>
            </StyledRow>
            <GradientPreviewBar style={{ background: cssGradientPreview(gradient) }} />
            <StyledColumn id="TD-Background-Stops-Container">
              {gradient.stops.map((stop, i) => (
                <StopRow key={i} id={`TD-Background-Stop-${i}`}>
                  <ColorSwatchInput
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(stop.color) ? stop.color : '#ffffff'}
                    onChange={(e) => handleStopColorChange(i, e.target.value)}
                    onKeyDown={stopKeyPropagationUnlessEscape}
                    onKeyUp={stopKeyPropagationUnlessEscape}
                  />
                  <NumberInput
                    id={`TD-Background-Stop-${i}-Position`}
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={stopPositionDrafts[i] ?? String(Math.round(stop.at * 100))}
                    onChange={(e) => handleStopPositionInput(i, e.target.value)}
                    onBlur={() => commitStopPosition(i)}
                    onKeyDown={handleStopPositionKeyDown}
                    onKeyUp={stopKeyPropagationUnlessEscape}
                  />
                  <NumberReadout>%</NumberReadout>
                  {gradient.stops.length > 2 && (
                    <ToolButton
                      variant="icon"
                      onClick={() => handleRemoveStop(i)}
                      id={`TD-Background-Stop-${i}-Remove`}
                    >
                      <Cross2Icon />
                    </ToolButton>
                  )}
                </StopRow>
              ))}
              <DropdownMenu.Item onSelect={preventEvent} asChild>
                <ToolButton variant="text" onClick={handleAddStop} id="TD-Background-AddStop">
                  <PlusIcon /> Add stop
                </ToolButton>
              </DropdownMenu.Item>
            </StyledColumn>
            <Divider />
            {/* The presets are the point of this menu — a user picking a background reaches for a
                good-looking one far more often than they hand-tune stops. They get their own
                full-width block with the label above rather than a label/control `StyledRow`: as a
                flex item in a `space-between` row, the grid collapses to whatever the label leaves
                over, which rendered 24 gradients as ~13px dots. */}
            <PresetSection>
              <PresetLabel>Presets</PresetLabel>
              <PresetGrid>
                {GRADIENT_PRESETS.map((p) => (
                  <DropdownMenu.Item key={p.id} onSelect={preventEvent} asChild>
                    <PresetSwatch
                      id={`TD-Background-Preset-${p.id}`}
                      title={p.name}
                      style={{ background: cssGradientPreview(p.background) }}
                      onClick={() => handlePresetClick(p.background)}
                    />
                  </DropdownMenu.Item>
                ))}
              </PresetGrid>
            </PresetSection>
          </>
        )}
        <Divider />
        <DropdownMenu.Item onSelect={preventEvent} asChild>
          <ToolButton variant="text" onClick={handleClear} id="TD-Background-Clear">
            Reset to default
          </ToolButton>
        </DropdownMenu.Item>
      </DMContent>
    </DropdownMenu.Root>
  )
})

/* -------------------- styles -------------------- */

const StyledRow = styled('div', {
  position: 'relative',
  width: '100%',
  minHeight: 32,
  color: '$text',
  fontFamily: '$ui',
  fontSize: '$1',
  padding: '$2 $3',
  display: 'flex',
  gap: '$3',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  variants: {
    variant: {
      tall: {
        alignItems: 'flex-start',
        '& > span': { paddingTop: '$1' },
      },
    },
  },
})

const StyledColumn = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$2',
  padding: '0 $3 $2',
})

const StopRow = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$2',
})

const TabGroup = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  gap: '$1',
  width: '100%',
})

const TabButton = styled('button', {
  flex: 1,
  padding: '$2',
  border: '1px solid $hover',
  borderRadius: '$1',
  background: 'transparent',
  color: '$text',
  fontFamily: '$ui',
  fontSize: '$1',
  cursor: 'pointer',
  variants: {
    isActive: {
      true: { background: '$selected', color: 'white', borderColor: '$selected' },
      false: {},
    },
  },
})

const ColorFieldGroup = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$2',
  flex: 1,
})

const ColorSwatchInput = styled('input', {
  width: 24,
  height: 24,
  padding: 0,
  border: '1px solid $hover',
  borderRadius: '$0',
  background: 'transparent',
  cursor: 'pointer',
  flexShrink: 0,
})

const HexTextInput = styled('input', {
  flex: 1,
  minWidth: 0,
  padding: '$1 $2',
  border: '1px solid $hover',
  borderRadius: '$0',
  background: 'transparent',
  color: '$text',
  fontFamily: '$mono',
  fontSize: '$1',
  '&:focus': { outline: '2px solid $selected', outlineOffset: -1 },
})

const NumberFieldRow = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$1',
})

const NumberInput = styled('input', {
  width: 52,
  padding: '$1 $2',
  border: '1px solid $hover',
  borderRadius: '$0',
  background: 'transparent',
  color: '$text',
  fontFamily: '$ui',
  fontSize: '$1',
  textAlign: 'right',
  '&:focus': { outline: '2px solid $selected', outlineOffset: -1 },
})

const NumberReadout = styled('span', {
  minWidth: 12,
  color: '$text',
  opacity: 0.7,
})

const GradientPreviewBar = styled('div', {
  height: 28,
  margin: '0 $3 $2',
  borderRadius: '$1',
  border: '1px solid $hover',
})

const PresetSection = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$2',
  padding: '$2 $3',
  width: '100%',
})

const PresetLabel = styled('span', {
  color: '$text',
  fontFamily: '$ui',
  fontSize: '$1',
})

const PresetGrid = styled('div', {
  display: 'grid',
  // Fixed tracks, not `1fr` or `auto-fill`: `DMContent` sizes itself with `width: fit-content`, so
  // a flexible track resolves against a width the grid is itself supposed to determine. That
  // circularity settles on the menu's minimum, which squeezed 24 presets into two columns and
  // twelve rows — overflowing `maxHeight: 75vh` with no scroll, since `DMContent` has `overflowY`
  // commented out. Concrete widths make the grid push the menu open to fit six across instead.
  gridTemplateColumns: 'repeat(6, 32px)',
  gridAutoRows: '32px',
  gap: '$2',
})

const PresetSwatch = styled('button', {
  // Fills its fixed grid track — see the note on `PresetGrid` for why the track, not the swatch,
  // carries the concrete size.
  width: '100%',
  height: '100%',
  border: '1px solid $hover',
  borderRadius: '$1',
  cursor: 'pointer',
  padding: 0,
})
