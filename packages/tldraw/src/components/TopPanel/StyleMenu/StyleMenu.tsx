import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  strokes,
  fills,
  defaultTextStyle,
  getEffectiveStrokeWidth,
} from '~state/shapes/shared/shape-styles'
import { GRADIENT_PRESETS } from '~state/shapes/shared/background'
import { useTldrawApp } from '~hooks'
import { DMCheckboxItem, DMContent, DMRadioItem } from '~components/Primitives/DropdownMenu'
import {
  CircleIcon,
  DashDashedIcon,
  DashDottedIcon,
  DashDrawIcon,
  DashSolidIcon,
  SizeLargeIcon,
  SizeMediumIcon,
  SizeSmallIcon,
} from '~components/Primitives/icons'
import { ToolButton } from '~components/Primitives/ToolButton'
import { Slider } from '~components/Primitives/Slider'
import {
  TDSnapshot,
  ColorStyle,
  DashStyle,
  SizeStyle,
  ShapeStyles,
  FontStyle,
  AlignStyle,
  TDShapeType,
} from '~types'
import { styled } from '~styles'
import { breakpoints } from '~components/breakpoints'
import { Divider } from '~components/Primitives/Divider'
import { preventEvent, stopKeyPropagationUnlessEscape } from '~components/preventEvent'
import {
  Cross2Icon,
  TextAlignCenterIcon,
  TextAlignJustifyIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
} from '@radix-ui/react-icons'

const currentStyleSelector = (s: TDSnapshot) => s.appState.currentStyle
const selectedIdsSelector = (s: TDSnapshot) =>
  s.document.pageStates[s.appState.currentPageId].selectedIds

// Phase 8b — `defaultTextStyle`'s keys drive the "common style across the current selection" sync
// effect below. It has no entries for the Phase 8a/8b fields (they're all optional overrides with
// no default), so they're appended explicitly — otherwise the panel would silently ignore a
// selected shape's own opacity/strokeWidth/cornerRadius/stroke/fill and show stale/blank controls.
const STYLE_KEYS = [
  ...Object.keys(defaultTextStyle),
  'opacity',
  'strokeWidth',
  'cornerRadius',
  'stroke',
  'fill',
  'fillGradient',
] as (keyof ShapeStyles)[]

// Corner radius is only meaningful for shapes with a rectangular outline (Rectangle and the
// host-component placeholder both consume it — see clampCornerRadius's call sites). Showing the
// control for e.g. a selected ellipse or line would do nothing when changed, which is worse than
// not offering it.
const CORNER_RADIUS_SHAPE_TYPES: string[] = [TDShapeType.Rectangle, TDShapeType.Component]

const cornerRadiusVisibleSelector = (s: TDSnapshot) => {
  const { activeTool, currentPageId: pageId } = s.appState
  if (activeTool === TDShapeType.Rectangle) return true
  if (activeTool !== 'select') return false
  const page = s.document.pages[pageId]
  return s.document.pageStates[pageId].selectedIds.some((id) =>
    CORNER_RADIUS_SHAPE_TYPES.includes(page.shapes[id]?.type)
  )
}

// A hex text field is free-typed, so it needs validating before it's sent through `app.style` —
// `#f00`/`#ff0000` (with optional alpha) are the forms every browser's own `<input type="color">`
// and CSS both accept.
const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const isValidHex = (value: string) => HEX_COLOR_RE.test(value.trim())

// `<input type="color">` only ever round-trips a 6-digit `#rrggbb`, so it needs a concrete value
// even when there's no override yet — falling back to the theme's current resolved stroke/fill
// keeps the swatch honest (it shows what the shape actually looks like right now) without
// implying an override is in effect.
const to6DigitHex = (value: string): string => {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return (
      '#' +
      value
        .slice(1)
        .split('')
        .map((c) => c + c)
        .join('')
    )
  }
  return '#000000'
}

const DASH_ICONS = {
  [DashStyle.Draw]: <DashDrawIcon />,
  [DashStyle.Solid]: <DashSolidIcon />,
  [DashStyle.Dashed]: <DashDashedIcon />,
  [DashStyle.Dotted]: <DashDottedIcon />,
}

const SIZE_ICONS = {
  [SizeStyle.Small]: <SizeSmallIcon />,
  [SizeStyle.Medium]: <SizeMediumIcon />,
  [SizeStyle.Large]: <SizeLargeIcon />,
}

