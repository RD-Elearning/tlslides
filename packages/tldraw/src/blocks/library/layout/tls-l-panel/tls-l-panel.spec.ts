/**
 * S11 (sprint 2026-11b) — tls.l.panel: each surface in every deck style keeps its text readable (contrast
 * findings from the layout oracle), and panels in a split (depth 3: split, panel, atoms) lay out clean.
 */
import { analyzeDeck } from '../../../layout-report'
import { BUILT_IN_STYLES, getDeckStyle } from '../../../styles'
import { checkGrammar } from '../../../composition-grammar'
import { defaultBlockRegistry } from '../../../validate-deck-spec'
import { panelStyle } from './layout'
import type { BlockSpec, DeckSpec, SlideSpec } from '../../../types'

const registry = defaultBlockRegistry()
const title = (id: string, text: string): BlockSpec => ({ id, type: 'tls.t.title', props: { text, size: 'subheading' } })
const body = (id: string, text: string): BlockSpec => ({ id, type: 'tls.t.body', props: { text } })
const panel = (id: string, surface: string, emphasis = 'none'): BlockSpec => ({
  id,
  type: 'tls.l.panel',
  props: { surface, emphasis, padding: 'lg', children: [title(`${id}h`, '42% change major'), body(`${id}b`, 'Most students who switch do it in the first year, after one term of the new courses.')] },
})
const slide = (a: string, b: string, emphasis = 'none'): SlideSpec => ({
  id: 's1',
  layout: 'timeline',
  regions: {
    title: [{ id: 't', type: 'tls.t.title', props: { text: 'Why students switch' } }],
    timeline: [{ id: 'sp', type: 'tls.l.split', props: { ratio: 0.4, children: [panel('p1', a, emphasis), panel('p2', b)] } }],
  },
})
const deckOf = (style: (typeof BUILT_IN_STYLES)[number], s: SlideSpec): DeckSpec => ({ version: 1, id: `panel-${style.id}`, title: 'panel', theme: style.palettes[0].id, style: style.id, aspect: 'widescreen', slides: [s] })

describe('tls.l.panel', () => {
  it('maps each surface to the card style it stands for', () => {
    expect(panelStyle('accent')).toEqual({ surface: 'accent' })
    expect(panelStyle('inverted')).toEqual({ tone: 'inverted' })
    expect(panelStyle('outline')).toEqual({ tone: 'outline' })
    expect(panelStyle('alt')).toEqual({ surface: 'surfaceAlt' })
    expect(panelStyle('base')).toEqual({})
  })

  const styles = BUILT_IN_STYLES.map((s) => getDeckStyle(s.id) ?? s)
  it.each(styles.map((s) => [s.id, s]))('%s: accent, inverted and alt panels in a split — no contrast, overflow or overlap error', (_id, style) => {
    for (const [a, b, em] of [['accent', 'base', 'band'], ['inverted', 'outline', 'corner'], ['alt', 'glass', 'none']] as const) {
      const s = slide(a, b, em)
      expect(checkGrammar(s, registry).filter((f) => f.level === 'error')).toEqual([])
      const report = analyzeDeck(deckOf(style as never, s), { registry, llmAuthored: true })[0]
      const bad = report.findings.filter((f) => f.severity === 'error' || /^contrast\//.test(f.code))
      expect([a, bad.map((f) => `${f.code} ${f.message}`)]).toEqual([a, []])
    }
  })

  it('two focal panels on one slide are a grammar/accent warning', () => {
    const f = checkGrammar(slide('accent', 'inverted'), registry).filter((x) => x.rule === 'grammar/accent')
    expect(f.map((x) => x.level)).toEqual(['warning'])
  })
})
