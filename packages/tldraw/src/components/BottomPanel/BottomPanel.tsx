import * as React from 'react'
import { styled } from '~styles'
import { useTldrawApp } from '~hooks'
import { ToolButton } from '~components/Primitives/ToolButton'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BorderAllIcon,
  ExitIcon,
  OpenInNewWindowIcon,
} from '@radix-ui/react-icons'
import { Tooltip } from '~components/Primitives/Tooltip'
import type { TDSnapshot } from '~types'

interface BottomPanelProps {
  onBlur?: React.FocusEventHandler
}

const buildSelector = (s: TDSnapshot) => s.appState.presentationBuildStep
const transitionSelector = (s: TDSnapshot) => s.settings.presentationTransition

const TRANSITIONS = ['fade', 'push', 'none'] as const
const TRANSITION_LABEL: Record<(typeof TRANSITIONS)[number], string> = {
  fade: 'Fade',
  push: 'Push',
  none: 'Cut',
}

export const BottomPanel = React.memo(function BottomPanel({
  onBlur,
}: BottomPanelProps): JSX.Element {
  const app = useTldrawApp()
  const buildStep = app.useStore(buildSelector)
  const transition = app.useStore(transitionSelector)
  // T16.1 — recomputed from the current page's shapes on every render, same as `app.buildSteps`
  // itself: cheap, and never stale after a mid-presentation edit via a host's `Deck.insertContent`.
  const totalBuildSteps = app.buildSteps.length

  const handleCycleTransition = React.useCallback(() => {
    const next = TRANSITIONS[(TRANSITIONS.indexOf(transition) + 1) % TRANSITIONS.length]
    app.setSetting('presentationTransition', next)
  }, [app, transition])

  return (
    <StyledBottomPanel onBlur={onBlur}>
      <StyledNavigationTools>
        <Tooltip label="Back" id="TD-NavigationTools-PreviousPage">
          <ToolButton onSelect={app.previousPresentation}>
            <ArrowLeftIcon />
          </ToolButton>
        </Tooltip>
        <Tooltip label="Next" id="TD-NavigationTools-NextPage">
          <ToolButton onSelect={app.advancePresentation}>
            <ArrowRightIcon />
          </ToolButton>
        </Tooltip>
        <Tooltip label="Fit to screen" kbd="⇧1" id="TD-FitToScreen">
          <ToolButton onSelect={app.zoomToFit}>
            <BorderAllIcon />
          </ToolButton>
        </Tooltip>
        {/* T16.1 — only shown when the current slide actually has build steps, so a slide with no
            animated shapes doesn't show a permanent, meaningless "0 / 0". */}
        {totalBuildSteps > 0 && (
          <StyledBuildIndicator id="TD-BuildStepIndicator">
            Build {Math.min(buildStep, totalBuildSteps)} / {totalBuildSteps}
          </StyledBuildIndicator>
        )}
      </StyledNavigationTools>
      <StyledSpacer />
      <StyledSlideControl>
        {/* T16.6 — a small, fixed set (fade / push / cut), cycled by repeated clicks rather than
            a dropdown: three options don't need a menu, and this keeps the presenter's hands on
            one button instead of opening/closing a picker mid-talk. */}
        <Tooltip label="Slide transition" id="TD-CycleTransition">
          <ToolButton variant="text" onSelect={handleCycleTransition}>
            {TRANSITION_LABEL[transition]}
          </ToolButton>
        </Tooltip>
        <Tooltip label="Open presenter view" id="TD-OpenPresenterView">
          <ToolButton onSelect={app.openPresenterView}>
            <OpenInNewWindowIcon />
          </ToolButton>
        </Tooltip>
        <Tooltip label="Exit presentation mode" id="TD-TogglePresentationMode">
          <ToolButton onSelect={app.togglePresentationMode}>
            <ExitIcon />
          </ToolButton>
        </Tooltip>
      </StyledSlideControl>
    </StyledBottomPanel>
  )
})

const StyledBottomPanel = styled('div', {
  width: '100%',
  position: 'absolute',
  zIndex: 100,
  bottom: 0,
  left: 0,
  right: 0,
  padding: 4,
  display: 'flex',
  flexDirection: 'row',
  pointerEvents: 'none',
  backgroundColor: '$panel',
  '& > *': {
    pointerEvents: 'all',
  },
})

const StyledNavigationTools = styled('div', {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: '$2',
})

const StyledSpacer = styled('div', {
  flexGrow: 2,
  pointerEvents: 'none',
})

const StyledSlideControl = styled('div', {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: '$2',
})

const StyledBuildIndicator = styled('div', {
  fontSize: '$1',
  color: '$text',
  opacity: 0.7,
  fontVariantNumeric: 'tabular-nums',
  paddingLeft: '$2',
  userSelect: 'none',
})
