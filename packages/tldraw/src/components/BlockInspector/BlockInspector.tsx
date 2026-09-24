/**
 * Block Inspector component - provides a right-hand panel for editing block properties.
 *
 * Three tabs:
 * - Content: Shows editable fields based on the block's schema, organized as:
 *   1. Content fields (role: 'content')
 *   2. Collapsible "Options" section (role: 'option' fields, excluding toggles)
 *   3. "Elements" section (one checkbox per `toggles` slot)
 * - Style: Surface / Text / Accent colour pickers (ThemeColorPicker), padding,
 *   vertical align, and a "Reset all styles to theme" button.
 * - Motion: Preset picker (from the real preset registry), delay/duration/stagger
 *   sliders that write only on user change (no mount effects), and a Preview button.
 *
 * B6 implementation (R12).
 */

import * as React from 'react'
import { styled } from '../../styles'
import { useTldraw, useBlockRegistry } from '../../hooks'
import type {
  BlockSchema,
  BlockStyleSpec,
  BlockMotionSpec,
  BlockStyleSpec as StyleSpec,
  ColorRole,
  SlotSpec,
  SpaceToken,
  RadiusToken,
  BlockDefinition,
} from '../../blocks/types'
import { setAtPath } from '../../blocks/prop-path'
import type { ComponentShape } from '../../types'
import { TDShapeType } from '../../types'
import { ThemeColorPicker, COLOR_ROLES } from './fields/ThemeColorPicker'
import { renderFieldForSpec, SelectField } from './fields/FieldControls'
import { MOTION_PRESETS, ACTIVE_PRESET_IDS } from '../../blocks/motion/presets'
import type { MotionPreset } from '../../blocks/motion/presets'

export interface BlockInspectorProps {
  selectedShapeId: string | null
  onPlayReveal?: (shapeId: string) => void
}

