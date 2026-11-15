/**
 * tls.m.screen — spro sprint 2026-11c S25 (shape `screen`; mam s05: an app's home screen described as header, search,
 * category tabs, a list of dishes and a bottom tab bar, drawn as five bullets): a device frame with a SCHEMATIC screen
 * built from a tiny wireframe grammar — `bar` (header with the screen's name), `search`, `tabs` (chips under the header),
 * `media` (a picture area), `cards` (a two-column grid), `list` (rows), `map` (streets and a pin), `button` (a wide
 * pill), `fab` (a round action button) and `nav` (the bottom tab bar) — in theme colours, each part numbered. Beside
 * the device the parts are listed with the same numbers, a name and a note: the slide explains the screen, it does not
 * pretend to be a screenshot (use tls.m.device-mock for a real one).
 */
import type { BlockDefinition, BlockSchema, CapacityReport, LayoutContext, LayoutNode, MotionRecipe, Size, TypeToken } from '../../../types'
import { capacityOf, emptyState, fitTier, lineH, linesNeeded, mutedStyle, objs, placeLines, readableOn, root, str, strokePath, style, tintOf } from '../../diagram/_kit'
import { slot } from '../../diagram/_motion'
import { DEFAULT_PROBE_HEIGHT } from '../../../layout/measure-block'

export const SCREEN_PARTS = ['bar', 'search', 'tabs', 'media', 'cards', 'list', 'map', 'button', 'fab', 'nav'] as const
export type ScreenPartKind = (typeof SCREEN_PARTS)[number]
export const PARTS_MIN = 2
export const PARTS_MAX = 8
const GAP = 60
const NOTE_LINES = 2

export interface ScreenPart extends Record<string, unknown> {
  kind: ScreenPartKind
  label: string
  note?: string
}
export interface ScreenProps extends Record<string, unknown> {
  title?: string
  device?: 'phone' | 'tablet' | 'browser'
  parts: ScreenPart[]
}

export const schema: BlockSchema = {
  title: { type: { kind: 'text', maxChars: 28 }, role: 'content', label: 'Screen name', help: 'Shown in the header bar: "Trang chủ", "Checkout".' },
  device: { type: { kind: 'enum', values: ['phone', 'tablet', 'browser'] }, role: 'option', label: 'Device' },
  parts: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          kind: { type: { kind: 'enum', values: [...SCREEN_PARTS] }, required: true, role: 'content', label: 'Part', help: 'bar = header, tabs = chips under it, nav = bottom tab bar, fab = round action button.' },
          label: { type: { kind: 'text', maxChars: 32 }, required: true, role: 'content', label: 'Name' },
          note: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Note', help: 'What the part does, in one line.' },
        },
      },
      min: PARTS_MIN,
      max: PARTS_MAX,
    },
    role: 'content',
    label: 'Parts',
    required: true,
    guidance: 'The screen top to bottom, 3-6 parts, each one kind; the names and notes come from the passages.',
  },
}

export const defaults: ScreenProps = {
  title: 'Trang chủ',
  device: 'phone',
  parts: [
    { kind: 'bar', label: 'Thanh tiêu đề', note: 'Vị trí giao hàng và nút giỏ hàng' },
    { kind: 'search', label: 'Ô tìm kiếm', note: 'Tìm theo món hoặc quán' },
    { kind: 'tabs', label: 'Danh mục', note: 'Bún, cơm, đồ uống, ăn vặt' },
    { kind: 'cards', label: 'Món gợi ý', note: 'Ảnh món, giá và thời gian giao' },
    { kind: 'nav', label: 'Thanh điều hướng', note: 'Trang chủ, đơn hàng, ưu đãi, tài khoản' },
  ],
}

const TIERS: ReadonlyArray<readonly [TypeToken, TypeToken]> = [
  ['heading', 'body'],
  ['subheading', 'body'],
  ['lead', 'caption'],
  ['body', 'caption'],
  ['caption', 'footnote'],
]

