/* eslint-disable no-console */
/**
 * L0 P0.5 — all-icons sheet. Names every icon in blocks/icons/index.ts on a grid of
 * tls.m.icon-label blocks (30 per slide), PUTs each as a deck into the Next.js sample's
 * in-memory deck store, opens it in the editor and screenshots it.
 *
 * Run:  node tools/visual/shoot.js icon-sheet     (needs `next dev -p 5433` and a rebuilt dist)
 * Shots: tools/visual/shots/icon-sheet-1.png … icon-sheet-3.png
 */
const fs = require('fs')
const path = require('path')

const BASE = 'http://localhost:5433'
const PER_SLIDE = 30

function iconNames() {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'packages', 'tldraw', 'src', 'blocks', 'icons', 'index.ts'),
    'utf8'
  )
  const body = src.slice(src.indexOf('export const ICONS'), src.indexOf('export const ICON_GROUPS'))
  return Array.from(body.matchAll(/^ {2}'?([a-z0-9-]+)'?: (?:\{|lucide\()/gm)).map((m) => m[1])
}

function deckFor(names, n, total) {
  return {
    version: 1,
    id: `icon-sheet-${n}`,
    title: `Icon sheet ${n}/${total}`,
    theme: 'coral-pop',
    aspect: 'widescreen',
    slides: [
      {
        id: `sl_icons_${n}`,
        layout: 'blank',
        regions: {
          content: [
            {
              id: `grid_${n}`,
              type: 'tls.l.grid',
              props: {
                columns: 6,
                rows: 5,
                gap: 'sm',
                children: names.map((icon, i) => ({
                  id: `ic_${n}_${i}`,
                  type: 'tls.m.icon-label',
                  props: { icon, label: icon, size: 'md' },
                })),
              },
            },
          ],
        },
      },
    ],
  }
}

module.exports = {
  base: BASE,
  known: [/Accessing element\.ref was removed in React 19/],
  route: '/edit/deck-demo-q3',
  async run(page) {
    const names = iconNames()
    const total = Math.ceil(names.length / PER_SLIDE)
    const shots = path.join(__dirname, '..', 'shots')
    const files = []
    // A second page at 3x pixel density, so 24px icons are inspectable once the slide is cropped.
    const hi = await page.context().browser().newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 })
    for (let n = 1; n <= total; n++) {
      const deck = deckFor(names.slice((n - 1) * PER_SLIDE, n * PER_SLIDE), n, total)
      const res = await page.request.put(`${BASE}/api/decks/${deck.id}`, { data: deck })
      if (!res.ok()) throw new Error(`PUT ${deck.id} failed: ${res.status()}`)
      await hi.goto(`${BASE}/edit/${deck.id}`, { waitUntil: 'networkidle' })
      await hi.waitForSelector('#canvas', { timeout: 20000 })
      await hi.waitForTimeout(2000)
      const file = path.join(shots, `icon-sheet-${n}.png`)
      // Crop to the slide frame (the first deck frame element on the canvas).
      await hi.screenshot({ path: file, clip: { x: 64, y: 161, width: 961, height: 540 } })
      files.push(file)
    }
    await hi.close()
    return { iconCount: names.length, slides: total, files }
  },
}
