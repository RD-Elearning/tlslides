/**
 * spro sprint 2026-11b S10 — the reveal blocks' viewer behaviour: without a runtime (editor, thumbnails,
 * exports) nothing changes (the static form); with it (DeckViewer) tabs show one panel, the accordion one
 * open section with the ones below moved up, step-through a spotlight, hotspots one note; keyboard works.
 */
import * as React from 'react'
import { render, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { renderNodeToDom, HostLayoutContext, RevealMount } from './render-dom'
import { BlockRegistryContext } from '../hooks/useBlockRegistry'
import { BlockRegistry } from './registry'
import { registerBuiltInBlocks } from './library'
import { createLayoutContext } from './layout/layout-child'
import { resolveTokens } from './tokens'
import { activityLabels } from './activity/labels'
import { isInteractiveSlide, isActivitySlide } from './activity/is-activity-slide'
import type { ActivityRuntime, BlockDefinition, ResolvedTokens, SurfaceContext } from './types'

const TOKENS: ResolvedTokens = resolveTokens({
  colors: { background: '#ffffff', surface: '#ffffff', text: '#1a1a1a', textMuted: '#6b7280', accent1: '#3b82f6', accent2: '#8b5cf6' },
  fonts: { script: 'script', sans: 'sans', serif: 'serif', mono: 'mono', heading: 'sans', body: 'sans' },
} as any)
const SURFACE: SurfaceContext = { behind: { type: 'solid', color: '#ffffff' }, luminance: 1, overImage: false }
const registry = new BlockRegistry()
registerBuiltInBlocks(registry)
const rt = (): ActivityRuntime => ({ submit: 'instant', labels: activityLabels('vi'), getState: () => undefined, setState: () => undefined, reducedMotion: true })

function setup(type: string, live: boolean, extra: Record<string, unknown> = {}) {
  const def = registry.get(type) as BlockDefinition
  const props = { ...(def.describe!.example.props as Record<string, unknown>), ...extra }
  const node = def.layout(props as any, createLayoutContext({ box: { width: 1600, height: 760 }, tokens: TOKENS, surface: SURFACE, registry }))
  const w = render(
    <BlockRegistryContext.Provider value={registry}>
      <HostLayoutContext.Provider value={{ tokens: TOKENS, surface: SURFACE, props, headless: false, ...(live ? { activity: rt } : {}) }}>
        <RevealMount def={def} props={props} blockKey="s1:b1">
          {renderNodeToDom(node)}
        </RevealMount>
      </HostLayoutContext.Provider>
    </BlockRegistryContext.Provider>,
  )
  const css = () => w.container.querySelector('style[data-rv-style]')?.textContent ?? ''
  // a flattened part's first piece (`pin[0][0]`) carries the control
  const part = (name: string) => Array.from(w.container.querySelectorAll<HTMLElement>('[data-part]')).find((e) => e.dataset.part === name || (e.dataset.part ?? '').startsWith(`${name}[`)) as HTMLElement
  return { w, css, part }
}

afterEach(cleanup)

describe('S10 reveal blocks', () => {
  it.each([['tls.c.tabs'], ['tls.c.accordion'], ['tls.c.step-through'], ['tls.c.hotspots']])('%s: without a runtime the static form is untouched (no style, no controls)', (type) => {
    const { w, css } = setup(type, false)
    expect(css()).toBe('')
    expect(w.container.querySelector('[data-rv]')).toBeNull()
    expect(w.container.querySelector('[tabindex="0"]')).toBeNull()
  })

  it('tabs: one panel at a time; a label (click or Enter) switches it', () => {
    const { css, part } = setup('tls.c.tabs', true)
    expect(part('item[0].lead').getAttribute('role')).toBe('tab')
    expect(part('item[0].lead').getAttribute('aria-selected')).toBe('true')
    expect(css()).toContain('[data-part^="item[1]."]:not([data-part^="item[1].lead"])')
    expect(css()).not.toContain('[data-part^="item[0]."]:not')
    fireEvent.keyDown(part('item[2].lead'), { key: 'Enter' })
    expect(part('item[2].lead').getAttribute('aria-selected')).toBe('true')
    expect(css()).toContain('[data-part^="item[0]."]:not([data-part^="item[0].lead"])')
  })

  it('a viewer re-render with an equal props object and a new runtime factory keeps the open tab', () => {
    const def = registry.get('tls.c.tabs') as BlockDefinition
    const props = def.describe!.example.props as Record<string, unknown>
    const node = def.layout(props as any, createLayoutContext({ box: { width: 1600, height: 760 }, tokens: TOKENS, surface: SURFACE, registry }))
    const tree = (p: Record<string, unknown>) => (
      <BlockRegistryContext.Provider value={registry}>
        <HostLayoutContext.Provider value={{ tokens: TOKENS, surface: SURFACE, props: p, headless: false, activity: () => rt() }}>
          <RevealMount def={def} props={p} blockKey="s1:b1">{renderNodeToDom(node)}</RevealMount>
        </HostLayoutContext.Provider>
      </BlockRegistryContext.Provider>
    )
    const w = render(tree({ ...props }))
    const lead = (i: number) => Array.from(w.container.querySelectorAll<HTMLElement>('[data-part]')).find((e) => (e.dataset.part ?? '').startsWith(`item[${i}].lead`)) as HTMLElement
    fireEvent.keyDown(lead(2), { key: 'Enter' })
    w.rerender(tree({ ...props }))
    expect(lead(2).getAttribute('aria-selected')).toBe('true')
  })

  it('a dim outranks the inline opacity the entrance motion leaves on parts', () => {
    const { css } = setup('tls.c.step-through', true)
    expect(css()).toMatch(/opacity:\.28!important/)
    expect(css()).not.toMatch(/opacity:[\d.]+[;}]/)
  })

  it('accordion: the first section open, the heads below a closed one move up by its body', () => {
    const { css, part } = setup('tls.c.accordion', true)
    expect(part('item[0].lead').getAttribute('aria-expanded')).toBe('true')
    expect(part('item[1].lead').getAttribute('aria-expanded')).toBe('false')
    expect(css()).toMatch(/\[data-part\^="item\[2\]\."\]\{transform:translateY\(-\d+(\.\d+)?px\)\}/)
    fireEvent.click(part('item[1].lead'))
    expect(part('item[1].lead').getAttribute('aria-expanded')).toBe('true')
    expect(css()).toContain('[data-part^="item[0]."]:not([data-part="item[0].lead"]){opacity:0')
  })

  it('step-through: a spotlight on the current step; a click on the block brings the next', () => {
    const { w, css, part } = setup('tls.c.step-through', true)
    expect(part('item[0].marker').getAttribute('aria-current')).toBe('step')
    expect(css()).toContain('[data-part^="item[1]."]{opacity:.28!important}')
    fireEvent.click(w.container.querySelector('[data-reveal]')!)
    expect(part('item[1].marker').getAttribute('aria-current')).toBe('step')
    fireEvent.keyDown(part('item[0].lead'), { key: ' ' })
    expect(part('item[0].marker').getAttribute('aria-current')).toBe('step')
  })

  it('hotspots: one note, beside the picture; a marker is a button', () => {
    const { css, part } = setup('tls.c.hotspots', true, { aspect: 1.5 })
    expect(part('pin[0]').getAttribute('role')).toBe('button')
    expect(part('pin[0]').getAttribute('aria-expanded')).toBe('true')
    expect(css()).toContain('[data-part^="item[1]."]{opacity:0')
    fireEvent.click(part('pin[1]'))
    expect(part('pin[1]').getAttribute('aria-expanded')).toBe('true')
    expect(css()).toContain('[data-part^="item[0]."]{opacity:0')
  })

  it('S10-b: a slide with a reveal block takes clicks like an activity slide', () => {
    const slide = { regions: { content: [{ id: 'a', type: 'tls.c.tabs', props: {} }] } }
    expect(isActivitySlide(slide, registry)).toBe(false)
    expect(isInteractiveSlide(slide, registry)).toBe(true)
    expect(isInteractiveSlide({ regions: { content: [{ id: 'a', type: 'tls.a.choice', props: {} }] } }, registry)).toBe(true)
    expect(isInteractiveSlide({ regions: { content: [{ id: 'a', type: 'tls.c.cards', props: {} }] } }, registry)).toBe(false)
  })
})
