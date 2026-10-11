/**
 * CS0 — content stress: real-shaped content (Vietnamese and English) poured into every design the
 * picker can offer, at the edges of what the AI is told it may write
 * (`reviews/blocks/content-stress/README.md`).
 *
 * The dry run (`dryRun.ts`) fills each design with its blocks' own example content, so a design
 * that breaks under other text, another language or another item count passes it. This module
 * rewrites a design's content slot by slot from the block schema, at one of these levels:
 *
 * - `same`  — every text the same length (characters) as the example, in the target language;
 *             item counts unchanged. A design must be clean here.
 * - `min`   — lists at the low end of their range (the slot guidance's `A–B items`, else the
 *             schema's `min`); text as `same`.
 * - `items` — lists at the high end of their range; text as `same`.
 * - `words` — every text slot whose guidance (or its list's) names `A–B words` at `B` words; the
 *             rest as `same`. Measures whether the guidance is a promise the design keeps.
 * - `over`  — both past the range (items + 2, words × 1.6): the oracle must report, not pass.
 *
 * Text and numerals: a string without two letters in a row (`02`, `Q3`, `→`) is left alone.
 * `designCapacity` searches the largest title (characters) and list (items) a design takes clean,
 * for the fill stage's prompt. Pure and DOM-free, deterministic: same input, same output.
 */
import { analyzeDeck } from '../layout-report'
import { assetsAllow, recipeSlide } from '../recipes'
import type { RecipeRole, SlideAssets } from '../recipes'
import type { BlockRegistry } from '../registry'
import { eligibleRecipes, prefixIds } from './dryRun'
import { deckTitleSize, slideProblems } from './quality'
import { applyDeckLook, deckLook, lookCandidates } from './variety'
import type { BlockSpec, DeckSpec, DeckStyle, SlideSpec, SlotSpec, SlotType } from '../types'

export type StressLevel = 'same' | 'min' | 'items' | 'words' | 'over'
export const STRESS_LEVELS: readonly StressLevel[] = ['same', 'min', 'items', 'words', 'over']
export type StressLang = 'vi' | 'en'

/** Lecture-register prose, cycled word by word. Vietnamese carries every tone mark and ư/ơ/đ. */
export const STRESS_TEXT: Record<StressLang, readonly string[]> = {
  vi: (
    'Kiểm định giả thuyết thống kê giúp người học quyết định dựa trên dữ liệu thay vì cảm tính. ' +
    'Mức ý nghĩa cho biết xác suất bác bỏ nhầm giả thuyết không khi nó thực sự đúng. ' +
    'Giá trị p nhỏ hơn mức ý nghĩa thì ta có đủ bằng chứng để bác bỏ. ' +
    'Sai lầm loại một và loại hai luôn đánh đổi lẫn nhau theo cỡ mẫu. ' +
    'Ví dụ tính tay với điểm thi của lớp sáu mươi sinh viên năm hai ngành kinh tế. ' +
    'Phân phối chuẩn, trung bình mẫu, độ lệch chuẩn và khoảng tin cậy được trình bày từng bước. ' +
    'Cuối mỗi phần có câu hỏi kiểm tra hiểu bài và kết luận thực tiễn.'
  ).split(/\s+/),
  en: (
    'Hypothesis testing lets learners decide from data rather than from intuition. ' +
    'The significance level is the chance of rejecting a null hypothesis that is in fact true. ' +
    'When the p value falls below that level we have enough evidence to reject it. ' +
    'Type one and type two errors trade off against each other as the sample grows. ' +
    'A worked example uses exam scores from a class of sixty second-year economics students. ' +
    'Normal distribution, sample mean, standard deviation and confidence intervals follow step by step. ' +
    'Each part ends with a check of understanding and a practical conclusion.'
  ).split(/\s+/),
}

const ITEMS_RE = /(\d+)\s*[–-]\s*(\d+)\s*items/
const WORDS_RE = /(\d+)\s*[–-]\s*(\d+)\s*words/

function rangeIn(re: RegExp, ...texts: Array<string | undefined>): [number, number] | undefined {
  for (const t of texts) {
    const m = t ? re.exec(t) : null
    if (m) return [Number(m[1]), Number(m[2])]
  }
  return undefined
}

