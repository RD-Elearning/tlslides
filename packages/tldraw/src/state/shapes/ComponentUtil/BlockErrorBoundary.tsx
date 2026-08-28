import * as React from 'react'
import { styled } from '@stitches/react'

interface BlockErrorBoundaryProps {
  componentId: string
  children: React.ReactNode
}

interface BlockErrorBoundaryState {
  error: Error | null
  lastComponentId: string
}

// A registered component is arbitrary, host-owned React code that this package does not control.
// If it throws during render, that must not take down the rest of the document with it (T5.3: "a
// document can outlive the app that defined its blocks" — the same must hold for a block that is
// merely buggy in the current app version). Scoped to a single ComponentShape, exactly as an
// error boundary is meant to be used.
export class BlockErrorBoundary extends React.Component<
  BlockErrorBoundaryProps,
  BlockErrorBoundaryState
> {
  state: BlockErrorBoundaryState = { error: null, lastComponentId: this.props.componentId }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  static getDerivedStateFromProps(
    props: BlockErrorBoundaryProps,
    state: BlockErrorBoundaryState
  ) {
    // Give a block a fresh chance to render if its componentId changes (e.g. registry hot-reload
    // during development), rather than staying stuck in the error state forever.
    if (state.error && props.componentId !== state.lastComponentId) {
      return { error: null, lastComponentId: props.componentId }
    }
    return { lastComponentId: props.componentId }
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error(`[ComponentShape "${this.props.componentId}"] threw while rendering:`, error)
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorRoot>
          <div>Block crashed</div>
          <ErrorId>{this.props.componentId}</ErrorId>
        </ErrorRoot>
      )
    }
    return this.props.children
  }
}

const ErrorRoot = styled('div', {
  pointerEvents: 'none',
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  border: '2px solid #ef4444',
  borderRadius: 4,
  background: 'rgba(239, 68, 68, 0.08)',
  color: '#b91c1c',
  fontFamily: 'sans-serif',
  fontSize: 13,
  fontWeight: 600,
  textAlign: 'center',
  padding: 8,
  boxSizing: 'border-box',
})

const ErrorId = styled('div', {
  fontSize: 11,
  fontFamily: 'monospace',
  fontWeight: 400,
  wordBreak: 'break-all',
})
