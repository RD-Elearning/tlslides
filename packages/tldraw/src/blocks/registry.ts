import * as React from 'react'
import type { BlockDefinition, BlockFamily } from './types'

/**
 * Runtime registry for block definitions. Blocks must be registered before they can
 * be inserted or rendered. Registering a block twice, or with a `$block` slot name,
 * throws a clear error.
 */
export class BlockRegistry {
  private definitions = new Map<string, BlockDefinition>()

  /**
   * Register a block definition. Throws if the type is already registered or if the
   * schema declares a slot named `$block` (that key is reserved for block metadata).
   */
  register(definition: BlockDefinition): void {
    if (this.definitions.has(definition.type)) {
      throw new Error(
        `BlockRegistry: block type "${definition.type}" is already registered. ` +
          `Each block type must be unique.`
      )
    }

    // Validate that $block is not a slot name (it is reserved for metadata)
    for (const slotName of Object.keys(definition.schema)) {
      if (slotName === '$block') {
        throw new Error(
          `BlockRegistry: block "${definition.type}" declares a slot named "$block", which is reserved ` +
            `for internal block metadata. Use a different slot name.`
        )
      }
    }

    this.definitions.set(definition.type, definition)
  }

  /**
   * Get a registered block definition by type. Returns undefined if not found.
   */
  get(type: string): BlockDefinition | undefined {
    return this.definitions.get(type)
  }

  /**
   * Check whether a block type is registered.
   */
  has(type: string): boolean {
    return this.definitions.has(type)
  }

  /**
   * List all registered definitions.
   */
  list(): BlockDefinition[] {
    return Array.from(this.definitions.values())
  }

  /**
   * List all definitions in a given family.
   */
  listByFamily(family: BlockFamily): BlockDefinition[] {
    return this.list().filter((def) => def.family === family)
  }
}

/**
 * Create a React component registry from a BlockDefinition array or BlockRegistry.
 * This is the bridge between `BlockDefinition`s and the `components` prop on `<Tldraw>`.
 *
 * Returns `Record<string, React.FC<Record<string, unknown>>>` — one entry per registered block, keyed by type.
 * For Phase 18, each component is a minimal placeholder div showing the block type.
 * Phase 20 replaces this with the real DOM renderer over `LayoutNode`.
 */
export function createBlockComponents(
  library: BlockDefinition[] | BlockRegistry
): Record<string, React.FC<Record<string, unknown>>> {
  const definitions = Array.isArray(library) ? library : library.list()
  const components: Record<string, React.FC<Record<string, unknown>>> = {}

  for (const def of definitions) {
    // The placeholder ignores props entirely, so it declares none — a parameter silenced with
    // an eslint-disable is just an unused parameter with extra steps. P20's real renderer will
    // take them.
    components[def.type] = () => {
      return React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#f3f4f6',
            border: '2px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'system-ui, sans-serif',
            color: '#6b7280',
            textAlign: 'center',
            padding: '16px',
          },
        },
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            { style: { fontWeight: 600, marginBottom: '4px' } },
            def.name
          ),
          React.createElement('div', { style: { fontSize: '12px', opacity: 0.7 } }, def.type)
        )
      )
    }
  }

  return components
}
