/**
 * Inline Editor - provides editable overlay for text blocks.
 * R11 implementation - ContentEditable with portal to avoid overflow clipping.
 */

import * as React from 'react'
import { styled } from '@stitches/react'
import { useTldraw } from '../../hooks'
import { setAtPath } from '../../blocks/prop-path'

export interface InlineEditorProps {
  shapeId: string
  propPath: string
  initialValue: string | { runs: Array<{ text: string; bold?: boolean; italic?: boolean }> }
  posY: number
  posX: number
  width: number
  height: number
  style: { size: number; color: string }
  onRequestClose: () => void
}

export const InlineEditor: React.FC<InlineEditorProps> = ({
  shapeId,
  propPath,
  initialValue,
  posY,
  posX,
  width,
  height,
  style,
  onRequestClose,
}) => {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const tldraw = useTldraw()
  
  const plainText = typeof initialValue === 'string' 
    ? initialValue 
    : initialValue.runs?.map(r => r.text).join('') || ''
  
  const handleBlur = (e: React.FocusEvent) => {
    const value = e.target.innerText
    if (value !== plainText) {
      tldraw.updateShapes({ id: shapeId, props: { [propPath]: value } })
    }
    onRequestClose()
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onRequestClose()
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      editorRef.current?.blur()
    }
  }
  
  React.useLayoutEffect(() => {
    if (editorRef.current) {
      const rect = editorRef.current.getBoundingClientRect()
      editorRef.current.style.position = 'fixed'
      editorRef.current.style.left = `${rect.left}px`
      editorRef.current.style.top = `${rect.top}px`
    }
  }, [])
  
  return (
    <EditorPortal>
      <EditorOverlay onClick={onRequestClose} />
      <EditorDiv
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          width,
          height,
          fontSize: style.size,
          color: style.color,
          fontWeight: 'normal',
          lineHeight: 1.2,
          outline: '2px solid transparent',
          outlineOffset: '2px',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          borderRadius: '4px',
          padding: '4px 8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #0066ff',
        }}
        dangerouslySetInnerHTML={{ __html: plainText }}
      />
    </EditorPortal>
  )
}

/* Styled components */

const EditorPortal = styled('div', {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
  zIndex: 1000,
  background: 'transparent',
})

const EditorOverlay = styled('div', {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  cursor: 'pointer',
  pointerEvents: 'auto',
})

const EditorDiv = styled('div', {
  position: 'absolute',
  cursor: 'text',
  pointerEvents: 'auto',
  userSelect: 'text',
})
