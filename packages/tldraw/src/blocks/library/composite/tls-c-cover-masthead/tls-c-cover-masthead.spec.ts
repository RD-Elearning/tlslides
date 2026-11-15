/** tls.c.cover-masthead — spro sprint 2026-11b S09 (wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCCoverMasthead, buildCoverMasthead } from './index'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCCoverMasthead, build: buildCoverMasthead, category: 'cover', scope: 'slide',
  overflow: { title: 'x'.repeat(200) },
  variants: { slot: 'variant', values: ['masthead', 'band', 'boxed'] },
  long: { kicker: S(60), title: S(80, 3), subtitle: S(120, 5), meta: [S(40, 1), S(40, 2), S(40, 3)] },
  parts: ['title', 'meta'],
})
