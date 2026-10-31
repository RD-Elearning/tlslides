/**
 * L03 — a deterministic permutation for activities that show their items shuffled (match, order,
 * sort). `layout()` and `template()` are pure: the poster, the PDF and the live block must show the
 * same order, so the shuffle is seeded by a hash of the block id, never by `Math.random`.
 */

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The indices 0..n-1 in a seeded order. With `notIdentity`, n ≥ 2 never comes back in order. */
export function seededOrder(n: number, seed: string, notIdentity = false): number[] {
  const idx = Array.from({ length: n }, (_, i) => i)
  const rand = rng(hashString(seed))
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  if (notIdentity && n >= 2 && idx.every((v, i) => v === i)) [idx[0], idx[1]] = [idx[1], idx[0]]
  return idx
}
