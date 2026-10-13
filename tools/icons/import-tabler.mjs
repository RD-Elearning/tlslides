#!/usr/bin/env node
/**
 * spro enhance PLAN.md I-1 — curates Tabler outline icons (MIT, v3.46.0) into
 * `packages/tldraw/src/blocks/icons/tabler.ts`: one merged path per icon on the 24 × 24 grid
 * (Tabler's own grid and 2-unit stroke, the same as Lucide's), its tags and a meaning group.
 *
 *   node tools/icons/import-tabler.mjs <tabler-outline dir>
 *
 * The directory is the git-ignored reference clone (`ppt-master/templates/icons/tabler-outline`);
 * nothing imports it at run time — the generated file is the source of truth and is committed.
 * Selection: whole categories that slides about teaching, science, data and work need, plus a
 * named list from the large generic categories; no `-off`, numbered or brand variants.
 */
import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2]
if (!dir || !fs.existsSync(dir)) {
  console.error('usage: import-tabler.mjs <tabler-outline dir>')
  process.exit(1)
}

// category → meaning group of the compose kit (`ICON_GROUPS`)
const CATEGORIES = {
  Math: 'math',
  Health: 'health',
  Charts: 'data',
  Database: 'data',
  Computers: 'tech',
  Development: 'tech',
  'Version control': 'tech',
  Nature: 'nature',
  Animals: 'nature',
  Weather: 'nature',
  Symbols: 'misc',
  Communication: 'people',
}
const MOOD = ['mood-happy', 'mood-sad', 'mood-smile', 'mood-confuzed', 'mood-surprised', 'mood-angry', 'mood-neutral', 'mood-heart', 'mood-crazy-happy', 'mood-nerd']
// named picks from the generic categories, by group
const NAMED = {
  education: ['school', 'books', 'book-2', 'notebook', 'certificate', 'presentation', 'presentation-analytics', 'chalkboard', 'backpack', 'ballpen', 'pencil', 'eraser', 'ruler-2', 'ruler-measure', 'highlight', 'bookmark', 'bookmarks', 'notes', 'clipboard-list', 'clipboard-check', 'checklist', 'list-check', 'list-numbers', 'list-details', 'quote', 'question-mark', 'help', 'bulb', 'brain', 'puzzle', 'trophy', 'award', 'medal', 'target-arrow', 'flag', 'microscope', 'flask', 'flask-2', 'atom', 'atom-2', 'dna', 'dna-2', 'telescope', 'magnet', 'prism', 'test-pipe', 'school-bell', 'abc', 'language', 'alphabet-latin', 'writing', 'file-certificate', 'mortarboard'],
  science: ['planet', 'rocket', 'satellite', 'world', 'globe', 'compass', 'temperature', 'bolt', 'battery', 'flame', 'droplet', 'wind', 'leaf', 'plant', 'seedling', 'recycle', 'solar-panel', 'windmill', 'virus', 'bacteria', 'radioactive', 'wave-sine', 'wave-square', 'zoom-scan', 'scale', 'weight', 'hourglass', 'clock', 'calendar', 'calendar-event', 'calendar-stats', 'timeline', 'timeline-event'],
  structure: ['hierarchy', 'hierarchy-2', 'hierarchy-3', 'sitemap', 'binary-tree', 'binary-tree-2', 'tree', 'trees', 'affiliate', 'chart-dots-3', 'topology-star', 'topology-star-ring', 'topology-ring', 'topology-bus', 'topology-full', 'topology-complex', 'route', 'route-2', 'git-merge', 'git-fork', 'arrows-split', 'arrows-join', 'arrows-shuffle', 'arrows-sort', 'sort-ascending', 'sort-descending', 'stack', 'stack-2', 'stack-push', 'stack-pop', 'layers-linked', 'layers-intersect', 'layout-grid', 'layout-list', 'layout-kanban', 'table', 'columns', 'grid-dots', 'circles', 'circles-relation', 'link', 'unlink', 'recursion', 'repeat', 'refresh', 'rotate-clockwise', 'infinity', 'loader', 'arrow-loop-right', 'arrow-iteration', 'arrow-fork', 'arrow-merge', 'filter', 'search', 'zoom-in', 'list-tree', 'brackets', 'braces', 'variable', 'function', 'math-function', 'cube', 'box', 'packages', 'puzzle-2'],
  business: ['briefcase', 'building', 'building-bank', 'building-factory', 'building-store', 'building-skyscraper', 'buildings', 'home', 'report-money', 'report-analytics', 'cash', 'coins', 'pig-money', 'receipt', 'shopping-cart', 'basket', 'truck', 'truck-delivery', 'package', 'tag', 'discount', 'chart-funnel', 'presentation', 'target', 'bulb', 'rocket', 'scale', 'contract', 'signature', 'file-invoice', 'invoice', 'license', 'shield-check', 'lock', 'key', 'id-badge', 'id', 'user-check', 'users-group', 'user-star', 'heart-handshake', 'thumb-up', 'thumb-down', 'star', 'stars', 'crown', 'gift', 'speakerphone', 'ad', 'world-www', 'map-pin', 'map', 'road', 'plane', 'car', 'bus', 'bike', 'ship', 'train'],
  people: ['user', 'users', 'user-plus', 'user-question', 'man', 'woman', 'friends', 'mood-kid', 'baby-carriage', 'accessible', 'hand-stop', 'hand-click', 'hand-finger', 'ear', 'eye', 'speakerphone', 'microphone', 'headphones', 'video', 'camera', 'photo', 'movie', 'music', 'palette', 'brush', 'color-swatch'],
}

