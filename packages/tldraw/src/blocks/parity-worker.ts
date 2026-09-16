/**
 * Playwright measurement worker. Runs in a child Node.js process
 * (forked by parity-harness.ts) to avoid Jest 27's VM sandbox
 * incompatibility with Playwright's dynamic imports.
 *
 * IPC protocol:
 *   Request:  { id, cmd: 'check', html, svgHtml, partNames, box, treeJson }
 *   Response: { id, ok: true, dom: {...}, svg: {...} }
 *          or { id, ok: false, error: string }
 *   Request:  { cmd: 'quit' }
 */

import { chromium } from 'playwright'
import type { Browser, Page } from 'playwright'

interface Geom {
  x: number
  y: number
  width: number
  height: number
}

interface PartResult {
  geom: Geom
  textLines: string[]
  fill: string | null
  strokeStyle: string | null
}

let browser: Browser | null = null
let page: Page | null = null

async function ensureBrowser(): Promise<Page> {
  if (!page) {
    browser = await chromium.launch()
    page = await browser.newPage()
  }
  return page
}

/**
 * Annotate SVG elements with data-part attributes by walking the SVG DOM
 * and LayoutNode tree in parallel.
 */
async function annotateSvg(
  p: Page,
  containerSelector: string,
  treeJson: string,
): Promise<void> {
  await p.evaluate(
    ({ sel, json }) => {
      const container = document.querySelector(sel)
      if (!container) return
      const svgEl = container.querySelector('svg')
      if (!svgEl) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const layoutTree = JSON.parse(json) as any

      function walk(svgNode: Element, layoutNode: Record<string, unknown>): void {
        if (layoutNode.part) {
          svgNode.setAttribute('data-part', String(layoutNode.part))
        }
        if (
          layoutNode.k === 'group' &&
          svgNode.tagName.toLowerCase() === 'g'
        ) {
          const kids = Array.from(svgNode.children)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lKids = (layoutNode.children || []) as any[]
          let si = 0
          while (
            si < kids.length &&
            kids[si].tagName.toLowerCase() === 'defs'
          ) {
            si++
          }
          for (let i = 0; i < lKids.length && si < kids.length; i++) {
            walk(kids[si], lKids[i])
            si++
          }
        }
      }

      // Find first content child of root <svg> (skip <defs>)
      const rootKids = Array.from(svgEl.children)
      let start = 0
      while (
        start < rootKids.length &&
        rootKids[start].tagName.toLowerCase() === 'defs'
      ) {
        start++
      }
      if (start < rootKids.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        walk(rootKids[start], layoutTree as any)
      }
    },
    { sel: containerSelector, json: treeJson },
  )
}

/**
 * Measure all [data-part] elements in a container.
 */
async function measureContainer(
  p: Page,
  containerId: string,
  partNames: string[],
): Promise<Record<string, PartResult>> {
  return p.evaluate(
    ({ sel, names }) => {
      const c = document.querySelector(sel)
      if (!c) return {}
      const cr = c.getBoundingClientRect()
      const result: Record<string, PartResult> = {}
      for (const name of names) {
        const el = c.querySelector(`[data-part="${name}"]`)
        if (!el) continue
        const r = el.getBoundingClientRect()
        const geom = {
          x: Math.round((r.x - cr.x) * 10) / 10,
          y: Math.round((r.y - cr.y) * 10) / 10,
          width: Math.round(r.width * 10) / 10,
          height: Math.round(r.height * 10) / 10,
        }

        // Text lines: child divs (DOM) or tspans (SVG)
        const divs = el.querySelectorAll(':scope > div')
        const tspans = el.querySelectorAll('tspan')
        let textLines: string[] = []
        if (divs.length > 0) {
          textLines = Array.from(divs).map((d) => d.textContent || '')
        } else if (tspans.length > 0) {
          textLines = Array.from(tspans).map((t) => t.textContent || '')
        }

        // Fill: computed background-color (DOM) or style attribute fill (SVG)
        const computed = getComputedStyle(el)
        let fill: string | null = null
        const bg = computed.backgroundColor
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          fill = bg
        }

        // Stroke: style attribute content (SVG) or computed border (DOM)
        const styleAttr = el.getAttribute('style')
        let strokeStyle: string | null = null
        if (styleAttr) {
          if (styleAttr.includes('stroke')) {
            strokeStyle = styleAttr
          }
          // For SVG elements: extract fill from style attribute
          // (SVG doesn't use CSS background-color for fill)
          if (!fill) {
            const fillMatch = styleAttr.match(/fill:\s*([^;]+)/)
            if (fillMatch && fillMatch[1] !== 'none') {
              fill = fillMatch[1]
            }
          }
        }
        // Also check computed border for DOM elements
        if (!strokeStyle) {
          const bw = computed.borderWidth
          if (bw && bw !== '0px') {
            strokeStyle = `border:${bw} ${computed.borderStyle} ${computed.borderColor}`
          }
        }

        result[name] = { geom, textLines, fill, strokeStyle }
      }
      return result
    },
    { sel: containerId, names: partNames },
  )
}

async function handleRequest(msg: Record<string, unknown>): Promise<Record<string, unknown>> {
  switch (msg.cmd) {
    case 'check': {
      const p = await ensureBrowser()
      const html = msg.html as string
      const svgHtml = msg.svgHtml as string
      const partNames = msg.partNames as string[]
      const box = msg.box as { width: number; height: number }
      const treeJson = msg.treeJson as string

      // Mount in page
      await p.setContent(
        `<!DOCTYPE html><html><head>` +
          `<style>*{margin:0;padding:0;box-sizing:border-box}body{overflow:hidden}</style>` +
          `</head><body>` +
          `<div id="dom-mount">${html}</div>` +
          `<div id="svg-mount" style="position:relative;width:${box.width}px;height:${box.height}px;overflow:hidden">${svgHtml}</div>` +
          `</body></html>`,
        { waitUntil: 'domcontentloaded' },
      )

      // Annotate SVG with data-part attributes
      await annotateSvg(p, '#svg-mount', treeJson)

      const domResults = await measureContainer(p, '#dom-mount', partNames)
      const svgResults = await measureContainer(p, '#svg-mount', partNames)

      return { ok: true, dom: domResults, svg: svgResults }
    }

    case 'quit': {
      await browser?.close()
      process.exit(0)
      break // unreachable but satisfies eslint no-fallthrough
    }

    default:
      return { ok: false, error: `Unknown command: ${msg.cmd}` }
  }
}

function send(msg: Record<string, unknown>): void {
  if (process.send) process.send(msg)
}

process.on('message', async (msg: Record<string, unknown>) => {
  try {
    const result = await handleRequest(msg)
    send({ ...result, id: msg.id })
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e))
    send({ ok: false, error: err.message, id: msg.id })
  }
})

send({ ready: true })
