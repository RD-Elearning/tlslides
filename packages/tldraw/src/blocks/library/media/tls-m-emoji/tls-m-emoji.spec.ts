/**
 * tls.m.emoji (spro creative CR9) — the emoji as a `data:` image, sized by step, backings, unknown
 * names linted, icon names mapped.
 */
import { tlsMEmoji } from './index'
import { emojiName } from './layout'
import { standardBlockSuite, leavesOf } from '../../text/standard-suite'
import { ctxNoAssets } from '../media-test'

standardBlockSuite(tlsMEmoji, { noCapacity: true })

const lay = (props: Record<string, unknown>, w = 400, h = 300) => tlsMEmoji.layout({ ...(tlsMEmoji.defaults as any), ...props } as any, ctxNoAssets(w, h))

describe('tls.m.emoji', () => {
  it('draws the emoji as a data: SVG image at the size step, capped by the box', () => {
    const img = leavesOf(lay({ emoji: 'rocket', size: 'lg' }), 'emoji').find((l) => l.k === 'image')!
    expect(img.width).toBe(160)
    expect((img.node as any).url).toMatch(/^data:image\/svg\+xml/)
    expect(leavesOf(lay({ emoji: 'rocket', size: 'xl' }, 100, 300), 'emoji')[0].width).toBe(100)
  })

  it('maps icon names and loose spellings; an unknown name is a placeholder and a lint warning', () => {
    expect(emojiName('bulb')).toBe('light-bulb')
    expect(emojiName('Party popper')).toBe('party-popper')
    expect(leavesOf(lay({ emoji: 'xyzzy' }), 'emoji')[0].k).toBe('icon')
    expect(tlsMEmoji.lint!({ emoji: 'xyzzy' } as any, { box: { x: 0, y: 0, width: 1, height: 1 } })[0].rule).toBe('emoji/unknown')
    expect(tlsMEmoji.lint!({ emoji: 'rocket' } as any, { box: { x: 0, y: 0, width: 1, height: 1 } })).toEqual([])
  })

  it('a backing sits behind the emoji and the whole stays in the box', () => {
    for (const backing of ['sticker', 'disc']) {
      const t = lay({ emoji: 'trophy', size: 'xl', backing }, 200, 200) as any
      expect(t.box.width).toBeLessThanOrEqual(200)
      expect(t.children[0].part).toBe('emoji.disc')
    }
  })
})
