import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTldrawApp } from '~hooks'
import { DMContent } from '~components/Primitives/DropdownMenu'
import { ToolButton } from '~components/Primitives/ToolButton'
import { StyledRow } from '~components/TopPanel/StyleMenu/StyleMenu'
import { styled } from '~styles'
import { stopKeyPropagationUnlessEscape } from '~components/preventEvent'
import { TDShape, TDSnapshot } from '~types'
import { TLDR } from '~state/TLDR'
import type { TldrawApp } from '~state'

// T8c.1 — numeric X/Y/W/H/rotation inspector.
//
// **What a single selection shows/edits**: `point` for X/Y (writes `{ point: [x, y] }`), its own
// local, *unrotated* size for W/H, and `rotation` (radians, displayed/edited in degrees) — all
// through `app.updateShapes`, the pre-existing generic "patch these shapes, one undo step" command
// every other imperative call in this fork already routes through (see `TldrawApp.updateShapes`).
// W/H is deliberately read from the shape's own dimension field, not from `getBounds` (which is
// the *rotated*, axis-aligned bbox for some shape utils) — an inspector that showed a rotated
// shape's screen-space bounding box under "W"/"H" would silently change what a value round-trips
// to depending on rotation, which is a worse surprise than not offering the field at all.
//
// **W/H is shown, disabled, for a shape with no independent size field** (`TextShape`, whose box
// *is* its measured text per `TextUtil.getBounds`; `DrawShape`/`LineShape`/`ArrowShape`, defined by
// points/handles, not a `size`) rather than hidden — the field's presence still tells you "there is
// a width and height here" even when this panel can't be the thing that changes them (a bare
// `TextShape` is resized by editing its text or its `style.scale`; Draw/Line/Arrow are resized by
// dragging their own points/handles). This mirrors `StyleMenu`'s corner-radius row precedent
// (visible whenever it *could* mean something, not simply whenever a value happens to be set) but
// applied to "does this control apply to this shape type" instead.
//
// **What a multi-selection shows/edits, decided explicitly**: X/Y is the selection's combined
// bounding box (`TLDR.getSelectedBounds`, the same helper `zoomToSelection` already uses)
// top-left, and editing it translates *every* selected shape by the same delta, preserving their
// relative layout — the natural generalisation of "move this shape to X" to "move this group to
// X." W/H and Rotation are shown, disabled: resizing or rotating a multi-shape selection to an
// exact number would need to replicate the interactive `TransformSession`'s per-shape-util resize
// math (each shape type's own `transform`, generally anchored and often aspect-ratio-aware) outside
// of a live pointer gesture — a materially different, separable feature from "read and write a
// number," not attempted here. A single shape's own W/H/rotation stay fully editable; only the
// *group* case is scoped down, and disabled — not hidden — so the reason ("select one shape to
// resize or rotate it exactly") is visible in the panel rather than silently absent.
function getShapeSize(shape: TDShape): number[] | undefined {
  if ('size' in shape) return (shape as unknown as { size: number[] }).size
  if ('radius' in shape) {
    const radius = (shape as unknown as { radius: number[] }).radius
    return [radius[0] * 2, radius[1] * 2]
  }
  return undefined
}

function applyShapeSize(app: TldrawApp, shape: TDShape, w: number, h: number) {
  if ('size' in shape) {
    app.updateShapes({ id: shape.id, size: [Math.max(1, w), Math.max(1, h)] })
  } else if ('radius' in shape) {
    app.updateShapes({ id: shape.id, radius: [Math.max(0.5, w / 2), Math.max(0.5, h / 2)] })
  }
}

interface SelectionInfo {
  ids: string[]
  x: number
  y: number
  w?: number
  h?: number
  rotationDeg?: number
}

const selectionInfoSelector = (s: TDSnapshot): SelectionInfo => {
  const pageId = s.appState.currentPageId
  const ids = s.document.pageStates[pageId].selectedIds
  if (ids.length === 0) return { ids, x: 0, y: 0 }
  if (ids.length === 1) {
    const shape = s.document.pages[pageId].shapes[ids[0]]
    if (!shape) return { ids: [], x: 0, y: 0 }
    const size = getShapeSize(shape)
    return {
      ids,
      x: shape.point[0],
      y: shape.point[1],
      w: size?.[0],
      h: size?.[1],
      rotationDeg: Math.round((((shape.rotation || 0) * 180) / Math.PI) * 100) / 100,
    }
  }
  const bounds = TLDR.getSelectedBounds(s)
  return { ids, x: bounds.minX, y: bounds.minY, w: bounds.width, h: bounds.height }
}

