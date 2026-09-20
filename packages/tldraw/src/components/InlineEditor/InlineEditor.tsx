/**
 * Inline Editor — contentEditable overlay for a block's text part.
 * R11 implementation.
 */

import * as React from 'react'
import { styled } from '../../styles'

export interface InlineEditorProps {
  propPath: string
  initialValue: string
  /** The target element's own bounding rect (viewport coordinates), used to position the
   *  overlay exactly on top of the text it is replacing. */
  rect: DOMRect
  style?: { size?: number; color?: string }
  onSave: (value: string) => void
  onCancel: () => void
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
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
        }}
      />
    </EditorPortal>
  )
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
  padding: '2px 4px',
  outline: '2px solid #0066ff',
  outlineOffset: '2px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
})
