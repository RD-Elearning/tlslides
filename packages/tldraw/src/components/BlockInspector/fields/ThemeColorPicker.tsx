/**
 * ThemeColorPicker — a colour picker that shows swatches for every `ColorRole`,
 * a "Custom…" hex input, and a Reset (↺ Theme default) button that deletes the
 * style key rather than writing `undefined` into JSON.
 *
 * Used by the Style tab (Surface / Text / Accent) and by `color`-kind field
 * controls. See B6-inspector.md §3–4, H1–H3, H9.
 */

import * as React from 'react'
import { styled } from '../../../styles'
import type { ColorRole, SurfaceContext } from '~blocks/types'
import { useDeckTokens } from '~hooks'
import { resolveColor } from '~blocks/tokens'

/** The full canonical list of ColorRole values — swatches are generated from this. */
export const COLOR_ROLES: readonly ColorRole[] = [
  'surface',
  'surfaceAlt',
  'accent',
  'accent2',
  'text',
  'textMuted',
  'positive',
  'negative',
  'warning',
  'neutral',
  'line',
  'scrim',
]

interface ThemeColorPickerProps {
  /** The current value: a ColorRole name, a hex string, or undefined (no override). */
  value: ColorRole | string | undefined
  /** Called with a ColorRole name when a swatch is clicked. */
  onRole: (role: ColorRole) => void
  /** Called with a hex string when "Custom…" is used. */
  onCustom: (hex: string) => void
  /** Called (with undefined) when Reset is clicked — deletes the key. */
  onReset: () => void
}

/** A minimal neutral surface context for swatch colour resolution. */
const NEUTRAL_SURFACE: SurfaceContext = {
  behind: { type: 'solid', color: '#f5f5f5' } as any,
  luminance: 0.85,
  overImage: false,
}

export const ThemeColorPicker: React.FC<ThemeColorPickerProps> = ({
  value,
  onRole,
  onCustom,
  onReset,
}) => {
  const tokens = useDeckTokens()

  // Resolve the effective colour for display.
  // If the value is a known ColorRole, resolve through the theme (no override) so
  // we show the actual theme colour. If it's a hex, show it directly.
  const effectiveColor: string | undefined = React.useMemo(() => {
    if (value === undefined) return undefined
    if (COLOR_ROLES.includes(value as ColorRole)) {
      return resolveColor(value as ColorRole, NEUTRAL_SURFACE, tokens, undefined).color
    }
    return value
  }, [value, tokens])

  const currentRole: ColorRole | undefined = COLOR_ROLES.includes(value as ColorRole)
    ? (value as ColorRole)
    : undefined

  return (
    <ColorPickerContainer>
      <SwatchRow>
        {COLOR_ROLES.map((role) => {
          const roleColor = resolveColor(role, NEUTRAL_SURFACE, tokens, undefined).color
          const selected = currentRole === role
          return (
            <SwatchButton
              key={role}
              color={roleColor}
              selected={selected}
              title={role}
              onClick={selected ? undefined : () => onRole(role)}
            />
          )
        })}
        {/* Show the current custom hex as a swatch too, if it's not a role. */}
        {value !== undefined && !currentRole && effectiveColor && (
          <SwatchButton
            key="custom-current"
            color={effectiveColor}
            selected={true}
            title={value}
            onClick={undefined as any}
          />
        )}
      </SwatchRow>

      <CustomRow>
        <CustomInput
          type="color"
          value={effectiveColor ?? '#ffffff'}
          onChange={(e) => onCustom(e.target.value)}
          title="Custom colour"
        />
        <ResetButton type="button" onClick={onReset} title="Reset to theme default">
          ↺ Theme
        </ResetButton>
      </CustomRow>
    </ColorPickerContainer>
  )
}

/* Styled components */

const ColorPickerContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
})

const SwatchRow = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
})

/**
 * A clickable colour swatch. `color` is passed as a plain prop and applied via
 * inline style — Stitches variants won't work for arbitrary hex values.
 */
const SwatchButton: React.FC<{
  color: string
  selected: boolean
  title: string
  onClick?: () => void
}> = ({ color, selected, title, onClick }) => (
  <SwatchDiv
    style={{
      backgroundColor: color,
      border: selected ? '2px solid var(--tl-accent-color, #0066ff)' : '1px solid var(--tl-border-color, #e0e0e0)',
      boxShadow: selected ? '0 0 0 2px var(--tl-accent-color, #0066ff)' : undefined,
      cursor: onClick ? 'pointer' : 'default',
    }}
    onClick={onClick}
    title={title}
    aria-label={title}
  />
)

const SwatchDiv = styled('div', {
  width: '24px',
  height: '24px',
  borderRadius: '4px',
  flexShrink: 0,
  transition: 'border-color 0.15s, box-shadow 0.15s',
  '&:focus': {
    outline: '2px solid var(--tl-accent-color, #0066ff)',
    outlineOffset: 1,
  },
})

const CustomRow = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

const CustomInput = styled('input', {
  width: '40px',
  height: '24px',
  padding: 0,
  border: '1px solid $border',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: 'transparent',
})

const ResetButton = styled('button', {
  padding: '4px 8px',
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
})
