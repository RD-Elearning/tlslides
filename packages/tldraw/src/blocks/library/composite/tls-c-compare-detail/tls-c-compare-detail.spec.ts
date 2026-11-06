/** tls.c.compare-detail — spro sprint 2026-11b S08 (the shared wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCCompareDetail } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCCompareDetail, build: richBuilder(tlsCCompareDetail), category: 'comparison', scope: 'slide',
  overflow: { verdict: S(161) },
  variants: { slot: 'variant', values: ['columns', 'cards', 'versus'] },
  long: { columns: [0, 1, 2].map((i) => ({ heading: S(40, i), summary: S(200, i), points: [0, 1, 2, 3].map((k) => S(90, i + k)) })), verdict: S(160) },
  parts: ['item', 'verdict'],
})
