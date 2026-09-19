import { setAtPath, getAtPath, parsePropPath } from './prop-path'

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
})
