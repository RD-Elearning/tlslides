import { Utils, TLPageState } from '@tlslides/core'
import type { Template, TDPage, TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'
import { DEFAULT_SLIDE_SIZE } from '~constants'
import { buildTemplateShapes } from '~state/templates'
import { activeDeckTheme } from '~state/shapes/shared/deck-theme'
import { getNextChildIndex } from '../shared/getNextChildIndex'

/**
 * Add a new slide built from a `Template`, filling any matching `content[slot]` values, and make
 * it the current page — one undoable command, modeled directly on `Commands.createPage` (same
 * `before`/`after` shape: the page and its `pageState` don't exist, then they do, and
 * `currentPageId` moves with them).
 *
 * The shape/id/theme work is delegated to `buildTemplateShapes` (`state/templates.ts`) — this
 * function's only job is turning that shape list into a `TDPage` and a proper undo/redo patch, the
 * same division of labour `TldrawApp.insertContent` has with its own command.
 *
 * `pageId` (optional, Phase 14) lets a host mint its own id for the new slide, the same
 * caller-supplied-id story as `Commands.duplicatePage`'s `newId` — defaults to a fresh generated
 * id, and uniqueness is the caller's responsibility.
 */
export function addSlideFromTemplate(
  app: TldrawApp,
  template: Template,
  content?: Record<string, string>,
  pageId = Utils.uniqueId()
): TldrawCommand {
  const { currentPageId } = app

  // `activeDeckTheme`, not `app.document.theme` raw. The document's theme is optional, so a deck
  // that has never had one set passes `undefined` here — and unlike the colour tokens, which
  // resolve lazily at render time (and so pick up the read-side default), the theme's font pairing
  // and `shapeDefaults` are baked into the shapes *once*, right here. Passing `undefined` therefore
  // left every template's text with no `font` at all, which falls back to `FontStyle.Script` —
  // so a template landed on a fresh deck rendered its headings in a handwriting face no built-in
  // theme actually asks for. Same read-side default the renderer uses; still writes nothing to the
  // document.
  const shapes = buildTemplateShapes(template, content, activeDeckTheme(app.document.theme), pageId)

  const page: TDPage = {
    id: pageId,
    name: template.name,
    childIndex: getNextChildIndex(app.state.document.pages),
    // Copied via `deepClone`, not shared — template.size/background are the same module-level
    // constant every call reuses (see the equivalent comment on `buildTemplateShapes`).
    size: Utils.deepClone(template.size ?? app.state.document.defaultPageSize ?? DEFAULT_SLIDE_SIZE),
    background: template.background ? Utils.deepClone(template.background) : undefined,
    shapes: Object.fromEntries(shapes.map((shape) => [shape.id, shape])),
    bindings: {},
  }

  const pageState: TLPageState = {
    id: pageId,
    selectedIds: [],
    camera: { point: [0, 0], zoom: 1 },
    editingId: undefined,
    bindingId: undefined,
    hoveredId: undefined,
    pointedId: undefined,
  }

  return {
    id: 'add_slide_from_template',
    before: {
      appState: {
        currentPageId,
      },
      document: {
        pages: {
          [pageId]: undefined,
        },
        pageStates: {
          [pageId]: undefined,
        },
      },
    },
    after: {
      appState: {
        currentPageId: pageId,
      },
      document: {
        pages: {
          [pageId]: page,
        },
        pageStates: {
          [pageId]: pageState,
        },
      },
    },
  }
}
