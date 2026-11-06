/** tls.c.glossary — spro sprint 2026-11b S08 (the shared wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCGlossary } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCGlossary, build: richBuilder(tlsCGlossary), category: 'learning', scope: 'slide',
  overflow: { terms: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ term: 't' + i, definition: 'd' })) },
  variants: { slot: 'variant', values: ['two-column', 'cards', 'index'] },
  long: { terms: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ term: S(40, i), definition: S(170, i) })) },
  parts: ['item'],
})
