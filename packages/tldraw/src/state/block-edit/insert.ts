/**
 * Block insertion without React — shared by the inserter hook (`useInsertBlock`), basic-profile
 * paste (editor E01) and `app.blockEdit.insertBlock` (editor E04).
 */
import { Utils } from '@tlslides/core'
import { blockToShape } from '~blocks/shape-bridge'
import { cloneSpecWithFreshIds } from '~blocks/clone-spec'
import { DEFAULT_SLIDE_SIZE } from '~constants'
import type { BlockSpec, BlockDefinition } from '~blocks/types'
import type { TldrawApp } from '../TldrawApp'

export interface InsertResult {
  spec: BlockSpec
  shapeId: string
}

/**
 * Build the `BlockSpec` to insert: deep-clone `describe.example` (or `defaults`),
 * regenerate all nested ids, strip `style` so the block starts on theme colours.
 *
 * Pure — does not touch the store. `useInsertBlock` calls this then commits.
 */
export function buildInsertSpec(def: BlockDefinition): BlockSpec {
  const source =
    def.describe?.example ??
    ({ id: Utils.uniqueId(), type: def.type, props: JSON.parse(JSON.stringify(def.defaults)) } as BlockSpec)
  const cloned = cloneSpecWithFreshIds(source)

  // H7: Strip style so the inserted instance starts on the slide's theme colours.
  // Literal colours inside props (e.g. donut slice color: 'blue') stay — they are
  // content, not style.
  delete cloned.style

  return cloned
}

/**
 * Insert a block by type at the centre of the current viewport (click) or at a
 * specific page point (drag-and-drop, which has already been converted to
 * page-space by the caller via `app.getPagePoint`).
 *
 * Returns the created shape's id and the spec used, or null if the block type
 * is unknown.
 */
/**
 * Editor E01/E04 — insert a block without React (paste, `app.blockEdit.insertBlock`): the
 * definition's example (or `props` when given) centred at `point` (page space) or the viewport
 * centre, clamped into the slide, selected. Returns the shape id.
 */
export function insertBlockShape(
  app: TldrawApp,
  def: BlockDefinition,
  opts: { props?: Record<string, unknown>; point?: [number, number] } = {},
): InsertResult {
  const spec = buildInsertSpec(def)
  if (opts.props) spec.props = { ...JSON.parse(JSON.stringify(opts.props)) }
  const [width, height] = def.size.preferred
  const centre: [number, number] =
    opts.point ?? (app.getPagePoint(app.centerPoint, app.currentPageId) as [number, number])
  const box = { x: centre[0] - width / 2, y: centre[1] - height / 2, width, height }
  // H8: clamp so the block stays inside the slide frame.
  const clamped = clampToSlideFrame(box, app)
  const shape = blockToShape(spec, clamped, { parentId: app.currentPageId, definitionMotion: def.motion })
  app.createShapes(shape)
  app.select(shape.id)
  return { spec, shapeId: shape.id }
}

/**
 * Clamp a block's box so it stays inside the page bounds. If the block is larger
 * than the page, its top-left corner is aligned to (0, 0) (best effort).
 *
 * Reads the page size from the app's document directly (not via useStore, since
 * we're inside a callback, not a render).
 */
export function clampToSlideFrame(
  box: { x: number; y: number; width: number; height: number },
  app: TldrawApp,
): { x: number; y: number; width: number; height: number } {
  const page = app.document.pages[app.currentPageId]
  const pageWidth = page?.size?.[0] ?? DEFAULT_SLIDE_SIZE[0]
  const pageHeight = page?.size?.[1] ?? DEFAULT_SLIDE_SIZE[1]

  const [w, h] = [box.width, box.height]

  // If the block is larger than the page, pin to top-left (best effort).
  let x = Math.min(box.x, pageWidth - w)
  let y = Math.min(box.y, pageHeight - h)

  x = Math.max(0, x)
  y = Math.max(0, y)

  return { x, y, width: w, height: h }
}
