/**
 * spro sprint 2026-11b S05-A — the static text budget table: directions, not exact numbers.
 */
import { defaultBlockRegistry } from '../validate-deck-spec'
import { blockBudget, budgetLine, type RegionClass } from './textBudgets'
import committed from '../__generated__/text-budgets.json'

const registry = defaultBlockRegistry()

describe('text budgets', () => {
  it('bullets in a full region hold more per item than in a third', () => {
    const full = blockBudget('tls.t.bullets', 'full', 'vi', registry)!
    const third = blockBudget('tls.t.bullets', 'third', 'vi', registry)!
    expect(full.slots!['items[].text'].fit).toBeGreaterThan(third.slots!['items[].text'].fit)
  })

  it('a card keeps its title short and grows its text with the room', () => {
    const half = blockBudget('tls.c.cards', 'half', 'en', registry)!
    const full = blockBudget('tls.c.cards', 'full', 'en', registry)!
    expect(half.slots!['cards[].title'].short).toBe(true)
    expect(half.slots!['cards[].title'].fit).toBe(half.slots!['cards[].title'].base)
    expect(full.slots!['cards[].text'].fit).toBeGreaterThan(half.slots!['cards[].text'].fit)
  })

  it('a body text stops at the reading floor, not at a shrunk type', () => {
    const third = blockBudget('tls.t.body', 'third', 'en', registry)!
    expect(third.slots!.text.fit).toBeGreaterThan(third.slots!.text.base)
    expect(third.factor).toBeLessThan(32)
  })

  it('the kit line names the band per item', () => {
    const b = blockBudget('tls.c.cards', 'half', 'vi', registry)!
    const line = budgetLine(b, [0.65, 0.95])
    expect(line).toMatch(/^per item \(at \d+ items; fewer when there are more\): (title ≤ \d+ chars, )?text \d+–\d+ chars$/)
  })

  it('verbatim slots (code, formula, the code language) are copied, not grown', () => {
    const code = blockBudget('tls.t.code', 'full', 'en', registry)
    const slots = code?.slots ?? {}
    for (const [k, v] of Object.entries(slots)) if (/^(code|language)$/.test(k)) expect(v.short).toBe(true)
    const f = blockBudget('tls.t.formula', 'full', 'en', registry)
    for (const [k, v] of Object.entries(f?.slots ?? {})) if (k === 'expression') expect(v.short).toBe(true)
  })

  // the full table takes ~40 s to rebuild: a sample keeps the committed file honest
  // (regenerate: node tools/text-budgets/cli.js; --check compares the whole file)
  it('the committed table matches the code on a sample', () => {
    for (const [type, cls] of [['tls.t.bullets', 'half'], ['tls.c.cards', 'full'], ['tls.t.body', 'third']] as Array<[string, RegionClass]>) {
      const b = blockBudget(type, cls, 'vi', registry)!
      const row = (committed as { blocks: Record<string, Record<string, Record<string, { factor: number; slots: unknown }>>> }).blocks[type][cls].vi
      expect({ type, cls, factor: row.factor, slots: row.slots }).toEqual({ type, cls, factor: b.factor, slots: b.slots })
    }
  })
})
