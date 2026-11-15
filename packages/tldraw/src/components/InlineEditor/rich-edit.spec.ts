import { normalizeRuns, plainText, runsOf, toggleBold, valueFromRuns, isEditableValue } from './rich-edit'

describe('rich-edit (editor E03)', () => {
  it('a string slot reads **bold** as a bold run and writes it back with markers', () => {
    const runs = runsOf('Revenue **+12%** now')!
    expect(runs).toEqual([{ text: 'Revenue ' }, { text: '+12%', bold: true }, { text: ' now' }])
    expect(plainText(runs)).toBe('Revenue +12% now')
    expect(valueFromRuns('x', runs)).toBe('Revenue **+12%** now')
  })
  it('a rich slot keeps italic, colour and size runs', () => {
    const v = { runs: [{ text: 'a', italic: true }, { text: 'b', color: 'accent', size: 1.2 }] }
    const runs = runsOf(v)!
    expect(valueFromRuns(v, runs)).toEqual(v)
  })
  it('empty and non-text values', () => {
    expect(runsOf(undefined)).toEqual([])
    expect(runsOf({ foo: 1 })).toBeNull()
    expect(isEditableValue(3)).toBe(false)
  })
  it('normalizeRuns merges equal neighbours and drops empties', () => {
    expect(normalizeRuns([{ text: 'a' }, { text: '' }, { text: 'b' }, { text: 'c', bold: true }])).toEqual([
      { text: 'ab' },
      { text: 'c', bold: true },
    ])
  })
  it('toggleBold bolds a range, and unbolds it when it is all bold', () => {
    const on = toggleBold([{ text: 'Hello world' }], 6, 11)
    expect(on).toEqual([{ text: 'Hello ' }, { text: 'world', bold: true }])
    expect(toggleBold(on, 6, 11)).toEqual([{ text: 'Hello world' }])
    expect(toggleBold(on, 3, 8)).toEqual([{ text: 'Hel' }, { text: 'lo world', bold: true }])
  })
})
