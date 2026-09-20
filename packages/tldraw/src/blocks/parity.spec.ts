/**
 * Parity tests: DOM↔SVG renderer agreement for probe blocks.
 *
 * Uses a Playwright worker process (via parity-harness) to measure DOM and SVG
 * renders of each probe block, comparing geometry, fill/stroke, text content,
 * and line count.
 *
 * The deliberately-broken-renderer tests prove the harness catches errors.
 */

import {
  assertParity,
  shutdownWorker,
  TEST_TOKENS,
  TEST_SURFACE,
} from './parity-harness'
import {
  probeRects,
  probeTextAndLines,
  probeMediaAndIcons,
  PROBE_BOX,
} from './probe-blocks'
import { renderNodeToSvg } from './render-svg'
import { createLayoutContext } from './layout'

describe('parity harness', () => {
  afterAll(async () => {
    await shutdownWorker()
  })

  describe('probe blocks', () => {
    it('probe.rects: DOM↔SVG parity (group, rect)', async () => {
      await assertParity(probeRects, {}, PROBE_BOX)
    }, 30_000)

    it('probe.textAndLines: DOM↔SVG parity (text, line, path)', async () => {
      await assertParity(probeTextAndLines, {}, PROBE_BOX)
    }, 30_000)

    it('probe.mediaAndIcons: DOM↔SVG parity (image, icon, host)', async () => {
      await assertParity(probeMediaAndIcons, {}, PROBE_BOX)
    }, 30_000)
  })

  describe('broken renderer detection', () => {
    it('catches a deliberately broken SVG renderer', async () => {
      const ctx = createLayoutContext({
        box: PROBE_BOX,
        tokens: TEST_TOKENS,
        surface: TEST_SURFACE,
      })
      const node = probeRects.layout({}, ctx)
      const correctSvg = renderNodeToSvg(node)

      // Prove the correct SVG passes
      await assertParity(probeRects, {}, PROBE_BOX, null, {
        svgOverride: correctSvg,
      })

      // Break: shift first rect's x by 10 units
      const brokenSvg = correctSvg.replace(
        'x="10" y="10" width="200" height="100"',
        'x="20" y="10" width="200" height="100"',
      )

      // Parity must fail with the broken SVG
      await expect(
        assertParity(probeRects, {}, PROBE_BOX, null, {
          svgOverride: brokenSvg,
        }),
      ).rejects.toThrow()
    }, 30_000)

    it('catches a broken fill color', async () => {
      const ctx = createLayoutContext({
        box: PROBE_BOX,
        tokens: TEST_TOKENS,
        surface: TEST_SURFACE,
      })
      const node = probeRects.layout({}, ctx)
      const correctSvg = renderNodeToSvg(node)

      // Break: change the fill color of the first rect
      const brokenSvg = correctSvg.replace(
        'fill:#3b82f6',
        'fill:#00ff00',
      )

      await expect(
        assertParity(probeRects, {}, PROBE_BOX, null, {
          svgOverride: brokenSvg,
        }),
      ).rejects.toThrow()
    }, 30_000)
  })
})
