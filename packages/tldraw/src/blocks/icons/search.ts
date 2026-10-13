/**
 * spro enhance PLAN.md I-2 — icons by meaning for one slide: the compose kit sends the ~40 icons
 * whose names and tags match the slide's text (English, and Vietnamese through a small word map),
 * instead of every name (800+). Pure.
 */
import { ICON_GROUPS, ICONS, iconTags } from './index'

/** Vietnamese words → the English tag words they mean (lower case, without tones as well). */
const VI: Array<[string, string[]]> = [
  ['cây', ['tree', 'hierarchy', 'binary']], ['nút', ['node']], ['đồ thị', ['graph', 'chart', 'network']], ['mạng', ['network', 'topology', 'world']],
  ['dữ liệu', ['data', 'database']], ['cơ sở dữ liệu', ['database']], ['bảng', ['table']], ['danh sách', ['list']], ['ngăn xếp', ['stack']], ['hàng đợi', ['queue', 'list']],
  ['liên kết', ['link']], ['con trỏ', ['pointer', 'arrow']], ['mảng', ['array', 'grid']], ['duyệt', ['route', 'path', 'search']], ['đệ quy', ['repeat', 'loop', 'recursion']],
  ['thuật toán', ['algorithm', 'function', 'code']], ['lập trình', ['code', 'programming', 'terminal']], ['mã', ['code']], ['máy tính', ['computer', 'device']], ['phần mềm', ['code', 'app']],
  ['sắp xếp', ['sort']], ['tìm kiếm', ['search', 'zoom']], ['lặp', ['repeat', 'loop', 'refresh']], ['so sánh', ['scale', 'compare']], ['tăng', ['up', 'growth', 'trending']], ['giảm', ['down']],
  ['toán', ['math']], ['công thức', ['function', 'math', 'formula']], ['hàm', ['function']], ['đạo hàm', ['function', 'math', 'chart']], ['tích phân', ['integral', 'math']], ['số', ['number', 'math']],
  ['phần trăm', ['percentage']], ['xác suất', ['dice', 'percentage', 'chart']], ['thống kê', ['chart', 'statistics']], ['biểu đồ', ['chart']], ['hình học', ['geometry', 'triangle', 'ruler']],
  ['khoa học', ['science', 'flask', 'atom']], ['vật lý', ['atom', 'magnet', 'physics']], ['hoá học', ['flask', 'chemistry', 'test']], ['sinh học', ['dna', 'biology', 'leaf']], ['tế bào', ['cell', 'virus']],
  ['sức khoẻ', ['health', 'heart']], ['sức khỏe', ['health', 'heart']], ['bệnh', ['medical', 'virus', 'health']], ['bệnh viện', ['hospital', 'medical']], ['bác sĩ', ['stethoscope', 'medical']], ['thuốc', ['pill', 'medicine']], ['bệnh nhân', ['patient', 'bed', 'user']],
  ['học', ['school', 'book', 'education']], ['học sinh', ['school', 'student', 'backpack']], ['sinh viên', ['school', 'student', 'certificate']], ['giáo viên', ['teacher', 'presentation', 'chalkboard']], ['bài giảng', ['presentation', 'book']],
  ['bài tập', ['exercise', 'pencil', 'checklist']], ['câu hỏi', ['question', 'help']], ['thảo luận', ['message', 'users', 'discussion']], ['nhóm', ['users', 'group']], ['mục tiêu', ['target', 'flag']], ['kết quả', ['trophy', 'check', 'award']],
  ['ý tưởng', ['bulb', 'idea']], ['sáng tạo', ['bulb', 'palette', 'sparkles']], ['ghi nhớ', ['bookmark', 'brain', 'notes']], ['định nghĩa', ['book', 'dictionary']], ['ví dụ', ['example', 'bulb']],
  ['thời gian', ['time', 'clock', 'hourglass']], ['lịch', ['calendar']], ['tiến độ', ['timeline', 'progress']], ['quy trình', ['route', 'steps', 'process']], ['bước', ['steps', 'arrow']],
  ['tiền', ['money', 'cash', 'coin']], ['doanh thu', ['money', 'revenue', 'chart']], ['chi phí', ['money', 'receipt']], ['lợi nhuận', ['money', 'trending']], ['khách hàng', ['user', 'customer', 'users']], ['thị trường', ['world', 'chart', 'building']],
  ['công ty', ['building', 'briefcase']], ['nhân viên', ['user', 'id', 'briefcase']], ['bán hàng', ['shopping', 'store', 'cart']], ['sản phẩm', ['package', 'box']], ['giao hàng', ['truck', 'delivery']],
  ['an toàn', ['shield', 'lock', 'safety']], ['bảo mật', ['lock', 'shield', 'key']], ['rủi ro', ['alert', 'warning']], ['cảnh báo', ['alert', 'warning']], ['lỗi', ['bug', 'error', 'alert']],
  ['môi trường', ['leaf', 'nature', 'recycle']], ['năng lượng', ['bolt', 'energy', 'solar']], ['nước', ['droplet', 'water']], ['khí hậu', ['temperature', 'weather', 'cloud']], ['biển', ['wave', 'ship']], ['nông nghiệp', ['plant', 'seedling']],
  ['giao thông', ['car', 'bus', 'road']], ['du lịch', ['plane', 'map', 'world']], ['bản đồ', ['map', 'pin']], ['thành phố', ['building', 'buildings']], ['trường', ['school']],
  ['chuyển đổi số', ['device', 'cloud', 'code']], ['số hoá', ['device', 'cloud']], ['dịch vụ', ['heart-handshake', 'service']], ['hợp tác', ['handshake', 'users']], ['giao tiếp', ['message', 'speakerphone']],
]

