/**
 * L03 — an activity is interactive ONLY when the host renders it interactively (DeckViewer sets
 * `HostLayoutContext.activity`); the editor canvas, thumbnails and export render the static poster.
 */

import * as React from 'react'
import { render, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { renderNodeToDom, HostLayoutContext } from './render-dom'
import { BlockRegistryContext } from '../hooks/useBlockRegistry'
import { BlockRegistry } from './registry'
import { registerBuiltInBlocks } from './library'
import { tlsAChoice } from './library/activity/tls-a-choice'
import { createLayoutContext } from './layout/layout-child'
import { resolveTokens } from './tokens'
import { activityLabels } from './activity/labels'
import type { ActivityRuntime, ActivityState, ResolvedTokens, SurfaceContext } from './types'

const TOKENS: ResolvedTokens = resolveTokens({
  colors: { background: '#ffffff', surface: '#ffffff', text: '#1a1a1a', textMuted: '#6b7280', accent1: '#3b82f6', accent2: '#8b5cf6' },
  fonts: { script: 'script', sans: 'sans', serif: 'serif', mono: 'mono', heading: 'sans', body: 'sans' },
} as any)
const SURFACE: SurfaceContext = { behind: { type: 'solid', color: '#ffffff' }, luminance: 1, overImage: false }

function setup(activity?: (key: string) => ActivityRuntime) {
  const registry = new BlockRegistry()
  registerBuiltInBlocks(registry)
  const props = tlsAChoice.describe!.example.props as Record<string, unknown>
  const node = tlsAChoice.layout(props as any, createLayoutContext({ box: { width: 1500, height: 900 }, tokens: TOKENS, surface: SURFACE, registry }))
  return render(
    <BlockRegistryContext.Provider value={registry}>
      <HostLayoutContext.Provider value={{ tokens: TOKENS, surface: SURFACE, props, headless: false, ...(activity ? { activity } : {}) }}>
        {renderNodeToDom(node)}
      </HostLayoutContext.Provider>
    </BlockRegistryContext.Provider>,
  )
}

afterEach(cleanup)

describe('L03 activity wiring', () => {
  it('without an activity runtime (editor, thumbnails) the poster markup is there but nothing responds', () => {
    const w = setup()
    const opt = w.container.querySelector('[data-act="option"][data-i="1"]') as HTMLButtonElement
    expect(opt).toBeTruthy()
    fireEvent.click(opt)
    expect(opt.dataset.state).toBe('idle')
    expect(w.container.querySelector('[data-part="feedback"]')?.textContent).toBe('')
  })

  it('with the runtime (DeckViewer) a click answers, and the state is the viewer session\'s', () => {
    let saved: ActivityState | undefined
    const keys: string[] = []
    const rt = (key: string): ActivityRuntime => {
      keys.push(key)
      return { submit: 'instant', labels: activityLabels('vi'), getState: () => saved, setState: (s) => (saved = s), reducedMotion: true }
    }
    const w = setup(rt)
    const opt = w.container.querySelector('[data-act="option"][data-i="1"]') as HTMLButtonElement
    fireEvent.click(opt)
    expect(opt.dataset.state).toBe('correct')
    expect(w.container.querySelector('[data-part="feedback"]')?.textContent).toBe('Chính xác!')
    expect(saved?.done).toBe(true)
    expect(keys.length).toBeGreaterThan(0)
  })
})
