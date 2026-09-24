/**
 * Tests for BlockInspector components.
 * B6 implementation (R12).
 */

import { renderFieldForSpec } from './fields/FieldControls'
import { COLOR_ROLES } from './fields/ThemeColorPicker'
import { parsePropPath, setAtPath, getAtPath } from '../../blocks/prop-path'
import type { SlotSpec } from '../../blocks/types'

describe('COLOR_ROLES', () => {
  it('includes the canonical 12 roles', () => {
    expect(COLOR_ROLES).toEqual([
      'surface',
      'surfaceAlt',
      'accent',
      'accent2',
      'text',
      'textMuted',
      'positive',
      'negative',
      'warning',
      'neutral',
      'line',
      'scrim',
    ])
  })
})

describe('parsePropPath', () => {
  it('splits simple paths', () => {
    expect(parsePropPath('text')).toEqual(['text'])
  })

  it('splits dotted paths', () => {
    expect(parsePropPath('items.2.text')).toEqual(['items', 2, 'text'])
  })

  it('handles numeric indices', () => {
    expect(parsePropPath('cells.0.title')).toEqual(['cells', 0, 'title'])
  })
})

describe('setAtPath', () => {
  it('sets a top-level key', () => {
    const result = setAtPath({ a: 1, b: 2 }, 'a', 99)
    expect(result).toEqual({ a: 99, b: 2 })
  })

  it('does not mutate the original object', () => {
    const original = { a: 1, b: 2 }
    const result = setAtPath(original, 'a', 99)
    expect(original.a).toBe(1)
    expect(result).not.toBe(original)
  })

  it('sets a nested path', () => {
    const result = setAtPath({ items: [{ text: 'old' }] }, 'items.0.text', 'new')
    expect(result).toEqual({ items: [{ text: 'new' }] })
  })

  it('creates intermediate objects when missing', () => {
    const result = setAtPath({}, 'a.b.c', 42)
    expect(result).toEqual({ a: { b: { c: 42 } } })
  })

  it('sets array index via numeric path', () => {
    const result = setAtPath({ items: ['x', 'y', 'z'] }, 'items.1', 'NEW')
    expect(result).toEqual({ items: ['x', 'NEW', 'z'] })
  })
})

describe('getAtPath', () => {
  it('gets a top-level key', () => {
    expect(getAtPath({ a: 1, b: 2 }, 'a')).toBe(1)
  })

  it('returns undefined for missing paths', () => {
    expect(getAtPath({ a: 1 }, 'b')).toBeUndefined()
  })

  it('gets a nested path', () => {
    expect(getAtPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42)
  })

  it('returns undefined for missing nested paths', () => {
    expect(getAtPath({ a: { b: 1 } }, 'a.c')).toBeUndefined()
  })
})

describe('renderFieldForSpec', () => {
  it('renders a text field', () => {
    const spec: SlotSpec = {
      type: { kind: 'text' },
      role: 'content',
      label: 'Title',
    }
    const result = renderFieldForSpec(spec, 'hello', 'title', () => {})
    expect(result).toBeTruthy()
  })

  it('renders a boolean field', () => {
    const spec: SlotSpec = {
      type: { kind: 'boolean' },
      role: 'option',
      label: 'Visible',
    }
    const result = renderFieldForSpec(spec, true, 'visible', () => {})
    expect(result).toBeTruthy()
  })

  it('renders a number field', () => {
    const spec: SlotSpec = {
      type: { kind: 'number', min: 0, max: 100 },
      role: 'content',
      label: 'Count',
    }
    const result = renderFieldForSpec(spec, 50, 'count', () => {})
    expect(result).toBeTruthy()
  })

  it('renders an enum field', () => {
    const spec: SlotSpec = {
      type: { kind: 'enum', values: ['a', 'b', 'c'] },
      role: 'option',
      label: 'Mode',
    }
    const result = renderFieldForSpec(spec, 'a', 'mode', () => {})
    expect(result).toBeTruthy()
  })

  it('renders a color field', () => {
    const spec: SlotSpec = {
      type: { kind: 'color' },
      role: 'option',
      label: 'Background',
    }
    const result = renderFieldForSpec(spec, 'accent', 'bg', () => {})
    expect(result).toBeTruthy()
  })

  it('renders an icon field', () => {
    const spec: SlotSpec = {
      type: { kind: 'icon' },
      role: 'option',
      label: 'Icon',
    }
    const result = renderFieldForSpec(spec, ['check'], 'icon', () => {})
    expect(result).toBeTruthy()
  })

  it('renders a blocks field (read-only summary)', () => {
    const spec: SlotSpec = {
      type: { kind: 'blocks' },
      role: 'content',
      label: 'Children',
    }
    const result = renderFieldForSpec(spec, [], 'children', () => {})
    expect(result).toBeTruthy()
  })

  it('derives name from path', () => {
    const spec: SlotSpec = {
      type: { kind: 'text' },
      role: 'content',
      label: 'Label',
    }
    // The path is used to derive a name for the field — it should not crash
    const result = renderFieldForSpec(spec, undefined, 'items.0.label', () => {})
    expect(result).toBeTruthy()
  })

  it('renders unknown kind as null', () => {
    const spec = {
      type: { kind: 'unknown' as never },
      role: 'content' as const,
      label: 'Unknown',
    }
    const result = renderFieldForSpec(spec, undefined, 'unknown', () => {})
    expect(result).toBeNull()
  })
})
