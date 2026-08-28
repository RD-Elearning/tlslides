import type { Patch, TDShape, TDBinding, TDAsset, TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

/**
 * Build the undo/redo patch for inserting a batch of shapes, bindings, and (new) assets into the
 * current page in one step.
 *
 * The shapes/bindings/assets passed in must already have their final ids, positions, and
 * cross-references — the id remapping and placement math live in `TldrawApp.insertContent`,
 * which is this command's only caller. `assets` must already be filtered down to ones that are
 * genuinely new (not already present in the document), same as `newAssets` in the old `paste`.
 *
 * This mirrors `createShapes`, but also patches `document.assets` so that assets added by the
 * insert are removed again on undo — `paste` never did this (it patched assets in directly,
 * outside of any command), so an undone paste left its assets behind. Folding assets into the
 * same before/after patch fixes that for both `paste` and `insertContent`.
 */
export function insertContent(
  app: TldrawApp,
  shapes: TDShape[],
  bindings: TDBinding[] = [],
  assets: TDAsset[] = [],
  select = true
): TldrawCommand {
  const { currentPageId } = app

  const beforeShapes: Record<string, Patch<TDShape> | undefined> = {}
  const afterShapes: Record<string, Patch<TDShape> | undefined> = {}

  shapes.forEach((shape) => {
    beforeShapes[shape.id] = undefined
    afterShapes[shape.id] = shape
  })

  const beforeBindings: Record<string, Patch<TDBinding> | undefined> = {}
  const afterBindings: Record<string, Patch<TDBinding> | undefined> = {}

  bindings.forEach((binding) => {
    beforeBindings[binding.id] = undefined
    afterBindings[binding.id] = binding
  })

  const beforeAssets: Record<string, Patch<TDAsset> | undefined> = {}
  const afterAssets: Record<string, Patch<TDAsset> | undefined> = {}

  assets.forEach((asset) => {
    beforeAssets[asset.id] = undefined
    afterAssets[asset.id] = asset
  })

  return {
    id: 'insert_content',
    before: {
      document: {
        assets: beforeAssets,
        pages: {
          [currentPageId]: {
            shapes: beforeShapes,
            bindings: beforeBindings,
          },
        },
        pageStates: {
          [currentPageId]: {
            selectedIds: [...app.selectedIds],
          },
        },
      },
    },
    after: {
      document: {
        assets: afterAssets,
        pages: {
          [currentPageId]: {
            shapes: afterShapes,
            bindings: afterBindings,
          },
        },
        pageStates: {
          [currentPageId]: {
            selectedIds: select ? shapes.map((shape) => shape.id) : [...app.selectedIds],
          },
        },
      },
    },
  }
}