export const BlockInspector: React.FC<BlockInspectorProps> = ({ selectedShapeId, onPlayReveal }) => {
  const tldraw = useTldraw()
  const blockRegistry = useBlockRegistry()
  const [activeTab, setActiveTab] = React.useState<'content' | 'style' | 'motion'>('content')

  const rawShape = selectedShapeId ? tldraw.getShape(selectedShapeId) : undefined
  const shape = rawShape?.type === TDShapeType.Component ? (rawShape as ComponentShape) : undefined
  const blockDef = shape ? blockRegistry?.get(shape.componentId) : undefined

  // Block metadata (style/motion) lives under the reserved `$block` key in the shape's own
  // `props` — NOT on `shape.style`/a top-level `shape.motion`, which don't exist for a
  // ComponentShape (`shape.style` is the ordinary tldraw `ShapeStyles` — color/fill/dash — and
  // overwriting it here would corrupt opacity/corner-radius rendering). See `shape-bridge.ts`.
  const blockMeta = React.useMemo(() => {
    if (!shape) return undefined
    return (shape.props as Record<string, unknown>).$block as Record<string, unknown> | undefined
  }, [shape])

  const blockProps = React.useMemo(() => {
    if (!shape) return null
    return (blockMeta?.props as Record<string, unknown> | undefined) ?? shape.props
  }, [shape, blockMeta])

  const blockStyle = blockMeta?.style as BlockStyleSpec | undefined
  const blockMotion = blockMeta?.motion as BlockMotionSpec | undefined

  /**
   * Update a top-level block prop (content fields).
   */
  const updateProp = React.useCallback(
    (path: string, value: unknown) => {
      if (!shape || !blockProps) return
      const newProps = setAtPath(shape.props as Record<string, unknown>, path, value)
      tldraw.updateShapes({ id: shape.id, props: newProps })
    },
    [shape, blockProps, tldraw],
  )

  /**
   * Update a `$block.style` or `$block.motion` field.
   *
   * H1: Reset = write `undefined` (deep-merge keeps omitted keys). When value is `undefined`,
   * the key is deleted from the section object. When the section becomes empty, it is
   * removed entirely from `$block`.
   */
  const updateBlockMeta = React.useCallback(
    (key: 'style' | 'motion', path: string, value: unknown) => {
      if (!shape) return
      const currentProps = shape.props as Record<string, unknown>
      const currentMeta = (currentProps.$block as Record<string, unknown> | undefined) ?? {}
      const currentSection = (currentMeta[key] as Record<string, unknown> | undefined) ?? {}

      const newSection = { ...currentSection }
      if (value === undefined) {
        // Delete the key — deep-merge keeps omitted keys (README pitfall 2).
        delete newSection[path]
        if (Object.keys(newSection).length === 0) {
          delete currentMeta[key]
        } else {
          currentMeta[key] = newSection
        }
      } else {
        newSection[path] = value
        currentMeta[key] = newSection
      }

      const newProps = { ...currentProps, $block: { ...currentMeta } }
      tldraw.updateShapes({ id: shape.id, props: newProps })
    },
    [shape, tldraw],
  )

  const updateStyle = React.useCallback(
    (path: string, value: unknown) => updateBlockMeta('style', path, value),
    [updateBlockMeta],
  )

  const updateMotion = React.useCallback(
    (path: string, value: unknown) => updateBlockMeta('motion', path, value),
    [updateBlockMeta],
  )

  /**
   * Reset all style overrides: removes `$block.style` entirely.
   */
  const resetAllStyles = React.useCallback(() => {
    if (!shape) return
    const currentProps = shape.props as Record<string, unknown>
    const currentMeta = (currentProps.$block as Record<string, unknown> | undefined) ?? {}
    const newProps = {
      ...currentProps,
      $block: { ...currentMeta, style: undefined },
    }
    tldraw.updateShapes({ id: shape.id, props: newProps })
  }, [shape, tldraw])

  if (!blockDef || !shape) {
    return (
      <InspectorContainer>
        <InspectorHeader>Block Inspector</InspectorHeader>
        <InspectorContent>
          <EmptyState>Select a block to edit its properties</EmptyState>
        </InspectorContent>
      </InspectorContainer>
    )
  }

  return (
    <InspectorContainer>
      <InspectorHeader>
        <InspectorTitle>{blockDef.name}</InspectorTitle>
        <TabContainer>
          <TabButton active={activeTab === 'content'} onClick={() => setActiveTab('content')}>
            Content
          </TabButton>
          <TabButton active={activeTab === 'style'} onClick={() => setActiveTab('style')}>
            Style
          </TabButton>
          <TabButton active={activeTab === 'motion'} onClick={() => setActiveTab('motion')}>
            Motion
          </TabButton>
        </TabContainer>
      </InspectorHeader>

      <InspectorContent>
        {activeTab === 'content' && (
          <ContentTab
            schema={blockDef.schema}
            blockDef={blockDef}
            props={blockProps}
            onUpdate={updateProp}
          />
        )}
        {activeTab === 'style' && (
          <StyleTab
            style={blockStyle}
            onUpdate={updateStyle}
            onResetAll={resetAllStyles}
            shape={shape}
          />
        )}
        {activeTab === 'motion' && (
          <MotionTab
            motion={blockMotion}
            defaultPreset={blockDef.motion?.preset}
            defaultParts={blockDef.motion?.parts}
            onUpdate={updateMotion}
            onPlay={onPlayReveal}
            shapeId={selectedShapeId}
          />
        )}
      </InspectorContent>
    </InspectorContainer>
  )
}

/* ──────────── Content tab ──────────── */

interface ContentTabProps {
  schema: BlockSchema
  blockDef: BlockDefinition
  props: Record<string, unknown> | null
  onUpdate: (path: string, value: unknown) => void
}

