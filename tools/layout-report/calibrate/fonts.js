/**
 * AC3 — the deck-style font set (reviews/blocks/ai-curation/README.md §3.3, §4.1) as @font-face CSS.
 *
 * Fonts come from the Next.js sample's fontsource packages (`examples/nextjs-sample/package.json`,
 * all OFL-1.1, each with a `vietnamese` subset). `fontFaceCss()` returns @font-face rules for the
 * normal (upright) faces of the latin, latin-ext and vietnamese subsets with every `url()` inlined
 * as a data: URI, declared under the canonical family name (the one `DeckStyle.fonts` / the theme
 * names first in its stack, e.g. 'Fraunces'; the package's own 'Fraunces Variable' is the second
 * name in the stack, for hosts that import the package CSS). Used by
 * `font-widths.js` (to measure) and `run.js` (the calibration page), so both see the same files.
 * Inter is not here: the sample loads it through `next/font` and `run.js` already inlines that.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../../..')
const NM = path.join(ROOT, 'examples/nextjs-sample/node_modules')

/** key = the metrics key (`blocks/layout/font-metrics/<key>.ts`); css = the package files to read. */
const FONT_SET = [
  { key: 'playfair-display', family: 'Playfair Display', pkg: '@fontsource-variable/playfair-display', css: ['index.css'], generic: 'serif' },
  { key: 'be-vietnam-pro', family: 'Be Vietnam Pro', pkg: '@fontsource/be-vietnam-pro', css: ['400.css', '700.css'], generic: 'sans-serif' },
  { key: 'fraunces', family: 'Fraunces', pkg: '@fontsource-variable/fraunces', css: ['index.css'], generic: 'serif' },
  { key: 'plus-jakarta-sans', family: 'Plus Jakarta Sans', pkg: '@fontsource-variable/plus-jakarta-sans', css: ['index.css'], generic: 'sans-serif' },
  { key: 'archivo', family: 'Archivo', pkg: '@fontsource-variable/archivo', css: ['index.css'], generic: 'sans-serif' },
  { key: 'patrick-hand', family: 'Patrick Hand', pkg: '@fontsource/patrick-hand', css: ['400.css'], generic: 'cursive' },
  { key: 'nunito', family: 'Nunito', pkg: '@fontsource-variable/nunito', css: ['index.css'], generic: 'sans-serif' },
  { key: 'bricolage-grotesque', family: 'Bricolage Grotesque', pkg: '@fontsource-variable/bricolage-grotesque', css: ['index.css'], generic: 'sans-serif' },
  { key: 'source-serif-4', family: 'Source Serif 4', pkg: '@fontsource-variable/source-serif-4', css: ['index.css'], generic: 'serif' },
  { key: 'crimson-pro', family: 'Crimson Pro', pkg: '@fontsource-variable/crimson-pro', css: ['index.css'], generic: 'serif' },
  { key: 'source-code-pro', family: 'Source Code Pro', pkg: '@fontsource-variable/source-code-pro', css: ['index.css'], generic: 'monospace' },
]

const SUBSETS = ['latin', 'latin-ext', 'vietnamese']

function pkgDir(f) {
  const dir = path.join(NM, f.pkg)
  if (!fs.existsSync(dir)) throw new Error(`${dir} missing: run COREPACK_ENABLE_STRICT=0 pnpm install`)
  return dir
}

/** Licence and subsets from the package metadata (recorded in the plan's AC3 notes). */
function fontMeta(f) {
  const m = JSON.parse(fs.readFileSync(path.join(pkgDir(f), 'metadata.json'), 'utf8'))
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir(f), 'package.json'), 'utf8'))
  return { family: m.family, version: pkg.version, license: (m.license && m.license.type) || m.license, subsets: m.subsets, variable: !!m.variable }
}

/** @font-face rules for the set (or `keys` of it), urls inlined, under the canonical family name. */
function fontFaceCss(keys) {
  let out = ''
  for (const f of FONT_SET) {
    if (keys && !keys.includes(f.key)) continue
    const dir = pkgDir(f)
    for (const file of f.css) {
      const css = fs.readFileSync(path.join(dir, file), 'utf8')
      for (const block of css.match(/@font-face\s*{[^}]*}/g) || []) {
        const comment = css.slice(0, css.indexOf(block)).split('/*').pop() || ''
        if (/italic/.test(block.match(/font-style:\s*([^;]+)/)?.[1] ?? '')) continue
        if (!SUBSETS.some((s) => comment.includes(`-${s}-`))) continue
        const inlined = block.replace(/,\s*url\(\.\/files\/[^)]+\.woff\)\s*format\('woff'\)/g, '').replace(/url\(\.\/files\/([^)]+)\)/g, (_m, name) => {
          const data = fs.readFileSync(path.join(dir, 'files', name)).toString('base64')
          return `url(data:font/woff2;base64,${data})`
        })
        out += inlined.replace(/font-family:\s*'[^']+'/, `font-family: '${f.family}'`) + '\n'
      }
    }
  }
  return out
}

module.exports = { FONT_SET, fontFaceCss, fontMeta }