const ALIGN_ICONS = {
  [AlignStyle.Start]: <TextAlignLeftIcon />,
  [AlignStyle.Middle]: <TextAlignCenterIcon />,
  [AlignStyle.End]: <TextAlignRightIcon />,
  [AlignStyle.Justify]: <TextAlignJustifyIcon />,
}

const themeSelector = (s: TDSnapshot) => (s.settings.isDarkMode ? 'dark' : 'light')

const optionsSelector = (s: TDSnapshot) => {
  const { activeTool, currentPageId: pageId } = s.appState
  switch (activeTool) {
    case 'select': {
      const page = s.document.pages[pageId]
      let hasText = false
      let hasLabel = false
      for (const id of s.document.pageStates[pageId].selectedIds) {
        if ('text' in page.shapes[id]) hasText = true
        if ('label' in page.shapes[id]) hasLabel = true
      }
      return hasText ? 'text' : hasLabel ? 'label' : ''
    }
    case TDShapeType.Text: {
      return 'text'
    }
    case TDShapeType.Rectangle: {
      return 'label'
    }
    case TDShapeType.Ellipse: {
      return 'label'
    }
    case TDShapeType.Triangle: {
      return 'label'
    }
    case TDShapeType.Arrow: {
      return 'label'
    }
    // Lines have no label, unlike arrows, so no text-style controls are shown for the line tool.
  }

  return false
}

