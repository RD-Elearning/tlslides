/**
 * EditOverlay - Renders inline editors at the right position.
 * Used for R11 inline text editing.
 */

import * as React from 'react'
import { useTldraw, useBlockRegistry } from '../../hooks'
import { InlineEditor } from '../InlineEditor'
import type { LayoutNode } from '../../blocks/types'

export interface EditOverlayProps {
  /** Map of editing states by propPath */
  editingStates: Record<string, {
    shapeId: string
    targetRect: DOMRect
    node: LayoutNode
  }>
  /** Called to close an editing session */
  onClose: (propPath: string) => void
}

export const EditOverlay: React.FC<EditOverlayProps> = ({ 
  editingStates, 
  onClose 
}) => {
  const tldraw = useTldraw()
  const blockRegistry = useBlockRegistry()
  
  return (
    <React.Fragment>
      {Object.entries(editingStates).map(([propPath, state]) => {
        const { shapeId, targetRect, node } = state
        const blockDef = blockRegistry?.get(shapeId)
        
        // Get text content from the appropriate prop
        const textContent = node.k === 'text' 
          ? (node as any).content || ''
          : ''
        
        // Get style info
        const nodeStyle = node.k === 'text' 
          ? (node as any).style || { size: 14, color: '#333' }
          : { size: 14, color: '#333' }
        
        return (
          <InlineEditor
            key={`${shapeId}-${propPath}`}
            shapeId={shapeId}
            propPath={propPath}
            initialValue={textContent}
            posX={targetRect.left}
            posY={targetRect.top}
            width={targetRect.width}
            height={targetRect.height}
            style={nodeStyle}
            onRequestClose={() => onClose(propPath)}
          />
        )
      })}
    </React.Fragment>
  )
}
