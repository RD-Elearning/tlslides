import { formatValue, localizeNumber } from './format-value'
import { formatValue as bigStat } from '../../composite/tls-c-big-stat/schema'
import { fmtNum, fmtSigned } from '../_chart/kit'

describe('number formatting by deck locale', () => {
  it('English stays as it was, compact without a trailing .0', () => {
    expect(formatValue(620e9, 'compact')).toBe('620B')
    expect(formatValue(4.2e6, 'compact')).toBe('4.2M')
    expect(formatValue(12.4, 'percent')).toBe('12.4%')
    expect(formatValue(1240, 'currency')).toBe('$1,240')
  })
  it('Vietnamese: decimal comma, dot thousands, scales as words', () => {
    expect(formatValue(620e9, 'compact', { locale: 'vi' })).toBe('620 tỷ')
    expect(formatValue(4.2e6, 'compact', { locale: 'vi' })).toBe('4,2 triệu')
    expect(formatValue(1500, 'compact', { locale: 'vi' })).toBe('1,5 nghìn')
    expect(formatValue(12.4, 'percent', { locale: 'vi' })).toBe('12,4%')
    expect(formatValue(1240, 'currency', { locale: 'vi', currency: '₫' })).toBe('₫1.240')
    expect(localizeNumber('1,240.5 units', 'vi-VN')).toBe('1.240,5 units')
  })
  it('chart axes and big stats follow the same rule', () => {
    expect(fmtNum(2500000, 'compact', 'vi')).toBe('2,5 triệu')
    expect(fmtSigned(-3.5, 'percent', 'vi')).toBe('-3,5%')
    expect(bigStat({ value: 0.124, format: 'percent' } as never, 'vi')).toBe('12,4%')
  })
  it('a big stat in plain format keeps its zeros (300 was shown as "3")', () => {
    expect(bigStat({ value: 300, format: 'plain' } as never)).toBe('300')
    expect(bigStat({ value: 120000, format: 'plain' } as never)).toBe('120000')
    expect(bigStat({ value: 2.5, format: 'plain' } as never)).toBe('2.5')
  })
})
