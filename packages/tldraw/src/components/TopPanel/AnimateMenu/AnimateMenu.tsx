import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTldrawApp } from '~hooks'
import { DMContent } from '~components/Primitives/DropdownMenu'
import { ToolButton } from '~components/Primitives/ToolButton'
import { StyledRow } from '~components/TopPanel/StyleMenu/StyleMenu'
import { styled } from '~styles'
import { stopKeyPropagationUnlessEscape } from '~components/preventEvent'
import { nextBuildOrder } from '~state/deck/presentation'
import { AnimationEffect, AnimationTrigger } from '~types'
import type { ShapeAnimation, TDSnapshot } from '~types'

const selectedIdsSelector = (s: TDSnapshot) =>
  s.document.pageStates[s.appState.currentPageId].selectedIds

// Reads the *first* selected shape's animation directly off the store, rather than off `app.page`
// at render time — `app.page` is a plain getter with no subscription of its own, so a component
// that only calls `app.useStore(selectedIdsSelector)` never re-renders when a shape's `animation`
// field changes without the *selection* also changing (exactly what every control in this panel
// does: pick an effect, and the ids selected don't change). Caught by actually driving this menu
// in a browser, not by any type check — the dropdown kept showing "None" after picking "Fade in".
const currentAnimationSelector = (s: TDSnapshot): ShapeAnimation | undefined => {
  const pageId = s.appState.currentPageId
  const firstId = s.document.pageStates[pageId].selectedIds[0]
  return firstId ? s.document.pages[pageId].shapes[firstId]?.animation : undefined
}

const EFFECT_OPTIONS: { value: AnimationEffect | 'none'; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: AnimationEffect.FadeIn, label: 'Fade in' },
  { value: AnimationEffect.SlideIn, label: 'Slide in' },
  { value: AnimationEffect.ZoomIn, label: 'Zoom in' },
  { value: AnimationEffect.Wipe, label: 'Wipe' },
]

const TRIGGER_OPTIONS: { value: AnimationTrigger; label: string }[] = [
  { value: AnimationTrigger.OnClick, label: 'On click' },
  { value: AnimationTrigger.WithPrevious, label: 'With previous' },
  { value: AnimationTrigger.AfterPrevious, label: 'After previous' },
]

// Snappy enough to not stall a live talk, slow enough to read as an intentional animation rather
// than a glitch — the same "pick one sane default, let a free-typed field override it" pattern
// Phase 8b's stroke-width/opacity controls already use.
const DEFAULT_DURATION_MS = 400
const DEFAULT_DELAY_MS = 0

/**
 * T16.2 — a panel to author a shape's build-step animation (effect/trigger/order/duration/delay),
 * routed through `TldrawApp.setShapeAnimation` (a thin wrapper over the generic `setShapeProps`
 * command) so undo/redo work exactly like every `StyleMenu` control.
 *
 * **Where it lives, and why:** next to `StyleMenu` in `TopPanel`'s left panel — animation is, like
 * style, a property of the current *selection*, not of the page (`BackgroundMenu`'s territory) or
 * the deck (`ThemeMenu`'s). It's a separate menu rather than a new `StyleMenu` section because it
 * only makes sense with a selection (there is no "next shape drawn gets this animation" concept
 * the way `currentStyle` provides for colour/dash/size) — `StyleMenu` stays meaningful with an
 * empty selection (it edits the *next* shape's defaults then); this one simply doesn't render.
 *
 * **Multi-selection scope decision:** this reads and writes the *first* selected shape's
 * animation, not a `StyleMenu`-style "common value across the selection" merge. Two shapes are
 * rarely meant to share one `order` (see `computeBuildSteps`'s grouping rules — same `order`,
 * different `trigger`, produces a build step nobody explicitly asked for), so most authoring is
 * one shape at a time; a full merge UI was judged not worth the size increase for a niche case. A
 * multi-shape selection still *sets* the same animation on every selected shape in one undo step
 * (`setShapeAnimation`'s own contract) — only the panel's *display* is first-shape-only.
 */
