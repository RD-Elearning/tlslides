/** spro creative CR2 — the compose kit for exact types, and the compact capability cards. */

import { BUILT_IN_BLOCKS } from './library'
import { cardText } from './capability-digest'
import { composeKit } from './compose-kit'
import { getDeckStyle } from './styles'

describe('creative CR2 kit and cards', () => {
  it('composeKit({types}) details exactly those types, lists their variants and the moves\' layouts', () => {
    const kit = composeKit({ style: getDeckStyle('doodle')!, types: ['tls.g.cycle', 'tls.t.takeaway'] })
    expect(kit.types).toEqual(['tls.g.cycle', 'tls.t.takeaway'])
    expect(kit.markdown).toContain('### `tls.g.cycle`')
    expect(kit.markdown).not.toContain('### `tls.g.orbit`')
    expect(kit.variants!['tls.g.cycle']).toEqual(['ring', 'cards', 'minimal'])
    expect(kit.markdown).toContain('`ring` (circle nodes on the arc: nodeStyle=circle, arrowStyle=arc)')
    expect(kit.layouts).toEqual(expect.arrayContaining(['timeline', 'two-column']))
  })

  it('a type the style avoids is left out', () => {
    const style = getDeckStyle('doodle')!
    const avoided = style.avoid[0]
    expect(composeKit({ style, types: [avoided, 'tls.g.cycle'] }).types).toEqual(['tls.g.cycle'])
  })

  it('every AI-eligible block has a one-line card with what it shows and its variants', () => {
    for (const d of BUILT_IN_BLOCKS.filter((x) => !x.editorOnly)) {
      const c = cardText(d)
      expect(c.split('\n')).toHaveLength(1)
      expect(c.startsWith(`\`${d.type}\``)).toBe(true)
      if (d.variants?.length) expect(c).toContain(`variants: ${d.variants[0].id}`)
    }
    expect(cardText(BUILT_IN_BLOCKS.find((d) => d.type === 'tls.c.journey')!)).toContain('shows timeline/sequence/story')
    expect(BUILT_IN_BLOCKS.find((d) => d.type === 'tls.g.cycle')!.fits!.moves).toEqual(expect.arrayContaining(['loop']))
  })
})
