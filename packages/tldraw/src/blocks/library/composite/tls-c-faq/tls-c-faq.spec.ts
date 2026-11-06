/** tls.c.faq — spro sprint 2026-11b S08 (the shared wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCFaq } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCFaq, build: richBuilder(tlsCFaq), category: 'text', scope: 'slide',
  overflow: { pairs: [0, 1, 2, 3, 4, 5].map((i) => ({ q: 'q' + i, a: 'a' })) },
  variants: { slot: 'variant', values: ['list', 'grid', 'bubbles'] },
  long: { pairs: [0, 1, 2, 3, 4].map((i) => ({ q: S(110, i), a: S(260, i) })) },
  parts: ['item'],
})
