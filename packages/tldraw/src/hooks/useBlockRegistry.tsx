import * as React from 'react'
import type { BlockRegistry } from '~blocks/registry'

// Context for the BlockRegistry — the bridge between block definitions (with layout()
// functions) and the ComponentUtil renderer. When a ComponentShape's componentId matches
// a definition in this registry, ComponentUtil renders through renderNodeToDom instead of
// the createBlockComponents placeholder.

const EMPTY_REGISTRY: BlockRegistry | undefined = undefined

export const BlockRegistryContext = React.createContext<BlockRegistry | undefined>(EMPTY_REGISTRY)

export function useBlockRegistry(): BlockRegistry | undefined {
  return React.useContext(BlockRegistryContext)
}
