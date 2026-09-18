import * as React from 'react'
import type { HostRegistry } from '~blocks/host-registry'

// Context for the HostRegistry — the bridge between host layout nodes (k: 'host')
// and the imperative DOM renderers that fill them. When a LayoutNode has k: 'host',
// the DOM renderer looks up its `render` id in this registry to find the real code.

const EMPTY_REGISTRY: HostRegistry | undefined = undefined

export const HostRegistryContext = React.createContext<HostRegistry | undefined>(EMPTY_REGISTRY)

export function useHostRegistry(): HostRegistry | undefined {
  return React.useContext(HostRegistryContext)
}
