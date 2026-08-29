import type { Patch, TDShape, TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

/**
 * Move a top-level shape to a new z-order position on its page, for the T8c.3 layers panel's
 * drag-and-drop reordering.
 *
 * This is `Commands.movePage` (see that file's doc comment) applied to shapes instead of pages,
 * deliberately reusing its exact design rather than the pre-existing `Commands.reorderShapes`:
 * `reorderShapes`'s `MoveType` (`Backward`/`Forward`/`ToFront`/`ToBack`) answers "nudge this
 * selection by one step or to an extreme," which is what a context-menu action needs, but a
 * drag-and-drop panel computes "the dragged row's target position among the currently-listed
 * rows" — an index — exactly `movePage`'s own input shape. `toIndex` has the same semantics
 * `movePage` documents: the shape's target zero-based position in the *final* order, i.e.
 * `Array.prototype.splice(toIndex, 0, shape)` semantics after removing it from what's left.
 *
 * Scoped to top-level shapes only (`parentId === pageId`) — the same scope the layers panel
 * itself lists (see `LayersPanel`'s doc comment): a group's children keep their existing
 * `reorderShapes`-managed relative order, and are not individually addressable rows here.
 *
 * Like `movePage`, every affected shape's `childIndex` is renumbered to a fresh gap-free 1..N
 * sequence rather than inserted fractionally between neighbours — the same rationale applies
 * (a layers panel is dragged repeatedly at the same spot far more often than shapes are
 * z-reordered by typical use of `reorderShapes`, so avoiding float-collision drift again outweighs
 * the cost of a full renumber, and a page's top-level shape count is bounded by what fits on one
 * slide).
 */
export function moveShapeToIndex(app: TldrawApp, shapeId: string, toIndex: number): TldrawCommand {
  const { currentPageId } = app
  const page = app.document.pages[currentPageId]

  const sorted = Object.values(page.shapes)
    .filter((shape) => shape.parentId === currentPageId)
    .sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))

  const fromIndex = sorted.findIndex((shape) => shape.id === shapeId)

  if (fromIndex === -1) {
    return { id: 'move_shape_to_index', before: {}, after: {} }
  }

  const [moving] = sorted.splice(fromIndex, 1)
  const clampedIndex = Math.max(0, Math.min(toIndex, sorted.length))
  sorted.splice(clampedIndex, 0, moving)

  const before: Record<string, Patch<TDShape> | undefined> = {}
  const after: Record<string, Patch<TDShape> | undefined> = {}

  sorted.forEach((shape, i) => {
    const nextChildIndex = i + 1
    if (shape.childIndex === nextChildIndex) return
    before[shape.id] = { childIndex: shape.childIndex }
    after[shape.id] = { childIndex: nextChildIndex }
  })

  return {
    id: 'move_shape_to_index',
    before: {
      document: {
        pages: {
          [currentPageId]: { shapes: before },
        },
      },
    },
    after: {
      document: {
        pages: {
          [currentPageId]: { shapes: after },
        },
      },
    },
  }
}
