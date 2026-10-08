/**
 * Tests for lists.ts — list rendering with markers, indent levels, and formatting.
 */

import { renderList } from './lists'
import type { ListOpts } from './lists'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Tests                                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('renderList', () => {
  it('returns empty runs for an empty items array', () => {
    const result = renderList([])
    expect(result.runs).toEqual([])
  })

  it('renders dot markers by default', () => {
    const result = renderList(['Apple', 'Banana', 'Cherry'])
    const text = result.runs.map((r) => r.text).join('')
    expect(text).toContain('\u2022') // •
    expect(text).toContain('Apple')
    expect(text).toContain('Banana')
    expect(text).toContain('Cherry')
  })

  it('renders dash markers', () => {
    const result = renderList(['One', 'Two'], { marker: 'dash' })
    const text = result.runs.map((r) => r.text).join('')
    expect(text).toContain('\u2013') // –
    expect(text).toContain('One')
    expect(text).toContain('Two')
  })

  it('renders chevron markers', () => {
    const result = renderList(['X', 'Y'], { marker: 'chevron' })
    const text = result.runs.map((r) => r.text).join('')
    expect(text).toContain('\u203A') // ›
  })

  it('renders numbered markers starting at 1', () => {
    const result = renderList(['First', 'Second', 'Third'], { marker: 'number' })
    const text = result.runs.map((r) => r.text).join('')
    expect(text).toContain('1.')
    expect(text).toContain('2.')
    expect(text).toContain('3.')
    expect(text).toContain('First')
    expect(text).toContain('Second')
    expect(text).toContain('Third')
  })

  it('renders numbered markers with custom start', () => {
    const result = renderList(['A', 'B'], { marker: 'number', start: 5 })
    const text = result.runs.map((r) => r.text).join('')
    expect(text).toContain('5.')
    expect(text).toContain('6.')
  })

  it('renders icon markers', () => {
    const result = renderList(['Item'], { marker: 'icon', icon: '★' })
    const text = result.runs.map((r) => r.text).join('')
    expect(text).toContain('★')
  })

  it('uses default icon "→" when none provided', () => {
    const result = renderList(['Item'], { marker: 'icon' })
    const text = result.runs.map((r) => r.text).join('')
    expect(text).toContain('→')
  })

  it('adds indent padding with non-breaking spaces', () => {
    const result0 = renderList(['Item'], { indent: 0 })
    const result1 = renderList(['Item'], { indent: 1 })
    const result2 = renderList(['Item'], { indent: 2 })

    const text0 = result0.runs.map((r) => r.text).join('')
    const text1 = result1.runs.map((r) => r.text).join('')
    const text2 = result2.runs.map((r) => r.text).join('')

    // More indentation = more NBSP characters at the start.
    const nbspCount0 = (text0.match(/\u00A0/g) ?? []).length
    const nbspCount1 = (text1.match(/\u00A0/g) ?? []).length
    const nbspCount2 = (text2.match(/\u00A0/g) ?? []).length

    expect(nbspCount1).toBeGreaterThan(nbspCount0)
    expect(nbspCount2).toBeGreaterThan(nbspCount1)
  })

  it('separates items with newlines in runs', () => {
    const result = renderList(['A', 'B', 'C'])
    // Expect runs: ['A text', '\n', 'B text', '\n', 'C text']
    const newlines = result.runs.filter((r) => r.text === '\n')
    expect(newlines).toHaveLength(2) // n-1 newlines for n items
  })

  it('does not add trailing newline after last item', () => {
    const result = renderList(['Only'])
    const lastRun = result.runs[result.runs.length - 1]
    expect(lastRun.text).not.toBe('\n')
    expect(lastRun.text).toContain('Only')
  })

  it('produces valid RichText structure', () => {
    const result = renderList(['Test'])
    expect(result).toHaveProperty('runs')
    expect(Array.isArray(result.runs)).toBe(true)
    expect(result.runs.length).toBeGreaterThanOrEqual(1)
    for (const run of result.runs) {
      expect(typeof run.text).toBe('string')
    }
  })

  it('handles single item', () => {
    const result = renderList(['Solo'])
    const text = result.runs.map((r) => r.text).join('')
    expect(text).toContain('Solo')
    const newlines = result.runs.filter((r) => r.text === '\n')
    expect(newlines).toHaveLength(0)
  })

  it('clamps indent level beyond array length', () => {
    // Indent 100 should clamp to the max padding.
    const result = renderList(['Item'], { indent: 100 })
    const resultMax = renderList(['Item'], { indent: 8 })
    const text = result.runs.map((r) => r.text).join('')
    const textMax = resultMax.runs.map((r) => r.text).join('')
    // Both should have the same NBSP count (clamped to max).
    const nbspCount = (text.match(/\u00A0/g) ?? []).length
    const nbspCountMax = (textMax.match(/\u00A0/g) ?? []).length
    expect(nbspCount).toBe(nbspCountMax)
  })

  it('supports all marker types without error', () => {
    const markers: Array<ListOpts['marker']> = ['dot', 'dash', 'chevron', 'number', 'icon']
    for (const marker of markers) {
      expect(() => renderList(['Item'], { marker })).not.toThrow()
    }
  })
})
