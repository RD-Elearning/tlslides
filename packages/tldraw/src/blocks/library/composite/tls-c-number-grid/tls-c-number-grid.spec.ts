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
