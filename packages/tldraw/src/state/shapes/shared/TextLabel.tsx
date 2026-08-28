import * as React from 'react'
import { stopPropagation } from '~components/stopPropagation'
import { GHOSTED_OPACITY, LETTER_SPACING } from '~constants'
import { TLDR } from '~state/TLDR'
import { styled } from '~styles'
import { getTextLabelSize } from './getTextSize'
import { useTextKeyboardEvents } from './useTextKeyboardEvents'

export interface TextLabelProps {
  font: string
  text: string
  color: string
  onBlur?: () => void
  onChange: (text: string) => void
  offsetY?: number
  offsetX?: number
  scale?: number
  isEditing?: boolean
  /** T8a.1 — opacity. Undefined means fully opaque, matching every caller from before this field
   * existed. Callers combine the persisted `style.opacity` and the transient ghost dim themselves
   * (via `getShapeOpacity`) before passing this down — see the note on `TextWrapper` below for why
   * that keeps this the single source of truth for the label's opacity. */
  opacity?: number
}

export const TextLabel = React.memo(function TextLabel({
  font,
  text,
  color,
  offsetX = 0,
  offsetY = 0,
  scale = 1,
  isEditing = false,
  opacity,
  onBlur,
  onChange,
}: TextLabelProps) {
  const rInput = React.useRef<HTMLTextAreaElement>(null)
  const rIsMounted = React.useRef(false)

  const rTextContent = React.useRef(text)

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      rTextContent.current = TLDR.normalizeText(e.currentTarget.value)
      onChange(rTextContent.current)
    },
    [onChange]
  )

  const handleKeyDown = useTextKeyboardEvents(onChange)

  const handleBlur = React.useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      e.currentTarget.setSelectionRange(0, 0)
      onBlur?.()
    },
    [onBlur]
  )

  const handleFocus = React.useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (!isEditing) return
      if (!rIsMounted.current) return

      if (document.activeElement === e.currentTarget) {
        e.currentTarget.select()
      }
    },
    [isEditing]
  )

  const handlePointerDown = React.useCallback(
    (e) => {
      if (isEditing) {
        e.stopPropagation()
      }
    },
    [isEditing]
  )

  React.useEffect(() => {
    if (isEditing) {
      rTextContent.current = text
      requestAnimationFrame(() => {
        rIsMounted.current = true
        const elm = rInput.current
        if (elm) {
          elm.focus()
          elm.select()
        }
      })
    } else {
      onBlur?.()
    }
  }, [isEditing, onBlur])

  const rInnerWrapper = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    const elm = rInnerWrapper.current
    if (!elm) return
    const size = getTextLabelSize(text, font)
    elm.style.transform = `scale(${scale}, ${scale}) translate(${offsetX}px, ${offsetY}px)`
    elm.style.width = size[0] + 1 + 'px'
    elm.style.height = size[1] + 1 + 'px'
  }, [text, font, offsetY, offsetX, scale])

  return (
    // Opacity is applied here as an inline style rather than through the `isGhost` styled-component
    // variant below: an inline `style` prop always wins over a class's declarations, so setting it
    // here keeps this one numeric value as the single source of truth instead of fighting the
    // variant for control of the same CSS property. (That `isGhost` variant is left in place as
    // dead code — no caller has ever passed `isGhost` to this component — but if one someday does,
    // an explicit `opacity` from a caller should still take precedence.)
    <TextWrapper style={opacity === undefined ? undefined : { opacity }}>
      <InnerWrapper
        ref={rInnerWrapper}
        hasText={!!text}
        isEditing={isEditing}
        style={{
          font,
          color,
        }}
      >
        {isEditing ? (
          <TextArea
            ref={rInput}
            style={{
              font,
              color,
            }}
            name="text"
            tabIndex={-1}
            autoComplete="false"
            autoCapitalize="false"
            autoCorrect="false"
            autoSave="false"
            autoFocus
            placeholder=""
            spellCheck="true"
            wrap="off"
            dir="auto"
            datatype="wysiwyg"
            defaultValue={rTextContent.current}
            color={color}
            onFocus={handleFocus}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onPointerDown={handlePointerDown}
            onContextMenu={stopPropagation}
          />
        ) : (
          text
        )}
        &#8203;
      </InnerWrapper>
    </TextWrapper>
  )
})

const TextWrapper = styled('div', {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  userSelect: 'none',
  variants: {
    isGhost: {
      false: { opacity: 1 },
      true: { transition: 'opacity .2s', opacity: GHOSTED_OPACITY },
    },
  },
})

const commonTextWrapping = {
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
}

const InnerWrapper = styled('div', {
  position: 'absolute',
  padding: '4px',
  zIndex: 1,
  minHeight: 1,
  minWidth: 1,
  lineHeight: 1,
  letterSpacing: LETTER_SPACING,
  outline: 0,
  fontWeight: '500',
  textAlign: 'center',
  backfaceVisibility: 'hidden',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  variants: {
    hasText: {
      false: {
        pointerEvents: 'none',
      },
      true: {
        pointerEvents: 'all',
      },
    },
    isEditing: {
      false: {
        userSelect: 'none',
      },
      true: {
        background: '$boundsBg',
        userSelect: 'text',
        WebkitUserSelect: 'text',
      },
    },
  },
  ...commonTextWrapping,
})

const TextArea = styled('textarea', {
  position: 'absolute',
  top: 0,
  left: 0,
  zIndex: 1,
  width: '100%',
  height: '100%',
  border: 'none',
  padding: '4px',
  resize: 'none',
  textAlign: 'inherit',
  minHeight: 'inherit',
  minWidth: 'inherit',
  lineHeight: 'inherit',
  letterSpacing: 'inherit',
  outline: 0,
  fontWeight: 'inherit',
  overflow: 'hidden',
  backfaceVisibility: 'hidden',
  display: 'inline-block',
  pointerEvents: 'all',
  background: '$boundsBg',
  userSelect: 'text',
  WebkitUserSelect: 'text',
  fontSmooth: 'always',
  WebkitFontSmoothing: 'subpixel-antialiased',
  MozOsxFontSmoothing: 'auto',
  ...commonTextWrapping,
})
