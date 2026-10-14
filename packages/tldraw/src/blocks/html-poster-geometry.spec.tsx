/**
 * LO7 (reviews/blocks/layout-oracle/README.md) — html-kind blocks paint their poster's text.
 *
 * The layout oracle measures an html block from its export poster. Before LO7 the live template
 * let the browser wrap its own text with its own line-heights, so the poster was an approximation
 * (confidence `medium`, always a screenshot). Now every built-in html template, given the poster
 * (`ctx.poster`, handed over by `HostMount`), paints exactly the poster's lines with the poster's
 * text metrics, and its host node says so (`posterGeometry`). These tests pin that contract:
 * 1. every built-in html block declares `posterGeometry`, and `measureBlock` trusts it (`high`);
 *    a host without the flag stays `medium`;
 * 2. for every html block, at three widths and two themes, the template's no-wrap text elements
 *    carry exactly the poster's lines and its font-size / line-height / letter-spacing;
 * 3. `HostMount` hands the host node's poster to the template (the real render path);
 * 4. without a poster the template is what it was (the browser wraps).
 * The geometry itself (poster vs Chromium, per part) is the LO5 calibration harness's job.
 */

import * as React from 'react'
import { render, cleanup } from '@testing-library/react'

import { BlockRegistry } from './registry'
import { BUILT_IN_BLOCKS, registerBuiltInBlocks } from './library'
import { createLayoutContext } from './layout/layout-child'
import { measureBlock } from './layout/measure-block'
import { resolveTokens } from './tokens'
import { renderNodeToDom, HostLayoutContext } from './render-dom'
import { BlockRegistryContext } from '../hooks/useBlockRegistry'
import { htmlHostNode, posterText, posterTextLeaves } from './html-block'
import { BUILT_IN_DECK_THEMES } from '../state/shapes/shared/deck-theme'
import type { BlockDefinition, HtmlTemplateContext, LayoutContext, LayoutNode, SurfaceContext } from './types'

const SURFACE: SurfaceContext = { behind: { type: 'solid', color: '#ffffff' }, luminance: 1, overImage: false }
const registry = new BlockRegistry()
registerBuiltInBlocks(registry)
const HTML_BLOCKS = BUILT_IN_BLOCKS.filter((d) => d.kind === 'html')

function ctxFor(width: number, height: number, themeIndex = 0): LayoutContext {
  return createLayoutContext({
    box: { width, height },
    tokens: resolveTokens(BUILT_IN_DECK_THEMES[themeIndex]),
    surface: SURFACE,
    registry,
  })
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function tplCtx(c: LayoutContext, host: Extract<LayoutNode, { k: 'host' }> | undefined): HtmlTemplateContext {
  return {
    esc,
    cssVar: (role: string) => `var(--tls-${role})`,
    box: { x: 0, y: 0, width: c.box.width, height: host?.box.height ?? c.box.height },
    tokens: c.tokens,
    ...(host?.poster ? { poster: host.poster } : {}),
  }
}

function exampleProps(def: BlockDefinition): Record<string, unknown> {
  return { ...(def.defaults as Record<string, unknown>), ...((def.describe?.example?.props as Record<string, unknown>) ?? {}) }
}

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim()

/** The template's poster-painted text elements: `white-space: nowrap` with the poster's metrics. */
function paintedTexts(html: string): Array<{ lines: string[]; size: number; lh: number; ls: number }> {
  const root = document.createElement('div')
  root.innerHTML = html
  const out: Array<{ lines: string[]; size: number; lh: number; ls: number }> = []
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (el.style.whiteSpace !== 'nowrap') return
    const lines = el.innerHTML.split(/<br\s*\/?>/i).map((part) => {
      const d = document.createElement('div')
      d.innerHTML = part
      return norm(d.textContent ?? '')
    })
    out.push({ lines, size: parseFloat(el.style.fontSize), lh: parseFloat(el.style.lineHeight), ls: parseFloat(el.style.letterSpacing) || 0 })
  })
  return out
}

