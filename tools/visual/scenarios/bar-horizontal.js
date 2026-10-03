/* eslint-disable no-console */
/**
 * L0 P0.9 — tls.d.bar with orientation: 'horizontal' next to the default vertical chart.
 * PUTs a one-slide deck into the Next.js sample's in-memory store, opens it, crops to the slide
 * at 2x density.
 *
 * Run:  node tools/visual/shoot.js bar-horizontal   (needs `next dev -p 5433` and a rebuilt dist)
 */
const path = require('path')

const BASE = 'http://localhost:5433'

const deck = {
  version: 1,
  id: 'bar-horizontal',
  title: 'Horizontal bar',
  theme: 'coral-pop',
  aspect: 'widescreen',
  slides: [
    {
      id: 'sl_bar_h',
      layout: 'two-column',
      regions: {
        title: [{ id: 't1', type: 'tls.t.title', props: { text: 'Horizontal and vertical, same data' } }],
        left: [
          {
            id: 'bar_h',
            type: 'tls.d.bar',
            props: {
              orientation: 'horizontal',
              title: 'Revenue by region ($M)',
              categories: ['North America', 'Europe, Middle East and Africa', 'Asia Pacific', 'Latin America', 'Other'],
              series: [120, 90, 150, 40, null],
              highlightIndex: 2,
            },
          },
        ],
        right: [
          {
            id: 'bar_v',
            type: 'tls.d.bar',
            props: {
              title: 'Vertical (default)',
              categories: ['NA', 'EMEA', 'APAC', 'LATAM'],
              series: [120, 90, 150, 40],
              highlightIndex: 2,
            },
          },
        ],
      },
    },
  ],
}

module.exports = {
  base: BASE,
  known: [/Accessing element\.ref was removed in React 19/],
  route: '/edit/deck-demo-q3',
  async run(page) {
    const res = await page.request.put(`${BASE}/api/decks/${deck.id}`, { data: deck })
    if (!res.ok()) throw new Error(`PUT failed: ${res.status()}`)
    const hi = await page.context().browser().newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
    await hi.goto(`${BASE}/edit/${deck.id}`, { waitUntil: 'networkidle' })
    await hi.waitForSelector('#canvas', { timeout: 20000 })
    await hi.waitForTimeout(2500)
    const file = path.join(__dirname, '..', 'shots', 'bar-horizontal-slide.png')
    await hi.screenshot({ path: file, clip: { x: 64, y: 161, width: 961, height: 540 } })
    await hi.close()
    return { file }
  },
}
