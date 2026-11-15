import * as React from 'react'

/**
 * Editor E01 — `'basic'` is the touch-up editor a host (spro) embeds for AI-generated decks: only
 * operations that survive `documentToDeckSpec` are reachable (no drawing tools, no tldraw styles,
 * no rotate/lock/flip, no auto-opening inspector). `'full'` (the default) is the whole editor.
 */
export type EditorProfile = 'full' | 'basic'

export const EditorProfileContext = React.createContext<EditorProfile>('full')

export function useEditorProfile(): EditorProfile {
  return React.useContext(EditorProfileContext)
}
