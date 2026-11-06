/**
 * spro sprint 2026-11b S12 — the eight new page skeletons end to end: each region filled, every style, the
 * oracle finds no error (no overflow, overlap or low contrast — the painted band / aside / frame included),
 * the painted surfaces compile as locked `style:` backdrops, and the editor round trip never writes them back.
 */
import { analyzeDeck } from './layout-report'
import { BUILT_IN_STYLES, getDeckStyle } from './styles'
import { defaultBlockRegistry } from './validate-deck-spec'
import { getSlideLayout } from './slide-layouts'
import { deckSpecToDocument } from './deck-document'
import { documentToDeckSpec } from './slide-decompiler'
import { resolveTokens } from './tokens'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import type { BlockSpec, DeckSpec, SlideSpec } from './types'

const registry = defaultBlockRegistry()
const NEW = ['header-band', 'magazine', 'mosaic', 'two-rows', 'hero-top', 'framed', 'aside', 'stage'] as const
const tokens = resolveTokens(DEFAULT_DECK_THEME)
const body = (id: string, text: string): BlockSpec => ({ id, type: 'tls.t.body', props: { text } })

function slideFor(id: (typeof NEW)[number]): SlideSpec {
  const regions = Object.keys(getSlideLayout(id)!.compile({ width: 1920, height: 1080 }, tokens))
  const out: Record<string, BlockSpec[]> = {}
  regions.forEach((r, i) => {
    if (r === 'title') out[r] = [{ id: 't', type: 'tls.t.title', props: { text: 'Why the sky is blue' } }]
    else if (r === 'visual') out[r] = [{ id: 'v', type: 'tls.m.image', props: { src: '/demo/photo-2.svg', alt: 'Sky', fit: 'cover' } }]
    else out[r] = [body(`b${i}`, 'Sunlight holds every colour; air scatters short blue waves far more than red ones.')]
  })
  return { id: 's1', layout: id, regions: out }
}
const deckOf = (style: (typeof BUILT_IN_STYLES)[number], slides: SlideSpec[]): DeckSpec => ({ version: 1, id: `l-${style.id}`, title: 'l', theme: style.palettes[0].id, style: style.id, aspect: 'widescreen', slides })

describe('S12 layouts v2', () => {
  const styles = BUILT_IN_STYLES.map((s) => getDeckStyle(s.id) ?? s)
  it.each(styles.map((s) => [s.id, s]))('%s: every new skeleton, filled, has no oracle error', (_id, style) => {
    const bad: string[] = []
    for (const id of NEW) {
      const report = analyzeDeck(deckOf(style as never, [slideFor(id)]), { registry, llmAuthored: true })[0]
      for (const f of report.findings.filter((x) => x.severity === 'error' || /^contrast\//.test(x.code))) bad.push(`${id}: ${f.code} ${f.message}`)
    }
    expect(bad).toEqual([])
  }, 120000)

  it('painted surfaces compile as locked style backdrops and never come back from the editor', () => {
    const style = getDeckStyle('corporate')!
    const deck = deckOf(style, NEW.map((id, i) => ({ ...slideFor(id), id: `s${i}` })))
    const { document } = deckSpecToDocument(deck)
    const painted = Object.values(document.pages).flatMap((p) => Object.values(p.shapes).filter((sh) => sh.id.includes('style:layout:')))
    expect(painted.length).toBe(3) // header band, frame panel, aside panel
    for (const sh of painted) expect((sh as { isLocked?: boolean }).isLocked).toBe(true)
    const back = documentToDeckSpec(document)
    const ids = JSON.stringify(back.spec ?? back)
    expect(ids).not.toContain('style:layout')
  })
})