/** Plain text of a text or rich-text value. */
export function plainText(v: unknown): string {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object' && Array.isArray((v as { runs?: unknown }).runs)) {
    return ((v as { runs: Array<{ text?: string }> }).runs).map((r) => r.text ?? '').join('')
  }
  return ''
}

const isProse = (s: string) => /\p{L}{2}/u.test(s)

/** A deterministic word stream for one slide. */
function textSource(lang: StressLang) {
  const words = STRESS_TEXT[lang]
  let at = 0
  const take = () => words[at++ % words.length].replace(/[.,]$/, '')
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return {
    words(n: number): string {
      const out: string[] = []
      for (let i = 0; i < Math.max(1, n); i++) out.push(take())
      return cap(out.join(' '))
    },
    /** As close to `chars` characters as whole words allow (never empty). */
    chars(chars: number): string {
      const out: string[] = [take()]
      while (out.join(' ').length < chars) out.push(take())
      if (out.length > 1 && out.join(' ').length - chars > chars - out.slice(0, -1).join(' ').length) out.pop()
      return cap(out.join(' '))
    },
  }
}

type Source = ReturnType<typeof textSource>

interface FillContext {
  level: StressLevel
  src: Source
  /** Only stretch this block type's words (`words` level), the rest stay `same`. */
  only?: string
  /** The type of the block being filled. */
  type: string
}

function fillText(kind: 'text' | 'richText', old: unknown, slot: { guidance?: string; help?: string }, maxChars: number | undefined, ctx: FillContext): unknown {
  const before = plainText(old)
  if (!before || !isProse(before)) return old
  const words = rangeIn(WORDS_RE, slot.guidance, slot.help)
  const stretch = !ctx.only || ctx.only === ctx.type
  let s: string
  if (ctx.level === 'words' && words && stretch) s = ctx.src.words(words[1])
  else if (ctx.level === 'over') s = ctx.src.words(Math.ceil((words?.[1] ?? before.split(/\s+/).length * 1.5) * 1.6))
  else s = ctx.src.chars(before.length)
  if (maxChars && ctx.level !== 'over' && s.length > maxChars) s = s.slice(0, maxChars).replace(/\s+\S*$/, '') || s.slice(0, maxChars)
  return kind === 'richText' ? { runs: [{ text: s }] } : s
}

function fillValue(v: unknown, slot: { guidance?: string; help?: string }, type: SlotType, ctx: FillContext, registry: BlockRegistry): unknown {
  switch (type.kind) {
    case 'text':
    case 'richText':
      return fillText(type.kind, v, slot, type.maxChars, ctx)
    case 'list': {
      if (!Array.isArray(v) || !v.length || type.of.kind === 'number') return v
      const items = rangeIn(ITEMS_RE, slot.guidance, slot.help)
      const lo = items?.[0] ?? type.min ?? 1
      const hi = items?.[1] ?? type.max ?? v.length
      const n = ctx.level === 'items' ? hi : ctx.level === 'min' ? lo : ctx.level === 'over' ? hi + 2 : v.length
      // "each 2–8 words" on the list applies to the item's first text field (or to a text item).
      const words = rangeIn(WORDS_RE, slot.guidance, slot.help)
      let of: SlotType = type.of
      let itemSlot: { guidance?: string; help?: string } = {}
      if (words && type.of.kind === 'object') {
        const fields = type.of.fields
        const first = Object.keys(fields).find((k) => fields[k].type.kind === 'text' || fields[k].type.kind === 'richText')
        if (first && !rangeIn(WORDS_RE, fields[first].guidance, fields[first].help)) {
          of = { ...type.of, fields: { ...fields, [first]: { ...fields[first], guidance: `${words[0]}–${words[1]} words` } } }
        }
      } else if (words) {
        itemSlot = { guidance: `${words[0]}–${words[1]} words` }
      }
      return Array.from({ length: n }, (_, i) => fillValue(JSON.parse(JSON.stringify(v[i % v.length])), itemSlot, of, ctx, registry))
    }
    case 'object': {
      if (!v || typeof v !== 'object') return v
      const o: Record<string, unknown> = { ...(v as Record<string, unknown>) }
      for (const [k, f] of Object.entries(type.fields)) {
        if (f.role === 'content' && o[k] !== undefined) o[k] = fillValue(o[k], f, f.type, ctx, registry)
      }
      return o
    }
    case 'blocks':
      return Array.isArray(v) ? v.map((b) => fillBlock(b as BlockSpec, ctx, registry)) : v
    default:
      return v
  }
}

