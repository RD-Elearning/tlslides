/** tls.c.number-grid — spro sprint 2026-11b S09 (wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCNumberGrid } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCNumberGrid, build: richBuilder(tlsCNumberGrid), category: 'metric', scope: 'slide',
  overflow: { stats: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ value: String(i), label: 'a' })) },
  variants: { slot: 'variant', values: ['tiles', 'strip', 'rows'] },
  long: { stats: [0, 1, 2, 3, 4, 5].map((i) => ({ value: '1.240,5', unit: 'triệu', label: S(40, i), text: S(110, i) })) },
  parts: ['value', 'item'],
})

describe('spro c10: text past its cap is cut at a word break, with an ellipsis', () => {
  const { clip } = jest.requireActual('../_rich-block') as typeof import('../_rich-block')
  it('lumo s11: never mid-word', () => {
    const line = 'Approve $6M: $3.5M for the lending pilot (loan book and risk models) and $2.5M for the Indonesia licence and local entity. Both start in Q4.'
    const out = clip(line, 110)
    expect(out.length).toBeLessThanOrEqual(110)
    expect(out.endsWith('…')).toBe(true)
    expect(out).toBe('Approve $6M: $3.5M for the lending pilot (loan book and risk models) and $2.5M for the Indonesia licence and…')
  })
  it('a text within its cap is untouched; one long word is still cut', () => {
    expect(clip('Ngắn gọn.', 110)).toBe('Ngắn gọn.')
    expect(clip('x'.repeat(20), 10)).toBe('x'.repeat(9) + '…')
  })
})
