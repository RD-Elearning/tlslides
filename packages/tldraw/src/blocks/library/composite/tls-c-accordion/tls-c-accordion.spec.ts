/** tls.c.accordion — spro sprint 2026-11b S10 (wave-1 suite on the static form at the slot maxima, Vietnamese text). */
import { tlsCAccordion } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCAccordion, build: richBuilder(tlsCAccordion), category: 'learning', scope: 'slide',
  overflow: { items: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ head: 'h' + i, text: 't' })) },
  variants: undefined,
  long: { items: [0, 1, 2, 3, 4, 5].map((i) => ({ head: S(70, i), text: S(240, i) })) },
  parts: ['item'],
})
