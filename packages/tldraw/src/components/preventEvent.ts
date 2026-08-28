export const preventEvent = (e: Event) => e.preventDefault()

// Phase 8b — @tlslides/core's `useKeyEvents` (packages/core/src/hooks/useKeyEvents.ts) listens for
// keydown/keyup on `window`, unconditionally, to drive tool shortcuts (letters switch tools,
// Escape cancels, and — the one that bit this phase — Tab clones the single selected shape,
// wired up in SelectTool.onKeyDown). None of that checks `document.activeElement`, so it fires
// even while a form field inside a menu has focus. React 17 changed event delegation to use real
// native propagation from the target up to the app's root container, which means a React
// `stopPropagation()` call genuinely stops the native event before it ever reaches that `window`
// listener (this would NOT have worked pre-17, where delegation was root-`document`-based).
// Every free-typed control in the style panel (and any future on-canvas form field) needs this on
// both `onKeyDown` and `onKeyUp`, or a keystroke meant for the field — most dramatically Tab,
// which otherwise clones the selected shape mid-edit — leaks into the canvas as a shortcut.
// Escape is deliberately exempted so it can still bubble up to close the menu / cancel the tool,
// matching how a user expects Escape to behave from inside any control.
export const stopKeyPropagationUnlessEscape = (e: { key: string; stopPropagation: () => void }) => {
  if (e.key !== 'Escape') e.stopPropagation()
}