describe('LO7: html blocks paint their poster', () => {
  afterEach(() => cleanup())

  it('there are html blocks, and every one declares posterGeometry on its host node', () => {
    expect(HTML_BLOCKS.map((d) => d.type).sort()).toEqual([
      'tls.c.big-stat',
      'tls.c.feature-grid',
      'tls.c.feature-reveal',
      'tls.c.hero',
      'tls.c.journey',
      'tls.c.kinetic-title',
      'tls.c.stat-spotlight',
      'tls.c.testimonial',
    ])
    for (const def of HTML_BLOCKS) {
      const node = def.layout(exampleProps(def), ctxFor(1728, 732))
      expect(node.k).toBe('host')
      expect((node as Extract<LayoutNode, { k: 'host' }>).posterGeometry).toBe(true)
    }
  })

  it('measureBlock: confidence high for a posterGeometry host, medium for a plain poster host', () => {
    for (const def of HTML_BLOCKS) {
      const m = measureBlock(def, exampleProps(def), 1728, ctxFor(1728, 732))
      expect({ type: def.type, confidence: m.confidence }).toEqual({ type: def.type, confidence: 'high' })
    }
    const hero = registry.get('tls.c.hero')!
    const approx: BlockDefinition = {
      ...hero,
      type: 'test.approx-hero',
      layout: (p, c) => htmlHostNode(hero.poster as never, 'tls.c.hero', p, c),
    }
    const m = measureBlock(approx, exampleProps(hero), 1728, ctxFor(1728, 732))
    expect(m.confidence).toBe('medium')
    expect(m.reason).toMatch(/poster/)
  })

  for (const def of HTML_BLOCKS) {
    for (const [w, h, theme] of [
      [1728, 732, 0],
      [840, 600, 0],
      [1728, 888, 1],
    ] as const) {
      it(`${def.type} @${w}x${h} theme ${theme}: template text = poster lines and metrics`, () => {
        const c = ctxFor(w, h, theme)
        const host = def.layout(exampleProps(def), c) as Extract<LayoutNode, { k: 'host' }>
        const html = def.html!.template(exampleProps(def), tplCtx(c, host))
        const painted = paintedTexts(html)
        const leaves = posterTextLeaves(host.poster)
        expect(leaves.size).toBeGreaterThan(0)
        // Every poster text the template paints appears once, line for line, with its metrics.
        const unmatched = [...painted]
        for (const [key, nodes] of leaves) {
          const lines = nodes.flatMap((n) => n.lines).map((l) => norm(l.text))
          const style = nodes[0].style
          const i = unmatched.findIndex((p) => JSON.stringify(p.lines) === JSON.stringify(lines))
          expect({ key, found: i >= 0, lines }).toEqual({ key, found: true, lines })
          const p = unmatched.splice(i, 1)[0]
          expect({ key, size: p.size, lh: p.lh, ls: p.ls }).toEqual({
            key,
            size: Math.round(style.size * (style.scale ?? 1) * 100) / 100,
            lh: style.lineHeight,
            ls: style.letterSpacing,
          })
        }
        // … and the template paints no other text without wrapping.
        expect(unmatched).toEqual([])
      })
    }
  }

  it('without a poster the template lets the browser wrap (no forced lines)', () => {
    for (const def of HTML_BLOCKS) {
      const c = ctxFor(1728, 732)
      const html = def.html!.template(exampleProps(def), tplCtx(c, undefined))
      expect({ type: def.type, painted: paintedTexts(html).length }).toEqual({ type: def.type, painted: 0 })
      expect(posterText({ esc }).active).toBe(false)
    }
  })

  it('HostMount hands the host node poster to the template (a narrow hero wraps where the poster does)', () => {
    const def = registry.get('tls.c.hero')!
    const props = { ...exampleProps(def), title: 'Margin fell on cloud spending this quarter' }
    const c = ctxFor(900, 600)
    const host = def.layout(props, c) as Extract<LayoutNode, { k: 'host' }>
    const titleLines = posterTextLeaves(host.poster).get('title')![0].lines
    expect(titleLines.length).toBeGreaterThan(1)
    const wrapper = render(
      <BlockRegistryContext.Provider value={registry}>
        <HostLayoutContext.Provider value={{ tokens: c.tokens, surface: SURFACE, props, headless: false }}>
          {renderNodeToDom(host)}
        </HostLayoutContext.Provider>
      </BlockRegistryContext.Provider>
    )
    const title = wrapper.container.querySelector<HTMLElement>('[data-part="title"]')!
    expect(title.style.whiteSpace).toBe('nowrap')
    expect(title.querySelectorAll('br')).toHaveLength(titleLines.length - 1)
    expect(paintedTexts(title.outerHTML)[0].lines).toEqual(titleLines.map((l) => norm(l.text)))
  })
})
