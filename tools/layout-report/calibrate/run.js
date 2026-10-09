#!/usr/bin/env node
/**
 * LO5 — browser calibration of the layout oracle (reviews/blocks/layout-oracle/README.md §3 LO5).
 *
 *   node tools/layout-report/calibrate/run.js [--out DIR] [--shots sl_04,ms_04] [--decks name=file,…]
 *
 * 1. bundles <DeckViewer> (the viewer's real render path) + the 4 fixture decks into DIR/www with
 *    the Inter woff2 + @font-face the Next.js sample serves (needs a prior `next dev`/`next build`
 *    of examples/nextjs-sample so .next/static has them; override with --font-css FILE);
 * 2. measure.js: ONE headless Chromium page at 1920x1080 visits every slide and records, per block,
 *    the painted DOM bbox, each layout text leaf's rendered lines/widths and the browser's own wrap;
 * 3. compare.js joins that with analyzeDeck (table + estimate) -> DIR/joined.json;
 * 4. stats.js / widths.js print the summary recorded in the plan.
 * Raw JSON stays in DIR (default: $TMPDIR/tls-calibration); nothing is written to the repo.
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '../../..')
const PKG = path.join(ROOT, 'packages/tldraw')
const args = process.argv.slice(2)
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d)
const OUT = path.resolve(opt('--out', path.join(os.tmpdir(), 'tls-calibration')))
const FONT_CSS = opt('--font-css', path.join(ROOT, 'examples/nextjs-sample/.next/static/css/app/layout.css'))
const FIX = path.join(PKG, 'src/blocks/__fixtures__')
// AC1: `--decks name=file,…` (paths under src/blocks/__fixtures__) replaces the four default decks,
// e.g. `--decks corporate=styles/corporate.json,minimal=styles/minimal.json,gradient=styles/gradient.json`.
const DEFAULT_DECKS = { demo: 'demo-deck.json', tour: 'block-library-tour.json', colorful: 'colorful-blocks-demo.json', motion: 'motion-showcase.json' }
const DECK_FILES = opt('--decks') ? Object.fromEntries(opt('--decks').split(',').map((kv) => kv.split('='))) : DEFAULT_DECKS

fs.mkdirSync(path.join(OUT, 'www/media'), { recursive: true })
if (!fs.existsSync(FONT_CSS)) throw new Error(`${FONT_CSS} missing: run next dev in examples/nextjs-sample once, or pass --font-css`)
const mediaDir = path.join(path.dirname(FONT_CSS), '../../media')
for (const f of fs.readdirSync(mediaDir)) if (f.endsWith('.woff2')) fs.copyFileSync(path.join(mediaDir, f), path.join(OUT, 'www/media', f))
const css = fs.readFileSync(FONT_CSS, 'utf8').replace(/\/_next\/static\/media\//g, 'media/')
fs.writeFileSync(
  path.join(OUT, 'www/index.html'),
  `<!doctype html><html><head><meta charset="utf-8"><style>${css}\nbody{margin:0}</style></head><body><div id="root"></div><script src="bundle.js"></script></body></html>`
)
const entry = path.join(OUT, 'entry.tsx')
fs.writeFileSync(
  entry,
  `import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { DeckViewer } from '${PKG}/src/components/DeckViewer/DeckViewer'
${Object.entries(DECK_FILES).map(([k, f]) => `import ${k} from '${FIX}/${f}'`).join('\n')}
const DECKS: Record<string, any> = { ${Object.keys(DECK_FILES).join(', ')} }
;(window as any).DECKS = Object.fromEntries(Object.entries(DECKS).map(([k, d]) => [k, d.slides.map((s: any) => s.id)]))
;(window as any).show = (deck: string, slide: number) =>
  new Promise<void>((resolve) => {
    ReactDOM.render(
      <div style={{ width: 1920, height: 1080 }}><DeckViewer spec={DECKS[deck]} slideIndex={slide} buildStep={999} /></div>,
      document.getElementById('root'),
      () => resolve()
    )
  })
`
)
const esbuild = require(require.resolve('esbuild', { paths: [ROOT, PKG] }))
esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  outfile: path.join(OUT, 'www/bundle.js'),
  tsconfig: path.join(PKG, 'tsconfig.build.json'),
  nodePaths: [path.join(PKG, 'node_modules'), path.join(ROOT, 'node_modules')],
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.json': 'json' },
  logLevel: 'error',
})
const env = { ...process.env, CALIB_OUT: OUT, SHOTS: opt('--shots', ''), CALIB_DECKS: JSON.stringify(DECK_FILES) }
for (const step of ['measure.js', 'compare.js', 'stats.js', 'widths.js']) {
  execFileSync(process.execPath, [path.join(__dirname, step)], { env, stdio: 'inherit' })
}
console.log(`raw data: ${OUT}/dom.json, ${OUT}/joined.json`)
