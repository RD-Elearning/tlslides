import * as React from 'react'

// Registry of host-app-supplied React components, keyed by the serializable `componentId` a
// ComponentShape stores in the document (F-02). Delivered via context — like `TldrawContext` /
// `useTldrawApp` — rather than drilled through `Renderer`/`Canvas` props, since it only needs to
// reach `ComponentUtil.Component`, an arbitrary number of levels deep in the shape tree, and nothing
// in between (Renderer, Canvas, Shape, Container) has any use for it.
export type TldrawComponentsRegistry = Record<string, React.ComponentType<any>>

// Stable empty default so consumers who never pass `components` don't cause every ComponentUtil
// instance to see a "new" registry object on each render.
const EMPTY_REGISTRY: TldrawComponentsRegistry = {}

export const TldrawComponentsContext =
  React.createContext<TldrawComponentsRegistry>(EMPTY_REGISTRY)

export function useTldrawComponents() {
  return React.useContext(TldrawComponentsContext)
}
