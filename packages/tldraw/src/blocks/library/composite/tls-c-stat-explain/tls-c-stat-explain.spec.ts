/** tls.c.stat-explain — spro sprint 2026-11b S09 (wave-1 suite at the slot maxima, Vietnamese text; count-up part). */
import { tlsCStatExplain } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'
import { layoutAt, hasPart } from '../composite-test'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa và rút ra kết luận chung cho bài học hôm nay về chủ đề đang học' + ' ').repeat(4)
const S = (n: number, k = 0) => V.slice(k, k + n)

wave1Suite({
  def: tlsCStatExplain, build: richBuilder(tlsCStatExplain), category: 'metric', scope: 'slide',
  overflow: { label: 'x'.repeat(200), value: '1', text: 'y' },
  variants: { slot: 'variant', values: ['left-number', 'top-number', 'ring'] },
  long: { value: '1.240,5', unit: 'triệu người', label: S(60), text: S(240, 3), source: S(90, 5), share: 62 },
  parts: ['value', 'item'],
})

describe('tls.c.stat-explain (S09)', () => {
  it('keeps the number as written (deck language) in its own count-up part', () => {
    const t = layoutAt(tlsCStatExplain, { value: '1,5', unit: 'lần', label: 'a', text: 'b' }, 1600, 640)
    expect(hasPart(t, 'value')).toBe(true)
    expect(tlsCStatExplain.motion?.partMotion?.value?.preset).toBe('count-up')
  })
  it('draws the ring / bar / icon visual when asked', () => {
    for (const visual of ['ring', 'bar', 'icon']) {
      const t = layoutAt(tlsCStatExplain, { value: '62%', label: 'a', text: 'b', visual, share: 62, icon: 'users' }, 1600, 640)
      expect([visual, hasPart(t, 'item[0].visual')]).toEqual([visual, true])
    }
  })
})
