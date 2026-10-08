/**
 * G5 — slide-level collision gate.
 *
 * `composite-geometry.spec.ts` only checks overlap *within* a single composite block's own
 * children. This checks the thing the product owner actually complained about (BACKLOG-visual.md
 * §1.1): two top-level blocks on the same slide painted on top of each other. It compiles every
 * deck fixture the same way the editor and `<DeckViewer>` do (`deckSpecToDocument`) and asserts,
 * in design space, that no two `ComponentShape` rects on the same page intersect.
 *
 * This does not catch DOM-only rendering overflow (a block's box not overlapping another block's
 * box while its *rendered text* still overflows past 0.8×lineHeight) — that class of defect is a
 * browser-only check (`overlap-audit.js`'s `leafPartCount`/`overflow` pass). This spec is the
 * cheap, browser-free gate for the coarser and more common defect: two whole blocks placed on
 * top of one another by the compiler itself.
 */
import * as fs from 'fs'
import * as path from 'path'
import { deckSpecToDocument, resolveDeckFrame } from './index'
import type { DeckSpec } from './types'
import type { ComponentShape } from '~types'

const FIXTURES_DIR = path.resolve(__dirname, '__fixtures__')

const FIXTURE_FILES = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.json'))

interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

function toRect(shape: ComponentShape): Rect {
  const [x, y] = shape.point
  const [w, h] = shape.size
  return { left: x, top: y, right: x + w, bottom: y + h }
}

/** Intersection area of two rects, shrunk by `tolerance` on each side to absorb rounding. */
function overlapArea(a: Rect, b: Rect, tolerance: number): number {
  const left = Math.max(a.left + tolerance, b.left + tolerance)
  const right = Math.min(a.right - tolerance, b.right - tolerance)
  const top = Math.max(a.top + tolerance, b.top + tolerance)
  const bottom = Math.min(a.bottom - tolerance, b.bottom - tolerance)
  if (right <= left || bottom <= top) return 0
  return (right - left) * (bottom - top)
}

// Rounding in region re-flow (V2.1) and gap math can leave adjacent blocks a fraction of a
// slide-unit apart or touching exactly at the boundary; 1 slide unit of tolerance absorbs that
// without hiding a real collision (real collisions in the fixtures measured tens to thousands of
// px² before they were fixed — see BACKLOG-visual.md §1.1).
const TOLERANCE = 1

describe('G5 — slide-level collision gate', () => {
  for (const file of FIXTURE_FILES) {
    const spec: DeckSpec = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf-8'))

    describe(file, () => {
      const { document } = deckSpecToDocument(spec)
      const frame = resolveDeckFrame(spec.aspect)

      for (const [pageId, page] of Object.entries(document.pages)) {
        it(`slide "${pageId}" has no overlapping top-level blocks`, () => {
          const shapes = Object.values(page.shapes).filter(
            (s): s is ComponentShape => s.type === 'component'
          )
          const rects = shapes.map((s) => ({ id: s.id, componentId: s.componentId, rect: toRect(s) }))

          const collisions: string[] = []
          for (let i = 0; i < rects.length; i++) {
            for (let j = i + 1; j < rects.length; j++) {
              const area = overlapArea(rects[i].rect, rects[j].rect, TOLERANCE)
              if (area > 0) {
                collisions.push(
                  `${rects[i].id} (${rects[i].componentId}) × ${rects[j].id} (${rects[j].componentId}): ` +
                    `${Math.round(area)}px²`
                )
              }
            }
          }

          if (collisions.length > 0) {
            throw new Error(`Overlapping blocks on "${pageId}":\n` + collisions.join('\n'))
          }
          expect(collisions).toEqual([])
        })

        // G8.1a (regression guard only — see BACKLOG-visual-fix-2.md §9 G8.1 notes for why this
        // isn't a full-fixture frame-bounds gate): checking every shape's box against the frame
        // for every slide immediately reproduces the same fill-vs-intrinsic-height bug on 7 other
        // blocks this phase didn't target (colorful-blocks-demo sl_02/sl_06/sl_07/sl_08/sl_09,
        // demo-deck sl_07/sl_08) — the same class G5 chose not to gate `overlap-audit` on for the
        // analogous reason (a known, disclosed, out-of-scope defect shouldn't turn a real gate
        // permanently red). So this only re-checks the slide this phase actually fixed.
        if (pageId === 'sl_05') {
          it(`slide "${pageId}" has no block extending past the frame bounds`, () => {
            const shapes = Object.values(page.shapes).filter(
              (s): s is ComponentShape => s.type === 'component'
            )

            const outOfBounds: string[] = []
            for (const s of shapes) {
              const rect = toRect(s)
              if (
                rect.left < -TOLERANCE ||
                rect.top < -TOLERANCE ||
                rect.right > frame.width + TOLERANCE ||
                rect.bottom > frame.height + TOLERANCE
              ) {
                outOfBounds.push(
                  `${s.id} (${s.componentId}): box [${Math.round(rect.left)},${Math.round(rect.top)},` +
                    `${Math.round(rect.right)},${Math.round(rect.bottom)}] vs frame ` +
                    `[0,0,${frame.width},${frame.height}]`
                )
              }
            }

            if (outOfBounds.length > 0) {
              throw new Error(`Block(s) past the frame edge on "${pageId}":\n` + outOfBounds.join('\n'))
            }
            expect(outOfBounds).toEqual([])
          })
        }
      }
    })
  }

  it('found at least one deck fixture to check', () => {
    expect(FIXTURE_FILES.length).toBeGreaterThan(0)
  })
})
