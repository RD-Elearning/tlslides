import * as React from 'react'
import { stopPropagation } from '~components/stopPropagation'
import { GHOSTED_OPACITY, LETTER_SPACING, DEFAULT_LINE_HEIGHT } from '~constants'
import { AlignStyle } from '~types'
import { TLDR } from '~state/TLDR'
import { styled } from '~styles'
import { getTextLabelSize } from './getTextSize'
import { useTextKeyboardEvents } from './useTextKeyboardEvents'
import { computeAutoFitScale } from './shape-styles'

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
  /** Phase 17 — CSS `letter-spacing`, already formatted (e.g. `'-0.03em'`) by the caller via
   * `getLetterSpacingCss`. Defaults to the pre-Phase-17 constant, matching every caller that
   * hasn't been updated to pass a resolved value. */
  letterSpacing?: string
  /** Phase 17 — line-height multiplier, resolved by the caller via `getLineHeight`. Defaults to
   * the pre-Phase-17 hardcoded `1`. */
  lineHeight?: number
  /** Phase 17 — `style.verticalAlign`, passed straight through: this component owns the only
   * layout mechanism (`TextWrapper`'s flexbox) capable of acting on it. `undefined` keeps the
   * pre-existing hardcoded center. */
  verticalAlign?: AlignStyle
  /** Phase 17 — the label's own box (shape bounds, e.g. `[bounds.width, bounds.height]`), needed
   * only when `autoFit` is true. Without a box there is nothing to fit text *into*, so `autoFit`
   * is a no-op unless this is also provided. */
  boxSize?: [number, number]
  /** Phase 17 — shrink (never grow) `scale`'s effective value so the label's natural text size
   * fits inside `boxSize`. See `computeAutoFitScale`'s own comment for the fit-ratio math, shared
   * verbatim with `renderPageToSvg`'s headless equivalent. Composes multiplicatively with `scale`
   * exactly the way ArrowUtil's own pre-existing auto-shrink-to-arrow-length `scale` already
   * composes with a manually-set `style.scale` baked into `font` — not a new pattern, the same
   * "multiple independent scale sources multiply together" idiom this component already had. */
  autoFit?: boolean
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
  letterSpacing = LETTER_SPACING,
  lineHeight = DEFAULT_LINE_HEIGHT,
  verticalAlign,
  boxSize,
  autoFit = false,
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
    const size = getTextLabelSize(text, font, letterSpacing, lineHeight)
    // Phase 17 — auto-fit composes with `scale` rather than replacing it in the general case, but
    // in practice every current caller passes `scale={1}` (the default) whenever `autoFit` is
    // true, so this reads as "auto-fit's own fit ratio is the effective scale" — see
    // `computeAutoFitScale`'s doc comment and RectangleUtil/EllipseUtil/TriangleUtil for how the
    // two are wired together.
    const fitScale = autoFit && boxSize ? computeAutoFitScale(size[0], size[1], ...boxSize) : 1
    const effectiveScale = scale * fitScale
    // Phase 17 — `verticalAlign`. A first version of this tried an inline `alignItems` on
    // `TextWrapper` (the flex container) instead, reasoning that CSS *does* let a flex container's
    // `align-items` resolve the static position of an absolutely-positioned child with `auto`
    // offsets. It technically does, but composing that with this element's own `scale(...)
    // translate(...)` transform (needed for `offsetX`/`offsetY`/auto-fit) put the label wildly off
    // -box on a real screenshot — caught only by looking at the PNG, not by any of the unit tests,
    // which never render a real flex layout. Replaced with a plain, explicit pixel offset instead:
    // `boxAlignY`, computed in *screen* pixels (the box's own size, minus the label's *final*
    // rendered height, halved) and applied as a leading `translate` OUTSIDE the scale — unlike
    // `offsetX`/`offsetY` below (which intentionally shrink with `effectiveScale`, matching how
    // ArrowUtil's pre-existing label-follows-bend-point offset already behaves), a vertical-align
    // nudge should stay a fixed number of screen pixels regardless of how small auto-fit shrank
    // the text, or a heavily-shrunk label would barely move off dead-center at all.
    let boxAlignY = 0
    if (boxSize) {
      const scaledHeight = size[1] * effectiveScale
      switch (verticalAlign) {
        case AlignStyle.Start:
        case AlignStyle.Justify:
          boxAlignY = -(boxSize[1] - scaledHeight) / 2
          break
        case AlignStyle.End:
          boxAlignY = (boxSize[1] - scaledHeight) / 2
          break
        default:
          boxAlignY = 0
      }
    }
    elm.style.transform =
      `translate(0px, ${boxAlignY}px) ` +
      `scale(${effectiveScale}, ${effectiveScale}) translate(${offsetX}px, ${offsetY}px)`
    elm.style.width = size[0] + 1 + 'px'
    elm.style.height = size[1] + 1 + 'px'
  }, [text, font, offsetY, offsetX, scale, letterSpacing, lineHeight, autoFit, boxSize, verticalAlign])

  return (
    // Opacity is applied here as an inline style rather than through the `isGhost` styled-component
    // variant below: an inline `style` prop always wins over a class's declarations, so setting it
    // here keeps this one numeric value as the single source of truth instead of fighting the
    // variant for control of the same CSS property. (That `isGhost` variant is left in place as
    // dead code — no caller has ever passed `isGhost` to this component — but if one someday does,
    // an explicit `opacity` from a caller should still take precedence.)
    // `verticalAlign` is deliberately NOT handled here via `alignItems` — see the layout effect's
    // own comment on why that approach broke on a real screenshot. `TextWrapper` stays exactly the
    // "always centered" flex container it was before this phase.
    <TextWrapper style={opacity === undefined ? undefined : { opacity }}>
      <InnerWrapper
        ref={rInnerWrapper}
        hasText={!!text}
        isEditing={isEditing}
        style={{
          font,
          color,
          letterSpacing,
          lineHeight,
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