interface Part {
  kind: ScreenPartKind
  label: string
  note: string
}

function parts(props: ScreenProps): Part[] {
  return objs(props.parts)
    .slice(0, PARTS_MAX)
    .map((p) => ({ kind: (SCREEN_PARTS as readonly string[]).includes(str(p.kind)) ? (str(p.kind) as ScreenPartKind) : 'list', label: str(p.label), note: str(p.note) }))
    .filter((p) => p.label)
}

/** height weight of each part inside the screen; fixed parts take a share of the screen height, flexible ones split the rest */
const FIXED: Partial<Record<ScreenPartKind, number>> = { bar: 0.09, search: 0.075, tabs: 0.065, button: 0.08, nav: 0.095 }
const FLEX: Partial<Record<ScreenPartKind, number>> = { media: 1, cards: 1.4, list: 1.2, map: 1.3 }

const f = (v: number) => String(Math.round(v * 100) / 100)

export function layout(props: ScreenProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const items = parts(props)
  const N = items.length
  if (N < 1) return emptyState(ctx, 'No parts')
  const device = props.device === 'tablet' || props.device === 'browser' ? props.device : 'phone'
  const sized = !ctx.tokens.measuring && H < DEFAULT_PROBE_HEIGHT
  // the device: as tall as the region, its width from the device's proportions, at most half the region
  const aspect = device === 'phone' ? 0.5 : device === 'tablet' ? 0.75 : 1.45
  const devH = H
  const devW = Math.min(W * (device === 'browser' ? 0.56 : 0.46), devH * aspect)
  const devHt = device === 'browser' ? Math.min(H, devW / aspect) : devH
  const devY = (H - devHt) / 2
  const listX = devW + GAP
  const listW = Math.max(1, W - listX)
  const accent = ctx.resolveColor('accent').color
  const surface = ctx.resolveColor('surface').color
  const text = ctx.resolveColor('text').color
  const line = ctx.resolveColor('line').color
  const frame = tintOf(text, surface, 0.12)
  const screenBg = surface
  const soft = tintOf(surface, text, 0.07)
  const softer = tintOf(surface, accent, 0.12)
  const badgeS = style(ctx, 'caption')
  const B = Math.max(26, Math.round(lineH(badgeS) * 1.15))
  const nodes: LayoutNode[] = []

  // ---- the device and its screen
  const bez = device === 'browser' ? 0 : Math.max(8, devW * 0.045)
  const topBar = device === 'browser' ? Math.max(26, devHt * 0.07) : 0
  const sx = bez
  const sy = devY + bez + topBar
  const sw = Math.max(1, devW - 2 * bez)
  const sh = Math.max(1, devHt - 2 * bez - topBar)
  const dev: LayoutNode[] = [
    { k: 'rect', part: 'device.body', box: { x: 0, y: devY, width: devW, height: devHt }, fill: { type: 'solid', color: device === 'browser' ? soft : frame }, radius: device === 'phone' ? devW * 0.13 : device === 'tablet' ? devW * 0.06 : 12 },
    { k: 'rect', part: 'device.screen', box: { x: sx, y: sy, width: sw, height: sh }, fill: { type: 'solid', color: screenBg }, radius: device === 'phone' ? devW * 0.09 : device === 'tablet' ? devW * 0.035 : 0 },
  ]
  if (device === 'browser') for (let i = 0; i < 3; i++) dev.push({ k: 'rect', part: `device.dot[${i}]`, box: { x: 14 + i * 18, y: devY + topBar / 2 - 5, width: 10, height: 10 }, fill: { type: 'solid', color: line }, radius: 5 })
  nodes.push(slot('device', { width: W, height: H }, dev))

  // the screen's parts top to bottom; `nav` pinned at the foot, `fab` floats over the content above it
  const pad = Math.max(8, sw * 0.05)
  const inner = sw - 2 * pad
  const flow = items.map((p, i) => ({ p, i })).filter(({ p }) => p.kind !== 'nav' && p.kind !== 'fab')
  const nav = items.findIndex((p) => p.kind === 'nav')
  const fab = items.findIndex((p) => p.kind === 'fab')
  const navH = nav >= 0 ? sh * (FIXED.nav ?? 0.09) : 0
  const avail = sh - navH - pad * (flow.length + 1) - (device === 'phone' ? sh * 0.03 : 0)
  const fixedH = flow.reduce((a, { p }) => a + (FIXED[p.kind] ?? 0) * sh, 0)
  const flexW = flow.reduce((a, { p }) => a + (FLEX[p.kind] ?? 0), 0)
  const flexUnit = flexW > 0 ? Math.max(0, avail - fixedH) / flexW : 0
  let y = sy + pad + (device === 'phone' ? sh * 0.03 : 0)
  const anchors: Array<{ i: number; x: number; y: number }> = []
  const tiny = style(ctx, 'footnote')
  const words = sw >= 240 && lineH(tiny) < sh * 0.06
  const wf = (p: Part, i: number, box: { x: number; y: number; width: number; height: number }): LayoutNode[] => {
    const out: LayoutNode[] = []
    const q = (k: string) => `part[${i}].${k}`
    const { x, width: w, height: h } = box
    const by = box.y
    switch (p.kind) {
      case 'bar': {
        out.push({ k: 'rect', part: q('bg'), box: { x: sx, y: by - pad / 2, width: sw, height: h + pad / 2 }, fill: { type: 'solid', color: softer } })
        const title = str(props.title) || p.label
        if (words) out.push(...placeLines(ctx, title, { ...style(ctx, 'caption'), color: text, weight: 700 } as any, { x, y: by + (h - lineH(style(ctx, 'caption'))) / 2, width: w * 0.7 }, 'start', 1, q('title')).nodes)
        else out.push({ k: 'rect', part: q('title'), box: { x, y: by + h * 0.35, width: w * 0.45, height: h * 0.3 }, fill: { type: 'solid', color: text }, radius: 3 })
        out.push({ k: 'rect', part: q('icon'), box: { x: x + w - h * 0.6, y: by + h * 0.2, width: h * 0.6, height: h * 0.6 }, fill: { type: 'solid', color: accent }, radius: h * 0.3 })
        break
      }
      case 'search':
        out.push({ k: 'rect', part: q('field'), box: { x, y: by, width: w, height: h }, fill: { type: 'solid', color: soft }, radius: h / 2 })
        out.push({ k: 'rect', part: q('glass'), box: { x: x + h * 0.3, y: by + h * 0.3, width: h * 0.4, height: h * 0.4 }, fill: { type: 'solid', color: screenBg }, stroke: { color: text, width: 2 }, radius: h * 0.2 })
        out.push({ k: 'rect', part: q('hint'), box: { x: x + h, y: by + h * 0.42, width: w * 0.4, height: h * 0.16 }, fill: { type: 'solid', color: line }, radius: 3 })
        break
      case 'tabs': {
        const n = 4
        const cw = (w - (n - 1) * 8) / n
        for (let k = 0; k < n; k++) out.push({ k: 'rect', part: q(`chip[${k}]`), box: { x: x + k * (cw + 8), y: by, width: cw, height: h }, fill: { type: 'solid', color: k === 0 ? accent : soft }, radius: h / 2 })
        break
      }
      case 'media': {
        out.push({ k: 'rect', part: q('img'), box: { x, y: by, width: w, height: h }, fill: { type: 'solid', color: softer }, radius: 10 })
        const m = Math.min(w, h) * 0.5
        const cx = x + w / 2
        const cy = by + h / 2
        out.push({ k: 'path', part: q('glyph'), box: { x: 0, y: 0, width: W, height: H }, d: `M${f(cx - m / 2)} ${f(cy + m / 3)}L${f(cx - m / 8)} ${f(cy - m / 4)}L${f(cx + m / 8)} ${f(cy + m / 10)}L${f(cx + m / 4)} ${f(cy - m / 12)}L${f(cx + m / 2)} ${f(cy + m / 3)}Z`, fill: { type: 'solid', color: tintOf(softer, accent, 0.5) } } as LayoutNode)
        break
      }
      case 'cards': {
        const cols = 2
        const rows = Math.max(1, Math.min(3, Math.floor(h / Math.max(40, w * 0.42))))
        const cw = (w - 10) / cols
        const ch = (h - (rows - 1) * 10) / rows
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) {
            const cx = x + c * (cw + 10)
            const cy = by + r * (ch + 10)
            out.push({ k: 'rect', part: q(`card[${r * cols + c}]`), box: { x: cx, y: cy, width: cw, height: ch }, fill: { type: 'solid', color: soft }, radius: 8 })
            out.push({ k: 'rect', part: q(`card[${r * cols + c}].img`), box: { x: cx, y: cy, width: cw, height: ch * 0.6 }, fill: { type: 'solid', color: softer }, radius: 8 })
            out.push({ k: 'rect', part: q(`card[${r * cols + c}].line`), box: { x: cx + 8, y: cy + ch * 0.7, width: cw * 0.6, height: Math.max(4, ch * 0.08) }, fill: { type: 'solid', color: line }, radius: 3 })
          }
        break
      }
      case 'list': {
        const rh = Math.max(28, Math.min(64, h / 4))
        const rows = Math.max(1, Math.floor(h / rh))
        for (let r = 0; r < rows; r++) {
          const ry = by + r * rh
          const d = rh * 0.62
          out.push({ k: 'rect', part: q(`row[${r}].thumb`), box: { x, y: ry + (rh - d) / 2, width: d, height: d }, fill: { type: 'solid', color: softer }, radius: 6 })
          out.push({ k: 'rect', part: q(`row[${r}].line`), box: { x: x + d + 10, y: ry + rh * 0.3, width: (w - d - 10) * 0.7, height: Math.max(4, rh * 0.14) }, fill: { type: 'solid', color: line }, radius: 3 })
          out.push({ k: 'rect', part: q(`row[${r}].sub`), box: { x: x + d + 10, y: ry + rh * 0.56, width: (w - d - 10) * 0.45, height: Math.max(3, rh * 0.1) }, fill: { type: 'solid', color: soft }, radius: 3 })
        }
        break
      }
      case 'map': {
        out.push({ k: 'rect', part: q('area'), box: { x, y: by, width: w, height: h }, fill: { type: 'solid', color: tintOf(surface, '#3E8E4E', 0.1) }, radius: 10 })
        out.push(strokePath(ctx, `M${f(x)} ${f(by + h * 0.3)}L${f(x + w)} ${f(by + h * 0.55)}M${f(x + w * 0.35)} ${f(by)}L${f(x + w * 0.5)} ${f(by + h)}`, q('roads'), screenBg, Math.max(4, w * 0.025)))
        const pr = Math.min(w, h) * 0.08
        out.push({ k: 'rect', part: q('pin'), box: { x: x + w * 0.62 - pr, y: by + h * 0.42 - pr, width: 2 * pr, height: 2 * pr }, fill: { type: 'solid', color: accent }, radius: pr })
        break
      }
      case 'button':
        out.push({ k: 'rect', part: q('pill'), box: { x, y: by, width: w, height: h }, fill: { type: 'solid', color: accent }, radius: h / 2 })
        if (words) out.push(...placeLines(ctx, p.label, { ...tiny, color: readableOn('#FFFFFF', accent, 4.5) }, { x, y: by + (h - lineH(tiny)) / 2, width: w }, 'center', 1, q('text')).nodes)
        break
      default:
        break
    }
    return out
  }
  for (const { p, i } of flow) {
    const h = FIXED[p.kind] != null ? (FIXED[p.kind] as number) * sh : (FLEX[p.kind] ?? 1) * flexUnit
    nodes.push(slot(`part[${i}]`, { width: W, height: H }, wf(p, i, { x: sx + pad, y, width: inner, height: Math.max(6, h) })))
    anchors.push({ i, x: sx + sw, y: y + h / 2 })
    y += h + pad
  }
  if (nav >= 0) {
    const ny = sy + sh - navH
    const kids: LayoutNode[] = [{ k: 'rect', part: `part[${nav}].bg`, box: { x: sx, y: ny, width: sw, height: navH }, fill: { type: 'solid', color: soft } }]
    for (let k = 0; k < 4; k++) {
      const d = navH * 0.36
      const cx = sx + sw * (k + 0.5) / 4
      kids.push({ k: 'rect', part: `part[${nav}].icon[${k}]`, box: { x: cx - d / 2, y: ny + navH * 0.25, width: d, height: d }, fill: { type: 'solid', color: k === 0 ? accent : line }, radius: d * 0.3 })
    }
    nodes.push(slot(`part[${nav}]`, { width: W, height: H }, kids))
    anchors.push({ i: nav, x: sx + sw, y: ny + navH / 2 })
  }
  if (fab >= 0) {
    const d = Math.max(28, sw * 0.16)
    const fx = sx + sw - pad - d
    const fy = sy + sh - navH - pad - d
    nodes.push(slot(`part[${fab}]`, { width: W, height: H }, [
      { k: 'rect', part: `part[${fab}].button`, box: { x: fx, y: fy, width: d, height: d }, fill: { type: 'solid', color: accent }, radius: d / 2 },
      { k: 'rect', part: `part[${fab}].plus.h`, box: { x: fx + d * 0.3, y: fy + d * 0.46, width: d * 0.4, height: d * 0.08 }, fill: { type: 'solid', color: readableOn('#FFFFFF', accent, 3) } },
      { k: 'rect', part: `part[${fab}].plus.v`, box: { x: fx + d * 0.46, y: fy + d * 0.3, width: d * 0.08, height: d * 0.4 }, fill: { type: 'solid', color: readableOn('#FFFFFF', accent, 3) } },
    ]))
    anchors.push({ i: fab, x: fx + d, y: fy + d / 2 })
  }
  // badges at the screen's right edge, one per part, in the list's numbering (top to bottom on the screen)
  anchors.sort((a, b) => a.y - b.y)
  const number = new Map(anchors.map((a, k) => [a.i, k + 1]))
  const badge = (n: number, x: number, yy: number, part: string): LayoutNode[] => [
    { k: 'rect', part: `${part}.dot`, box: { x, y: yy, width: B, height: B }, fill: { type: 'solid', color: accent }, stroke: { color: screenBg, width: 2 }, radius: B / 2 },
    ...placeLines(ctx, String(n), { ...badgeS, color: readableOn('#FFFFFF', accent, 4.5) }, { x, y: yy + (B - lineH(badgeS)) / 2, width: B }, 'center', 1, `${part}.n`).nodes,
  ]
  const marks: LayoutNode[] = []
  let lastY = -Infinity
  for (const a of anchors) {
    const by = Math.max(a.y - B / 2, lastY + B + 2)
    lastY = by
    // just outside the frame's right edge, level with its part: on the screen it would cover the part's own icons
    marks.push(...badge(number.get(a.i) ?? 0, devW + 8, by, `badge[${a.i}]`))
  }
  nodes.push(slot('badges', { width: W, height: H }, marks))

  // ---- the legend: the parts in screen order, number, name, note
  const order = anchors.map((a) => items[a.i])
  const legendH = (t: readonly [TypeToken, TypeToken]) => {
    const ls = style(ctx, t[0])
    const ns = mutedStyle(ctx, t[1])
    const tw = listW - B - 16
    return order.reduce((a, p) => a + Math.max(B, linesNeeded(ctx, p.label, ls, tw) * lineH(ls) + (p.note ? 4 + Math.min(NOTE_LINES, linesNeeded(ctx, p.note, ns, tw)) * lineH(ns) : 0)), 0) + (order.length - 1) * 18
  }
  const whole = (t: readonly [TypeToken, TypeToken]) => {
    const ls = style(ctx, t[0])
    const ns = mutedStyle(ctx, t[1])
    const tw = listW - B - 16
    return order.every((p) => linesNeeded(ctx, p.label, ls, tw) <= 2 && (!p.note || linesNeeded(ctx, p.note, ns, tw) <= NOTE_LINES))
  }
  const tier = fitTier(TIERS, (t) => t === TIERS[TIERS.length - 1] || (sized && whole(t) && legendH(t) <= H), ctx)
  const ls = style(ctx, tier[0])
  const ns = mutedStyle(ctx, tier[1])
  const tw = listW - B - 16
  let ly = Math.max(0, (H - legendH(tier)) / 2)
  order.forEach((p, k) => {
    const i = anchors[k].i
    const kids: LayoutNode[] = [...badge(k + 1, listX, ly + Math.max(0, (lineH(ls) - B) / 2), `item[${i}].badge`)]
    const lb = placeLines(ctx, p.label, ls, { x: listX + B + 16, y: ly, width: tw }, 'start', 2, `item[${i}].label`)
    kids.push(...lb.nodes)
    let h = lb.height
    if (p.note) {
      const nt = placeLines(ctx, p.note, ns, { x: listX + B + 16, y: ly + lb.height + 4, width: tw }, 'start', NOTE_LINES, `item[${i}].note`)
      kids.push(...nt.nodes)
      h += 4 + nt.height
    }
    nodes.push(slot(`item[${i}]`, { width: W, height: H }, kids))
    ly += Math.max(B, h) + 18
  })
  return root(ctx, nodes)
}

