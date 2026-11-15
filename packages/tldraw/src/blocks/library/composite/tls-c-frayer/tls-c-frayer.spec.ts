/** tls.c.frayer — spro sprint 2026-11b S08 (the shared wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCFrayer } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCFrayer, build: richBuilder(tlsCFrayer), category: 'learning', scope: 'slide',
  overflow: { term: S(41) },
  variants: { slot: 'variant', values: ['quadrant', 'stack'] },
  long: { term: S(40), definition: S(220), traits: [0, 1, 2, 3].map((i) => S(80, i)), examples: [0, 1, 2].map((i) => S(80, i)), nonExamples: [0, 1, 2].map((i) => S(80, i)) },
  parts: ['item'],
})
