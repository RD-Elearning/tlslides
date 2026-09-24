/**
 * G8.5 — regression guard for `tls.l.row`'s `sizing: 'content'` mode.
 *
 * Before G8.5, `measureIntrinsicSize`'s fallback probe measured every child at the row's own
 * given width, so a short label and a long paragraph both reported that same width back as their
 * "intrinsic" size — `content` mode degenerated into the same 50/50 split as `equal` mode
 * (BACKLOG-visual-fix-2.md §8.5, root-caused in G5's `container-flex.js` note). `tls.t.body`
 * gained a real `intrinsicSize` export; this asserts the two children now get measurably
 * different widths, proportional to their real content, and that `equal` mode is unaffected.
 */

import { tlsLRow } from './index'
import { registerBuiltInBlocks } from '../../index'
import { BlockRegistry } from '../../../registry'
import { makeCtx } from '../test-helpers'
import type { LayoutNode } from '../../../types'

function makeRegistryWithBuiltIns(): BlockRegistry {
  const reg = new BlockRegistry()
  registerBuiltInBlocks(reg)
  return reg
}

const SHORT_LABEL = 'OK'
const LONG_PARAGRAPH =
  'This is a much longer paragraph of body copy that goes on for quite a while, describing ' +
  'something in considerable detail across many more words than the short label next to it.'

describe('tls.l.row — sizing: content', () => {
  const registry = makeRegistryWithBuiltIns()

  it('gives a short label and a long paragraph measurably different widths', () => {
    const box = { width: 1200, height: 200 }
    const ctx = makeCtx(box, registry)
    const node = tlsLRow.layout(
      {
        gap: 'md',
        sizing: 'content',
        children: [
          { id: 'short', type: 'tls.t.body', props: { text: SHORT_LABEL } },
          { id: 'long', type: 'tls.t.body', props: { text: LONG_PARAGRAPH } },
        ],
      } as any,
      ctx
    )

    expect(node.children).toHaveLength(2)
    const shortWidth = node.children[0].box.width
    const longWidth = node.children[1].box.width

    // The long paragraph must be substantially wider than the short label — content mode is a
    // no-op if the two end up equal (the exact bug this test guards against).
    expect(longWidth).toBeGreaterThan(shortWidth * 3)
    // Both still fit within the row (2 children, 1 gap of 24 at 'md').
    expect(shortWidth + longWidth + 24).toBeLessThanOrEqual(box.width + 1)
  })

  it('still splits children equally when sizing is "equal" (default), unaffected by the fix', () => {
    const box = { width: 1200, height: 200 }
    const ctx = makeCtx(box, registry)
    const node = tlsLRow.layout(
      {
        gap: 'md',
        sizing: 'equal',
        children: [
          { id: 'short', type: 'tls.t.body', props: { text: SHORT_LABEL } },
          { id: 'long', type: 'tls.t.body', props: { text: LONG_PARAGRAPH } },
        ],
      } as any,
      ctx
    )

    expect(node.children).toHaveLength(2)
    const [c0, c1]: LayoutNode[] = node.children
    expect(c0.box.width).toBeCloseTo(c1.box.width, 5)
  })
})