export const AnimateMenu = React.memo(function AnimateMenu(): JSX.Element | null {
  const app = useTldrawApp()
  const selectedIds = app.useStore(selectedIdsSelector)
  const current = app.useStore(currentAnimationSelector)

  const handleEffectChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value
      if (value === 'none') {
        app.setShapeAnimation(undefined, selectedIds)
        return
      }
      const next: ShapeAnimation = current
        ? { ...current, effect: value as AnimationEffect }
        : {
            effect: value as AnimationEffect,
            trigger: AnimationTrigger.OnClick,
            order: nextBuildOrder(app.page),
            durationMs: DEFAULT_DURATION_MS,
            delayMs: DEFAULT_DELAY_MS,
          }
      app.setShapeAnimation(next, selectedIds)
    },
    [app, current, selectedIds]
  )

  const handleTriggerChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!current) return
      app.setShapeAnimation({ ...current, trigger: e.target.value as AnimationTrigger }, selectedIds)
    },
    [app, current, selectedIds]
  )

  const orderField = useIntField(current?.order, (order) => {
    if (current) app.setShapeAnimation({ ...current, order }, selectedIds)
  })
  const durationField = useIntField(current?.durationMs, (durationMs) => {
    if (current) app.setShapeAnimation({ ...current, durationMs: Math.max(0, durationMs) }, selectedIds)
  })
  const delayField = useIntField(current?.delayMs, (delayMs) => {
    if (current) app.setShapeAnimation({ ...current, delayMs: Math.max(0, delayMs) }, selectedIds)
  })

  if (selectedIds.length === 0) return null

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger asChild id="TD-Animate">
        <ToolButton variant="text">{current ? 'Animated' : 'Animate'}</ToolButton>
      </DropdownMenu.Trigger>
      <DMContent>
        <StyledRow id="TD-Animate-Effect-Container">
          Effect
          <StyledSelect
            id="TD-Animate-Effect-Select"
            value={current?.effect ?? 'none'}
            onChange={handleEffectChange}
            onKeyDown={stopKeyPropagationUnlessEscape}
            onKeyUp={stopKeyPropagationUnlessEscape}
          >
            {EFFECT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </StyledSelect>
        </StyledRow>
        {current && (
          <>
            <StyledRow id="TD-Animate-Trigger-Container">
              Trigger
              <StyledSelect
                id="TD-Animate-Trigger-Select"
                value={current.trigger}
                onChange={handleTriggerChange}
                onKeyDown={stopKeyPropagationUnlessEscape}
                onKeyUp={stopKeyPropagationUnlessEscape}
              >
                {TRIGGER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </StyledSelect>
            </StyledRow>
            <StyledRow id="TD-Animate-Order-Container">
              Order
              <NumberInput id="TD-Animate-Order-Input" type="number" step={1} {...orderField} />
            </StyledRow>
            <StyledRow id="TD-Animate-Duration-Container">
              Duration (ms)
              <NumberInput
                id="TD-Animate-Duration-Input"
                type="number"
                min={0}
                step={50}
                {...durationField}
              />
            </StyledRow>
            <StyledRow id="TD-Animate-Delay-Container">
              Delay (ms)
              <NumberInput id="TD-Animate-Delay-Input" type="number" min={0} step={50} {...delayField} />
            </StyledRow>
          </>
        )}
      </DMContent>
    </DropdownMenu.Root>
  )
})

/**
 * A free-typed integer field: shows a live draft while typing, commits on blur or Enter (not per
 * keystroke, so "4" while typing "400" doesn't briefly commit 4), and drops an invalid/blank draft
 * rather than coercing it. Same shape as `StyleMenu`'s stroke-width/corner-radius handling —
 * pulled into one small hook here since this panel needed three near-identical copies of it.
 */
function useIntField(committed: number | undefined, onCommit: (value: number) => void) {
  const [draft, setDraft] = React.useState<string | undefined>(undefined)
  const onChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value)
  }, [])
  const onBlur = React.useCallback(() => {
    setDraft((d) => {
      if (d !== undefined && d.trim() !== '') {
        const parsed = Number(d)
        if (Number.isFinite(parsed)) onCommit(Math.round(parsed))
      }
      return undefined
    })
  }, [onCommit])
  const onKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    stopKeyPropagationUnlessEscape(e)
    if (e.key === 'Enter') e.currentTarget.blur()
  }, [])
  return {
    value: draft ?? String(committed ?? 0),
    onChange,
    onBlur,
    onKeyDown,
    onKeyUp: stopKeyPropagationUnlessEscape,
  }
}

const StyledSelect = styled('select', {
  padding: '$1 $2',
  border: '1px solid $hover',
  borderRadius: '$0',
  background: 'transparent',
  color: '$text',
  fontFamily: '$ui',
  fontSize: '$1',
  '&:focus': {
    outline: '2px solid $selected',
    outlineOffset: -1,
  },
})

const NumberInput = styled('input', {
  width: 64,
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
})
