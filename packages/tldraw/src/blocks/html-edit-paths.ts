/**
 * Editor E02 (html blocks) — a `kind: 'html'` block paints its template's own markup, which carries
 * no `data-prop-path`, so the live editor could neither edit its text in place nor drill into its
 * items. This pass marks the template's text elements after each (re)template:
 *
 * 1. every poster text leaf with a `propPath` (in paint order), its lines joined;
 * 2. then every string prop the poster did not name, when its text is unique in the props.
 *
 * Each is matched to the first unmarked, innermost HTML element whose text equals it (whitespace
 * ignored: poster lines are joined by `<br>`, which has no text). No match → no mark (the inspector
 * still edits that field). DOM-only; the template output itself is unchanged.
 */

import type { LayoutNode } from './types'

const squash = (s: string) => s.replace(/\*\*/g, '').replace(/\s+/g, '')

function posterTexts(poster: LayoutNode | undefined): Array<[path: string, text: string]> {
  const byPath = new Map<string, string>()
  const walk = (n: LayoutNode): void => {
    if (n.k === 'group') n.children.forEach(walk)
    else if (n.k === 'text' && n.propPath) {
      const t = n.lines.map((l) => l.text).join('')
      byPath.set(n.propPath, (byPath.get(n.propPath) ?? '') + t)
    }
  }
  if (poster) walk(poster)
  return [...byPath]
}

function propTexts(props: unknown, base = '', out: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof props === 'string') {
    if (base) out.push([base, props])
  } else if (Array.isArray(props)) props.forEach((v, i) => propTexts(v, base ? `${base}.${i}` : String(i), out))
  else if (props && typeof props === 'object') {
    const runs = (props as { runs?: unknown }).runs
    if (Array.isArray(runs) && base) out.push([base, runs.map((r) => (r && typeof r.text === 'string' ? r.text : '')).join('')])
    else for (const [k, v] of Object.entries(props)) propTexts(v, base ? `${base}.${k}` : k, out)
  }
  return out
}

/** Mark `root`'s text elements with the prop paths they paint. Returns how many were marked. */
export function markHtmlEditPaths(root: HTMLElement, props: Record<string, unknown>, poster: LayoutNode | undefined): number {
  const fromPoster = posterTexts(poster)
  const named = new Set(fromPoster.map(([p]) => p))
  const fromProps = propTexts(props).filter(([p]) => !named.has(p))
  const counts = new Map<string, number>()
  for (const [, t] of fromProps) counts.set(squash(t), (counts.get(squash(t)) ?? 0) + 1)
  const wanted = [...fromPoster, ...fromProps.filter(([, t]) => counts.get(squash(t)) === 1)]
    .map(([p, t]) => [p, squash(t)] as const)
    .filter(([, t]) => t.length > 0)
  if (!wanted.length) return 0

  const els = Array.from(root.querySelectorAll<HTMLElement>('*')).filter(
    (e) => !(typeof SVGElement !== 'undefined' && e instanceof SVGElement) && e.tagName !== 'STYLE' && e.tagName !== 'SCRIPT'
  )
  const text = new Map<HTMLElement, string>()
  for (const e of els) text.set(e, squash(e.textContent ?? ''))
  const used = new Set<HTMLElement>()
  let marked = 0
  for (const [path, want] of wanted) {
    const hit = els.find(
      (e) =>
        !used.has(e) &&
        text.get(e) === want &&
        // innermost: no element child paints the same text
        !Array.from(e.children).some((c) => text.get(c as HTMLElement) === want)
    )
    if (!hit) continue
    used.add(hit)
    hit.setAttribute('data-prop-path', path)
    marked++
  }
  return marked
}