/** Same shape as `AnimateMenu`'s `useIntField`, but for a possibly-fractional value (a shape
 *  position/size in page units has no reason to be integral) and with an optional `disabled` — the
 *  multi-selection W/H/Rotation case above. */
function useNumberField(
  committed: number | undefined,
  onCommit: (value: number) => void,
  disabled = false
) {
  const [draft, setDraft] = React.useState<string | undefined>(undefined)
  const onChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value)
  }, [])
  const onBlur = React.useCallback(() => {
    setDraft((d) => {
      if (d !== undefined && d.trim() !== '') {
        const parsed = Number(d)
        if (Number.isFinite(parsed)) onCommit(parsed)
      }
      return undefined
    })
  }, [onCommit])
  const onKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    stopKeyPropagationUnlessEscape(e)
    if (e.key === 'Enter') e.currentTarget.blur()
  }, [])
  return {
    value: draft ?? (committed !== undefined ? String(Math.round(committed * 100) / 100) : ''),
    onChange,
    onBlur,
    onKeyDown,
    onKeyUp: stopKeyPropagationUnlessEscape,
    disabled,
  }
}

export const InspectorMenu = React.memo(function InspectorMenu(): JSX.Element | null {
  const app = useTldrawApp()
  const info = app.useStore(selectionInfoSelector)

  const isSingle = info.ids.length === 1
  const canResize = isSingle && info.w !== undefined && info.h !== undefined

  const xField = useNumberField(info.x, (x) => {
    if (info.ids.length === 0) return
    const dx = x - info.x
    app.updateShapes(
      ...info.ids.map((id) => {
        const shape = app.page.shapes[id]
        return { id, point: [shape.point[0] + dx, shape.point[1]] }
      })
    )
  })
  const yField = useNumberField(info.y, (y) => {
    if (info.ids.length === 0) return
    const dy = y - info.y
    app.updateShapes(
      ...info.ids.map((id) => {
        const shape = app.page.shapes[id]
        return { id, point: [shape.point[0], shape.point[1] + dy] }
      })
    )
  })
  const wField = useNumberField(
    info.w,
    (w) => {
      if (!canResize) return
      const shape = app.page.shapes[info.ids[0]]
      const size = getShapeSize(shape)
      if (shape && size) applyShapeSize(app, shape, w, size[1])
    },
    !canResize
  )
  const hField = useNumberField(
    info.h,
    (h) => {
      if (!canResize) return
      const shape = app.page.shapes[info.ids[0]]
      const size = getShapeSize(shape)
      if (shape && size) applyShapeSize(app, shape, size[0], h)
    },
    !canResize
  )
  const rotationField = useNumberField(
    info.rotationDeg,
    (deg) => {
      if (!isSingle) return
      const shape = app.page.shapes[info.ids[0]]
      if (shape) app.updateShapes({ id: shape.id, rotation: (deg * Math.PI) / 180 })
    },
    !isSingle
  )

  if (info.ids.length === 0) return null

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger asChild id="TD-Inspector">
        <ToolButton variant="text">Position</ToolButton>
      </DropdownMenu.Trigger>
      <DMContent>
        <StyledRow id="TD-Inspector-XY-Container">
          X / Y
          <XYFieldRow>
            <NumberInput id="TD-Inspector-X-Input" type="number" step={1} {...xField} />
            <NumberInput id="TD-Inspector-Y-Input" type="number" step={1} {...yField} />
          </XYFieldRow>
        </StyledRow>
        <StyledRow id="TD-Inspector-WH-Container">
          W / H
          <XYFieldRow>
            <NumberInput id="TD-Inspector-W-Input" type="number" min={1} step={1} {...wField} />
            <NumberInput id="TD-Inspector-H-Input" type="number" min={1} step={1} {...hField} />
          </XYFieldRow>
        </StyledRow>
        <StyledRow id="TD-Inspector-Rotation-Container">
          Rotation
          <NumberInput
            id="TD-Inspector-Rotation-Input"
            type="number"
            step={1}
            {...rotationField}
          />
        </StyledRow>
      </DMContent>
    </DropdownMenu.Root>
  )
})

const XYFieldRow = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  gap: '$1',
})

const NumberInput = styled('input', {
  width: 56,
  padding: '$1 $2',
  border: '1px solid $hover',
  borderRadius: '$0',
  background: 'transparent',
  color: '$text',
  fontFamily: '$ui',
  fontSize: '$1',
  textAlign: 'right',

  '&:focus': {
    outline: '2px solid $selected',
    outlineOffset: -1,
  },

  '&:disabled': {
    opacity: 0.5,
  },
})
