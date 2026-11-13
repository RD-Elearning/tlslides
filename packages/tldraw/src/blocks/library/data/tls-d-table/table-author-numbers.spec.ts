/**
 * Sprint 2026-11c S18-h (T28, D61): a number column draws the author's strings as written. "." and "," mean
 * opposite things in Vietnamese and English; the table used to read every string as English and re-format it
 * (coffee deck b0108f26 s4: "1.086" tấn -> 1,09, "2,70" tấn/ha -> 270, "68.500" đ/kg -> 68,5).
 */

import { tlsDTable } from './index'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { textsOf } from '../_chart/chart-test'

const SZ = { width: 1200, height: 520 }
const lay = (props: Record<string, unknown>, locale: string) => {
  const ctx = makeCtx(SZ, makeRegistry())
  ;(ctx.tokens as any).locale = locale
  return tlsDTable.layout({ ...(tlsDTable.defaults as any), ...props } as any, ctx)
}
const columns = [{ label: 'Vụ' }, { label: 'Sản lượng', kind: 'number' }, { label: 'Năng suất', kind: 'number' }, { label: 'Giá', kind: 'number' }, { label: 'Chín', kind: 'number' }]
const rows = [
  ['2023–2024', '1.086', '2,70', '68.500', '71%'],
  ['2024–2025', '1.189', '2,90', '112.000', '76%'],
  ['2025–2026', '52.000', '31,8%', '118.400', '79%'],
]

describe('tls.d.table — author numbers', () => {
  for (const locale of ['vi', 'en']) {
    it(`draws Vietnamese-formatted strings exactly as written (${locale})`, () => {
      const texts = textsOf(lay({ columns, rows, header: 'none', showFooter: false }, locale))
      for (const s of ['1.086', '2,70', '68.500', '1.189', '2,90', '112.000', '52.000', '31,8%', '118.400', '71%']) expect(texts).toContain(s)
      for (const bad of ['1,09', '270', '68,5', '68.5', '52', '1.09']) expect(texts).not.toContain(bad)
    })
  }

  it('English-formatted strings stay as written too', () => {
    const texts = textsOf(lay({ columns: columns.slice(0, 3), rows: [['a', '1,086', '2.70'], ['b', '12,500.5', '$9']], header: 'none', showFooter: false }, 'en'))
    for (const s of ['1,086', '2.70', '12,500.5', '$9']) expect(texts).toContain(s)
  })

  it('JSON numbers and bare digit strings are still formatted in the deck language', () => {
    const texts = textsOf(lay({ columns: columns.slice(0, 3), rows: [['a', 1234567, '2500']], header: 'none', showFooter: false }, 'vi'))
    expect(texts).toContain('1.234.567')
    expect(texts).toContain('2.500')
  })
})
