/**
 * tls.m.illustration (spro creative CR9) — palette slots filled, ratio kept, words find scenes.
 */
import { tlsMIllustration } from './index'
import { sceneName } from './layout'
import { standardBlockSuite, leavesOf } from '../../text/standard-suite'
import { ctxNoAssets } from '../media-test'

standardBlockSuite(tlsMIllustration, { noCapacity: true })

const lay = (props: Record<string, unknown>, w = 480, h = 360) => tlsMIllustration.layout({ ...(tlsMIllustration.defaults as any), ...props } as any, ctxNoAssets(w, h))

describe('tls.m.illustration', () => {
  it('fills the colour slots from the palette and keeps the 4:3 scene inside the box', () => {
    const img = leavesOf(lay({ scene: 'running' }, 800, 300), 'scene')[0]
    const url = decodeURIComponent((img.node as any).url)
    expect(url).not.toMatch(/\{ink\}|\{accent\}|\{paper\}/)
    expect(img.height).toBe(300)
    expect(img.width).toBe(400)
  })

  it('finds a scene by name or by an English or Vietnamese word; lints an unknown one', () => {
    expect(sceneName('sitting reading')).toBe('sitting-reading')
    expect(sceneName('đọc')).toMatch(/reading/)
    expect(sceneName('success')).toBe('jumping')
    expect(tlsMIllustration.lint!({ scene: 'xyzzy' } as any, { box: { x: 0, y: 0, width: 1, height: 1 } })[0].rule).toBe('illustration/unknown')
  })

  it('flip mirrors the scene', () => {
    expect(decodeURIComponent((leavesOf(lay({ flip: true }), 'scene')[0].node as any).url)).toContain('scale(-1 1)')
  })
})