function ContentTab({ schema, blockDef, props, onUpdate }: ContentTabProps) {
  if (!props) return null

  // Partition schema slots into content, option, and toggles.
  const contentSlots: Array<[string, SlotSpec]> = []
  const optionSlots: Array<[string, SlotSpec]> = []
  const toggleSlots: Array<[string, SlotSpec]> = []

  for (const [key, spec] of Object.entries(schema)) {
    if (spec.toggles) {
      // Toggles slots are shown in the Elements section, not Options.
      toggleSlots.push([key, spec])
    } else if (spec.role === 'option') {
      optionSlots.push([key, spec])
    } else {
      contentSlots.push([key, spec])
    }
  }

  return (
    <ContentSection>
      {contentSlots.map(([key, spec]) => (
        <ContentField
          key={key}
          name={key}
          spec={spec}
          value={props[key]}
          onChange={(value) => onUpdate(key, value)}
        />
      ))}

      {optionSlots.length > 0 && (
        <CollapsibleSection label="Options" defaultOpen={false}>
          {optionSlots.map(([key, spec]) => (
            <ContentFieldCompact
              key={key}
              name={key}
              spec={spec}
              value={props[key]}
              onChange={(value) => onUpdate(key, value)}
            />
          ))}
        </CollapsibleSection>
      )}

      {toggleSlots.length > 0 && (
        <ElementsSection label="Elements">
          {toggleSlots.map(([key, spec]) => {
            const currentValue = props[key]
            // A toggle is "on" (visible) when the boolean value is true or undefined
            // (undefined means "default = visible"). Only an explicit `false` hides it.
            const isChecked = currentValue === undefined ? true : !!currentValue
            return (
              <ElementToggle
                key={key}
                name={key}
                label={spec.label}
                checked={isChecked}
                onChange={(checked) => onUpdate(key, checked ? undefined : false)}
              />
            )
          })}
        </ElementsSection>
      )}
    </ContentSection>
  )
}

interface ContentFieldProps {
  name: string
  spec: SlotSpec
  value: unknown
  onChange: (value: unknown) => void
}

function ContentField({ spec, value, onChange }: ContentFieldProps) {
  return renderFieldForSpec(spec, value, spec.label ?? '', onChange) as React.ReactElement
}

function ContentFieldCompact({ spec, value, onChange }: ContentFieldProps) {
  return (
    <CompactFieldContainer>
      <CompactFieldLabel>{spec.label}</CompactFieldLabel>
      {renderFieldForSpec(spec, value, spec.label ?? '', onChange) as React.ReactElement}
    </CompactFieldContainer>
  )
}

/* ──────────── Style tab ──────────── */

interface StyleTabProps {
  style?: BlockStyleSpec
  onUpdate: (path: string, value: unknown) => void
  onResetAll: () => void
  shape: ComponentShape
}

/** H5: Space tokens are '3xs','2xs','xs','sm','md','lg','xl','2xl','3xl','4xl'. */
const SPACE_TOKENS: Array<string | 'none'> = [
  'none',
  '3xs',
  '2xs',
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
]

