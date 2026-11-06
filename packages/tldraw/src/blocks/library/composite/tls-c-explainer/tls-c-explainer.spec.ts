/** tls.c.explainer — spro sprint 2026-11b S08 (the shared wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCExplainer } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCExplainer, build: richBuilder(tlsCExplainer), category: 'text', scope: 'slide',
  overflow: { claim: S(91) },
  variants: { slot: 'variant', values: ['stacked', 'side-example', 'boxed'] },
  long: { claim: S(90), text: S(420), points: [S(120), S(120, 1), S(120, 2)], example: { label: S(20), text: S(240) } },
  parts: ['example'],
})
