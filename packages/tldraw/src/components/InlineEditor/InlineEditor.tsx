/**
 * Inline Editor — contentEditable overlay for a block's text part.
 * R11 implementation.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import { styled } from '../../styles'

export interface InlineEditorProps {
  propPath: string
  initialValue: string
  /** The target element's own bounding rect (viewport coordinates), used to position the
   *  overlay exactly on top of the text it is replacing. */
  rect: DOMRect
  style?: InlineEditorStyle
  onSave: (value: string) => void
  onCancel: () => void
}

/** The edited text's own type, in viewport pixels (`editorStyleOf`). */
export interface InlineEditorStyle {
  size?: number
  color?: string
  family?: string
  weight?: string
  lineHeight?: number
  letterSpacing?: number
  align?: string
}

/**
 * The type of `target` as it appears on screen: its computed style (CSS pixels inside the canvas)
 * times the canvas zoom, which is how much wider the element shows (`rect`) than it is laid out.
 * Before (spro demo T9) the overlay drew every text at the browser's default 16 px over the slide.
 */
export function editorStyleOf(target: HTMLElement, rect: DOMRect): InlineEditorStyle {
  const cs = window.getComputedStyle(target)
  const zoom = target.offsetWidth > 0 ? rect.width / target.offsetWidth : 1
  const px = (v: string) => {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n * zoom : undefined
  }
  return {
    size: px(cs.fontSize),
    color: cs.color,
    family: cs.fontFamily,
    weight: cs.fontWeight,
    lineHeight: px(cs.lineHeight),
    letterSpacing: px(cs.letterSpacing),
    align: cs.textAlign,
  }
}

export const InlineEditor: React.FC<InlineEditorProps> = ({
  propPath,
  initialValue,
  rect,
  style,
  onSave,
  onCancel,
}) => {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const savedRef = React.useRef(false)

  // Set the starting text once via `textContent` (never `dangerouslySetInnerHTML` — the
  // value is arbitrary deck content, and rendering it as HTML would let a crafted prop value
  // inject markup/scripts into the editor's own DOM), then focus and select it.
  React.useEffect(() => {
    const el = editorRef.current
    if (!el) return
    el.textContent = initialValue
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, [])

  const commit = () => {
    if (savedRef.current) return
    savedRef.current = true
    const value = editorRef.current?.textContent ?? initialValue
    if (value !== initialValue) {
      onSave(value)
    } else {
      onCancel()
    }
  }

  const cancel = () => {
    if (savedRef.current) return
    savedRef.current = true
    onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commit()
    }
  }

  // Portalled to <body>: the shape sits inside the canvas's CSS transform, and a transformed
  // ancestor makes `position: fixed` relative to itself — the overlay landed away from the text.
  const overlay = (
    <EditorPortal data-prop-path={propPath}>
      <EditorOverlay onMouseDown={commit} />
      <EditorDiv
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          minHeight: rect.height,
          fontSize: style?.size,
          color: style?.color,
          fontFamily: style?.family,
          fontWeight: style?.weight as React.CSSProperties['fontWeight'],
          lineHeight: style?.lineHeight ? `${style.lineHeight}px` : undefined,
          letterSpacing: style?.letterSpacing,
          textAlign: style?.align as React.CSSProperties['textAlign'],
        }}
      />
    </EditorPortal>
  )
  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body)
}

const EditorPortal = styled('div', {
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 1000,
})

const EditorOverlay = styled('div', {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'auto',
})

const EditorDiv = styled('div', {
  position: 'absolute',
  pointerEvents: 'auto',
  cursor: 'text',
  userSelect: 'text',
  lineHeight: 1.2,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
  borderRadius: '4px',
  padding: 0,
  outline: '2px solid #0066ff',
  outlineOffset: '2px',
  // the slide shows through: the text keeps its own colour on its own background (white text on
  // a dark slide read white on white before); the original text is hidden meanwhile
  backgroundColor: 'transparent',
})
