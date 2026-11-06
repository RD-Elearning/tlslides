/** tls.c.infographic-row — spro sprint 2026-11b S09 (wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCInfographicRow } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCInfographicRow, build: richBuilder(tlsCInfographicRow), category: 'list', scope: 'slide',
  overflow: { items: [0, 1, 2, 3, 4, 5].map((i) => ({ icon: 'sun', head: 'h' + i })) },
  variants: { slot: 'variant', values: ['line', 'circles', 'steps'] },
  long: { items: [0, 1, 2, 3, 4].map((i) => ({ icon: 'sun', head: S(24, i), text: S(90, i) })) },
  parts: ['line', 'item'],
})