/** Name parts that only say how an icon is drawn (`message-circle`, `chart-bar-2`). */
const MODIFIERS = new Set(['circle', 'square', 'filled', 'plus', 'minus', 'check', 'x', 'up', 'down', 'left', 'right', 'off', 'alt', 'cog', 'star', 'heart', 'bolt', 'code', 'dollar', 'pin', 'pause', 'share', 'exclamation', 'question', 'cancel', 'search', 'edit', 'dots', '2', '3'])

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
const words = (s: string) => (s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 1)

/** The English words a slide text is about: its own words plus the Vietnamese map's. */
export function queryWords(text: string): Set<string> {
  const low = text.toLowerCase()
  const plain = strip(low)
  const out = new Set(words(low))
  for (const [vi, en] of VI) if (low.includes(vi) || plain.includes(strip(vi))) en.forEach((w) => out.add(w))
  return out
}

/** Up to `n` icon names that fit `text`, best first; topped up with general icons. */
export function iconsFor(text: string, n = 40): string[] {
  const q = queryWords(text)
  const scored: Array<[string, number]> = []
  for (const name of Object.keys(ICONS)) {
    // the share of the icon's name the slide is about: `binary-tree` beats `message-circle-search`
    const all = name.split('-')
    const core = all.filter((p) => !MODIFIERS.has(p))
    const parts = core.length ? core : all
    const named = parts.filter((p) => q.has(p)).length
    let tagged = 0
    for (const t of iconTags(name)) for (const w of t.toLowerCase().split(/\s+/)) if (q.has(w)) tagged++
    const score = (6 * named) / parts.length + Math.min(3, tagged)
    if (score > 0) scored.push([name, score])
  }
  scored.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const out = scored.slice(0, n).map(([name]) => name)
  // general-purpose icons so a card always has something plain that fits
  for (const name of ['check', 'arrow-right', 'info', 'alert-triangle', 'help-circle', 'lightbulb', 'target', 'star', 'users', 'clock', 'book-open', 'chart-bar', 'layers', 'settings', 'search']) {
    if (out.length >= n) break
    if (!out.includes(name) && ICONS[name]) out.push(name)
  }
  return out
}

/** `iconsFor`'s names with their group, for the prompt. */
export function iconGroupOf(name: string): string {
  for (const [g, names] of Object.entries(ICON_GROUPS)) if (names.includes(name)) return g
  return 'misc'
}
