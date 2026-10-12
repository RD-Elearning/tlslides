/**
 * The formula notation: `_` / `^` followed by a `{…}` group, a run of letters or a run of digits
 * lowers / raises it — `h_min`, `x_i`, `2^h`, `log_2N` (the run stops where letters meet digits,
 * so the N stays on the line). Pure.
 */

export type Seg = { text: string; kind: 'base' | 'sub' | 'sup' }

export function parseFormula(line: string): Seg[] {
  const out: Seg[] = []
  let base = ''
  const flush = () => {
    if (base) out.push({ text: base, kind: 'base' })
    base = ''
  }
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if ((ch === '_' || ch === '^') && i + 1 < line.length) {
      let text: string
      if (line[i + 1] === '{') {
        const end = line.indexOf('}', i + 2)
        text = end < 0 ? line.slice(i + 2) : line.slice(i + 2, end)
        i = end < 0 ? line.length : end
      } else {
        const run = /^[A-Za-z]+|^[0-9]+/.exec(line.slice(i + 1))
        text = run ? run[0] : line[i + 1]
        i += text.length
      }
      if (!text) continue
      flush()
      out.push({ text, kind: ch === '_' ? 'sub' : 'sup' })
    } else base += ch
  }
  flush()
  return out
}
