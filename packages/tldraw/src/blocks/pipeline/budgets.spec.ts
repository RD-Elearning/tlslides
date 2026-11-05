/**
 * spro sprint 2026-11b S05-B — measured text fill at the block's final box.
 */
import { analyzeDeck } from '../layout-report'
import { defaultBlockRegistry } from '../validate-deck-spec'
import type { BlockSpec, DeckSpec, SlideSpec } from '../types'
import { FILL_FLOOR, slotFill } from './budgets'

const registry = defaultBlockRegistry()
const T: BlockSpec = { id: 't', type: 'tls.t.title', props: { text: 'Bốn ý chính' } }
const deck = (slide: SlideSpec): DeckSpec => ({ version: 1, id: 'f', title: 'f', theme: 'minimal-white', style: 'minimal', aspect: 'widescreen', slides: [slide] }) as DeckSpec
const fill = (slide: SlideSpec) => {
  const d = deck(slide)
  return slotFill(d, 0, analyzeDeck(d, { registry, llmAuthored: true })[0], registry)
}
const LONG =
  'Mức ý nghĩa cho biết xác suất bác bỏ nhầm giả thuyết không khi nó thực sự đúng, nên ta chọn nó trước khi nhìn dữ liệu. ' +
  'Giá trị p nhỏ hơn mức ý nghĩa thì có đủ bằng chứng để bác bỏ; lớn hơn thì chưa đủ, không có nghĩa giả thuyết đúng. ' +
  'Ví dụ với điểm thi của sáu mươi sinh viên: trung bình mẫu, độ lệch chuẩn và khoảng tin cậy được tính từng bước. ' +
  'Sai lầm loại một và loại hai đánh đổi lẫn nhau theo cỡ mẫu, nên cỡ mẫu là quyết định thiết kế chứ không phải chi tiết. ' +
  'Cuối phần có câu hỏi tự kiểm tra. Khi đọc kết quả, hãy nhớ rằng một kiểm định chỉ trả lời câu hỏi đã đặt ra trước, ' +
  'không phải mọi câu hỏi nảy ra sau khi nhìn dữ liệu; vì vậy giả thuyết, mức ý nghĩa và cỡ mẫu phải được ghi lại trước khi thu thập. ' +
  'Một kết quả không có ý nghĩa thống kê không chứng minh rằng không có hiệu ứng, chỉ cho thấy dữ liệu chưa đủ để kết luận.'

describe('slotFill', () => {
  it('a row of cards with one-line texts in a full region is under the self-study floor', () => {
    const cards: BlockSpec = { id: 'k', type: 'tls.c.cards', props: { lead: 'none', cards: ['Đầu vào', 'Mô hình', 'Kết quả'].map((title) => ({ title, text: 'Một dòng ngắn.' })) } }
    const f = fill({ id: 's', role: 'content', layout: 'timeline', regions: { title: [T], timeline: [cards] } })
    const k = f.find((x) => x.block === 'k')!
    expect(k.ratio).toBeLessThan(FILL_FLOOR.text)
    expect(k.fit).toBeGreaterThan(k.used)
  })

  // the plan guessed 600 characters; a half column holds ≈ 1 180 body characters at 28 units (text-budgets),
  // so a filled one carries ≈ 900+
  it('a body text of about 830 characters in a half region is not', () => {
    const body: BlockSpec = { id: 'b', type: 'tls.t.body', props: { text: LONG } }
    const f = fill({ id: 's', role: 'content', layout: 'two-column', regions: { title: [T], left: [body], right: [{ id: 'b2', type: 'tls.t.body', props: { text: LONG } }] } })
    expect(LONG.length).toBeGreaterThan(800)
    expect(f.find((x) => x.block === 'b')!.ratio).toBeGreaterThanOrEqual(FILL_FLOOR.text)
  })

  it('labels-only blocks and the title are not judged', () => {
    const f = fill({ id: 's', role: 'content', layout: 'timeline', regions: { title: [T], timeline: [{ id: 'tg', type: 'tls.t.tags', props: { items: ['Một', 'Hai'] } }] } })
    expect(f.map((x) => x.block)).not.toContain('t')
    expect(f.map((x) => x.block)).not.toContain('tg')
  })
})
