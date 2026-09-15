import { BlockRegistry, createBlockComponents } from './registry'
import type { BlockDefinition } from './types'

const minimalDef = (type: string): BlockDefinition => ({
  type,
  name: 'Test Block',
  family: 'layout',
  tier: 'A',
  summary: 'A test block',
  keywords: ['test'],
  schema: {},
  defaults: {},
  size: { preferred: [400, 300], min: [200, 150] },
  layout: () => ({ k: 'group', box: { x: 0, y: 0, width: 400, height: 300 }, children: [] }),
  motion: { parts: [] },
})

describe('BlockRegistry', () => {

  describe('register and basic operations', () => {
    it('registers a block definition', () => {
      const registry = new BlockRegistry()
      const def = minimalDef('tls.test.block')
      registry.register(def)

      expect(registry.has('tls.test.block')).toBe(true)
      expect(registry.get('tls.test.block')).toBe(def)
    })

    it('returns undefined for an unregistered type', () => {
      const registry = new BlockRegistry()
      expect(registry.get('does.not.exist')).toBeUndefined()
      expect(registry.has('does.not.exist')).toBe(false)
    })

    it('lists all registered definitions', () => {
      const registry = new BlockRegistry()
      const def1 = minimalDef('tls.one')
      const def2 = minimalDef('tls.two')

      registry.register(def1)
      registry.register(def2)

      const list = registry.list()
      expect(list).toHaveLength(2)
      expect(list).toContain(def1)
      expect(list).toContain(def2)
    })

    it('lists definitions by family', () => {
      const registry = new BlockRegistry()
      const layout = { ...minimalDef('tls.stack'), family: 'layout' as const }
      const text = { ...minimalDef('tls.heading'), family: 'text' as const }

      registry.register(layout)
      registry.register(text)

      const byFamily = registry.listByFamily('layout')
      expect(byFamily).toHaveLength(1)
      expect(byFamily[0]).toBe(layout)
    })
  })

  describe('duplicate registration throws', () => {
    it('throws when registering the same type twice', () => {
      const registry = new BlockRegistry()
      const def = minimalDef('tls.test')

      registry.register(def)

      expect(() => {
        registry.register(def)
      }).toThrow(/already registered/)
      expect(() => {
        registry.register(def)
      }).toThrow(/tls\.test/)
    })
  })

  describe('$block slot name is reserved', () => {
    it('throws when a schema declares a slot named $block', () => {
      const registry = new BlockRegistry()
      const def = {
        ...minimalDef('tls.bad'),
        schema: {
          label: { type: { kind: 'text' as const }, role: 'content' as const, label: 'Label' },
          $block: { type: { kind: 'text' as const }, role: 'content' as const, label: 'Reserved' },
        },
      }

      expect(() => {
        registry.register(def)
      }).toThrow(/\$block/)
      expect(() => {
        registry.register(def)
      }).toThrow(/reserved/)
    })
  })
})

describe('createBlockComponents', () => {
  const def1 = {
    ...minimalDef('tls.one'),
    name: 'Block One',
  }
  const def2 = {
    ...minimalDef('tls.two'),
    name: 'Block Two',
  }

  it('returns one component per registered definition', () => {
    const definitions = [def1, def2]
    const components = createBlockComponents(definitions)

    expect(Object.keys(components)).toHaveLength(2)
    expect(components['tls.one']).toBeDefined()
    expect(components['tls.two']).toBeDefined()
  })

  it('returns one component per entry when given a BlockRegistry', () => {
    const registry = new BlockRegistry()
    registry.register(def1)
    registry.register(def2)

    const components = createBlockComponents(registry)

    expect(Object.keys(components)).toHaveLength(2)
    expect(components['tls.one']).toBeDefined()
    expect(components['tls.two']).toBeDefined()
  })

  it('creates valid React components that render', () => {
    const components = createBlockComponents([def1])
    const Component = components['tls.one']

    expect(Component).toBeDefined()
    expect(typeof Component).toBe('function')

    // Test that it's a valid React component by checking it can be called
    const result = Component({})
    expect(result).toBeDefined()
    // It should return a React element
    expect(result?.type).toBeDefined()
  })
})
