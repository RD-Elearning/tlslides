import * as React from 'react'
import { styled } from '~styles'
import { stopKeyPropagationUnlessEscape } from '~components/preventEvent'

// Phase 8b — no slider primitive existed anywhere in this repo (checked: no `@radix-ui/react-
// slider` dependency, no `type="range"` input, nothing under Primitives/). Rather than pull in a
// new Radix package for one control, this wraps a native `<input type="range">`, styled to match
// the rest of Primitives.
export interface SliderProps {
  value: number
  min?: number
  max?: number
  step?: number
  /** Fired continuously while dragging/typing, for live label feedback. Does NOT go through the
   *  style command — see `onValueCommit`. */
  onValueChange: (value: number) => void
  /** Fired once when the gesture ends (pointer released, arrow key pressed and released, or the
   *  control loses focus). This is the one that should call `app.style(...)` — committing on
   *  every `onValueChange` tick would create one undo step per pixel of drag. */
  onValueCommit?: (value: number) => void
  id?: string
  'aria-label'?: string
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(function Slider(
  { value, min = 0, max = 100, step = 1, onValueChange, onValueCommit, id, ...rest },
  ref
) {
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onValueChange(Number(e.currentTarget.value)),
    [onValueChange]
  )
  const handleCommit = React.useCallback(
    (e: React.SyntheticEvent<HTMLInputElement>) =>
      onValueCommit?.(Number(e.currentTarget.value)),
    [onValueCommit]
  )
  // See stopKeyPropagationUnlessEscape's comment: without this, arrow-key nudging of the slider
  // while focused would double as canvas shortcuts (and worse, other keys typed by mistake could
  // trigger tool switches or Tab-clone). Combined with the commit-on-keyup this control already
  // needs.
  const handleKeyUp = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      stopKeyPropagationUnlessEscape(e)
      handleCommit(e)
    },
    [handleCommit]
  )
  return (
    <StyledSlider
      ref={ref}
      type="range"
      id={id}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={handleChange}
      onPointerUp={handleCommit}
      onKeyDown={stopKeyPropagationUnlessEscape}
      onKeyUp={handleKeyUp}
      onBlur={handleCommit}
      {...rest}
    />
  )
})

const StyledSlider = styled('input', {
  appearance: 'none',
  WebkitAppearance: 'none',
  width: '100%',
  height: 16,
  background: 'transparent',
  margin: 0,
  cursor: 'pointer',

  '&::-webkit-slider-runnable-track': {
    height: 4,
    borderRadius: '$0',
    background: '$hover',
  },
  '&::-webkit-slider-thumb': {
    WebkitAppearance: 'none',
    marginTop: -6,
    width: 16,
    height: 16,
    borderRadius: '$4',
    background: '$selected',
    border: '2px solid $panel',
    boxShadow: '$3',
  },
  '&::-moz-range-track': {
    height: 4,
    borderRadius: '$0',
    background: '$hover',
  },
  '&::-moz-range-thumb': {
    width: 12,
    height: 12,
    border: '2px solid $panel',
    borderRadius: '$4',
    background: '$selected',
    boxShadow: '$3',
  },
})
