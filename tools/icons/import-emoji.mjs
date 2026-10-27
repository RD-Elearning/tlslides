#!/usr/bin/env node
/**
 * spro creative PLAN CR9 — curates Fluent Emoji (Microsoft, MIT) flat SVGs into
 * `packages/tldraw/src/blocks/icons/emoji.ts` for `tls.m.emoji` and `look.icon: emoji`: per emoji
 * its title, glyph, the SVG body (32 × 32 grid, numbers rounded to one decimal) and its keywords.
 * Skin-toned emoji use the default tone.
 *
 *   node tools/icons/import-emoji.mjs [ref]      (ref: a git ref of microsoft/fluentui-emoji, default main)
 *
 * Fetches from raw.githubusercontent.com; the repository's LICENSE is checked to be MIT before
 * anything is written. Nothing fetches at run time — the generated file is committed.
 */
import fs from 'node:fs'
import path from 'node:path'

const ref = process.argv[2] ?? 'main'
const RAW = `https://raw.githubusercontent.com/microsoft/fluentui-emoji/${ref}`
const get = async (p) => {
  const r = await fetch(`${RAW}/${p.split('/').map(encodeURIComponent).join('/')}`)
  return r.ok ? r.text() : undefined
}
const licence = (await get('LICENSE')) ?? ''
if (!/MIT License/.test(licence) || !/Microsoft Corporation/.test(licence)) {
  console.error('licence check failed: expected the MIT licence of Microsoft Corporation')
  process.exit(1)
}

// Fluent folder names: teaching, science, data, work, feelings, nature, travel, celebration
const CURATED = [
  'Rocket', 'Light bulb', 'Microscope', 'Telescope', 'Test tube', 'Dna', 'Books', 'Open book', 'Notebook',
  'Graduation cap', 'School', 'Pencil', 'Memo', 'Bar chart', 'Chart increasing', 'Chart decreasing',
  'Bullseye', 'Trophy', 'Sports medal', '1st place medal', 'Star', 'Glowing star', 'Sparkles', 'Fire',
  'High voltage', 'Hundred points', 'Check mark button', 'Cross mark', 'Red question mark',
  'Red exclamation mark', 'Warning', 'Brain', 'Robot', 'Laptop', 'Desktop computer', 'Mobile phone',
  'Globe showing asia-australia', 'Globe with meridians', 'Globe showing americas', 'Calendar',
  'Spiral calendar', 'Hourglass done', 'Alarm clock', 'Stopwatch', 'Money bag', 'Dollar banknote', 'Coin',
  'Credit card', 'Shopping cart', 'Package', 'Delivery truck', 'Handshake', 'Thumbs up', 'Clapping hands',
  'Waving hand', 'Raising hands', 'Folded hands', 'Flexed biceps', 'Party popper', 'Confetti ball',
  'Wrapped gift', 'Balloon', 'Smiling face with smiling eyes', 'Grinning face with big eyes',
  'Thinking face', 'Exploding head', 'Star-struck', 'Smiling face with sunglasses', 'Face with monocle',
  'Nerd face', 'Partying face', 'Face screaming in fear', 'Hugging face', 'Red heart', 'Sparkling heart',
  'Seedling', 'Herb', 'Deciduous tree', 'Evergreen tree', 'Four leaf clover', 'Sunflower',
  'Globe showing europe-africa', 'Sun', 'Rainbow', 'Cloud with lightning and rain', 'Snowflake', 'Droplet',
  'Water wave', 'Recycling symbol', 'Hospital', 'Stethoscope', 'Pill', 'Syringe', 'Adhesive bandage',
  'Anatomical heart', 'Bone', 'Tooth', 'X-ray', 'Magnifying glass tilted left', 'Key', 'Locked', 'Shield',
  'Gear', 'Hammer and wrench', 'Toolbox', 'Magnet', 'Balance scale', 'Bell', 'Megaphone', 'Loudspeaker',
  'Speech balloon', 'Thought balloon', 'Envelope', 'Clipboard', 'Pushpin', 'Round pushpin', 'Paperclip',
  'Scroll', 'Puzzle piece', 'Game die', 'Video game', 'Artist palette', 'Musical notes', 'Movie camera',
  'Camera', 'Microphone', 'Headphone', 'Airplane', 'Automobile', 'Bicycle', 'Bus', 'Ship', 'Railway car',
  'Building construction', 'Classical building', 'Office building', 'House', 'Factory', 'World map',
  'Compass', 'Mountain', 'Brick', 'Chart increasing with yen', 'Abacus', 'Input numbers', 'Straight ruler',
  'Triangular ruler', 'Alembic', 'Atom symbol', 'Satellite', 'Battery', 'Electric plug', 'Hot beverage',
  'Pizza', 'Red apple', 'Bread', 'Cat', 'Dog face', 'Owl', 'Honeybee', 'Butterfly', 'Turtle', 'Eyes', 'Ear',
  'Ok hand', 'Victory hand', 'Index pointing up', 'Backhand index pointing right', 'Raised hand',
  'Writing hand', 'Bust in silhouette', 'Busts in silhouette', 'Teacher', 'Student', 'Scientist',
  'Technologist', 'Health worker', 'Judge', 'Office worker', 'Ninja', 'Crown', 'Gem stone', 'Door', 'Hammer',
  'Lady beetle', 'Ticket', 'Card index dividers', 'Bookmark tabs', 'Label', 'Spiral notepad', 'Ledger',
  'Newspaper', 'Page facing up', 'Inbox tray', 'Outbox tray', 'Link', 'Chains', 'Hourglass not done',
  'Watch', 'Firecracker', 'Light rail', 'Stop sign', 'Construction', 'Vertical traffic light',
  'Chequered flag', 'Triangular flag', 'Placard', 'White flag', 'Japanese symbol for beginner', 'Sos button',
  'New button', 'Cool button', 'Free button'
]