export const StyleMenu = React.memo(function ColorMenu(): JSX.Element {
  const app = useTldrawApp()
  const theme = app.useStore(themeSelector)
  const options = app.useStore(optionsSelector)
  const showCornerRadius = app.useStore(cornerRadiusVisibleSelector)
  const currentStyle = app.useStore(currentStyleSelector)
  const selectedIds = app.useStore(selectedIdsSelector)
  const [displayedStyle, setDisplayedStyle] = React.useState(currentStyle)
  const rDisplayedStyle = React.useRef(currentStyle)
  React.useEffect(() => {
    const {
      appState: { currentStyle },
      page,
      selectedIds,
    } = app
    let commonStyle = {} as ShapeStyles
    if (selectedIds.length <= 0) {
      commonStyle = currentStyle
    } else {
      const overrides = new Set<string>([])
      app.selectedIds
        .map((id) => page.shapes[id])
        .forEach((shape) => {
          STYLE_KEYS.forEach((key) => {
            if (overrides.has(key)) return
            if (commonStyle[key] === undefined) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              commonStyle[key] = shape.style[key]
            } else {
              if (commonStyle[key] === shape.style[key]) return
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              commonStyle[key] = shape.style[key]
              overrides.add(key)
            }
          })
        })
    }
    // Until we can work out the correct logic for deciding whether or not to
    // update the selected style, do a string comparison. Yuck!
    if (JSON.stringify(commonStyle) !== JSON.stringify(rDisplayedStyle.current)) {
      rDisplayedStyle.current = commonStyle
      setDisplayedStyle(commonStyle)
    }
  }, [currentStyle, selectedIds])
  const handleToggleFilled = React.useCallback((checked: boolean) => {
    app.style({ isFilled: checked })
  }, [])
  const handleDashChange = React.useCallback((value: string) => {
    app.style({ dash: value as DashStyle })
  }, [])
  const handleSizeChange = React.useCallback((value: string) => {
    // Phase 8b — coherence rule for the size-enum-vs-arbitrary-stroke-width conflict: an explicit
    // `strokeWidth` override otherwise wins forever (see getEffectiveStrokeWidth), which would
    // make the S/M/L buttons look permanently broken once a shape has ever had a custom width.
    // Picking a size is a discrete "go back to the enum" action, so it clears the override in the
    // same `app.style` call — one undo step either restores both together, or neither.
    app.style({ size: value as SizeStyle, strokeWidth: undefined })
  }, [])
  const handleFontChange = React.useCallback((value: string) => {
    app.style({ font: value as FontStyle })
  }, [])
  const handleTextAlignChange = React.useCallback((value: string) => {
    app.style({ textAlign: value as AlignStyle })
  }, [])
  // Phase 8b — same coherence rule as size/strokeWidth above, applied to color/stroke/fill:
  // picking a swatch is the discrete "go back to the enum" action, so it clears both custom hex
  // overrides. Without this, a shape with a custom stroke would stop responding to the swatch
  // grid entirely, which would look like the grid was broken rather than being overridden.
  // Phase 11 extends the same rule to `fillGradient`: the enum is the least specific of the three
  // fill controls, so picking it clears both.
  const handleColorChange = React.useCallback((value: ColorStyle) => {
    app.style({ color: value, stroke: undefined, fill: undefined, fillGradient: undefined })
  }, [])

  // --- Opacity (T8b.1) --------------------------------------------------------------------
  // The slider fires `onValueChange` continuously while dragging, purely for the live "NN%"
  // label; the actual `app.style` call — the one that goes through the undo stack — only happens
  // on `onValueCommit`, i.e. once per gesture. See Primitives/Slider for why.
  const [opacityDraft, setOpacityDraft] = React.useState<number | undefined>(undefined)
  const opacityPercent = Math.round((displayedStyle.opacity ?? 1) * 100)
  const handleOpacityChange = React.useCallback((value: number) => setOpacityDraft(value), [])
  const handleOpacityCommit = React.useCallback((value: number) => {
    app.style({ opacity: value / 100 })
    setOpacityDraft(undefined)
  }, [])

  // --- Stroke width (T8b.1) ---------------------------------------------------------------
  // A free-typed number field always displays the *effective* width (`getEffectiveStrokeWidth`),
  // so it shows the size-derived value until the user actually overrides it. Committed on blur or
  // Enter, not on every keystroke, so "3" while typing "32" doesn't briefly flash a 3px stroke.
  const effectiveStrokeWidth = getEffectiveStrokeWidth(displayedStyle)
  const [strokeWidthDraft, setStrokeWidthDraft] = React.useState<string | undefined>(undefined)
  const handleStrokeWidthInput = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setStrokeWidthDraft(e.target.value),
    []
  )
  const commitStrokeWidth = React.useCallback(() => {
    setStrokeWidthDraft((draft) => {
      if (draft !== undefined && draft.trim() !== '') {
        const parsed = Number(draft)
        if (Number.isFinite(parsed)) app.style({ strokeWidth: Math.max(0, parsed) })
      }
      return undefined
    })
  }, [])
  const handleStrokeWidthKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    stopKeyPropagationUnlessEscape(e)
    if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
  }, [])
  const handleResetStrokeWidth = React.useCallback(() => {
    setStrokeWidthDraft(undefined)
    app.style({ strokeWidth: undefined })
  }, [])

  // --- Corner radius (T8b.1) --------------------------------------------------------------
  // Blank means "no override" (the shape's own implicit default — see clampCornerRadius's
  // callers), so an empty field is a valid, meaningful commit rather than being coerced to 0.
  const [cornerRadiusDraft, setCornerRadiusDraft] = React.useState<string | undefined>(undefined)
  const handleCornerRadiusInput = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setCornerRadiusDraft(e.target.value),
    []
  )
  const commitCornerRadius = React.useCallback(() => {
    setCornerRadiusDraft((draft) => {
      if (draft !== undefined) {
        if (draft.trim() === '') {
          app.style({ cornerRadius: undefined })
        } else {
          const parsed = Number(draft)
          if (Number.isFinite(parsed)) app.style({ cornerRadius: Math.max(0, parsed) })
        }
      }
      return undefined
    })
  }, [])
  const handleCornerRadiusKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    stopKeyPropagationUnlessEscape(e)
    if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
  }, [])

  // --- Arbitrary hex colour (T8b.2) -------------------------------------------------------
  // `<input type="color">` always yields a valid 6-digit hex, so it commits immediately, same as
  // clicking an enum swatch. The paired text field is free-typed, so it only commits a value that
  // passes `isValidHex` — an in-progress "#3" while typing "#3a7bd5" is simply not sent yet,
  // rather than rejected with an error state.
  const [strokeHexDraft, setStrokeHexDraft] = React.useState<string | undefined>(undefined)
  const [fillHexDraft, setFillHexDraft] = React.useState<string | undefined>(undefined)
  const handleStrokeColorPicker = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => app.style({ stroke: e.target.value }),
    []
  )
  const handleFillColorPicker = React.useCallback(
    // Phase 11 — a flat fill hex is more specific than the enum but less specific than a gradient,
    // so picking one clears `fillGradient` in the same call (see the "Gradient fill" section's
    // own handlers for the reverse direction).
    (e: React.ChangeEvent<HTMLInputElement>) =>
      app.style({ fill: e.target.value, fillGradient: undefined }),
    []
  )
  const handleStrokeHexInput = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setStrokeHexDraft(e.target.value),
    []
  )
  const handleFillHexInput = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setFillHexDraft(e.target.value),
    []
  )
  const commitStrokeHex = React.useCallback(() => {
    setStrokeHexDraft((draft) => {
      if (draft !== undefined && isValidHex(draft)) app.style({ stroke: draft.trim() })
      return undefined
    })
  }, [])
  const commitFillHex = React.useCallback(() => {
    setFillHexDraft((draft) => {
      if (draft !== undefined && isValidHex(draft)) {
        app.style({ fill: draft.trim(), fillGradient: undefined })
      }
      return undefined
    })
  }, [])
  const handleHexKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    stopKeyPropagationUnlessEscape(e)
    if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
  }, [])
  const handleClearStroke = React.useCallback(() => {
    setStrokeHexDraft(undefined)
    app.style({ stroke: undefined })
  }, [])
  const handleClearFill = React.useCallback(() => {
    setFillHexDraft(undefined)
    app.style({ fill: undefined })
  }, [])

  // --- Gradient fill (T11.3) --------------------------------------------------------------
  // Presets only, deliberately — a full custom-stop editor per shape (angle field, add/remove
  // stop rows) would roughly double this panel's size for a feature whose headline use case
  // (per the Phase 11 brief) is the *page* background, not individual shapes; see BackgroundMenu
  // for that full editor. `app.style` still accepts an arbitrary `fillGradient` object from any
  // other caller (a template, a future custom-stop UI), `getShapeStyle` renders whatever it's
  // given — this is a UI scope decision, not a data-model limitation.
  const handleFillGradientPreset = React.useCallback(
    (background: (typeof GRADIENT_PRESETS)[number]['background']) => {
      app.style({ fillGradient: background, fill: undefined })
    },
    []
  )
  const handleClearFillGradient = React.useCallback(() => {
    app.style({ fillGradient: undefined })
  }, [])

  const handleMenuOpenChange = React.useCallback(
    (open: boolean) => {
      app.setMenuOpen(open)
    },
    [app]
  )
  return (
    <DropdownMenu.Root dir="ltr" onOpenChange={handleMenuOpenChange}>
      <DropdownMenu.Trigger asChild id="TD-Styles">
        <ToolButton variant="text">
          Styles
          {/* Phase 8b — this preview must fall back through `stroke`/`fill` exactly like
              `getShapeStyle` does, or it would keep showing the enum colour after a custom hex
              override, contradicting the shape it's supposed to summarize (caught by comparing
              the trigger button against the actual rendered shape in the stylepanel.js
              screenshot). */}
          <OverlapIcons
            style={{
              color: displayedStyle.stroke ?? strokes[theme][displayedStyle.color as ColorStyle],
            }}
          >
            {displayedStyle.isFilled && (
              <CircleIcon
                size={16}
                stroke="none"
                fill={displayedStyle.fill ?? fills[theme][displayedStyle.color as ColorStyle]}
              />
            )}
            {DASH_ICONS[displayedStyle.dash]}
          </OverlapIcons>
        </ToolButton>
      </DropdownMenu.Trigger>
      <DMContent>
        <StyledRow variant="tall" id="TD-Styles-Color-Container">
          <span>Color</span>
          <ColorGrid>
            {Object.keys(strokes.light).map((style: string) => (
              <DropdownMenu.Item
                key={style}
                onSelect={preventEvent}
                asChild
                id={`TD-Styles-Color-Swatch-${style}`}
              >
                <ToolButton
                  variant="icon"
                  isActive={displayedStyle.color === style && !displayedStyle.stroke}
                  onClick={() => handleColorChange(style as ColorStyle)}
                >
                  <CircleIcon
                    size={18}
                    strokeWidth={2.5}
                    fill={
                      displayedStyle.isFilled ? fills.light[style as ColorStyle] : 'transparent'
                    }
                    stroke={strokes.light[style as ColorStyle]}
                  />
                </ToolButton>
              </DropdownMenu.Item>
            ))}
          </ColorGrid>
        </StyledRow>
        <StyledRow variant="tall" id="TD-Styles-CustomColor-Container">
          <span>Custom</span>
          <CustomColorGroup>
            <HexColorField
              label="Stroke"
              idPrefix="TD-Styles-CustomStroke"
              pickerValue={to6DigitHex(
                displayedStyle.stroke ?? strokes[theme][displayedStyle.color as ColorStyle]
              )}
              textValue={strokeHexDraft ?? displayedStyle.stroke ?? ''}
              hasOverride={displayedStyle.stroke !== undefined}
              onPickerChange={handleStrokeColorPicker}
              onTextChange={handleStrokeHexInput}
              onTextBlur={commitStrokeHex}
              onTextKeyDown={handleHexKeyDown}
              onClear={handleClearStroke}
            />
            {displayedStyle.isFilled && (
              <HexColorField
                label="Fill"
                idPrefix="TD-Styles-CustomFill"
                pickerValue={to6DigitHex(
                  displayedStyle.fill ?? fills[theme][displayedStyle.color as ColorStyle]
                )}
                textValue={fillHexDraft ?? displayedStyle.fill ?? ''}
                hasOverride={displayedStyle.fill !== undefined}
                onPickerChange={handleFillColorPicker}
                onTextChange={handleFillHexInput}
                onTextBlur={commitFillHex}
                onTextKeyDown={handleHexKeyDown}
                onClear={handleClearFill}
              />
            )}
          </CustomColorGroup>
        </StyledRow>
        <DMCheckboxItem
          variant="styleMenu"
          checked={!!displayedStyle.isFilled}
          onCheckedChange={handleToggleFilled}
          id="TD-Styles-Fill"
        >
          Fill
        </DMCheckboxItem>
        {displayedStyle.isFilled && (
          <StyledRow variant="tall" id="TD-Styles-FillGradient-Container">
            <span>Gradient</span>
            <GradientPresetGroup>
              {GRADIENT_PRESETS.slice(0, 8).map((p) => (
                <DropdownMenu.Item key={p.id} onSelect={preventEvent} asChild>
                  <GradientPresetButton
                    id={`TD-Styles-FillGradient-${p.id}`}
                    title={p.name}
                    isActive={
                      displayedStyle.fillGradient?.type === 'linearGradient' &&
                      displayedStyle.fillGradient.angle === p.background.angle &&
                      JSON.stringify(displayedStyle.fillGradient.stops) ===
                        JSON.stringify(p.background.stops)
                    }
                    style={{
                      background: `linear-gradient(${p.background.angle}deg, ${p.background.stops
                        .map((s) => `${s.color} ${Math.round(s.at * 100)}%`)
                        .join(', ')})`,
                    }}
                    onClick={() => handleFillGradientPreset(p.background)}
                  />
                </DropdownMenu.Item>
              ))}
            </GradientPresetGroup>
            {displayedStyle.fillGradient !== undefined && (
              <ToolButton
                variant="icon"
                onClick={handleClearFillGradient}
                id="TD-Styles-FillGradient-Reset"
              >
                <Cross2Icon />
              </ToolButton>
            )}
          </StyledRow>
        )}
        <StyledRow id="TD-Styles-Dash-Container">
          Dash
          <StyledGroup dir="ltr" value={displayedStyle.dash} onValueChange={handleDashChange}>
            {Object.values(DashStyle).map((style) => (
              <DMRadioItem
                key={style}
                isActive={style === displayedStyle.dash}
                value={style}
                onSelect={preventEvent}
                bp={breakpoints}
                id={`TD-Styles-Dash-${style}`}
              >
                {DASH_ICONS[style as DashStyle]}
              </DMRadioItem>
            ))}
          </StyledGroup>
        </StyledRow>
        <StyledRow id="TD-Styles-Size-Container">
          Size
          <StyledGroup dir="ltr" value={displayedStyle.size} onValueChange={handleSizeChange}>
            {Object.values(SizeStyle).map((sizeStyle) => (
              <DMRadioItem
                key={sizeStyle}
                isActive={sizeStyle === displayedStyle.size}
                value={sizeStyle}
                onSelect={preventEvent}
                bp={breakpoints}
                id={`TD-Styles-Dash-${sizeStyle}`}
              >
                {SIZE_ICONS[sizeStyle as SizeStyle]}
              </DMRadioItem>
            ))}
          </StyledGroup>
        </StyledRow>
        <StyledRow id="TD-Styles-Opacity-Container">
          Opacity
          <SliderFieldRow>
            <Slider
              id="TD-Styles-Opacity-Slider"
              aria-label="Opacity"
              value={opacityDraft ?? opacityPercent}
              min={0}
              max={100}
              step={5}
              onValueChange={handleOpacityChange}
              onValueCommit={handleOpacityCommit}
            />
            <NumberReadout>{opacityDraft ?? opacityPercent}%</NumberReadout>
          </SliderFieldRow>
        </StyledRow>
        <StyledRow id="TD-Styles-StrokeWidth-Container">
          Stroke width
          <NumberFieldRow>
            <NumberInput
              id="TD-Styles-StrokeWidth-Input"
              type="number"
              min={0}
              step={0.5}
              value={strokeWidthDraft ?? String(effectiveStrokeWidth)}
              onChange={handleStrokeWidthInput}
              onBlur={commitStrokeWidth}
              onKeyDown={handleStrokeWidthKeyDown}
              onKeyUp={stopKeyPropagationUnlessEscape}
            />
            {displayedStyle.strokeWidth !== undefined && (
              <ToolButton
                variant="icon"
                onClick={handleResetStrokeWidth}
                id="TD-Styles-StrokeWidth-Reset"
              >
                <Cross2Icon />
              </ToolButton>
            )}
          </NumberFieldRow>
        </StyledRow>
        {showCornerRadius && (
          <StyledRow id="TD-Styles-CornerRadius-Container">
            Corner radius
            <NumberFieldRow>
              <NumberInput
                id="TD-Styles-CornerRadius-Input"
                type="number"
                min={0}
                step={1}
                placeholder="Auto"
                value={
                  cornerRadiusDraft ??
                  (displayedStyle.cornerRadius !== undefined
                    ? String(displayedStyle.cornerRadius)
                    : '')
                }
                onChange={handleCornerRadiusInput}
                onBlur={commitCornerRadius}
                onKeyDown={handleCornerRadiusKeyDown}
                onKeyUp={stopKeyPropagationUnlessEscape}
              />
              {displayedStyle.cornerRadius !== undefined && (
                <ToolButton
                  variant="icon"
                  onClick={() => app.style({ cornerRadius: undefined })}
                  id="TD-Styles-CornerRadius-Reset"
                >
                  <Cross2Icon />
                </ToolButton>
              )}
            </NumberFieldRow>
          </StyledRow>
        )}
        {(options === 'text' || options === 'label') && (
          <>
            <Divider />
            <StyledRow id="TD-Styles-Font-Container">
              Font
              <StyledGroup dir="ltr" value={displayedStyle.font} onValueChange={handleFontChange}>
                {Object.values(FontStyle).map((fontStyle) => (
                  <DMRadioItem
                    key={fontStyle}
                    isActive={fontStyle === displayedStyle.font}
                    value={fontStyle}
                    onSelect={preventEvent}
                    bp={breakpoints}
                    id={`TD-Styles-Font-${fontStyle}`}
                  >
                    <FontIcon fontStyle={fontStyle}>Aa</FontIcon>
                  </DMRadioItem>
                ))}
              </StyledGroup>
            </StyledRow>
            {options === 'text' && (
              <StyledRow id="TD-Styles-Align-Container">
                Align
                <StyledGroup
                  dir="ltr"
                  value={displayedStyle.textAlign}
                  onValueChange={handleTextAlignChange}
                >
                  {Object.values(AlignStyle).map((style) => (
                    <DMRadioItem
                      key={style}
                      isActive={style === displayedStyle.textAlign}
                      value={style}
                      onSelect={preventEvent}
                      bp={breakpoints}
                      id={`TD-Styles-Align-${style}`}
                    >
                      {ALIGN_ICONS[style]}
                    </DMRadioItem>
                  ))}
                </StyledGroup>
              </StyledRow>
            )}
          </>
        )}
      </DMContent>
    </DropdownMenu.Root>
  )
})

const ColorGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, auto)',
  gap: 0,
})

export const StyledRow = styled('div', {
  position: 'relative',
  width: '100%',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  minHeight: '32px',
  outline: 'none',
  color: '$text',
  fontFamily: '$ui',
  fontWeight: 400,
  fontSize: '$1',
  padding: '$2 0 $2 $3',
  borderRadius: 4,
  userSelect: 'none',
  margin: 0,
  display: 'flex',
  gap: '$3',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  variants: {
    variant: {
      tall: {
        alignItems: 'flex-start',
        padding: '0 0 0 $3',
        '& > span': {
          paddingTop: '$4',
        },
      },
    },
  },
})

const StyledGroup = styled(DropdownMenu.DropdownMenuRadioGroup, {
  display: 'flex',
  flexDirection: 'row',
  gap: '$1',
})

const OverlapIcons = styled('div', {
  display: 'grid',
  '& > *': {
    gridColumn: 1,
    gridRow: 1,
  },
})

const FontIcon = styled('div', {
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '$3',
  variants: {
    fontStyle: {
      [FontStyle.Script]: {
        fontFamily: 'Caveat Brush',
      },
      [FontStyle.Sans]: {
        fontFamily: 'Recursive',
      },
      [FontStyle.Serif]: {
        fontFamily: 'Georgia',
      },
      [FontStyle.Mono]: {
        fontFamily: 'Recursive Mono',
      },
    },
  },
})

