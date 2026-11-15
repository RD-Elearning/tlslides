/** tls.c.split-statement — spro sprint 2026-11b S09 (wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCSplitStatement } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCSplitStatement, build: richBuilder(tlsCSplitStatement), category: 'emphasis', scope: 'slide',
  overflow: { evidence: [0, 1, 2, 3, 4].map((i) => ({ text: 't' + i })) },
  variants: { slot: 'variant', values: ['left-claim', 'top-claim', 'band'] },
  long: { statement: S(130), evidence: [0, 1, 2, 3].map((i) => ({ text: S(120, i), source: S(60, i) })) },
  parts: ['claim', 'item'],
})
