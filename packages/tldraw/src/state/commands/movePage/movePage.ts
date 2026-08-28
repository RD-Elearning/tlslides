import type { Patch, TDPage, TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

/**
 * Move a page to a new position in the deck.
 *
 * `toIndex` is the page's target zero-based position in the deck's *final* order — i.e. the same
 * semantics as removing the page from the array and calling `Array.prototype.splice(toIndex, 0,
 * page)` on what's left. That's the natural index for a drag-and-drop UI to compute (drop before
 * slide N) and for "move up"/"move down" (`currentIndex - 1` / `currentIndex + 1`).
 *
 * Every page's `childIndex` is renumbered to a fresh, gap-free 1..N sequence reflecting the new
 * order. This is deliberately a full renumber rather than fractional insertion between neighbors
 * (as `reorderShapes` does for shapes): fractional insertion at the same spot repeatedly drifts
 * toward floating-point collisions, and pages are few enough (unlike shapes within a group) that
 * renumbering all of them is cheap and keeps `childIndex` always a clean, collision-free integer
 * sequence (B-03/B-04).
 */
export function movePage(app: TldrawApp, pageId: string, toIndex: number): TldrawCommand {
  const { pages } = app.document

  const sorted = Object.values(pages).sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))
  const fromIndex = sorted.findIndex((page) => page.id === pageId)

  if (fromIndex === -1) {
    return { id: 'move_page', before: {}, after: {} }
  }

  const [moving] = sorted.splice(fromIndex, 1)
  const clampedIndex = Math.max(0, Math.min(toIndex, sorted.length))
  sorted.splice(clampedIndex, 0, moving)

  const beforePages: Record<string, Patch<TDPage> | undefined> = {}
  const afterPages: Record<string, Patch<TDPage> | undefined> = {}

  sorted.forEach((page, i) => {
    const nextChildIndex = i + 1
    if (page.childIndex === nextChildIndex) return
    beforePages[page.id] = { childIndex: page.childIndex }
    afterPages[page.id] = { childIndex: nextChildIndex }
  })

  return {
    id: 'move_page',
    before: {
      document: {
        pages: beforePages,
      },
    },
    after: {
      document: {
        pages: afterPages,
      },
    },
  }
}
