/**
 * Hook for inline editing functionality.
 * R11 - Detects double-click on propPath elements and manages editing state.
 */

import * as React from 'react'

export interface EditingState {
  shapeId: string
  propPath: string
  targetRect: DOMRect
  style: { size: number; color: string }
}

export function useInlineEdit() {
  const [editing, setEditing] = React.useState<EditingState | null>(null)
  
  const startEdit = React.useCallback((
    shapeId: string,
    propPath: string,
    targetRect: DOMRect,
    style: { size: number; color: string }
  ) => {
    setEditing({ shapeId, propPath, targetRect, style })
  }, [])
  
  const stopEdit = React.useCallback(() => {
    setEditing(null)
  }, [])
  
  return { editing, startEdit, stopEdit }
}
