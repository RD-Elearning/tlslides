/** tls.c.timeline-detail — spro sprint 2026-11b S08 (the shared wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCTimelineDetail } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCTimelineDetail, build: richBuilder(tlsCTimelineDetail), category: 'timeline', scope: 'slide',
  overflow: { events: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ date: 'd' + i, title: 't', text: 'x' })) },
  variants: { slot: 'variant', values: ['left-rail', 'zigzag', 'cards'] },
  long: { events: [0, 1, 2, 3, 4, 5].map((i) => ({ date: S(24, i), title: S(60, i), text: S(200, i) })) },
  parts: ['item'],
})