export function capacity(props: ScreenProps, box: Size): CapacityReport {
  const n = Array.isArray(props.parts) ? props.parts.length : 0
  const ok = n < 1 || (box.width >= 900 && box.height >= 380)
  return capacityOf({ parts: { max: PARTS_MAX, used: n } }, ok, [{ kind: 'truncate', slot: 'parts' }])
}

export const motion: MotionRecipe = {
  parts: ['device', 'part[*]', 'badges', 'item[*]'],
  preset: 'stagger-children',
  partMotion: { device: { preset: 'fade-up', delay: 0 }, 'part[*]': { preset: 'fade-in', delay: 200, stagger: 70 }, badges: { preset: 'fade-in', delay: 600 }, 'item[*]': { preset: 'fade-up', delay: 650, stagger: 90 } },
}

export const tlsMScreen: BlockDefinition = {
  type: 'tls.m.screen',
  name: 'Screen sketch',
  family: 'media',
  tier: 'A',
  summary: 'A schematic app or web screen in a device frame, its parts numbered and explained beside it.',
  keywords: ['screen', 'app screen', 'wireframe', 'ui', 'layout of a screen', 'màn hình', 'giao diện', 'ứng dụng', 'thanh điều hướng'],
  category: 'media',
  scope: 'group',
  shortDescription: 'App screen sketch with numbered parts',
  related: ['tls.m.device-mock', 'tls.g.annotated'],
  describe: {
    when: 'The passages describe one screen of an app or site part by part (header, search, tabs, list, bottom bar): what is where and what it does.',
    avoid: 'A real screenshot (tls.m.device-mock), a user flow across screens (tls.g.flow), or a feature list with no screen (tls.m.icon-list).',
    example: { id: 'b_screen', type: 'tls.m.screen', props: { title: 'Home', device: 'phone', parts: [{ kind: 'bar', label: 'Header', note: 'Delivery address and cart' }, { kind: 'search', label: 'Search', note: 'Dishes or shops' }, { kind: 'cards', label: 'Picks', note: 'Photo, price, time' }, { kind: 'nav', label: 'Tab bar', note: 'Home, orders, deals, account' }] } },
  },
  schema,
  defaults,
  size: { preferred: [1500, 680], min: [900, 400] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
