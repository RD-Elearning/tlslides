/**
 * spro sprint 2026-11b S05-B — the measured fill of a slide's text blocks: how much of what each
 * text-bearing block's **final box** holds its text uses.
 *
 * For each block whose fits row says `lines` or `paragraphs` (and that is not a frame or a
 * decoration), its long text leaves (`SHORT_FIELD` names stay as they are) are lengthened with the
 * block's own words by a factor, the block alone in its own box with the deck's style; the largest
 * factor that still lays out without an overflow, a cut or type shrunk under the reading floor gives
 * `fit = used × factor`, `ratio = used / fit`. At most 6 layouts per block. Pure, deterministic.
 *
 * Costly next to a plain check, so the caller asks for it (`/check` `fillText: true`, text decks only).
 */
import type { LayoutReport } from '../layout-report'
import type { BlockRegistry } from '../registry'
import type { BlockSpec, DeckSpec, SlotSpec } from '../types'
import { layoutOk, leaves, setAt, type Leaf } from './textBudgets'

export interface SlotFill {
  block: string
  type: string
  /** Characters of the long leaves today. */
  used: number
  /** Characters they could hold at this box (≥ used; `used × 4` is the probe ceiling). */
  fit: number
  /** used / fit, 0-1. */
  ratio: number
}

const PROBE_MAX = 4
/** Relations of frames and decoration: their text is not judged for fill. */
const NOT_INFO = new Set(['cover', 'divider', 'agenda', 'closing', 'statement'])

/** `text` repeated word by word until it is about `n` characters. */
function lengthen(text: string, n: number): string {
  const w = text.split(/\s+/).filter(Boolean)
  if (!w.length) return text
  const out: string[] = []
  let i = 0
  while (out.join(' ').length < n) out.push(w[i++ % w.length])
  return out.join(' ')
}

function grown(block: BlockSpec, ls: Leaf[], factor: number): BlockSpec {
  const b = JSON.parse(JSON.stringify(block)) as BlockSpec
  const props = (b.props ?? {}) as Record<string, unknown>
  for (const l of ls) {
    if (l.short) continue
    const s = lengthen(l.base, Math.round(l.base.length * factor))
    setAt(props, l.path, l.rich ? { runs: [{ text: s }] } : s)
  }
  return { ...b, props }
}

/** The block's spec by id on the slide (regions, then free). */
function blockOf(deck: DeckSpec, slideIndex: number, id: string): BlockSpec | undefined {
  const s = deck.slides[slideIndex]
  for (const bs of Object.values(s.regions ?? {})) for (const b of bs) if (b.id === id) return b
  return (s.free ?? []).find((p) => p.block.id === id)?.block
}

export function slotFill(deck: DeckSpec, slideIndex: number, report: LayoutReport, registry: BlockRegistry): SlotFill[] {
  const out: SlotFill[] = []
  for (const r of report.blocks) {
    if (r.region === 'title' || r.layer === 'backdrop' || r.outOfFlow) continue
    const def = registry.get(r.type)
    const load = def?.fits?.textLoad
    if (!def || !(load === 'lines' || load === 'paragraphs')) continue
    const rel = def.fits?.relations ?? []
    if (!rel.length || rel.every((x) => NOT_INFO.has(x))) continue
    const spec = blockOf(deck, slideIndex, r.id)
    if (!spec) continue
    const ls = leaves((spec.props ?? {}) as Record<string, unknown>, def.schema as Record<string, SlotSpec>).filter((l) => !l.short)
    if (!ls.length) continue
    const used = ls.reduce((n, l) => n + l.base.length, 0)
    const base = layoutOk(deck, spec, r.box, registry).sizes
    const ok = (k: number) => layoutOk(deck, grown(spec, ls, k), r.box, registry, base).ok
    // probes: 1.5, 2.5, 4, then up to 3 bisections between the last pass and the first miss
    let lo = 1
    let hi = PROBE_MAX
    let missed = false
    for (const k of [1.5, 2.5, PROBE_MAX]) {
      if (ok(k)) lo = k
      else {
        hi = k
        missed = true
        break
      }
    }
    if (missed) {
      for (let i = 0; i < 3 && hi - lo > 0.1; i++) {
        const mid = (lo + hi) / 2
        if (ok(mid)) lo = mid
        else hi = mid
      }
    }
    const fit = Math.round(used * lo)
    out.push({ block: r.id, type: r.type, used, fit, ratio: Math.round((used / Math.max(1, fit)) * 1000) / 1000 })
  }
  return out
}

/** S05-b: the band floor per reading mode (`used / fit`). */
export const FILL_FLOOR: Record<'presentation' | 'balanced' | 'text', number> = { presentation: 0.35, balanced: 0.5, text: 0.65 }