function StyleTab({ style, onUpdate, onResetAll, shape }: StyleTabProps) {
  return (
    <StyleSection>
      <StyleColors>
        <StyleColorRow>
          <StyleLabel>Surface</StyleLabel>
          <ThemeColorPicker
            value={style?.surface as ColorRole | string | undefined}
            onRole={(role) => onUpdate('surface', role)}
            onCustom={(hex) => onUpdate('surface', hex)}
            onReset={() => onUpdate('surface', undefined)}
          />
        </StyleColorRow>

        <StyleColorRow>
          <StyleLabel>Text colour (on)</StyleLabel>
          <ThemeColorPicker
            value={style?.on as ColorRole | string | undefined}
            onRole={(role) => onUpdate('on', role)}
            onCustom={(hex) => onUpdate('on', hex)}
            onReset={() => onUpdate('on', undefined)}
          />
        </StyleColorRow>

        <StyleColorRow>
          <StyleLabel>Accent</StyleLabel>
          <ThemeColorPicker
            value={style?.accent as ColorRole | string | undefined}
            onRole={(role) => onUpdate('accent', role)}
            onCustom={(hex) => onUpdate('accent', hex)}
            onReset={() => onUpdate('accent', undefined)}
          />
        </StyleColorRow>
      </StyleColors>

      <StyleColorRow>
        <StyleLabel>Padding</StyleLabel>
        <PaddingSelector
          value={style?.padding}
          onChange={(val) => onUpdate('padding', val)}
        />
      </StyleColorRow>

      <StyleColorRow>
        <StyleLabel>Vertical align</StyleLabel>
        <AlignSelector
          value={style?.align ?? 'start'}
          onChange={(val) => onUpdate('align', val)}
        />
      </StyleColorRow>

      <ResetAllButton onClick={onResetAll}>↺ Reset all styles to theme</ResetAllButton>
    </StyleSection>
  )
}

const PaddingSelector: React.FC<{
  value: SpaceToken | number | [number, number] | undefined
  onChange: (value: SpaceToken | number | undefined) => void
}> = ({ value, onChange }) => {
  const [showCustom, setShowCustom] = React.useState(false)
  const [customValue, setCustomValue] = React.useState('')

  const handleTokenSelect = (token: string) => {
    if (token === 'none') {
      onChange(undefined)
    } else {
      onChange(token as SpaceToken)
    }
  }

  const handleCustomSubmit = () => {
    const num = parseFloat(customValue)
    if (!isNaN(num)) {
      onChange(num)
    }
    setShowCustom(false)
  }

  return (
    <PaddingSelectorContainer>
      <PaddingTokenSelect value={valueToToken(value)} onChange={(e) => handleTokenSelect(e.target.value)}>
        {SPACE_TOKENS.map((t) => (
          <option key={t} value={t}>
            {t === 'none' ? 'None' : t}
          </option>
        ))}
      </PaddingTokenSelect>
      <CustomPaddingButton
        type="button"
        onClick={() => setShowCustom(!showCustom)}
        title="Custom padding"
      >
        Custom
      </CustomPaddingButton>
      {showCustom && (
        <CustomPaddingInput
          type="number"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onBlur={() => setShowCustom(false)}
          onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
          placeholder="px"
        />
      )}
    </PaddingSelectorContainer>
  )
}

function valueToToken(value: SpaceToken | number | [number, number] | undefined): string {
  if (value === undefined) return 'none'
  if (typeof value === 'number') return 'custom'
  if (typeof value === 'string') return value
  return 'custom'
}

const AlignSelector: React.FC<{
  value: 'start' | 'center' | 'end' | undefined
  onChange: (value: 'start' | 'center' | 'end') => void
}> = ({ value = 'start', onChange }) => {
  return (
    <SelectField
      value={value || 'start'}
      onChange={(e) => onChange(e.target.value as 'start' | 'center' | 'end')}
    >
      <option value="start">Top</option>
      <option value="center">Center</option>
      <option value="end">Bottom</option>
    </SelectField>
  )
}

/* ──────────── Motion tab ──────────── */

interface MotionTabProps {
  motion?: BlockMotionSpec
  defaultPreset?: string
  defaultParts?: string[]
  onUpdate: (path: string, value: unknown) => void
  onPlay?: (shapeId: string) => void
  shapeId: string | null
}