/* -------------------- Phase 8b -------------------- */

// One row: the opacity Slider plus its live "NN%" readout.
const SliderFieldRow = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$2',
  flex: 1,
  marginLeft: '$4',
})

const NumberReadout = styled('span', {
  minWidth: 34,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  color: '$text',
  opacity: 0.7,
})

// One row: a numeric input plus an optional "reset to default" button (shown only while an
// override is actually in effect).
const NumberFieldRow = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$1',
})

const NumberInput = styled('input', {
  width: 48,
  padding: '$1 $2',
  border: '1px solid $hover',
  borderRadius: '$0',
  background: 'transparent',
  color: '$text',
  fontFamily: '$ui',
  fontSize: '$1',
  textAlign: 'right',

  '&:focus': {
    outline: '2px solid $selected',
    outlineOffset: -1,
  },
})

const CustomColorGroup = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$2',
  width: '100%',
})

const CustomColorField = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$2',
})

const CustomColorLabel = styled('span', {
  width: 34,
  fontSize: '$0',
  color: '$text',
  opacity: 0.7,
})

// Native color swatch. Deliberately dependency-free per the phase brief — no color-picker library
// — every modern browser ships its own picker UI behind this input.
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

  '&:focus': {
    outline: '2px solid $selected',
    outlineOffset: -1,
  },
})

