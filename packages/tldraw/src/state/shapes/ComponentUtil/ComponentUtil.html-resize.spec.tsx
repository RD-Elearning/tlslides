/**
 * LO8 item 1 (reviews/blocks/layout-oracle/README.md) — an html block re-wraps when it is resized.
 *
 * LO7 made html templates paint the poster's line breaks (`white-space: nowrap` + `<br>`). That is
 * only safe if every size change in the editor recomputes the poster for the new box and the live
 * HTML is re-templated from it; a stale template would keep the old (wider) lines and overflow the
 * narrower shape. These tests drive the real editor path — `ComponentUtil`'s `Component` →
 * `layoutBlock` → `renderNodeToDom` → `HostMount.update` — through a resize, a props edit and a
 * theme switch, and compare the DOM's painted lines with the poster the layout produced for the
 * *current* render.
 */
import * as React from 'react'
import { act, render } from '@testing-library/react'
import { Component } from '..'
import { TldrawContext, BlockRegistryContext } from '~hooks'
import { TldrawApp } from '~state'
import { BlockRegistry } from '~blocks/registry'
import { registerBuiltInBlocks } from '~blocks/library'
import { posterTextLeaves } from '~blocks/html-block'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'
import type { BlockDefinition, LayoutContext, LayoutNode } from '~blocks/types'

const MONO_GRID = BUILT_IN_DECK_THEMES.find((t) => t.id === 'mono-grid')!

const builtIns = new BlockRegistry()
registerBuiltInBlocks(builtIns)

function noopEvents() {
  return {
    onPointerDown: () => void 0,
    onPointerUp: () => void 0,
    onPointerEnter: () => void 0,
    onPointerMove: () => void 0,
    onPointerLeave: () => void 0,
  }
}

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim()

/** Every `white-space: nowrap` element's lines (split at `<br>`), in DOM order. */
function domLines(root: HTMLElement): string[][] {
  const out: string[][] = []
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (el.style.whiteSpace !== 'nowrap') return
    out.push(
      el.innerHTML.split(/<br\s*\/?>/i).map((part) => {
        const d = document.createElement('div')
        d.innerHTML = part
        return norm(d.textContent ?? '')
      })
    )
  })
  return out
}

/** The poster's text leaves' lines, flattened in poster order. */
function posterLines(host: LayoutNode): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const [key, list] of posterTextLeaves((host as Extract<LayoutNode, { k: 'host' }>).poster)) {
    out.set(key, list.flatMap((n) => n.lines.map((l) => norm(l.text))))
  }
  return out
}

/** Wrap a built-in html block so the test sees the host node of every render (same type → the
 *  same template is found by `HostMount`). */
function spyOn(type: string): { def: BlockDefinition; hosts: LayoutNode[]; ctxs: LayoutContext[] } {
  const base = builtIns.get(type)!
  const hosts: LayoutNode[] = []
  const ctxs: LayoutContext[] = []
  const def: BlockDefinition = {
    ...base,
    layout: (p, c) => {
      const n = base.layout(p, c)
      hosts.push(n)
      ctxs.push(c)
      return n
    },
  }
  return { def, hosts, ctxs }
}

function element(app: TldrawApp, registry: BlockRegistry, type: string, size: [number, number], props: Record<string, unknown>) {
  const shape = Component.create({
    id: 'html-1',
    componentId: type,
    point: [0, 0],
    size,
    props: { $block: { type, props } } as Record<string, unknown>,
  })
  return (
    <TldrawContext.Provider value={app}>
      <BlockRegistryContext.Provider value={registry}>
        <Component.Component
          shape={shape}
          isEditing={false}
          isBinding={false}
          isHovered={false}
          isSelected={false}
          isGhost={false}
          bounds={{ minX: 0, minY: 0, maxX: size[0], maxY: size[1], width: size[0], height: size[1] }}
          meta={{ isDarkMode: false }}
          events={noopEvents()}
        />
      </BlockRegistryContext.Provider>
    </TldrawContext.Provider>
  )
}

function exampleProps(type: string): Record<string, unknown> {
  const def = builtIns.get(type)!
  return { ...(def.defaults as Record<string, unknown>), ...((def.describe?.example?.props as Record<string, unknown>) ?? {}) }
}