function MotionTab({ motion, defaultPreset, defaultParts, onUpdate, onPlay, shapeId }: MotionTabProps) {
  // H6: No mount effects — initialise local state from the stored value, but only
  // call onUpdate on actual user interaction.
  const [delay, setDelay] = React.useState(motion?.delay ?? 0)
  const [duration, setDuration] = React.useState(motion?.duration ?? 500)
  const [stagger, setStagger] = React.useState(motion?.stagger ?? 0)

  // H8: Preset list comes from the real preset registry.
  // Keep "None" as the empty-string option. Filter out ambient presets since
  // this UI can't preview looping animations.
  const presetOptions = React.useMemo(() => {
    return ACTIVE_PRESET_IDS.filter((id) => {
      const preset = MOTION_PRESETS[id]
      return !preset.isAmbient
    })
  }, [])

  return (
    <MotionSection>
      <MotionLabel>Preset</MotionLabel>
      <PresetSelector
        value={motion?.preset ?? defaultPreset ?? ''}
        onChange={(e) => onUpdate('preset', e.target.value || undefined)}
      >
        <option value="">None</option>
        {presetOptions.map((id) => {
          const preset = MOTION_PRESETS[id]
          return (
            <option key={id} value={id}>
              {preset.id}
            </option>
          )
        })}
      </PresetSelector>

      <SliderContainer>
        <MotionLabel>Delay: {typeof delay === 'number' ? `${delay}ms` : delay}</MotionLabel>
        <SliderWithEnd
          min={0}
          max={2000}
          value={typeof delay === 'number' ? delay : 0}
          onChange={(e) => setDelay(Number(e.target.value))}
          onChangeEnd={() => onUpdate('delay', delay)}
        />
      </SliderContainer>

      <SliderContainer>
        <MotionLabel>Duration: {typeof duration === 'number' ? `${duration}ms` : duration}</MotionLabel>
        <SliderWithEnd
          min={100}
          max={5000}
          value={typeof duration === 'number' ? duration : 500}
          onChange={(e) => setDuration(Number(e.target.value))}
          onChangeEnd={() => onUpdate('duration', duration)}
        />
      </SliderContainer>

      <SliderContainer>
        <MotionLabel>Stagger: {typeof stagger === 'number' ? `${stagger}ms` : stagger}</MotionLabel>
        <SliderWithEnd
          min={0}
          max={200}
          value={typeof stagger === 'number' ? stagger : 0}
          onChange={(e) => setStagger(Number(e.target.value))}
          onChangeEnd={() => onUpdate('stagger', stagger)}
        />
      </SliderContainer>

      {onPlay && shapeId && <PlayButton onClick={() => onPlay(shapeId)}>Preview</PlayButton>}
    </MotionSection>
  )
}

/* ──────────── Styled components ──────────── */

const InspectorContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '320px',
  backgroundColor: '$bg',
  borderLeft: '1px solid $border',
  overflow: 'hidden',
})

const InspectorHeader = styled('div', {
  padding: '12px 16px',
  borderBottom: '1px solid $border',
  backgroundColor: '$headerBg',
})

const InspectorTitle = styled('h3', {
  margin: 0,
  fontSize: '14px',
  fontWeight: 600,
  color: '$text',
})

const CompactFieldContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
})

const CompactFieldLabel = styled('label', {
  fontSize: '12px',
  fontWeight: 500,
  color: '$textMuted',
})

const TabContainer = styled('div', {
  display: 'flex',
  gap: '4px',
  marginTop: '8px',
})

const TabButton = styled('button', {
  flex: 1,
  padding: '6px 12px',
  fontSize: '12px',
  background: 'transparent',
  border: '1px solid $border',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'all 0.15s',
  variants: {
    active: {
      true: { background: '$accent', color: '$text', fontWeight: 500 },
      false: {
        background: 'transparent',
        color: '$textMuted',
        '&:hover': { background: '$bgHover' },
      },
    },
  },
})

const InspectorContent = styled('div', {
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
})

const EmptyState = styled('div', {
  textAlign: 'center',
  padding: '32px 16px',
  color: '$textMuted',
  fontSize: '14px',
})

const ContentSection = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
})

const CollapsibleSectionBase = styled('div', {
  border: '1px solid $border',
  borderRadius: '6px',
  padding: '8px',
})

