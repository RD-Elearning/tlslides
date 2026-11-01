import * as React from 'react'

/**
 * Editor E08 — the strings of the editor chrome a host can translate (`<Tldraw messages>`).
 * English defaults; `{name}` placeholders are filled by `format`.
 */
export const DEFAULT_MESSAGES = {
  'menu.editText': 'Edit text',
  'menu.duplicate': 'Duplicate',
  'menu.delete': 'Delete',
  'menu.cut': 'Cut',
  'menu.copy': 'Copy',
  'menu.paste': 'Paste',
  'menu.undo': 'Undo',
  'menu.redo': 'Redo',
  'strip.duplicate': 'Duplicate Slide',
  'strip.delete': 'Delete Slide',
  'strip.moveUp': 'Move up',
  'strip.moveDown': 'Move down',
  'strip.more': 'Slide actions',
  'strip.count': '{n} slides',
  'strip.deleteConfirm': 'Delete slide {n}?',
  'inspector.content': 'Content',
  'inspector.style': 'Style',
  'inspector.motion': 'Motion',
  'inspector.close': 'Close',
  'inspector.options': 'Options',
  'inspector.elements': 'Elements',
  'inspector.empty': 'Select a block to edit its properties',
  'inspector.resetStyles': 'Reset all styles to theme',
  'field.add': '+ Add',
  'field.moveUp': 'Move up',
  'field.moveDown': 'Move down',
  'field.remove': 'Remove',
  'field.select': '— select —',
  'field.noChildren': 'No child blocks',
  'field.children': '{n} child block(s)',
  'field.value': 'Value',
  'field.label': 'Label',
  'edit.required': 'Required',
  'edit.limit': '{n} / {max}',
}

export type TldrawMessages = typeof DEFAULT_MESSAGES
export type TldrawMessageId = keyof TldrawMessages

/** Host callbacks for schema-driven names (field labels, block names, enum values). */
export interface TldrawLabels {
  field?: (blockType: string, slotPath: string, schemaLabel: string) => string | undefined
  block?: (blockType: string, name: string) => string | undefined
  option?: (blockType: string, slot: string, value: string) => string | undefined
}

export const MessagesContext = React.createContext<{ messages: TldrawMessages; labels: TldrawLabels }>({
  messages: DEFAULT_MESSAGES,
  labels: {},
})

export function format(msg: string, vars?: Record<string, string | number>): string {
  return vars ? msg.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : msg
}

/** `t('menu.delete')`, `t('strip.count', { n: 3 })`. */
export function useMsg(): (id: TldrawMessageId, vars?: Record<string, string | number>) => string {
  const { messages } = React.useContext(MessagesContext)
  return React.useCallback((id, vars) => format(messages[id] ?? DEFAULT_MESSAGES[id], vars), [messages])
}

export function useLabels(): TldrawLabels {
  return React.useContext(MessagesContext).labels
}
