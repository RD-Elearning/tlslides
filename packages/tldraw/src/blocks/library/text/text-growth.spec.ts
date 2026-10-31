/**
 * CR7a (spro creative PLAN §6.9): list blocks set fixed body type and drew it the same in a whole
 * slide and in a quarter one. They now step their type up while the larger text still fits.
 */
import { BlockRegistry } from '../../registry'
import { registerBuiltInBlocks } from '..'
import { makeCtx } from './test-helpers'
import { TIERED_BLOCK_TYPES } from '../../tiered'
import { GROW_STEPS } from './_engine/grow'
import type { LayoutNode } from '../../types'

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)
const texts = (n: LayoutNode): Array<{ size: number; cut: boolean }> =>
  n.k === 'group' ? n.children.flatMap(texts) : n.k === 'text' ? [{ size: n.style.size, cut: !!(n as { truncated?: boolean }).truncated }] : []
const GROWN = ['tls.t.bullets', 'tls.t.checklist', 'tls.t.kv-list', 'tls.t.qa', 'tls.t.numbered', 'tls.t.tags', 'tls.m.icon-list']

describe('list text grows with its region', () => {
  it.each(GROWN)('%s: larger type in a whole-slide box, authored type in a tight one, in the box, nothing cut', (type) => {
    const def = registry.get(type)!
    const props = { ...(def.defaults as object), ...((def.describe?.example?.props ?? {}) as object) }
    const lay = (w: number, h: number, typeStep = 0) => {
      const c = makeCtx({ width: w, height: h }, registry)
      return def.layout(props as never, { ...c, tokens: { ...c.tokens, typeStep } })
    }
    const max = (n: LayoutNode) => Math.max(...texts(n).map((x) => x.size))
    const big = lay(1600, 800)
    // a typeStep of GROW_STEPS leaves no room to grow: the authored size and height
    const authored = lay(900, 2000, GROW_STEPS)
    const tight = lay(900, Math.ceil(authored.box.height) + 2)
    expect(max(big)).toBeGreaterThan(max(tight))
    expect(texts(big).some((t) => t.cut)).toBe(false)
    expect(big.box.height).toBeLessThanOrEqual(800 + 1)
    expect(max(tight)).toBe(max(authored))
  })

  it.each(GROWN)('%s honours style.typeStep (harmonizeTypes)', (type) => {
    expect(TIERED_BLOCK_TYPES.has(type)).toBe(true)
  })

  it('a list stacked with another block in one region keeps its authored type (corpus 49e47797 s03: region/overflow)', () => {
    const { analyzeDeck } = require('../../layout-report') as typeof import('../../layout-report')
    const slide = {"id": "s03", "layout": "two-column", "rhythm": "dense", "regions": {"title": [{"id": "s03_t", "type": "tls.t.title", "props": {"text": "Định nghĩa đạo hàm"}}], "left": [{"id": "s03_def", "type": "tls.t.definition", "props": {"term": "Đạo hàm tại x0", "layout": "stacked", "example": "f'(x0) = lim(delta y / delta x) khi delta x → 0", "termTone": "accent", "definition": "Đạo hàm tại x0 là giới hạn của tỉ số delta y / delta x khi delta x tiến về 0.", "showExample": true}}], "right": [{"id": "s03_kv", "type": "tls.t.kv-list", "props": {"items": [{"key": "Kí hiệu", "value": "f'(x) hoặc dy/dx (Leibniz)"}, {"key": "Điều kiện", "value": "Có đạo hàm tại x0 thì liên tục tại x0"}, {"key": "Chiều ngược", "value": "Không đúng: y = |x| liên tục tại 0 nhưng không có đạo hàm"}, {"key": "Ý nghĩa hình học", "value": "Cát tuyến qua hai điểm gần nhau tiến dần thành tiếp tuyến tại x0 khi delta x tiến về 0"}], "leader": "rule", "keyTone": "muted"}}, {"id": "s03_take", "type": "tls.t.takeaway", "props": {"size": "lead", "text": "Đạo hàm tại x0 chính là giới hạn của tỉ số delta y / delta x khi delta x tiến về 0.", "tone": "accent", "label": "delta x → 0"}}]}}
    const report = analyzeDeck({ version: 1, id: 'd', title: 'd', theme: 'minimal-white', style: 'minimal', aspect: 'widescreen', slides: [slide] } as never)[0]
    expect(report.findings.filter((f) => f.severity !== 'info' && /overflow|truncated/.test(f.code)).map((f) => f.code)).toEqual([])
  })
})
