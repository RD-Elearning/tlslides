/** tls.c.step-through — spro sprint 2026-11b S10 (wave-1 suite on the static form at the slot maxima, Vietnamese text). */
import { tlsCStepThrough } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCStepThrough, build: richBuilder(tlsCStepThrough), category: 'learning', scope: 'slide',
  overflow: { steps: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ title: 'h' + i, text: 't' })) },
  variants: undefined,
  long: { steps: [0, 1, 2, 3, 4, 5].map((i) => ({ title: S(50, i), text: S(200, i) })) },
  parts: ['item'],
})
