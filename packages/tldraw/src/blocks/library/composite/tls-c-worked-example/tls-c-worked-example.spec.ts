/** tls.c.worked-example — spro sprint 2026-11b S08 (the shared wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCWorkedExample } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCWorkedExample, build: richBuilder(tlsCWorkedExample), category: 'learning', scope: 'slide',
  overflow: { problem: S(261) },
  variants: { slot: 'variant', values: ['numbered', 'two-column', 'ledger'] },
  long: { problem: S(260), formula: 'n = 2^{h+1} - 1', steps: [0, 1, 2, 3, 4, 5].map((i) => ({ text: S(140, i), formula: 'x_1 = 2^3', why: S(120, i) })), result: S(140), check: S(120) },
  parts: ['item', 'result'],
})
