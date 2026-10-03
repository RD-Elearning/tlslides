/**
 * Uniformly scale an SVG path's `d` string.
 *
 * The `icon` layout node draws its path in a `viewBox` equal to its own box size, so a 24x24
 * icon path only fills a box that is exactly 24 wide. To draw an icon at another size, blocks
 * scale the path data itself with this helper (`scaleIconPath(icon.path, size / 24)`).
 *
 * Every numeric parameter scales linearly, including relative commands and arc radii. Arc
 * rotation and the two arc flags are left alone. Pure; returns the input on malformed data.
 */

const ARGS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 }

function fmt(n: number): string {
  const r = Math.round(n * 1000) / 1000
  return Object.is(r, -0) ? '0' : String(r)
}

export function scaleIconPath(d: string, factor: number): string {
  if (!Number.isFinite(factor) || factor <= 0) return d
  if (factor === 1) return d
  let pos = 0
  const skip = () => {
    while (pos < d.length && /[\s,]/.test(d[pos])) pos++
  }
  const num = (): number | undefined => {
    skip()
    const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i.exec(d.slice(pos))
    if (!m) return undefined
    pos += m[0].length
    return parseFloat(m[0])
  }
  const flag = (): string | undefined => {
    skip()
    if (d[pos] === '0' || d[pos] === '1') return d[pos++]
    return undefined
  }

  const out: string[] = []
  let cmd = ''
  for (;;) {
    skip()
    if (pos >= d.length) break
    if (/[a-zA-Z]/.test(d[pos])) {
      cmd = d[pos++]
      out.push(cmd)
      if (cmd.toLowerCase() === 'z') continue
    } else if (cmd === '' || cmd.toLowerCase() === 'z') {
      return d
    }
    const lower = cmd.toLowerCase()
    const n = ARGS[lower]
    if (n === undefined || n === 0) return d
    const args: string[] = []
    for (let k = 0; k < n; k++) {
      if (lower === 'a' && (k === 3 || k === 4)) {
        const f = flag()
        if (f === undefined) return d
        args.push(f)
        continue
      }
      const v = num()
      if (v === undefined) return d
      // arc rotation (k === 2) is an angle, not a length
      args.push(lower === 'a' && k === 2 ? fmt(v) : fmt(v * factor))
    }
    out.push(args.join(' '))
  }
  return out.join(' ')
}
