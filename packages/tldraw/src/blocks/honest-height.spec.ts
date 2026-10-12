/**
 * spro compose PLAN.md B1 — honest heights over every option. A composed slide sets knobs freely
 * (`leader: rule`, `layout: inline`, …); a block that paints below the height it reports makes the
 * oracle report `content/overflow` that no rewording fixes (llm-eval 2026-10-13: every composed
 * tls.t.kv-list with `leader: rule` painted 7 units low). Each block's example is laid out with
 * each value of each enum option, one at a time; no leaf may end below the root box.
 */
import { BUILT_IN_BLOCKS } from './library'
import { makeCtx, makeRegistry } from './library/text/test-helpers'
import { absoluteLeaves } from './library/text/standard-suite'

const reg = makeRegistry()

function cases() {
  const out: Array<[string, string, unknown]> = []
  for (const def of BUILT_IN_BLOCKS) {
    if (!def.describe?.example || def.type.startsWith('tls.l.') || def.scope === 'slide') continue
    for (const [name, slot] of Object.entries(def.schema ?? {})) {
      if (slot.role !== 'option' || slot.type.kind !== 'enum') continue
      for (const v of slot.type.values) out.push([def.type, name, v])
    }
    out.push([def.type, '(example)', undefined])
  }
  return out
}

/** Known, measured exceptions (fix the block, then remove the line). */
const KNOWN = new Set<string>([])

it.each(cases())('%s %s=%s paints inside its reported height', (type, knob, value) => {
  const def = BUILT_IN_BLOCKS.find((d) => d.type === type)!
  const props = { ...(def.defaults as object), ...(def.describe!.example.props as object), ...(knob === '(example)' ? {} : { [knob]: value }) }
  const [w, h] = def.size.preferred
  const tree = def.layout(props as never, makeCtx({ width: w, height: h * 2 }, reg))
  const over = Math.max(0, ...absoluteLeaves(tree).map((l) => l.y + l.height - tree.box.height))
  if (KNOWN.has(`${type} ${knob}=${value}`)) return
  expect([type, knob, value, Math.round(over)]).toEqual([type, knob, value, 0])
})
