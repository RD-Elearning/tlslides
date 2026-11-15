import { setAtPath, getAtPath, parsePropPath, hasPath } from './prop-path'

describe('prop-path', () => {
  it('setAtPath sets a value at top-level path', () => {
    const obj = { text: 'hello' }
    const result = setAtPath(obj, 'text', 'world')
    expect(result.text).toBe('world')
  })

  it('setAtPath sets a value at nested path', () => {
    const obj = { items: [{ text: 'hello' }] }
    const result = setAtPath(obj, 'items.0.text', 'world') as { items: Array<{ text: string }> }
    expect(result.items[0].text).toBe('world')
  })

  it('setAtPath does not mutate the input object (undo safety)', () => {
    const obj = { items: [{ text: 'hello' }] }
    setAtPath(obj, 'items.0.text', 'world')
    expect(obj.items[0].text).toBe('hello')
  })

  it('parsePropPath parses dot-separated paths', () => {
    expect(parsePropPath('text')).toEqual(['text'])
    expect(parsePropPath('items.0.text')).toEqual(['items', 0, 'text'])
  })

  it('hasPath: present, empty, missing, out of range', () => {
    const p = { title: '', items: [{ text: 'a' }], meta: null }
    expect(hasPath(p, 'title')).toBe(true)
    expect(hasPath(p, 'meta')).toBe(true)
    expect(hasPath(p, 'items.0.text')).toBe(true)
    expect(hasPath(p, 'text')).toBe(false)
    expect(hasPath(p, 'items.1.text')).toBe(false)
    expect(hasPath(p, 'items.0.missing')).toBe(false)
    expect(hasPath(p, 'meta.x')).toBe(false)
    expect(hasPath(p, '')).toBe(false)
  })
})