/** The DOM paints exactly the last poster's lines, and no poster line is wider than the box. */
function expectDomMatchesLastPoster(container: HTMLElement, hosts: LayoutNode[], ctxs: LayoutContext[]) {
  const host = hosts[hosts.length - 1]
  const ctx = ctxs[ctxs.length - 1]
  const expected = [...posterLines(host).values()]
  const painted = domLines(container)
  expect(painted.map((l) => l.join(' / ')).sort()).toEqual(expected.map((l) => l.join(' / ')).sort())
  for (const [, list] of posterTextLeaves((host as Extract<LayoutNode, { k: 'host' }>).poster)) {
    for (const n of list) {
      for (const l of n.lines) expect(l.width).toBeLessThanOrEqual(ctx.box.width + 0.5)
    }
  }
}

describe('LO8: html blocks re-wrap live when the shape is resized or edited', () => {
  const app = new TldrawApp()
  act(() => {
    app.setDeckTheme(MONO_GRID)
  })

  const CASES: Array<{ type: string; wide: [number, number]; narrow: [number, number]; key: string }> = [
    { type: 'tls.c.hero', wide: [1728, 600], narrow: [640, 700], key: 'title' },
    { type: 'tls.c.testimonial', wide: [1400, 420], narrow: [420, 700], key: 'quote' },
    { type: 'tls.c.feature-grid', wide: [1728, 420], narrow: [1120, 520], key: 'cells.0.title' },
  ]

  for (const { type, wide, narrow, key } of CASES) {
    it(`${type}: resize wide → narrow → wide re-templates from the new poster`, () => {
      const { def, hosts, ctxs } = spyOn(type)
      const registry = new BlockRegistry()
      registry.register(def)
      const props = exampleProps(type)

      const r = render(element(app, registry, type, wide, props))
      expectDomMatchesLastPoster(r.container, hosts, ctxs)
      const wideLines = posterLines(hosts[hosts.length - 1])

      r.rerender(element(app, registry, type, narrow, props))
      expectDomMatchesLastPoster(r.container, hosts, ctxs)
      const narrowLines = posterLines(hosts[hosts.length - 1])
      // The test is only meaningful if the narrow box really wraps differently.
      const total = (m: Map<string, string[]>) => [...m.values()].reduce((s, l) => s + l.length, 0)
      expect(total(narrowLines)).toBeGreaterThan(total(wideLines))
      expect(narrowLines.has(key)).toBe(true)

      r.rerender(element(app, registry, type, wide, props))
      expectDomMatchesLastPoster(r.container, hosts, ctxs)
      expect(posterLines(hosts[hosts.length - 1])).toEqual(wideLines)
      r.unmount()
    })
  }

  it('tls.c.hero: a props edit at the same size re-templates (new text, new lines)', () => {
    const type = 'tls.c.hero'
    const { def, hosts, ctxs } = spyOn(type)
    const registry = new BlockRegistry()
    registry.register(def)
    const props = exampleProps(type)
    const r = render(element(app, registry, type, [900, 700], props))
    expectDomMatchesLastPoster(r.container, hosts, ctxs)
    const longer = { ...props, title: 'Margin fell on cloud spending across every region this quarter' }
    r.rerender(element(app, registry, type, [900, 700], longer))
    expectDomMatchesLastPoster(r.container, hosts, ctxs)
    expect(posterLines(hosts[hosts.length - 1]).get('title')!.join(' ')).toContain('every region')
    r.unmount()
  })

  it('tls.c.hero: a theme with another type scale re-wraps at the same size and props', () => {
    const type = 'tls.c.hero'
    const { def, hosts, ctxs } = spyOn(type)
    const registry = new BlockRegistry()
    registry.register(def)
    const props = { ...exampleProps(type), title: 'Margin fell on cloud spending this quarter' }
    const r = render(element(app, registry, type, [900, 700], props))
    expectDomMatchesLastPoster(r.container, hosts, ctxs)
    const before = posterLines(hosts[hosts.length - 1])
    const other = BUILT_IN_DECK_THEMES.find((t) => t.id === 'midnight')!
    act(() => {
      app.setDeckTheme(other)
    })
    expectDomMatchesLastPoster(r.container, hosts, ctxs)
    // Meaningful only if the other type scale really wraps differently.
    expect(posterLines(hosts[hosts.length - 1])).not.toEqual(before)
    act(() => {
      app.setDeckTheme(MONO_GRID)
    })
    r.unmount()
  })
})