const ElementsSectionBase = styled('div', {
  border: '1px solid $border',
  borderRadius: '6px',
  padding: '8px',
})

const ElementsSectionHeader = styled('div', {
  fontSize: '12px',
  fontWeight: 500,
  color: '$textMuted',
  marginBottom: '8px',
})

const ElementToggleBase = styled('label', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
  color: '$text',
  cursor: 'pointer',
  marginBottom: '4px',
})

const BoolCheckbox = styled('input', {
  width: '36px',
  height: '18px',
  cursor: 'pointer',
})

/* Wrapper components that accept custom props */

const CollapsibleSection: React.FC<{
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}> = ({ label, defaultOpen = false, children }) => {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <CollapsibleSectionBase>
      <ElementsSectionHeader style={{ cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        {label} {open ? '▼' : '▶'}
      </ElementsSectionHeader>
      {open && children}
    </CollapsibleSectionBase>
  )
}

const ElementsSection: React.FC<{
  label: string
  children: React.ReactNode
}> = ({ label, children }) => (
  <ElementsSectionBase>
    <ElementsSectionHeader>{label}</ElementsSectionHeader>
    {children}
  </ElementsSectionBase>
)

const ElementToggle: React.FC<{
  name: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}> = ({ name, label, checked, onChange }) => (
  <ElementToggleBase>
    <BoolCheckbox
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>{label}</span>
  </ElementToggleBase>
)

const StyleSection = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
})

const StyleColors = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
})

const StyleColorRow = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
})

const StyleLabel = styled('label', {
  fontSize: '12px',
  fontWeight: 500,
  color: '$text',
})

const PaddingSelectorContainer = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
})

const PaddingTokenSelect = styled('select', {
  flex: 1,
  padding: '6px 8px',
  fontSize: '12px',
  border: '1px solid $border',
  borderRadius: '4px',
  backgroundColor: '$bg',
  cursor: 'pointer',
})

const CustomPaddingButton = styled('button', {
  padding: '2px 6px',
  fontSize: '11px',
  border: '1px solid $border',
  borderRadius: '4px',
  background: 'transparent',
  color: '$textMuted',
  cursor: 'pointer',
  '&:hover': {
    background: '$bgHover',
    color: '$text',
  },
})

const CustomPaddingInput = styled('input', {
  width: '60px',
  padding: '4px 6px',
  fontSize: '12px',
  border: '1px solid $border',
  borderRadius: '4px',
})

const ResetAllButton = styled('button', {
  padding: '6px 12px',
  fontSize: '12px',
  border: '1px solid $border',
  borderRadius: '4px',
  background: 'transparent',
  color: '$text',
  cursor: 'pointer',
  '&:hover': {
    background: '$bgHover',
    color: '$accent',
  },
})

const MotionSection = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
})

const MotionLabel = styled('label', {
  fontSize: '12px',
  fontWeight: 500,
  color: '$text',
})

const SliderContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
})

const Slider = styled('input', {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  background: '$border',
  outline: 'none',
  cursor: 'pointer',
  '&:hover': { background: '$accent' },
})

/**
 * Slider wrapper that accepts an `onChangeEnd` callback.
 * H6: commits the value to the document only on release, so one updateShapes = one undo step.
 */
const SliderWithEnd: React.FC<{
  min: number
  max: number
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onChangeEnd: () => void
}> = ({ min, max, value, onChange, onChangeEnd }) => (
  <Slider
    type="range"
    min={min}
    max={max}
    value={value}
    onChange={onChange}
    onMouseUp={onChangeEnd}
    onTouchEnd={onChangeEnd}
  />
)

const PresetSelector = styled('select', {
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid $border',
  borderRadius: '6px',
  width: '100%',
  backgroundColor: '$bg',
  cursor: 'pointer',
})

const PlayButton = styled('button', {
  padding: '8px 16px',
  fontSize: '14px',
  background: '$accent',
  color: '$text',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  marginTop: '8px',
})

