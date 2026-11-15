/** tls.c.summary-sheet — spro sprint 2026-11b S08 (the shared wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCSummarySheet } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCSummarySheet, build: richBuilder(tlsCSummarySheet), category: 'learning', scope: 'slide',
  overflow: { remember: S(141) },
  variants: { slot: 'variant', values: ['grid', 'sheet'] },
  long: { ideas: [0, 1, 2, 3, 4, 5].map((i) => ({ title: S(40, i), text: S(150, i) })), box: { label: S(24), text: S(200), formula: 'n = 2^h' }, remember: S(140) },
  parts: ['item', 'remember'],
})