interface HexColorFieldProps {
  label: string
  idPrefix: string
  /** Always a valid 6-digit hex — what `<input type="color">` needs to round-trip. */
  pickerValue: string
  /** The free-typed text field's value: the draft while typing, else the persisted override
   *  (blank when there isn't one). */
  textValue: string
  hasOverride: boolean
  onPickerChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onTextBlur: () => void
  onTextKeyDown: (e: React.KeyboardEvent) => void
  onClear: () => void
}

// Shared by the Stroke and Fill custom-colour rows: a swatch (native picker), a hex text field,
// and a reset button that only appears once an override is actually set — otherwise there'd be
// nothing meaningful to reset to (the swatch already shows the resolved enum colour).
function HexColorField({
  label,
  idPrefix,
  pickerValue,
  textValue,
  hasOverride,
  onPickerChange,
  onTextChange,
  onTextBlur,
  onTextKeyDown,
  onClear,
}: HexColorFieldProps): JSX.Element {
  return (
    <CustomColorField>
      <CustomColorLabel>{label}</CustomColorLabel>
      <ColorSwatchInput
        type="color"
        id={`${idPrefix}-Picker`}
        value={pickerValue}
        onChange={onPickerChange}
        onKeyDown={stopKeyPropagationUnlessEscape}
        onKeyUp={stopKeyPropagationUnlessEscape}
      />
      <HexTextInput
        id={`${idPrefix}-Hex`}
        type="text"
        placeholder={pickerValue}
        value={textValue}
        onChange={onTextChange}
        onBlur={onTextBlur}
        onKeyDown={onTextKeyDown}
        onKeyUp={stopKeyPropagationUnlessEscape}
        spellCheck={false}
      />
      {hasOverride && (
        <ToolButton variant="icon" onClick={onClear} id={`${idPrefix}-Reset`}>
          <Cross2Icon />
        </ToolButton>
      )}
    </CustomColorField>
  )
}

/* -------------------- Phase 11 -------------------- */

const GradientPresetGroup = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 20px)',
  gap: '$1',
})

const GradientPresetButton = styled('button', {
  width: 20,
  height: 20,
  padding: 0,
  border: '1px solid $hover',
  borderRadius: '$0',
  cursor: 'pointer',
  variants: {
    isActive: {
      true: { outline: '2px solid $selected', outlineOffset: 1 },
      false: {},
    },
  },
})