function fillBlock(block: BlockSpec, ctx: FillContext, registry: BlockRegistry): BlockSpec {
  const def = registry.get(block.type)
  if (!def) return block
  const inner: FillContext = { ...ctx, type: block.type }
  const props: Record<string, unknown> = { ...((block.props ?? {}) as Record<string, unknown>) }
  for (const [k, slot] of Object.entries(def.schema as Record<string, SlotSpec>)) {
    if (props[k] === undefined) continue
    if (slot.role === 'content' || slot.type.kind === 'blocks') props[k] = fillValue(props[k], slot, slot.type, inner, registry)
  }
  // Containers whose children are not a schema slot (composition patterns) still get their leaves filled.
  if (Array.isArray(props.children) && !(def.schema as Record<string, SlotSpec>).children) {
    props.children = (props.children as BlockSpec[]).map((c) => fillBlock(c, ctx, registry))
  }
  return { ...block, props }
}

/** The slide with its content rewritten at `level` in `lang` (ids, layout and knobs unchanged). */
export function stressSlide(slide: SlideSpec, registry: BlockRegistry, level: StressLevel, lang: StressLang, opts: { only?: string } = {}): SlideSpec {
  const ctx: FillContext = { level, src: textSource(lang), only: opts.only, type: '' }
  const regions: Record<string, BlockSpec[]> = {}
  for (const [name, blocks] of Object.entries(slide.regions ?? {})) regions[name] = blocks.map((b) => fillBlock(b, ctx, registry))
  return { ...slide, regions }
}

/** A one-slide deck in `style` (its first palette), the slide's ids prefixed with `id`. */
export function soloDeck(slide: SlideSpec, style: DeckStyle, id = 's1'): DeckSpec {
  return {
    version: 1,
    id: `stress-${style.id}`,
    title: 'Content stress',
    theme: style.palettes[0].id,
    style: style.id,
    aspect: 'widescreen',
    slides: [{ ...prefixIds(slide, id), id }],
  }
}

/** What keeps the deck's only slide from being accepted (empty = clean), the S4.1 bar. */
export function soloProblems(deck: DeckSpec, registry: BlockRegistry): string[] {
  const [report] = analyzeDeck(deck, { registry, llmAuthored: true })
  return slideProblems(report, deckTitleSize(deck))
}

/* ─────────────────────────────── capacity ─────────────────────────────── */

export interface ListCapacity {
  /** The block id in the design (unprefixed) and the list slot. */
  block: string
  type: string
  slot: string
  /** The range the slot's guidance (else schema) gives the model. */
  range: [number, number]
  /** Most items that stay clean at the example's text length; 0 = not even the low end. */
  max: number
}

export interface DesignCapacity {
  /** Longest title (characters) that stays clean; `null` = the design has no `tls.t.title`. */
  title: number | null
  lists: ListCapacity[]
  /** The design is not clean at `same` in this language (capacities would mean nothing). */
  baseline: string[]
}

const TITLE_MAX_PROBE = 120

function setTitles(slide: SlideSpec, text: string): number {
  let n = 0
  const walk = (b: BlockSpec) => {
    if (b.type === 'tls.t.title') {
      b.props = { ...(b.props ?? {}), text: { runs: [{ text }] } }
      n++
    }
    const children = (b.props as { children?: BlockSpec[] } | undefined)?.children
    if (Array.isArray(children)) children.forEach(walk)
  }
  Object.values(slide.regions ?? {}).forEach((bs) => bs.forEach(walk))
  return n
}

/**
 * The largest title (characters, whole words of `lang`) and the most list items the design takes
 * while its slide stays clean, every other content at the `same` level. Binary search; about 7
 * oracle runs for the title and 4 per list.
 */
