import { blockToShape, shapeToBlock, BLOCK_PROP_KEY } from './shape-bridge'
import { ColorStyle, TDShapeType } from '~types'
import { defaultStyle } from '~state/shapes/shared'
import type { BlockSpec, Box } from './types'

describe('blockToShape and shapeToBlock', () => {
  const testBox: Box = { x: 100, y: 200, width: 400, height: 300 }

  const complexSpec: BlockSpec = {
    type: 'tls.test.complex',
    id: 'block-1',
    props: {
      title: 'Test Title',
      value: 42,
      nested: { deep: { value: 'nested data' } },
      array: [1, 2, 3],
    },
    style: {
      surface: 'accent',
      accent: 'accent2',
      tone: 'filled',
      padding: 24,
      gap: 16,
    },
    motion: {
      order: 2,
      preset: 'fade-up',
      duration: 500,
      delay: 100,
      parts: {
        title: { preset: 'count-up' },
      },
    },
    children: [
      {
        type: 'tls.nested.child',
        props: { label: 'Child' },
      },
    ],
    slot: 'content',
  }

  describe('blockToShape round-trip', () => {
    it('converts a BlockSpec to a ComponentShape and back losslessly', () => {
      const shape = blockToShape(complexSpec, testBox)
      const recovered = shapeToBlock(shape)

      expect(recovered).toEqual(complexSpec)
    })

    it('survives JSON serialization round-trip', () => {
      const shape = blockToShape(complexSpec, testBox)
      const serialized = JSON.stringify(shape)
      const deserialized = JSON.parse(serialized)
      const recovered = shapeToBlock(deserialized)

      expect(recovered).toEqual(complexSpec)
    })

    it('produces a ComponentShape with correct type and componentId', () => {
      const shape = blockToShape(complexSpec, testBox)

      expect(shape.type).toBe(TDShapeType.Component)
      expect(shape.componentId).toBe('tls.test.complex')
    })

    it('sets the shape point and size from the box', () => {
      const shape = blockToShape(complexSpec, testBox)

      expect(shape.point).toEqual([testBox.x, testBox.y])
      expect(shape.size).toEqual([testBox.width, testBox.height])
    })

    it('copies slot from spec to shape', () => {
      const shape = blockToShape(complexSpec, testBox)
      expect(shape.slot).toBe('content')
    })

    it('creates animation from motion.order and motion.preset', () => {
      const shape = blockToShape(complexSpec, testBox)

      expect(shape.animation).toBeDefined()
      expect(shape.animation?.order).toBe(2)
      expect(shape.animation?.durationMs).toBe(500)
      expect(shape.animation?.delayMs).toBe(100)
    })

    it('does not create animation when motion is absent', () => {
      const specNoMotion: BlockSpec = {
        type: 'tls.test.no-motion',
        props: { label: 'No motion' },
      }

      const shape = blockToShape(specNoMotion, testBox)
      expect(shape.animation).toBeUndefined()
    })

    it('does not create animation when motion has no order or preset', () => {
      const specEmptyMotion: BlockSpec = {
        type: 'tls.test.empty-motion',
        props: { label: 'Empty motion' },
        motion: { duration: 500 },
      }

      const shape = blockToShape(specEmptyMotion, testBox)
      expect(shape.animation).toBeUndefined()
    })
  })

  describe('deep cloning, not aliasing', () => {
    // Regression: `style: defaultStyle` handed every shape the same module-level singleton, so a
    // single `shape.style.color = ...` restyled every block in the process and corrupted the
    // shared default. `toEqual` passes while aliasing — only `not.toBe` catches it. Same bug
    // class as DEFAULT_SLIDE_SIZE in Phase 3.
    it('does not alias the module-level defaultStyle', () => {
      const a = blockToShape(complexSpec, testBox)
      const b = blockToShape(complexSpec, testBox)

      expect(a.style).not.toBe(defaultStyle)
      expect(a.style).toEqual(defaultStyle)
      expect(a.style).not.toBe(b.style)

      a.style.color = ColorStyle.Red
      expect(b.style.color).not.toBe(ColorStyle.Red)
      expect(defaultStyle.color).not.toBe(ColorStyle.Red)
    })

    it('does not alias nested objects or arrays in blockToShape', () => {
      const shape1 = blockToShape(complexSpec, testBox)
      const shape2 = blockToShape(complexSpec, testBox)

      const meta1 = shape1.props[BLOCK_PROP_KEY] as any
      const meta2 = shape2.props[BLOCK_PROP_KEY] as any

      // Should have the same structure
      expect(meta1).toEqual(meta2)

      // But not be the same object (no aliasing)
      expect(meta1).not.toBe(meta2)
      expect(meta1.style).not.toBe(meta2.style)
      expect(meta1.motion).not.toBe(meta2.motion)
      expect(meta1.children).not.toBe(meta2.children)
    })

    it('mutating one shape does not affect another', () => {
      const shape1 = blockToShape(complexSpec, testBox)
      const shape2 = blockToShape(complexSpec, testBox)

      const meta1 = shape1.props[BLOCK_PROP_KEY] as any
      meta1.style.padding = 9999

      const meta2 = shape2.props[BLOCK_PROP_KEY] as any
      expect(meta2.style.padding).not.toBe(9999)
    })

    it('mutating the original spec does not affect the shape', () => {
      const original = JSON.parse(JSON.stringify(complexSpec))
      const shape = blockToShape(original, testBox)

      original.props.title = 'MUTATED'

      const recovered = shapeToBlock(shape)
      expect(recovered?.props.title).toBe('Test Title')
    })
  })

  describe('block metadata under $block key', () => {
    it('stores props.id, style, motion, children under $block', () => {
      const shape = blockToShape(complexSpec, testBox)
      const metadata = shape.props[BLOCK_PROP_KEY]

      expect(metadata).toBeDefined()
      expect((metadata as any).id).toBe('block-1')
      expect((metadata as any).style).toBeDefined()
      expect((metadata as any).motion).toBeDefined()
      expect((metadata as any).children).toBeDefined()
    })

    it('spreads content props at the top level', () => {
      const shape = blockToShape(complexSpec, testBox)

      expect(shape.props.title).toBe('Test Title')
      expect(shape.props.value).toBe(42)
      expect(shape.props.nested).toEqual({ deep: { value: 'nested data' } })
      expect(shape.props.array).toEqual([1, 2, 3])
    })

    it('does not include $block in recovered props', () => {
      const shape = blockToShape(complexSpec, testBox)
      const recovered = shapeToBlock(shape)

      expect(recovered?.props[BLOCK_PROP_KEY]).toBeUndefined()
      expect(Object.keys(recovered!.props).includes('$block')).toBe(false)
    })
  })

  describe('optional fields', () => {
    it('handles BlockSpec with no optional fields', () => {
      const minimalSpec: BlockSpec = {
        type: 'tls.minimal',
        props: { label: 'Minimal' },
      }

      const shape = blockToShape(minimalSpec, testBox)
      const recovered = shapeToBlock(shape)

      expect(recovered?.id).toBeUndefined()
      expect(recovered?.style).toBeUndefined()
      expect(recovered?.motion).toBeUndefined()
      expect(recovered?.children).toBeUndefined()
      expect(recovered?.slot).toBeUndefined()
    })

    it('includes optional fields when present', () => {
      const shape = blockToShape(complexSpec, testBox)
      const recovered = shapeToBlock(shape)

      expect(recovered?.id).toBe('block-1')
      expect(recovered?.style).toBeDefined()
      expect(recovered?.motion).toBeDefined()
      expect(recovered?.children).toBeDefined()
      expect(recovered?.slot).toBe('content')
    })
  })

  describe('shapeToBlock with non-block shapes', () => {
    it('returns undefined when there is no $block metadata', () => {
      const shape: any = {
        type: 'rectangle',
        props: { color: 'red' },
      }

      expect(shapeToBlock(shape)).toBeUndefined()
    })

    it('returns undefined when $block is not an object', () => {
      const shape: any = {
        type: 'component',
        props: { [BLOCK_PROP_KEY]: 'not-an-object' },
      }

      expect(shapeToBlock(shape)).toBeUndefined()
    })

    it('returns undefined when $block is null', () => {
      const shape: any = {
        type: 'component',
        props: { [BLOCK_PROP_KEY]: null },
      }

      expect(shapeToBlock(shape)).toBeUndefined()
    })
  })

  describe('motion without animation', () => {
    it('includes motion in the recovered spec even if animation is not created', () => {
      const specWithMotionButNoOrder: BlockSpec = {
        type: 'tls.motion-no-order',
        props: {},
        motion: { duration: 300, ease: 'ease-in-out' },
      }

      const shape = blockToShape(specWithMotionButNoOrder, testBox)
      const recovered = shapeToBlock(shape)

      expect(recovered?.motion).toEqual({
        duration: 300,
        ease: 'ease-in-out',
      })
      expect(shape.animation).toBeUndefined()
    })
  })

  describe('nested children', () => {
    it('deeply clones nested children', () => {
      const specWithNesting: BlockSpec = {
        type: 'tls.parent',
        props: {},
        children: [
          {
            type: 'tls.child1',
            props: { data: [1, 2, 3] },
            children: [
              {
                type: 'tls.grandchild',
                props: { value: 'nested' },
              },
            ],
          },
        ],
      }

      const shape1 = blockToShape(specWithNesting, testBox)
      const shape2 = blockToShape(specWithNesting, testBox)

      const meta1 = shape1.props[BLOCK_PROP_KEY] as any
      const meta2 = shape2.props[BLOCK_PROP_KEY] as any

      expect(meta1.children).toEqual(meta2.children)
      expect(meta1.children).not.toBe(meta2.children)
      expect(meta1.children[0]).not.toBe(meta2.children[0])
    })
  })

  describe('id generation and options (P0 regression)', () => {
    it('generates different ids for each blockToShape call', () => {
      const spec = { type: 'tls.test', props: {} }
      const shape1 = blockToShape(spec, testBox)
      const shape2 = blockToShape(spec, testBox)

      // Different ids are critical — without this, insertContent maps both to the same entry
      expect(shape1.id).not.toBe(shape2.id)
      expect(shape1.id).toBeTruthy()
      expect(shape2.id).toBeTruthy()
    })

    it('honours an explicit opts.id', () => {
      const spec = { type: 'tls.test', props: {} }
      const customId = 'my-custom-id-12345'
      const shape = blockToShape(spec, testBox, { id: customId })

      expect(shape.id).toBe(customId)
    })

    it('defaults parentId to "page"', () => {
      const spec = { type: 'tls.test', props: {} }
      const shape = blockToShape(spec, testBox)

      expect(shape.parentId).toBe('page')
    })

    it('honours an explicit opts.parentId', () => {
      const spec = { type: 'tls.test', props: {} }
      const shape = blockToShape(spec, testBox, { parentId: 'page-custom' })

      expect(shape.parentId).toBe('page-custom')
    })

    it('defaults childIndex to 1', () => {
      const spec = { type: 'tls.test', props: {} }
      const shape = blockToShape(spec, testBox)

      expect(shape.childIndex).toBe(1)
    })

    it('honours an explicit opts.childIndex', () => {
      const spec = { type: 'tls.test', props: {} }
      const shape = blockToShape(spec, testBox, { childIndex: 5 })

      expect(shape.childIndex).toBe(5)
    })
  })

  describe('reserved props validation (P3)', () => {
    it('throws if spec.props contains a $block key', () => {
      const specWithReservedKey: BlockSpec = {
        type: 'tls.bad',
        props: { label: 'Safe', $block: 'THIS_IS_RESERVED' },
      }

      expect(() => {
        blockToShape(specWithReservedKey, testBox)
      }).toThrow(/\$block/)
      expect(() => {
        blockToShape(specWithReservedKey, testBox)
      }).toThrow(/reserved/)
    })
  })

  describe('shape type guard in shapeToBlock (P3)', () => {
    it('returns undefined for non-ComponentShape types', () => {
      const rectangleShape: any = {
        type: 'rectangle',
        props: { [BLOCK_PROP_KEY]: { motion: {} } },
      }

      expect(shapeToBlock(rectangleShape)).toBeUndefined()
    })

    it('returns undefined for unknown shape types', () => {
      const unknownShape: any = {
        type: 'unknown.type',
        props: { [BLOCK_PROP_KEY]: { motion: {} } },
      }

      expect(shapeToBlock(unknownShape)).toBeUndefined()
    })
  })

  describe('JSON round-trip deep clone behavior (P3 note)', () => {
    it('documents that undefined props are dropped by JSON round-trip', () => {
      // This is intentional: JSON.stringify drops undefined values.
      // The repo's Utils.deepMerge treats explicit undefined as "clear this field",
      // but for serializable block props this is acceptable.
      const specWithUndefined: BlockSpec = {
        type: 'tls.test',
        props: { defined: 'value', undefined: undefined },
      }

      const shape = blockToShape(specWithUndefined, testBox)
      const recovered = shapeToBlock(shape)

      // The undefined prop is dropped (JSON round-trip behaviour)
      expect(recovered?.props.defined).toBe('value')
      expect('undefined' in recovered!.props).toBe(false)
    })
  })
})
