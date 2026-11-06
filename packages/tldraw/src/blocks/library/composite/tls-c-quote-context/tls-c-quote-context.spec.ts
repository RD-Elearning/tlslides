/** tls.c.quote-context — spro sprint 2026-11b S09 (wave-1 suite at the slot maxima, Vietnamese text). */
import { tlsCQuoteContext } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCQuoteContext, build: richBuilder(tlsCQuoteContext), category: 'emphasis', scope: 'slide',
  overflow: { quote: 'x'.repeat(400) },
  variants: { slot: 'variant', values: ['side-context', 'under-context'] },
  long: { quote: S(240), author: S(60, 2), role: S(60, 4), context: S(220, 6) },
  parts: ['quote', 'context'],
})