function parse(file) {
  const text = fs.readFileSync(file, 'utf8')
  const tags = (/tags:\s*\[([^\]]*)\]/.exec(text)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const category = /category:\s*(.+)/.exec(text)?.[1]?.trim() ?? ''
  if (/<(circle|rect|line|polyline|polygon|ellipse)\b/.test(text)) return undefined // paths only
  const ds = [...text.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1].trim())
  if (!ds.length) return undefined
  return { tags, category, path: ds.join(' ') }
}

const out = new Map()
const add = (name, group) => {
  if (out.has(name)) return
  const f = path.join(dir, `${name}.svg`)
  if (!fs.existsSync(f)) return
  const p = parse(f)
  if (p) out.set(name, { name, group, ...p })
}
for (const f of fs.readdirSync(dir).sort()) {
  const name = f.replace(/\.svg$/, '')
  if (/-off$|-\d+$|^brand-/.test(name)) continue
  const p = parse(path.join(dir, f))
  if (p && CATEGORIES[p.category]) out.set(name, { name, group: CATEGORIES[p.category], ...p })
}
for (const n of MOOD) add(n, 'people')
for (const [group, names] of Object.entries(NAMED)) for (const n of names) add(n, group === 'structure' ? 'structure' : group)

const title = (n) => n.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
const rows = [...out.values()].sort((a, b) => a.name.localeCompare(b.name))
const lines = [
  '/**',
  ' * Generated by `tools/icons/import-tabler.mjs` (spro enhance PLAN.md I-1) — do not edit by hand.',
  ' * Tabler Icons v3.46.0 outline, MIT License, Copyright (c) 2020-2026 Paweł Kuna',
  ' * (https://tabler.io/icons). Paths merged per icon, 24 × 24 grid, stroked at 2 units.',
  ' */',
  '',
  "export const TABLER_SOURCE = 'Tabler Icons v3.46.0, MIT License - https://tabler.io/icons'",
  '',
  '/** name → [title, path, group, tags] */',
  'export const TABLER_ICONS: Record<string, [string, string, string, string[]]> = {',
  ...rows.map((r) => `  ${JSON.stringify(r.name)}: [${JSON.stringify(title(r.name))}, ${JSON.stringify(r.path)}, ${JSON.stringify(r.group)}, ${JSON.stringify(r.tags.slice(0, 8))}],`),
  '}',
  '',
]
const target = path.join(path.dirname(new URL(import.meta.url).pathname), '../../packages/tldraw/src/blocks/icons/tabler.ts')
fs.writeFileSync(target, lines.join('\n'))
const byGroup = {}
for (const r of rows) byGroup[r.group] = (byGroup[r.group] ?? 0) + 1
console.log(`${rows.length} icons →`, target, byGroup)
