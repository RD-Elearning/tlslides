import type { Patch, TDShape, TDBinding, TDAsset, TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'

/**
 * Build the undo/redo patch for inserting a batch of shapes, bindings, and (new) assets into one
 * page (the current page by default) in one step.
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
 *
 * `pageId` (optional, Phase 14) targets a page other than the current one — used by
 * `Deck.insertContent`/`Deck.addBlock` so a host can add content to a slide it isn't currently
 * viewing without an extra `changePage` command. Never reads/writes `appState.currentPageId`
 * either way, so inserting into another page never moves the user's own viewport. The before/
 * after `selectedIds` snapshot must come from *that* page's own `pageState` (`app.
 * getPageState(pageId)`), not `app.selectedIds` (which is always the *current* page's selection)
 * — getting this wrong would silently corrupt a different, unrelated page's selection whenever
 * `pageId` isn't the current page.
 */
export function insertContent(
  app: TldrawApp,
  shapes: TDShape[],
  bindings: TDBinding[] = [],
  assets: TDAsset[] = [],
  select = true,
  pageId = app.currentPageId
): TldrawCommand {
  const targetSelectedIds = app.getPageState(pageId).selectedIds

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
          [pageId]: {
            shapes: beforeShapes,
            bindings: beforeBindings,
          },
        },
        pageStates: {
          [pageId]: {
            selectedIds: [...targetSelectedIds],
          },
        },
      },
    },
    after: {
      document: {
        assets: afterAssets,
        pages: {
          [pageId]: {
            shapes: afterShapes,
            bindings: afterBindings,
          },
        },
        pageStates: {
          [pageId]: {
            selectedIds: select ? shapes.map((shape) => shape.id) : [...targetSelectedIds],
          },
        },
      },
    },
  }
}
