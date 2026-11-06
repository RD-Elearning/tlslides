/** tls.c.hotspots — spro sprint 2026-11b S10 (wave-1 suite on the static form at the slot maxima, Vietnamese text). */
import { tlsCHotspots } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCHotspots, build: richBuilder(tlsCHotspots), category: 'learning', scope: 'slide',
  overflow: { spots: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ fx: 0.1, fy: 0.1, label: 'l' + i, text: 't' })) },
  variants: { slot: 'variant', values: ['notes-right', 'notes-below'] },
  long: { aspect: 1.5, spots: [0, 1, 2, 3, 4, 5].map((i) => ({ fx: i / 5, fy: 1 - i / 5, label: S(24, i), text: S(160, i) })) },
  parts: ['image', 'pin', 'item'],
})