export function designCapacity(slide: SlideSpec, style: DeckStyle, registry: BlockRegistry, lang: StressLang): DesignCapacity {
  const base = stressSlide(slide, registry, 'same', lang)
  const baseline = soloProblems(soloDeck(base, style), registry)
  if (baseline.length) return { title: null, lists: [], baseline }

  // Title: characters.
  let title: number | null = null
  if (setTitles(JSON.parse(JSON.stringify(base)) as SlideSpec, 'x')) {
    const clean = (chars: number) => {
      const s = JSON.parse(JSON.stringify(base)) as SlideSpec
      setTitles(s, textSource(lang).chars(chars))
      return soloProblems(soloDeck(s, style), registry).length === 0
    }
    let lo = 0
    let hi = TITLE_MAX_PROBE
    if (clean(hi)) lo = hi
    else {
      while (hi - lo > 2) {
        const mid = (lo + hi) >> 1
        if (clean(mid)) lo = mid
        else hi = mid
      }
    }
    title = lo
  }

  // Lists: the top-level region blocks' content list slots (not nested pattern children).
  const lists: ListCapacity[] = []
  for (const [region, blocks] of Object.entries(base.regions ?? {})) {
    blocks.forEach((b, bi) => {
      const def = registry.get(b.type)
      if (!def) return
      for (const [key, slot] of Object.entries(def.schema as Record<string, SlotSpec>)) {
        const t = slot.type
        if (slot.role !== 'content' || t.kind !== 'list' || t.of.kind === 'number') continue
        const items = (b.props as Record<string, unknown> | undefined)?.[key]
        if (!Array.isArray(items) || !items.length) continue
        const r = rangeIn(ITEMS_RE, slot.guidance, slot.help) ?? [t.min ?? 1, t.max ?? items.length]
        const withN = (n: number) => {
          const s = JSON.parse(JSON.stringify(base)) as SlideSpec
          const blk = s.regions[region][bi]
          const list = (blk.props as Record<string, unknown[]>)[key]
          ;(blk.props as Record<string, unknown>)[key] = Array.from({ length: n }, (_, i) => JSON.parse(JSON.stringify(list[i % list.length])))
          return soloProblems(soloDeck(s, style), registry).length === 0
        }
        let max = 0
        if (withN(r[1])) max = r[1]
        else {
          let lo = r[0] - 1
          let hi = r[1]
          if (withN(r[0])) {
            lo = r[0]
            while (hi - lo > 1) {
              const mid = (lo + hi) >> 1
              if (withN(mid)) lo = mid
              else hi = mid
            }
            max = lo
          }
        }
        lists.push({ block: b.id, type: b.type, slot: key, range: r, max })
      }
    })
  }
  return { title, lists, baseline }
}

/* ─────────────────────────────── the run ─────────────────────────────── */

/** One request shape to stress: a style, a language, the roles its outline needs, its assets. */
export interface StressCase {
  id: string
  style: DeckStyle
  lang: StressLang
  roles: readonly RecipeRole[]
  assets?: Partial<SlideAssets>
}

export interface StressRow {
  case: string
  style: string
  lang: StressLang
  role: RecipeRole
  /** `recipe/look`. */
  design: string
  /** Problems per level; empty = clean. */
  levels: Record<StressLevel, string[]>
}

/**
 * Every design the picker can offer for each case's roles (its style, its assets, any seed:
 * all look candidates), filled at every level. A (style, language, design) is run once.
 */
export function runContentStress(cases: readonly StressCase[], registry: BlockRegistry, levels: readonly StressLevel[] = STRESS_LEVELS): StressRow[] {
  const rows: StressRow[] = []
  const seen = new Set<string>()
  for (const c of cases) {
    const look = deckLook(c.style, 0)
    for (const role of new Set(c.roles)) {
      const candidates = lookCandidates(eligibleRecipes(role, c.style, registry), c.style, registry, look).filter((k) => assetsAllow(k.recipe, k.variant, c.assets))
      for (const k of candidates) {
        const design = `${k.recipe.id}/${k.variant}`
        const key = `${c.style.id}|${c.lang}|${design}`
        if (seen.has(key)) continue
        seen.add(key)
        const template = applyDeckLook(recipeSlide(k.recipe, registry, k.variant, c.style), look, k.recipe, k.variant)
        const out = {} as Record<StressLevel, string[]>
        for (const level of levels) out[level] = soloProblems(soloDeck(stressSlide(template, registry, level, c.lang), c.style), registry)
        rows.push({ case: c.id, style: c.style.id, lang: c.lang, role, design, levels: out })
      }
    }
  }
  return rows
}
