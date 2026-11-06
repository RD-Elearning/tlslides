/** tls.c.closing-recap — spro sprint 2026-11b S09 (wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCClosingRecap } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCClosingRecap, build: richBuilder(tlsCClosingRecap), category: 'closing', scope: 'slide',
  overflow: { takeaways: ['a', 'b', 'c', 'd'] },
  variants: { slot: 'variant', values: ['columns', 'stack'] },
  long: { takeaways: [S(110), S(110, 2), S(110, 4)], action: S(120, 6), actionLabel: S(24, 8) },
  parts: ['item', 'action', 'panel'],
})
