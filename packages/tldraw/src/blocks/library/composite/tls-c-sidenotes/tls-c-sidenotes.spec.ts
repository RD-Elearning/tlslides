/** tls.c.sidenotes — spro sprint 2026-11b S08 (the shared wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCSidenotes } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCSidenotes, build: richBuilder(tlsCSidenotes), category: 'text', scope: 'slide',
  overflow: { text: S(641) },
  variants: { slot: 'variant', values: ['right-margin', 'left-margin'] },
  long: { text: [S(210), S(210, 1), S(210, 2)].join('\n\n'), notes: [0, 1, 2, 3].map((i) => ({ label: S(20, i), text: S(120, i), at: i % 3 })) },
  parts: ['item', 'note'],
})
