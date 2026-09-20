/**
 * Nearest-name suggestion, shared by every module that turns a wrong name into a fix instruction.
 *
 * Two modules need this and used to disagree. `slide-compiler.ts` had a private `nearestRegion`
 * that, despite its name, scored by longest common *prefix*: `"lft"` and `"left"` share only a
 * leading `"l"`, scoring `1/4 = 0.25`, below its own `0.3` cutoff — so the single most likely
 * typo a model makes produced no suggestion at all. `validate-deck-spec.ts` (Q19) then wrote a
 * real Levenshtein implementation because the prefix scorer was too weak for the AI repair loop
 * its findings feed. This module is that Levenshtein implementation, extracted so both callers
 * share one answer: a compiler finding and a validator finding for the same misnamed region now
 * suggest the same replacement.
 *
 * Pure: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

/** Levenshtein edit distance, two-row rolling buffer (O(min(m,n)) space). */
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = new Array<number>(n + 1)
  let curr = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    const swap = prev
    prev = curr
    curr = swap
  }
  return prev[n]
}

/**
 * Nearest candidate by case-insensitive edit distance, or `undefined` when nothing is close
 * enough to be a plausible typo rather than a different name entirely.
 *
 * The threshold scales with name length (`max(2, ceil(longer / 2))`) so that short names like
 * `left` tolerate the one- and two-character slips a model actually makes, while a genuinely
 * unrelated name still returns `undefined` rather than a misleading suggestion.
 */
export function nearestName(target: string, candidates: string[]): string | undefined {
  if (!target || candidates.length === 0) return undefined
  let best: string | undefined
  let bestDistance = Infinity
  const lowerTarget = target.toLowerCase()
  for (const candidate of candidates) {
    const d = levenshtein(lowerTarget, candidate.toLowerCase())
    if (d < bestDistance) {
      bestDistance = d
      best = candidate
    }
  }
  if (best === undefined) return undefined
  const threshold = Math.max(2, Math.ceil(Math.max(target.length, best.length) / 2))
  return bestDistance <= threshold ? best : undefined
}
