import { MagicWandIcon } from '@radix-ui/react-icons'
import * as React from 'react'
import { useTldrawApp } from '~hooks'
import { ALL_STYLE_KEYS } from '~state/shapes/shared/shape-styles'
import { ToolButton } from '~components/Primitives/ToolButton'
import { Tooltip } from '~components/Primitives/Tooltip'
import { ShapeStyles, TDSnapshot } from '~types'

const selectedIdsSelector = (s: TDSnapshot) =>
  s.document.pageStates[s.appState.currentPageId].selectedIds

// T8c.2 — format painter, "copy this shape's look onto other shapes."
//
// **What "style" means here, and why**: every `ShapeStyles` field *except* `scale` — the full
// list already lives in one place (`ALL_STYLE_KEYS`, moved out of StyleMenu in this same phase for
// exactly this reuse). That includes color/fill/dash/size overrides, opacity, stroke width, corner
// radius, the Phase 11 gradient fill, and every Phase 17 typography field (`fontFamily`,
// `fontToken`, line height, letter spacing, list markers, vertical align, auto-fit) — all of them
// are author-facing visual choices, exactly what a "make this look like that" tool is for.
// `scale` is excluded because it isn't one: it's `ArrowUtil`'s own internal auto-shrink-to-the-
// arrow's-length factor (see `ShapeStyles.scale`'s call sites), silently written and read by that
// one shape type. Painting it onto an unrelated shape would look like a random resize with no
// visible cause, not a style match.
//
// **The patch is a full copy, not a sparse merge.** A naive `{ ...sourceShape.style }` would only
// include keys the source shape happens to have *set* — any key merely absent from the source
// (because it never had an override) would be left alone on the target, silently keeping the
// target's own pre-existing override instead of matching the source. That's the exact class of
// coherence bug Phase 8b/17 fixed for color-vs-hex and size-vs-strokeWidth (an override "wins
// forever" unless something explicitly clears it) — a format painter that doesn't actually make
// shapes match would be worse than not having one. So every key in `FORMAT_PAINTER_STYLE_KEYS` is
// written into the patch, present-on-the-source or not; a key absent on the source becomes an
// explicit `undefined` in the patch, which `Utils.deepMerge` (relied on throughout this fork, see
// `styleShapes.spec.ts`) treats as "clear this field" — so the target ends up looking exactly like
// the source, including losing overrides the source never had.
export const FORMAT_PAINTER_STYLE_KEYS = ALL_STYLE_KEYS.filter((key) => key !== 'scale')

/** Exported for `FormatPainter.spec.ts` — the "full copy, absent keys become explicit `undefined`"
 *  behaviour is exactly the part worth a regression test, independent of any React/DOM wiring. */
export function copyableStyle(style: ShapeStyles): Partial<ShapeStyles> {
  const patch: Record<string, unknown> = {}
  FORMAT_PAINTER_STYLE_KEYS.forEach((key) => {
    patch[key] = style[key]
  })
  return patch as Partial<ShapeStyles>
}

export const FormatPainter = React.memo(function FormatPainter(): JSX.Element {
  const app = useTldrawApp()
  const selectedIds = app.useStore(selectedIdsSelector)
  const [armed, setArmed] = React.useState(false)
  // A ref, not state: the effect below needs the *current* copied style and source id without
  // re-subscribing every render, and without re-running every time `armed` itself changes (it
  // should only react to a *selection* change — see the effect's own comment).
  const painted = React.useRef<{ style: Partial<ShapeStyles>; sourceId: string } | null>(null)

  const canArm = selectedIds.length === 1

  const handleClick = React.useCallback(() => {
    if (armed) {
      // Click again to cancel — the copied style is discarded, nothing is applied.
      setArmed(false)
      painted.current = null
      return
    }
    if (!canArm) return
    const shape = app.page.shapes[selectedIds[0]]
    if (!shape) return
    painted.current = { style: copyableStyle(shape.style), sourceId: shape.id }
    setArmed(true)
  }, [app, armed, canArm, selectedIds])

  // Applies the copied style the next time the selection changes to something other than the
  // source shape itself — i.e. the next shape (or shapes) a user clicks or marquee-selects, the
  // same "pick up a style, then click a target" interaction a paintbrush tool implies, without
  // needing a dedicated pointer-tracking tool class: `SelectTool` already updates `selectedIds` on
  // every click, so watching that is enough. Deliberately keyed only on `selectedIds` (not
  // `armed`/`painted`, both read from the ref instead) so arming itself — which doesn't change
  // `selectedIds` — never re-triggers this effect.
  React.useEffect(() => {
    if (!painted.current) return
    if (selectedIds.length === 0) return // empty selection (e.g. Escape) — stay armed, no target yet
    if (selectedIds.length === 1 && selectedIds[0] === painted.current.sourceId) return
    app.style(painted.current.style)
    painted.current = null
    setArmed(false)
    // Deliberately `[selectedIds]` only, not `[app, selectedIds]` — `app` is a stable reference
    // for the component's lifetime (see `useTldrawApp`), so omitting it changes nothing at
    // runtime; it's just not worth exhaustive-deps churn here (this fork's eslint config doesn't
    // have `eslint-plugin-react-hooks` wired up to check it either way).
  }, [selectedIds])

  return (
    <Tooltip label="Format painter — copy style, then click a shape to apply it">
      <ToolButton
        id="TD-FormatPainter"
        variant="text"
        isActive={armed}
        disabled={!armed && !canArm}
        onClick={handleClick}
      >
        <MagicWandIcon />
      </ToolButton>
    </Tooltip>
  )
})
