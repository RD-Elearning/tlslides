/**
 * tls.c.comparison `style: poster` (spro creative CR13, PLAN Appendix C.3): two contenders, a big
 * number each (the optional `metric` of a column), its title and a few short lines under it, on
 * the shared poster layout — the biggest metric type that fits the box (`posterFit`). A comparison
 * of three columns, or with no metric at all, is drawn by the regular layouts.
 */
import type { BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import { posterFit, type Cell, type PosterOptions } from '../_poster'
import type { ComparisonProps } from './schema'

const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max).trim() : typeof v === 'number' ? String(v) : '')

/** True when the poster form applies: two columns and at least one `metric`. */
export function isPoster(props: ComparisonProps): boolean {
  const cols = Array.isArray(props.columns) ? props.columns : []
  return props.style === 'poster' && cols.length === 2 && cols.some((c) => !!c && !!clean((c as { metric?: unknown }).metric, 12))
}

function cells(props: ComparisonProps, metric: 'display' | 'title' | 'heading'): { main: Cell[]; opts: PosterOptions } {
  const hi = typeof props.highlight === 'number' ? props.highlight : -1
  const items: BlockSpec[] = props.columns.slice(0, 2).map((col, i) => {
    const m = clean((col as { metric?: unknown }).metric, 12)
    const lines = (Array.isArray(col.items) ? col.items : []).map((t) => clean(t, 120)).filter(Boolean).slice(0, 4)
    const kids: BlockSpec[] = []
    if (m) kids.push({ id: `metric-${i}`, type: 'tls.t.title', props: { text: m, size: metric, color: hi === i || hi < 0 ? 'accent' : 'text' } })
    kids.push({ id: `title-${i}`, type: 'tls.t.title', props: { text: clean(col.title, 60), size: 'subheading' } })
    if (lines.length) kids.push({ id: `items-${i}`, type: 'tls.t.bullets', props: { items: lines.map((text) => ({ text })), marker: 'dash' } })
    return { id: `side-${i}`, type: 'tls.l.card', props: { padding: 'md', children: kids, $block: { style: { surface: 'surfaceAlt' } } } }
  })
  return { main: [{ spec: { id: 'sides', type: 'tls.l.grid', props: { columns: 2, gap: 'lg', sizing: 'equal', children: items } }, group: 'side', grid: { columns: 2, items } }], opts: {} }
}

export function layoutPoster(props: ComparisonProps, ctx: LayoutContext): LayoutNode {
  return posterFit(ctx, (['display', 'title', 'heading'] as const).map((m) => cells(props, m)))
}