const fmt = (m) => {
  const r = Math.round(parseFloat(m) * 10) / 10
  return (Object.is(r, -0) ? '0' : String(r)).replace(/^(-?)0\./, '$1.')
}
function minify(svg) {
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  return body
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
    .replace(/(\sd=")([^"]+)"/g, (_, a, d) => a + d.replace(/-?\d*\.?\d+(?:e-?\d+)?/gi, fmt).replace(/\s*([a-zA-Z])\s*/g, '$1').replace(/ (?=-)/g, '') + '"')
    .trim()
}
const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const rows = []
for (const folder of CURATED) {
  const snake = folder.toLowerCase().replace(/ /g, '_')
  const svg = (await get(`assets/${folder}/Flat/${snake}_flat.svg`)) ?? (await get(`assets/${folder}/Default/Flat/${snake}_flat_default.svg`))
  if (!svg) {
    console.warn('missing', folder)
    continue
  }
  if (/<image|xlink:href="http/.test(svg)) continue // flat SVGs are paths; anything else is skipped
  const meta = JSON.parse((await get(`assets/${folder}/metadata.json`)) ?? '{}')
  rows.push({ name: kebab(folder), title: folder, glyph: meta.glyph ?? '', body: minify(svg), tags: [...new Set([...(meta.keywords ?? []), ...(meta.mappedToEmoticons ?? [])])].slice(0, 8) })
}
rows.sort((a, b) => a.name.localeCompare(b.name))
const lines = [
  '/**',
  ' * Generated by `tools/icons/import-emoji.mjs` (spro creative PLAN CR9) — do not edit by hand.',
  ' * Fluent Emoji (flat), MIT License, Copyright (c) Microsoft Corporation',
  ' * (https://github.com/microsoft/fluentui-emoji). SVG bodies on the 32 × 32 grid.',
  ' */',
  '',
  "export const EMOJI_SOURCE = 'Fluent Emoji (Microsoft), MIT License - https://github.com/microsoft/fluentui-emoji'",
  '',
  '/** name → [title, glyph, SVG body (32 × 32 viewBox), tags] */',
  'export const EMOJI: Record<string, [string, string, string, string[]]> = {',
  ...rows.map((r) => `  ${JSON.stringify(r.name)}: [${JSON.stringify(r.title)}, ${JSON.stringify(r.glyph)}, ${JSON.stringify(r.body)}, ${JSON.stringify(r.tags)}],`),
  '}',
  '',
]
const target = path.join(path.dirname(new URL(import.meta.url).pathname), '../../packages/tldraw/src/blocks/icons/emoji.ts')
fs.writeFileSync(target, lines.join('\n'))
console.log(`${rows.length} emoji →`, target, `${Math.round(fs.statSync(target).size / 1024)} KB`)
