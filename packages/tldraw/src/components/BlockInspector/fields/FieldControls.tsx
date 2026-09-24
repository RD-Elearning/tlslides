/**
 * Field controls for the Block Inspector.
 *
 * Each component renders one kind of slot value from the block schema.
 * See B6-inspector.md §2 (Steps 2) — "Field controls (one component per kind)".
 */

import * as React from 'react'
import { styled } from '../../../styles'
import type { SlotSpec, ColorRole } from '~blocks/types'
import { ThemeColorPicker } from './ThemeColorPicker'
import { ICONS } from '~blocks/icons'

export interface FieldProps {
  /** The slot specification from the block's schema. */
  spec: SlotSpec
  /** Current value (may be undefined). */
  value: unknown
  /** Called with the new value. */
  onChange: (value: unknown) => void
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                        */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Return a default value for a given slot type, used when adding a new item to a list.
 */
function getDefaultForSlotType(spec: SlotSpec): unknown {
  switch (spec.type.kind) {
    case 'text':
      return ''
    case 'richText':
      return ''
    case 'number':
      return spec.type.min !== undefined ? spec.type.min : 0
    case 'enum':
      return spec.type.values[0] ?? ''
    case 'boolean':
      return false
    case 'color':
      return undefined
    case 'icon':
      return ''
    case 'image':
      return ''
    case 'list':
      return []
    case 'object':
      return {}
    case 'series':
      return []
    case 'blocks':
      return []
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Text                                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const TextField: React.FC<FieldProps & { name: string }> = ({ spec, value, onChange }) => {
  const typeSpec = spec.type as { kind: 'text'; maxChars?: number; multiline?: boolean }
  const isMultiline = !!typeSpec.multiline
  const maxChars = typeSpec.maxChars

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  if (isMultiline) {
    return (
      <FieldContainer>
        <FieldLabel>{spec.label}</FieldLabel>
        <TextAreaField
          value={(value as string) || ''}
          onChange={handleChange}
          maxLength={maxChars}
          placeholder={spec.help}
        />
        {spec.help && <FieldHelp>{spec.help}</FieldHelp>}
      </FieldContainer>
    )
  }

  return (
    <FieldContainer>
      <FieldLabel>{spec.label}</FieldLabel>
      <InputField
        type="text"
        value={(value as string) || ''}
        onChange={handleChange}
        maxLength={maxChars}
        placeholder={spec.help}
      />
      {spec.help && <FieldHelp>{spec.help}</FieldHelp>}
    </FieldContainer>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* RichText — plain textarea, writes { runs: [{text}] } or string                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const RichTextField: React.FC<FieldProps & { name: string }> = ({ spec, value, onChange }) => {
  const typeSpec = spec.type as { kind: 'richText'; maxChars?: number }
  const maxChars = typeSpec.maxChars

  // Extract plain text from the current value for display.
  const plainText = React.useMemo(() => {
    if (value === undefined || value === null) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'object' && 'runs' in value) {
      return (value as { runs: Array<{ text: string }> }).runs.map((r) => r.text).join('')
    }
    return String(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    // When the original value was rich (has `runs`), write `{ runs: [{ text }] }`.
    // Otherwise write a plain string.
    if (value !== undefined && value !== null && typeof value === 'object' && 'runs' in value) {
      onChange({ runs: [{ text }] })
    } else {
      onChange(text)
    }
  }

  return (
    <FieldContainer>
      <FieldLabel>{spec.label}</FieldLabel>
      <TextAreaField
        value={plainText}
        onChange={handleChange}
        maxLength={maxChars}
        placeholder={spec.help}
      />
      {spec.help && <FieldHelp>{spec.help}</FieldHelp>}
    </FieldContainer>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Number                                                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const NumberField: React.FC<FieldProps & { name: string }> = ({ spec, value, onChange }) => {
  const typeSpec = spec.type as { kind: 'number'; min?: number; max?: number }
  const min = typeSpec.min
  const max = typeSpec.max

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    if (!isNaN(val)) onChange(val)
  }

  return (
    <FieldContainer>
      <FieldLabel>{spec.label}</FieldLabel>
      <InputField
        type="number"
        value={value === undefined || value === null ? '' : String(value)}
        onChange={handleChange}
        min={min}
        max={max}
        placeholder={spec.help}
      />
      {spec.help && <FieldHelp>{spec.help}</FieldHelp>}
    </FieldContainer>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Enum                                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const EnumField: React.FC<FieldProps & { name: string }> = ({ spec, value, onChange }) => {
  const typeSpec = spec.type as { kind: 'enum'; values: string[] }

  return (
    <FieldContainer>
      <FieldLabel>{spec.label}</FieldLabel>
      <SelectField
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          — select —
        </option>
        {typeSpec.values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </SelectField>
      {spec.help && <FieldHelp>{spec.help}</FieldHelp>}
    </FieldContainer>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Boolean                                                                        */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const BooleanField: React.FC<FieldProps & { name: string }> = ({ spec, value, onChange }) => {
  return (
    <BoolFieldContainer>
      <BoolLabel>
        <BoolCheckbox
          type="checkbox"
          checked={value as boolean || false}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{spec.label}</span>
      </BoolLabel>
      {spec.help && <FieldHelp>{spec.help}</FieldHelp>}
    </BoolFieldContainer>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Color — uses ThemeColorPicker                                                    */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const ColorField: React.FC<FieldProps & { name: string }> = ({ spec, value, onChange }) => {
  return (
    <FieldContainer>
      <FieldLabel>{spec.label}</FieldLabel>
      <ThemeColorPicker
        value={value as ColorRole | string | undefined}
        onRole={(role) => onChange(role)}
        onCustom={(hex) => onChange(hex)}
        onReset={() => onChange(undefined)}
      />
      {spec.help && <FieldHelp>{spec.help}</FieldHelp>}
    </FieldContainer>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Icon — select from ICONS keys                                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const IconField: React.FC<FieldProps & { name: string }> = ({ spec, value, onChange }) => {
  const iconNames = Object.keys(ICONS)

  return (
    <FieldContainer>
      <FieldLabel>{spec.label}</FieldLabel>
      <SelectField
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          — select icon —
        </option>
        {iconNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </SelectField>
      {spec.help && <FieldHelp>{spec.help}</FieldHelp>}
    </FieldContainer>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Image — URL/asset id text input                                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const ImageField: React.FC<FieldProps & { name: string }> = ({ spec, value, onChange }) => {
  return (
    <FieldContainer>
      <FieldLabel>{spec.label}</FieldLabel>
      <InputField
        type="text"
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https:// or asset id"
      />
      {spec.help && <FieldHelp>{spec.help}</FieldHelp>}
    </FieldContainer>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* List — add/remove/reorder rows                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const ListField: React.FC<FieldProps & { name: string; path: string }> = ({
  spec,
  value,
  onChange,
  path,
}) => {
  const typeSpec = spec.type as unknown as { kind: 'list'; of: SlotSpec; min?: number; max?: number }
  const items = (value as unknown[]) ?? []
  const maxItems = typeSpec.max

  const addItem = () => {
    const newItem = getDefaultForSlotType(typeSpec.of)
    onChange([...items, newItem])
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newItems = [...items]
    const [removed] = newItems.splice(index, 1)
    newItems.splice(index - 1, 0, removed)
    onChange(newItems)
  }

  const moveDown = (index: number) => {
    if (index === items.length - 1) return
    const newItems = [...items]
    const [removed] = newItems.splice(index, 1)
    newItems.splice(index + 1, 0, removed)
    onChange(newItems)
  }

  const updateItem = (index: number, newValue: unknown) => {
    const newItems = [...items]
    newItems[index] = newValue
    onChange(newItems)
  }

  return (
    <FieldContainer>
      <FieldLabel>{spec.label}</FieldLabel>
      <ListItemsContainer>
        {items.map((item, i) => (
          <ListItemRow key={i}>
            <ListControls>
              <ListButton onClick={() => moveUp(i)} title="Move up" disabled={i === 0}>
                ↑
              </ListButton>
              <ListButton
                onClick={() => moveDown(i)}
                title="Move down"
                disabled={i === items.length - 1}
              >
                ↓
              </ListButton>
              <ListButton
                onClick={() => removeItem(i)}
                title="Remove"
                disabled={typeSpec.min !== undefined && items.length <= typeSpec.min}
              >
                ✕
              </ListButton>
            </ListControls>
            <ListItemContent>
              <RecursiveField
                spec={typeSpec.of}
                value={item}
                path={`${path}.${i}`}
                name={`${path}.${i}`}
                onChange={(val) => updateItem(i, val)}
              />
            </ListItemContent>
          </ListItemRow>
        ))}
      </ListItemsContainer>
      {(maxItems === undefined || items.length < maxItems) && (
        <AddButton onClick={addItem}>+ Add</AddButton>
      )}
      {spec.help && <FieldHelp>{spec.help}</FieldHelp>}
    </FieldContainer>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Object — recursive fields                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const ObjectField: React.FC<FieldProps & { name: string; path: string }> = ({
  spec,
  value,
  onChange,
  path,
}) => {
  const typeSpec = spec.type as { kind: 'object'; fields: Record<string, SlotSpec> }
  const obj = (value as Record<string, unknown>) ?? {}

  const updateField = (key: string, val: unknown) => {
    onChange({ ...obj, [key]: val })
  }

  return (
    <FieldContainer>
      <FieldLabel>{spec.label}</FieldLabel>
      <ObjectFieldsContainer>
        {Object.entries(typeSpec.fields).map(([fieldKey, fieldSpec]) => (
          <RecursiveField
            key={fieldKey}
            spec={fieldSpec}
            value={obj[fieldKey]}
            path={`${path}.${fieldKey}`}
            onChange={(val) => updateField(fieldKey, val)}
            name={fieldKey}
          />
        ))}
      </ObjectFieldsContainer>
      {spec.help && <FieldHelp>{spec.help}</FieldHelp>}
    </FieldContainer>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Series — list of number+label                                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const SeriesField: React.FC<FieldProps & { name: string; path: string }> = ({
  spec,
  value,
  onChange,
  path,
}) => {
  const typeSpec = spec.type as { kind: 'series'; value: 'number'; label: 'text'; max?: number }
  const items = (value as Array<{ value: number; label: string }>) ?? []
  const maxItems = typeSpec.max

  const addItem = () => {
    if (maxItems !== undefined && items.length >= maxItems) return
    onChange([...items, { value: 0, label: '' }])
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const updateValue = (index: number, val: number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], value: val }
    onChange(newItems)
  }

  const updateLabel = (index: number, val: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], label: val }
    onChange(newItems)
  }

  return (
    <FieldContainer>
      <FieldLabel>{spec.label}</FieldLabel>
      <ListItemsContainer>
        {items.map((item, i) => (
          <SeriesRow key={i}>
            <NumberField
              spec={{ type: { kind: 'number' }, label: 'Value', role: 'option' }}
              value={item.value}
              onChange={(val) => updateValue(i, val as number)}
              name={`_${i}_value`}
            />
            <TextField
              spec={{ type: { kind: 'text' }, label: 'Label', role: 'option' }}
              value={item.label}
              onChange={(val) => updateLabel(i, val as string)}
              name={`_${i}_label`}
            />
            <ListButton onClick={() => removeItem(i)} title="Remove">
              ✕
            </ListButton>
          </SeriesRow>
        ))}
      </ListItemsContainer>
      {(maxItems === undefined || items.length < maxItems) && (
        <AddButton onClick={addItem}>+ Add</AddButton>
      )}
      {spec.help && <FieldHelp>{spec.help}</FieldHelp>}
    </FieldContainer>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Blocks — read-only summary                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const BlocksField: React.FC<FieldProps & { name: string }> = ({ spec, value }) => {
  const children = (value as unknown[]) ?? []

  return (
    <FieldContainer>
      <FieldLabel>{spec.label}</FieldLabel>
      <BlocksSummary>
        {children.length === 0
          ? 'No child blocks'
          : `${children.length} child block${children.length === 1 ? '' : 's'}`}
      </BlocksSummary>
      {spec.help && <FieldHelp>{spec.help}</FieldHelp>}
    </FieldContainer>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Recursive dispatcher                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

interface RecursiveFieldProps {
  spec: SlotSpec
  value: unknown
  path: string
  name: string
  onChange: (value: unknown) => void
}

/**
 * Dispatch to the correct field component based on `spec.type.kind`.
 * This is used internally by ListField and ObjectField for recursive nesting.
 */
export function renderFieldForSpec(
  spec: SlotSpec,
  value: unknown,
  path: string,
  onChange: (value: unknown) => void,
): React.ReactNode {
  const name = path.split('.').pop() ?? 'field'

  const commonProps: FieldProps & { name: string; path: string } = {
    spec,
    value,
    onChange,
    name,
    path,
  }

  switch (spec.type.kind) {
    case 'text':
      return <TextField {...commonProps} />
    case 'richText':
      return <RichTextField {...commonProps} />
    case 'number':
      return <NumberField {...commonProps} />
    case 'enum':
      return <EnumField {...commonProps} />
    case 'boolean':
      return <BooleanField {...commonProps} />
    case 'color':
      return <ColorField {...commonProps} />
    case 'icon':
      return <IconField {...commonProps} />
    case 'image':
      return <ImageField {...commonProps} />
    case 'list':
      return <ListField {...commonProps} />
    case 'object':
      return <ObjectField {...commonProps} />
    case 'series':
      return <SeriesField {...commonProps} />
    case 'blocks':
      return <BlocksField {...commonProps} />
    default:
      return null
  }
}

/**
 * Internal recursive component — used by ListField and ObjectField.
 */
const RecursiveField: React.FC<RecursiveFieldProps> = ({ spec, value, path, name, onChange }) => {
  return renderFieldForSpec(
    spec,
    value,
    path,
    onChange,
  ) as React.ReactElement
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Styled components                                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

const FieldContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
})

const FieldLabel = styled('label', {
  fontSize: '12px',
  fontWeight: 500,
  color: '$text',
  marginBottom: '4px',
})

const FieldHelp = styled('div', {
  fontSize: '12px',
  color: '$textMuted',
})

const InputField = styled('input', {
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid $border',
  borderRadius: '6px',
  width: '100%',
  boxSizing: 'border-box',
})

const TextAreaField = styled('textarea', {
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid $border',
  borderRadius: '6px',
  width: '100%',
  boxSizing: 'border-box',
  minHeight: '60px',
  resize: 'vertical',
})

export const SelectField = styled('select', {
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid $border',
  borderRadius: '6px',
  width: '100%',
  backgroundColor: '$bg',
  boxSizing: 'border-box',
})

const BoolFieldContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
})

const BoolLabel = styled('label', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
  fontWeight: 500,
  color: '$text',
  cursor: 'pointer',
})

const BoolCheckbox = styled('input', {
  width: '36px',
  height: '18px',
  cursor: 'pointer',
})

const ListItemsContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
})

const ListItemRow = styled('div', {
  display: 'flex',
  gap: '8px',
  alignItems: 'flex-start',
})

const ListControls = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  paddingTop: '20px',
})

const ListItemContent = styled('div', {
  flex: 1,
  minWidth: 0,
})

const ListButton = styled('button', {
  padding: '2px 6px',
  fontSize: '12px',
  border: '1px solid $border',
  borderRadius: '4px',
  background: 'transparent',
  color: '$textMuted',
  cursor: 'pointer',
  '&:hover': {
    background: '$bgHover',
    color: '$text',
  },
  variants: {
    disabled: {
      true: {
        opacity: 0.4,
        cursor: 'not-allowed',
      },
    },
  },
})

const AddButton = styled('button', {
  padding: '6px 12px',
  fontSize: '12px',
  border: '1px solid $border',
  borderRadius: '4px',
  background: 'transparent',
  color: '$text',
  cursor: 'pointer',
  '&:hover': {
    background: '$bgHover',
  },
})

const ObjectFieldsContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
})

const SeriesRow = styled('div', {
  display: 'flex',
  gap: '6px',
  alignItems: 'center',
})

const BlocksSummary = styled('div', {
  fontSize: '12px',
  color: '$textMuted',
  padding: '4px 8px',
  backgroundColor: '$bgHover',
  borderRadius: '4px',
})
