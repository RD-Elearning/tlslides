import { applyListMarkers } from './textList'

describe('applyListMarkers', () => {
  it('passes text through unchanged when no list style is set', () => {
    expect(applyListMarkers('one\ntwo', undefined)).toBe('one\ntwo')
  })

  it('prefixes every line with a bullet', () => {
    expect(applyListMarkers('one\ntwo\nthree', 'bullet')).toBe('•  one\n•  two\n•  three')
  })

  it('prefixes every line with an incrementing number', () => {
    expect(applyListMarkers('one\ntwo\nthree', 'number')).toBe('1.  one\n2.  two\n3.  three')
  })

  it('marks a blank line too, rather than special-casing it', () => {
    expect(applyListMarkers('one\n\ntwo', 'bullet')).toBe('•  one\n•  \n•  two')
    expect(applyListMarkers('one\n\ntwo', 'number')).toBe('1.  one\n2.  \n3.  two')
  })

  it('works on a single line with no newline at all', () => {
    expect(applyListMarkers('solo', 'bullet')).toBe('•  solo')
    expect(applyListMarkers('solo', 'number')).toBe('1.  solo')
  })
})
