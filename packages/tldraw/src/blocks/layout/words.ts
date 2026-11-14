/** spro sprint 2026-11c (c1, MĂM s13 "Delivera|bles"): line ends that cut a word — a letter or digit on both
 *  sides of the break (a break at a space keeps the space on one of the lines). Han / kana / Thai break
 *  between letters by design. */
const WORD_END = /[\p{L}\p{N}]$/u
const WORD_START = /^[\p{L}\p{N}]/u
const NO_SPACES = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u
export function brokenWords(lines: ReadonlyArray<{ text: string }>, source?: string): number {
  let n = 0
  for (let i = 1; i < lines.length; i++) {
    const a = lines[i - 1].text
    const b = lines[i].text
    if (!WORD_END.test(a) || !WORD_START.test(b) || NO_SPACES.test(a.slice(-1)) || NO_SPACES.test(b[0])) continue
    // with the text at hand, a hard line break ("results\nNext") is no cut: the two pieces must touch in it
    if (source !== undefined && !source.includes((a.split(/\s/).pop() ?? '') + (b.split(/\s/)[0] ?? ''))) continue
    n++
  }
  return n
}

/**
 * Cut words in a laid-out tree. A centred or end-aligned text is placed one node per line (parts
 * `title[1][0]`, `title[1][1]`…): those nodes are read as one text, in order.
 */
export function cutWordsIn(root: { k: string }, source?: string): number {
  const texts = new Map<string, Array<{ text: string }>>()
  let n = 0
  const walk = (node: any) => {
    if (node.k === 'group') return node.children.forEach(walk)
    if (node.k !== 'text') return
    const part: string | undefined = node.part
    const m = part ? /^(.*\])\[\d+\]$/.exec(part) : null
    if (!m || node.lines.length !== 1) {
      n += brokenWords(node.lines, source)
      return
    }
    texts.set(m[1], [...(texts.get(m[1]) ?? []), ...node.lines])
  }
  walk(root)
  for (const lines of texts.values()) n += brokenWords(lines, source)
  return n
}

/**
 * Every text a block's props hold, one per line (a rich text's runs joined): the `source` that tells a cut word
 * from a wrap at a space whose space the layout dropped from the line's end (S24-b: `tls.c.recap` points and
 * `tls.g.cycle` labels lose it, and "biên gộp|31,8%" read as a cut).
 */
export function propsText(v: unknown): string {
  const out: string[] = []
  const walk = (x: unknown, key: string) => {
    if (typeof x === 'string') {
      if (key !== 'type' && key !== 'id') out.push(x)
    } else if (Array.isArray(x)) x.forEach((y) => walk(y, key))
    else if (x && typeof x === 'object') {
      const runs = (x as { runs?: unknown }).runs
      if (Array.isArray(runs) && runs.every((r) => r && typeof (r as { text?: unknown }).text === 'string')) {
        out.push(runs.map((r) => (r as { text: string }).text).join(''))
        return
      }
      for (const [k, y] of Object.entries(x)) walk(y, k)
    }
  }
  walk(v, '')
  return out.join('\n')
}
