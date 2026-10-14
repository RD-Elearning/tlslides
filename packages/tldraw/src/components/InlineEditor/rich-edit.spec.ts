import { fromEdited, toEditable } from './rich-edit'

describe('rich-edit', () => {
  it('strings round-trip unchanged', () => {
    expect(toEditable('Hello')).toBe('Hello')
    expect(fromEdited('Hello', 'Bye')).toBe('Bye')
  })
  it('bold runs become **…** and come back as bold runs', () => {
    const v = { runs: [{ text: 'Revenue ' }, { text: '+12%', bold: true }] }
    expect(toEditable(v)).toBe('Revenue **+12%**')
    expect(fromEdited(v, 'Revenue **+15%** now')).toEqual({
      runs: [{ text: 'Revenue ' }, { text: '+15%', bold: true }, { text: ' now' }],
    })
  })
  it('runs with italic, colour or size are not editable inline', () => {
    expect(toEditable({ runs: [{ text: 'a', italic: true }] })).toBeNull()
    expect(toEditable({ runs: [{ text: 'a', color: 'accent' }] })).toBeNull()
    expect(toEditable({ runs: [{ text: 'a', size: 1.2 }] })).toBeNull()
  })
  it('a missing value edits as empty text; other shapes are not editable', () => {
    expect(toEditable(undefined)).toBe('')
    expect(toEditable({ foo: 1 })).toBeNull()
  })
})
