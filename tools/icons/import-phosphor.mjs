#!/usr/bin/env node
/**
 * spro creative PLAN CR9 — curates Phosphor Icons (MIT, @phosphor-icons/core 2.1.1) into
 * `packages/tldraw/src/blocks/icons/phosphor.ts`: per icon the regular and fill weights, rescaled
 * from Phosphor's 256 grid onto the engine's 24 grid (both are filled shapes, not strokes), its
 * tags and a meaning group. `look.icon: filled` draws the fill weight of any name Phosphor has;
 * a name the Tabler/Lucide set lacks (x-ray, gavel, …) is drawn from the regular weight.
 *
 *   node tools/icons/import-phosphor.mjs <@phosphor-icons/core package dir>
 *
 * The package is fetched with `npm pack @phosphor-icons/core@2.1.1` into a scratch directory; its
 * LICENSE is checked to be MIT before anything is written. Nothing imports the package at run time.
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const dir = process.argv[2]
if (!dir || !fs.existsSync(path.join(dir, 'assets/fill'))) {
  console.error('usage: import-phosphor.mjs <@phosphor-icons/core package dir>')
  process.exit(1)
}
const licence = fs.readFileSync(path.join(dir, 'LICENSE'), 'utf8')
if (!/^MIT License/.test(licence) || !/Phosphor Icons/.test(licence)) {
  console.error('licence check failed: expected the MIT licence of Phosphor Icons')
  process.exit(1)
}
const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
const { icons } = await import(pathToFileURL(path.join(dir, 'dist/index.mjs')).href)
const here = path.dirname(new URL(import.meta.url).pathname)
const blocks = path.join(here, '../../packages/tldraw/src/blocks/icons')
const tablerText = fs.readFileSync(path.join(blocks, 'tabler.ts'), 'utf8')
const lucideText = fs.readFileSync(path.join(blocks, 'index.ts'), 'utf8')
const known = new Set([...tablerText.matchAll(/^ {2}"([^"]+)": \[/gm)].map((m) => m[1]))
for (const m of lucideText.matchAll(/^ {2}'?([a-z0-9-]+)'?: lucide\(/gm)) known.add(m[1])
// the fill weights `SOLID_ALIASES` (icons/index.ts) points at: imported for their fill weight only
const solidBlock = /SOLID_ALIASES[^{]*\{([\s\S]*?)\n\}/.exec(lucideText)?.[1] ?? ''
const solidOnly = new Set([...solidBlock.matchAll(/:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]))

// Phosphor (figma) category → meaning group of the compose kit; only these categories bring new
// names (the generic ones — design, editing, games, devices, commerce — bring only the named picks)
const GROUP = {
  'health & wellness': 'health', 'math & finance': 'business', 'technology & development': 'tech',
  education: 'education', people: 'people', 'weather & nature': 'nature', time: 'time-place',
  'maps & travel': 'time-place', 'security & warnings': 'tech', communication: 'people',
}
// subjects the creative review found missing, and the math/science/law/teaching set
const MATH = ['sigma', 'pi', 'function', 'math-operations', 'calculator', 'infinity', 'percent', 'divide', 'equals', 'plus-minus', 'square-root', 'chart-scatter', 'chart-polar', 'graph', 'tree-structure', 'flow-arrow', 'intersect', 'subtract', 'unite', 'exclude', 'radical', 'triangle', 'cube', 'polygon', 'ruler', 'compass-tool', 'angle', 'vector-two', 'vector-three']
const NAMED = ['gavel', 'scales', 'robot', 'microscope', 'dna', 'flask', 'atom', 'test-tube', 'virus', 'bone', 'skull', 'tooth', 'pill', 'syringe', 'stethoscope', 'heartbeat', 'brain', 'lightbulb', 'lightbulb-filament', 'chalkboard-teacher', 'student', 'exam', 'certificate', 'books', 'book-open-text', 'notebook', 'pencil-simple', 'pen-nib', 'palette', 'paint-brush', 'camera', 'film-slate', 'microphone', 'headphones', 'music-notes', 'game-controller', 'puzzle-piece', 'dice-five', 'trophy', 'medal', 'crown', 'gift', 'rocket-launch', 'shopping-cart', 'storefront', 'package', 'truck', 'barcode', 'tag', 'receipt', 'handshake', 'briefcase', 'presentation-chart', 'kanban', 'calendar-check', 'clipboard-text', 'file-text', 'folder-open', 'envelope-simple', 'chat-circle-dots', 'megaphone', 'cpu', 'database', 'cloud', 'wifi-high', 'desktop', 'laptop', 'device-mobile', 'robot', 'code', 'terminal-window', 'bug', 'git-branch', 'lock-key', 'key', 'shield-check', 'fingerprint', 'eye', 'magnifying-glass', 'funnel', 'gear', 'sliders', 'lightning', 'fire', 'drop', 'leaf', 'plant', 'tree', 'flower', 'sun', 'moon', 'cloud-rain', 'snowflake', 'globe-hemisphere-west', 'map-trifold', 'compass', 'airplane', 'car', 'bicycle', 'bus', 'train', 'boat', 'house', 'buildings', 'factory', 'bank', 'hospital', 'church', 'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down', 'check-circle', 'x-circle', 'warning', 'info', 'question', 'star', 'heart', 'smiley', 'smiley-sad', 'thumbs-up', 'thumbs-down', 'hand-waving', 'users-three', 'user', 'baby', 'person-simple-walk', 'wheelchair', 'coffee', 'pizza', 'hamburger']
const SKIP = /^(text-|align-|arrow-(?!right$|left$|up$|down$|circle-right$|bend-up-right$|u-up-left$))|-(slash|dashed|dotted)$|^(paragraph|list-dashes|list-plus|list-magnifying-glass|columns-plus|rows-plus|selection|cursor|crop|frame-corners|caret-|dots-|square-split|split-)/
const fmt = (n) => {
  const r = Math.round(n * 100) / 100
  return (Object.is(r, -0) ? '0' : String(r)).replace(/^(-?)0\./, '$1.')
}
async function scaled(file) {
  const text = fs.readFileSync(file, 'utf8')
  if (/<(circle|rect|line|polyline|polygon|ellipse)\b/.test(text)) return undefined
  const ds = [...text.matchAll(/<path d="([^"]+)"(?! opacity)/g)].map((m) => m[1])
  if (!ds.length) return undefined
  const { scaleIconPath } = await import(pathToFileURL(path.join(blocks, 'scale-path.ts')).href)
  return scaleIconPath(ds.join(''), 24 / 256).replace(/-?\d*\.?\d+(?:e-?\d+)?/gi, (m) => fmt(parseFloat(m))).replace(/[ ,](?=-)/g, '').replace(/\s*([a-zA-Z])\s*/g, '$1')
}

const rows = []
for (const ic of icons) {
  const cats = ic.categories ?? []
  if (cats.includes('brands') || SKIP.test(ic.name)) continue
  const named = NAMED.includes(ic.name) || MATH.includes(ic.name)
  const solidAlias = solidOnly.has(ic.name) && !named && !known.has(ic.name) && !GROUP[ic.figma_category]
  if (!named && !known.has(ic.name) && !GROUP[ic.figma_category] && !solidAlias) continue
  const fill = await scaled(path.join(dir, 'assets/fill', `${ic.name}-fill.svg`))
  if (!fill) continue
  const isNew = !known.has(ic.name) && !solidAlias
  const regular = isNew ? await scaled(path.join(dir, 'assets/regular', `${ic.name}.svg`)) : ''
  if (regular === undefined) continue
  const group = MATH.includes(ic.name) ? 'math' : GROUP[ic.figma_category] ?? 'misc'
  const tags = (ic.tags ?? []).filter((t) => !t.startsWith('*')).slice(0, 8)
  rows.push({ name: ic.name, title: ic.pascal_name.replace(/([a-z])([A-Z0-9])/g, '$1 $2'), regular, fill, group, tags })
}
rows.sort((a, b) => a.name.localeCompare(b.name))
const lines = [
  '/**',
  ' * Generated by `tools/icons/import-phosphor.mjs` (spro creative PLAN CR9) — do not edit by hand.',
  ` * Phosphor Icons, @phosphor-icons/core ${pkg.version}, MIT License, Copyright (c) 2023 Phosphor Icons`,
  ' * (https://phosphoricons.com). Regular and fill weights, filled shapes rescaled to the 24 × 24 grid;',
  ' * the regular weight only for names the Tabler/Lucide set does not draw.',
  ' */',
  '',
  `export const PHOSPHOR_SOURCE = 'Phosphor Icons ${pkg.version}, MIT License - https://phosphoricons.com'`,
  '',
  '/** name → [title, regular path (\'\' when Tabler/Lucide draw the name), fill path, group, tags] */',
  'export const PHOSPHOR_ICONS: Record<string, [string, string, string, string, string[]]> = {',
  ...rows.map((r) => `  ${JSON.stringify(r.name)}: [${JSON.stringify(r.title)}, ${JSON.stringify(r.regular)}, ${JSON.stringify(r.fill)}, ${JSON.stringify(r.group)}, ${JSON.stringify(r.tags)}],`),
  '}',
  '',
]
const target = path.join(blocks, 'phosphor.ts')
fs.writeFileSync(target, lines.join('\n'))
const fresh = rows.filter((r) => r.regular).length
if (solidOnly.size < 50) console.warn('warning: SOLID_ALIASES not found in icons/index.ts')
console.log(`${rows.length} icons (${fresh} new names) →`, target, `${Math.round(fs.statSync(target).size / 1024)} KB`)
