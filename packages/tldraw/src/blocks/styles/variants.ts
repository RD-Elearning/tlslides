import { FontStyle } from '~types'
import type { DeckTheme } from '~types'
import type { BlockSpec, DeckStyle, MasterSpec } from '../types'
import { DOODLE_STYLE } from './doodle'
import { GLASS_STYLE } from './glass'
import { MEMPHIS_STYLE } from './memphis'
import { MINIMAL_STYLE } from './minimal'
import { motif, placePx } from './_place'

/**
 * spro enhance PLAN.md S1/S3 — style variants, wave 1. A variant is a complete style inside a
 * family (`variantOf`): its own palettes, render treatment, motif pack and masters, the base
 * style's knob defaults and rules where they still fit. Fonts are the bundled faces (a new face
 * needs the font pipeline: sidecar fonts, frontend, width tables).
 */

const HAND = { heading: FontStyle.Script, body: FontStyle.Sans, headingFamily: '"Patrick Hand", cursive', bodyFamily: '"Nunito", "Nunito Variable", sans-serif' }
const BRICOLAGE = { heading: FontStyle.Sans, body: FontStyle.Sans, headingFamily: '"Bricolage Grotesque", "Bricolage Grotesque Variable", sans-serif', bodyFamily: '"Nunito", "Nunito Variable", sans-serif' }
const JAKARTA = { heading: FontStyle.Sans, body: FontStyle.Sans, headingFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Variable", sans-serif', bodyFamily: '"Inter", "Inter Variable", sans-serif' }
const SERIF = { heading: FontStyle.Serif, body: FontStyle.Sans, headingFamily: '"Source Serif 4", "Source Serif 4 Variable", serif', bodyFamily: '"Inter", "Inter Variable", sans-serif' }

const pal = (id: string, name: string, fonts: DeckTheme['fonts'], c: DeckTheme['colors'], radius: number): DeckTheme => ({
  id,
  name,
  colors: c,
  fonts,
  shapeDefaults: { isFilled: true, cornerRadius: radius },
})

const at = (shape: string, tone: string, seed: number, x: number, y: number, w: number, h: number, extra: Record<string, unknown> = {}): BlockSpec =>
  placePx(motif(shape, { tone, opacity: 'strong', seed, ...extra }), x, y, w, h)
const texture = (pattern: string, scale = 'md', tone = 'line'): BlockSpec => ({ id: 'paper', type: 'tls.m.pattern', props: { pattern, scale, tone, opacity: 'soft' } })

// ── doodle / sketchnote ─────────────────────────────────────────────────────────────────────────
const SKETCH_MASTERS: MasterSpec[] = [
  // the motifs keep to the right edge and the bottom margin: the cover's kicker and title sit top-left
  { name: 'cover', signature: 'star', blocks: { star: at('star', 'accent', 3, 1640, 120, 150, 150, { rotation: 10 }), sparkle: at('sparkle', 'accent2', 6, 1500, 300, 90, 90), squiggle: at('squiggle', 'accent2', 7, 1400, 930, 420, 64) }, background: { type: 'solid', color: 'theme:background' } },
  { name: 'section', signature: 'star', blocks: { star: at('star', 'accent', 8, 1420, 320, 380, 380, { rotation: 6 }), squiggle: at('squiggle', 'accent2', 2, 1240, 880, 480, 64) }, background: { type: 'solid', color: 'theme:surface' } },
  // S4: the content master carries the page only; the slide's motif comes from its ticket
  { name: 'content', blocks: {}, background: { type: 'solid', color: 'theme:background' } },
]
export const DOODLE_SKETCHNOTE_STYLE: DeckStyle = {
  ...DOODLE_STYLE,
  id: 'doodle-sketchnote',
  variantOf: 'doodle',
  name: 'Doodle · Sketchnote',
  brief: 'Sketchnote: warm paper, hand-drawn ink outlines, pen-hatched pastel blocks, stars and squiggles.',
  palettes: [
    pal('doodle-sketchnote-cream', 'Sketchnote Cream', HAND, { background: '#FFFCF5', surface: '#FFF1C9', text: '#1A1A1A', textMuted: '#54504A', accent1: '#E4572E', accent2: '#2F9C95', positive: '#2F855A', negative: '#C53030', warning: '#B7791F' }, 22),
    pal('doodle-sketchnote-sky', 'Sketchnote Sky', HAND, { background: '#FBFDFF', surface: '#E3F0FF', text: '#15202B', textMuted: '#4A5563', accent1: '#2563EB', accent2: '#F2994A', positive: '#2F855A', negative: '#C53030', warning: '#B7791F' }, 22),
    pal('doodle-sketchnote-mint', 'Sketchnote Mint', HAND, { background: '#FAFFFB', surface: '#DFF5E8', text: '#14231B', textMuted: '#465A4E', accent1: '#1F8A5B', accent2: '#E2557B', positive: '#2F855A', negative: '#C53030', warning: '#B7791F' }, 22),
  ],
  surface: { card: 'filled', stroke: 'bold', shadow: 0, render: { stroke: 'rough', fill: 'hachure', roughness: 1.3, emphasis: 'highlighter', highlight: '#FFD86B' } },
  masters: SKETCH_MASTERS,
  // a big wave behind a diagram read as clutter (golden v1): corners and behind a statement only
  concept: { decoration: 'rich', motifs: ['tls.m.decoration:star', 'tls.m.decoration:sparkle', 'tls.m.decoration:squiggle', 'tls.m.decoration:icon', 'tls.m.icon-cluster'], zones: ['corner', 'behind-title'], icons: 'blob', accent: 'Ink black for lines, one warm colour for the key word; pastel blocks for groups.' , subjects: true },
  rules: ['Short, friendly sentences.', 'Draw the idea, not paragraphs.'],
}

// ── doodle / geo3d ──────────────────────────────────────────────────────────────────────────────
const GEO_MASTERS: MasterSpec[] = [
  { name: 'cover', signature: 'cube', blocks: { grid: texture('grid', 'lg'), cube: at('cube', 'accent', 1, 1480, 120, 300, 300), cyl: at('cylinder', 'accent2', 2, 140, 760, 200, 240), cone: at('cone', 'accent', 3, 1660, 760, 180, 220) }, background: { type: 'solid', color: 'theme:background' } },
  { name: 'section', signature: 'cube', blocks: { grid: texture('grid', 'lg'), cube: at('cube', 'accent', 4, 1360, 300, 420, 420), slab: at('slab', 'accent2', 5, 1180, 820, 300, 180) }, background: { type: 'solid', color: 'theme:surface' } },
  { name: 'content', blocks: { grid: texture('grid', 'lg') }, background: { type: 'solid', color: 'theme:background' } },
]
export const DOODLE_GEO3D_STYLE: DeckStyle = {
  ...DOODLE_STYLE,
  id: 'doodle-geo3d',
  variantOf: 'doodle',
  name: 'Doodle · Geo 3D',
  brief: 'Geometric doodle: grid paper, isometric cubes, cylinders and cones with an ink edge, slab-like cards.',
  palettes: [
    pal('doodle-geo3d-indigo', 'Geo Indigo', HAND, { background: '#FBFBFE', surface: '#ECEEFF', text: '#161833', textMuted: '#4B4F6B', accent1: '#5B5BD6', accent2: '#F59E0B', positive: '#2F855A', negative: '#C53030', warning: '#B7791F' }, 16),
    pal('doodle-geo3d-coral', 'Geo Coral', HAND, { background: '#FFFBF8', surface: '#FFE9DF', text: '#2A1712', textMuted: '#63493F', accent1: '#F0643C', accent2: '#2A9D8F', positive: '#2F855A', negative: '#B42318', warning: '#B7791F' }, 16),
    pal('doodle-geo3d-lime', 'Geo Lime', HAND, { background: '#FCFDF7', surface: '#EEF6D8', text: '#1C2410', textMuted: '#4E5A3C', accent1: '#5E8C1F', accent2: '#7C5CFC', positive: '#2F855A', negative: '#B42318', warning: '#9A6700' }, 16),
  ],
  surface: { card: 'filled', stroke: 'bold', shadow: 'hard', render: { stroke: 'rough', roughness: 0.7 } },
  masters: GEO_MASTERS,
  concept: { decoration: 'rich', motifs: ['tls.m.decoration:cube', 'tls.m.decoration:cylinder', 'tls.m.decoration:cone', 'tls.m.decoration:pyramid', 'tls.m.decoration:slab', 'tls.m.decoration:icon', 'tls.m.icon-cluster'], zones: ['corner', 'beside-visual', 'behind-title'], icons: 'tile', accent: 'Indigo for structure, amber for the one thing to notice; one solid beside the main visual.' , subjects: true },
  rules: ['Structure first: layers, stacks, trees, steps.', 'One solid per slide, beside the visual.'],
  blockDefaults: { ...DOODLE_STYLE.blockDefaults, 'tls.t.takeaway': { ...DOODLE_STYLE.blockDefaults['tls.t.takeaway'], variant: 'tint' } },
}

// ── doodle / chalkboard ─────────────────────────────────────────────────────────────────────────
const CHALK_MASTERS: MasterSpec[] = [
  { name: 'cover', signature: 'star', blocks: { grain: texture('grain', 'md', 'line'), star: at('star', 'accent', 3, 150, 130, 130, 130), squiggle: at('squiggle', 'accent2', 7, 160, 880, 380, 60) }, background: { type: 'solid', color: 'theme:background' } },
  { name: 'section', signature: 'sparkle', blocks: { grain: texture('grain', 'md', 'line'), sparkle: at('sparkle', 'accent', 2, 1520, 300, 260, 260) }, background: { type: 'solid', color: 'theme:background' } },
  { name: 'content', blocks: { grain: texture('grain', 'md', 'line') }, background: { type: 'solid', color: 'theme:background' } },
]
export const DOODLE_CHALKBOARD_STYLE: DeckStyle = {
  ...DOODLE_STYLE,
  id: 'doodle-chalkboard',
  variantOf: 'doodle',
  name: 'Doodle · Chalkboard',
  brief: 'Chalkboard: dark slate, chalk-white handwriting, pastel chalk colours, all drawn by hand.',
  palettes: [
    pal('doodle-chalkboard-slate', 'Chalk Slate', HAND, { background: '#22302F', surface: '#2B3B3A', text: '#F4F1E8', textMuted: '#C9C4B5', accent1: '#F9D56E', accent2: '#8FD3C7', positive: '#9BE29B', negative: '#FF9A8B', warning: '#F9D56E' }, 14),
    pal('doodle-chalkboard-green', 'Chalk Green', HAND, { background: '#1F3A2C', surface: '#284838', text: '#F3F1E7', textMuted: '#C6CDBF', accent1: '#FFD479', accent2: '#F5A3B7', positive: '#A8E6A1', negative: '#FFA49A', warning: '#FFD479' }, 14),
    pal('doodle-chalkboard-night', 'Chalk Night', HAND, { background: '#1D2333', surface: '#262E42', text: '#F1F2F6', textMuted: '#C2C7D4', accent1: '#7FD1FF', accent2: '#FFB86B', positive: '#9BE29B', negative: '#FF9A8B', warning: '#FFD479' }, 14),
  ],
  surface: { card: 'outline', stroke: 'bold', shadow: 0, render: { stroke: 'rough', roughness: 1.6 } },
  masters: CHALK_MASTERS,
  motionStyle: 'subtle',
  concept: { decoration: 'sparse', motifs: ['tls.m.decoration:star', 'tls.m.decoration:squiggle', 'tls.m.decoration:sparkle', 'tls.m.decoration:icon', 'tls.m.icon-cluster'], zones: ['corner', 'behind-title'], icons: 'plain', accent: 'Chalk yellow for the key word, mint for the second idea; outlines only, no filled panels.' , subjects: true },
  rules: ['Few words, big, as on a board.', 'Outlines, never solid panels.'],
  blockDefaults: { ...DOODLE_STYLE.blockDefaults, 'tls.t.takeaway': { ...DOODLE_STYLE.blockDefaults['tls.t.takeaway'], variant: 'line' } },
}

// ── doodle / notebook ───────────────────────────────────────────────────────────────────────────
const NOTE_MASTERS: MasterSpec[] = [
  { name: 'cover', signature: 'star', blocks: { lines: texture('lines', 'lg'), star: at('star', 'accent2', 3, 1640, 140, 140, 140) }, background: { type: 'solid', color: 'theme:background' } },
  { name: 'section', blocks: { lines: texture('lines', 'lg') }, background: { type: 'solid', color: 'theme:background' } },
  { name: 'content', blocks: { lines: texture('lines', 'lg') }, background: { type: 'solid', color: 'theme:background' } },
]
export const DOODLE_NOTEBOOK_STYLE: DeckStyle = {
  ...DOODLE_STYLE,
  id: 'doodle-notebook',
  variantOf: 'doodle',
  name: 'Doodle · Notebook',
  brief: 'Notebook: lined paper, ballpoint-blue handwriting, sticky-note cards, a highlighter on key words.',
  palettes: [
    pal('doodle-notebook-blue', 'Notebook Blue', HAND, { background: '#FFFFFF', surface: '#FFF6C7', text: '#1B2A6B', textMuted: '#4A5584', accent1: '#2B59C3', accent2: '#E8A317', positive: '#2F855A', negative: '#C53030', warning: '#B7791F' }, 6),
    pal('doodle-notebook-red', 'Notebook Red', HAND, { background: '#FFFEFB', surface: '#FFE4E1', text: '#2A1B1B', textMuted: '#5E4A4A', accent1: '#C8372D', accent2: '#2B59C3', positive: '#2F855A', negative: '#B42318', warning: '#B7791F' }, 6),
    pal('doodle-notebook-green', 'Notebook Green', HAND, { background: '#FFFFFF', surface: '#E5F7E0', text: '#1A2E1F', textMuted: '#4A5E4F', accent1: '#2E7D4F', accent2: '#E8A317', positive: '#2F855A', negative: '#B42318', warning: '#9A6700' }, 6),
  ],
  surface: { card: 'filled', stroke: 'hairline', shadow: 1, render: { stroke: 'rough', roughness: 1, emphasis: 'highlighter', highlight: '#FFE066' } },
  masters: NOTE_MASTERS,
  concept: { decoration: 'sparse', motifs: ['tls.m.decoration:star', 'tls.m.decoration:squiggle', 'tls.m.decoration:icon', 'tls.m.icon-cluster'], zones: ['corner', 'under-heading'], icons: 'plain', accent: 'Blue ink for text, a yellow highlighter on one key word per slide.' , subjects: true },
  rules: ['Notes, not prose.', 'One highlighted word per slide.'],
}

// ── minimal / soft ──────────────────────────────────────────────────────────────────────────────
export const MINIMAL_SOFT_STYLE: DeckStyle = {
  ...MINIMAL_STYLE,
  id: 'minimal-soft',
  variantOf: 'minimal',
  name: 'Minimal · Soft',
  brief: 'Soft minimal: off-white pages, white rounded cards that float on a gentle shadow, one clear accent colour, generous space.',
  palettes: [
    pal('minimal-soft-blue', 'Soft Blue', JAKARTA, { background: '#F6F7F9', surface: '#FFFFFF', text: '#111827', textMuted: '#4B5563', accent1: '#2563EB', accent2: '#93C5FD', positive: '#15803D', negative: '#B91C1C', warning: '#A16207' }, 20),
    pal('minimal-soft-teal', 'Soft Teal', JAKARTA, { background: '#F5F8F7', surface: '#FFFFFF', text: '#0F1F1C', textMuted: '#475B57', accent1: '#0F766E', accent2: '#99D5CC', positive: '#15803D', negative: '#B91C1C', warning: '#A16207' }, 20),
    pal('minimal-soft-rose', 'Soft Rose', JAKARTA, { background: '#FAF6F6', surface: '#FFFFFF', text: '#1F1416', textMuted: '#5F4B4F', accent1: '#BE185D', accent2: '#F9A8D4', positive: '#15803D', negative: '#B91C1C', warning: '#A16207' }, 20),
  ],
  fonts: { heading: { family: 'Plus Jakarta Sans', fallback: FontStyle.Sans, metricsKey: 'plus-jakarta-sans' }, body: { family: 'Inter', fallback: FontStyle.Sans, metricsKey: 'inter' } },
  tokens: { ...MINIMAL_STYLE.tokens, radius: { sm: 10, md: 20, lg: 24, xl: 32 } },
  surface: { card: 'raised', stroke: 'none', shadow: 1 },
  concept: { decoration: 'none', motifs: ['tls.x.rule'], zones: ['under-heading', 'watermark'], quiet: ['tls.m.decoration:icon'], icons: 'disc', accent: 'The accent on the key word and the one number; everything else grey.' },
  rules: ['One idea per slide.', 'White cards on a soft page; no ornament.', 'One accent colour, used once per slide.'],
  blockDefaults: { ...MINIMAL_STYLE.blockDefaults, 'tls.t.takeaway': { ...MINIMAL_STYLE.blockDefaults['tls.t.takeaway'], variant: 'tint' } },
}

// ── glass / clay 3D ─────────────────────────────────────────────────────────────────────────────
const CLAY_MASTERS: MasterSpec[] = [
  { name: 'cover', blocks: { orb: at('orb', 'accent', 1, 1420, 100, 360, 360), orb2: at('orb', 'accent2', 2, 120, 760, 220, 220), blob: at('blob', 'accent2', 9, 1560, 760, 260, 220, { opacity: 'soft' }) }, background: { type: 'solid', color: 'theme:background' } },
  { name: 'section', blocks: { orb: at('orb', 'accent', 3, 1300, 260, 480, 480) }, background: { type: 'solid', color: 'theme:surface' } },
  { name: 'content', blocks: {}, background: { type: 'solid', color: 'theme:background' } },
]
export const GLASS_CLAY_STYLE: DeckStyle = {
  ...GLASS_STYLE,
  id: 'glass-clay',
  variantOf: 'glass',
  name: 'Glass · Clay 3D',
  brief: 'Clay 3D: pastel pages, puffy white cards with deep soft shadows, glossy spheres and soft blobs. Modern, friendly, product-like.',
  palettes: [
    pal('glass-clay-lilac', 'Clay Lilac', JAKARTA, { background: '#EEF0FB', surface: '#FFFFFF', text: '#171A33', textMuted: '#4E5272', accent1: '#6D4AFF', accent2: '#FF7EB3', positive: '#15803D', negative: '#B91C1C', warning: '#A16207' }, 28),
    pal('glass-clay-peach', 'Clay Peach', JAKARTA, { background: '#FFF1EA', surface: '#FFFFFF', text: '#2B1710', textMuted: '#664A40', accent1: '#F25F3A', accent2: '#4CC9F0', positive: '#15803D', negative: '#B91C1C', warning: '#A16207' }, 28),
    pal('glass-clay-mint', 'Clay Mint', JAKARTA, { background: '#E9F7F2', surface: '#FFFFFF', text: '#0F241D', textMuted: '#45605A', accent1: '#10A37F', accent2: '#FFB020', positive: '#15803D', negative: '#B91C1C', warning: '#A16207' }, 28),
  ],
  tokens: { ...GLASS_STYLE.tokens, radius: { sm: 14, md: 24, lg: 32, xl: 40 } },
  surface: { card: 'raised', stroke: 'none', shadow: 2 },
  masters: CLAY_MASTERS,
  concept: { decoration: 'sparse', motifs: ['tls.m.decoration:orb', 'tls.m.decoration:blob', 'tls.m.decoration:icon', 'tls.m.icon-cluster'], zones: ['corner', 'beside-visual'], icons: 'tile', accent: 'One saturated colour for the focus; spheres in the margin, never on the text.' },
  rules: ['Big, rounded, friendly.', 'One sphere or blob per slide, in the margin.', 'Numbers large, words few.'],
  blockDefaults: { ...GLASS_STYLE.blockDefaults, 'tls.t.takeaway': { ...GLASS_STYLE.blockDefaults['tls.t.takeaway'], variant: 'tint' } },
}

// ── memphis / confetti 3D ───────────────────────────────────────────────────────────────────────
const CONFETTI_MASTERS: MasterSpec[] = [
  { name: 'cover', signature: 'cube', blocks: { cube: at('cube', 'accent', 1, 1540, 80, 260, 260), pyr: at('pyramid', 'accent2', 2, 120, 760, 240, 240), zig: at('zigzag', 'accent', 3, 1380, 970, 460, 70), cyl: at('cylinder', 'accent', 4, 1700, 700, 160, 200) }, background: { type: 'solid', color: 'theme:background' } },
  { name: 'section', signature: 'cube', blocks: { cube: at('cube', 'alt', 5, 1340, 300, 440, 440), zig: at('zigzag', 'alt', 6, 1140, 1000, 720, 56) }, background: { type: 'solid', color: 'theme:accent1' } },
  { name: 'content', blocks: { zig: at('zigzag', 'accent', 8, 40, 1024, 260, 40) }, background: { type: 'solid', color: 'theme:background' } },
]
export const MEMPHIS_CONFETTI_STYLE: DeckStyle = {
  ...MEMPHIS_STYLE,
  id: 'memphis-confetti',
  variantOf: 'memphis',
  name: 'Memphis · Confetti 3D',
  brief: 'Memphis with depth: bright flat colours, black outlines, hard shadows and floating isometric cubes, pyramids and cylinders among the zigzags.',
  palettes: [
    pal('memphis-confetti-pop', 'Confetti Pop', BRICOLAGE, { background: '#FFF8EC', surface: '#FFFFFF', text: '#1A1A1A', textMuted: '#4D4743', accent1: '#FF5C8A', accent2: '#2EC4B6', positive: '#2F855A', negative: '#C53030', warning: '#9A6700' }, 8),
    pal('memphis-confetti-sun', 'Confetti Sun', BRICOLAGE, { background: '#FFFBEA', surface: '#FFFFFF', text: '#1A1A1A', textMuted: '#4D4743', accent1: '#3A86FF', accent2: '#FF006E', positive: '#2F855A', negative: '#C53030', warning: '#9A6700' }, 8),
  ],
  masters: CONFETTI_MASTERS,
  concept: { decoration: 'rich', motifs: ['tls.m.decoration:cube', 'tls.m.decoration:pyramid', 'tls.m.decoration:zigzag', 'tls.m.decoration:cylinder', 'tls.m.decoration:dots', 'tls.m.decoration:icon', 'tls.m.icon-cluster'], zones: ['corner', 'beside-visual', 'behind-title'], icons: 'sticker', accent: 'Flat bright blocks; one floating solid in the margin, never on the text.' , subjects: true },
}

// ── academic / lecture ──────────────────────────────────────────────────────────────────────────
export const ACADEMIC_LECTURE_STYLE: DeckStyle = {
  ...MINIMAL_STYLE,
  id: 'academic-lecture',
  variantOf: 'minimal',
  family: 'professional',
  name: 'Academic · Lecture',
  brief: 'University lecture: serif titles, clean sans body, thin rules, outlined definition and theorem boxes, numbered figures. Quiet and precise.',
  palettes: [
    pal('academic-lecture-ivory', 'Lecture Ivory', SERIF, { background: '#FFFFFF', surface: '#F6F4EE', text: '#141414', textMuted: '#54524C', accent1: '#1D4ED8', accent2: '#B45309', positive: '#15803D', negative: '#B91C1C', warning: '#A16207' }, 6),
    pal('academic-lecture-crimson', 'Lecture Crimson', SERIF, { background: '#FFFFFF', surface: '#F7F2F2', text: '#161212', textMuted: '#57504F', accent1: '#9F1239', accent2: '#1E40AF', positive: '#15803D', negative: '#B91C1C', warning: '#A16207' }, 6),
    pal('academic-lecture-forest', 'Lecture Forest', SERIF, { background: '#FFFFFF', surface: '#F1F5F1', text: '#121712', textMuted: '#4F574F', accent1: '#166534', accent2: '#B45309', positive: '#15803D', negative: '#B91C1C', warning: '#A16207' }, 6),
  ],
  fonts: { heading: { family: 'Source Serif 4', fallback: FontStyle.Serif, metricsKey: 'source-serif-4' }, body: { family: 'Inter', fallback: FontStyle.Sans, metricsKey: 'inter' } },
  surface: { card: 'outline', stroke: 'hairline', shadow: 0 },
  concept: { decoration: 'none', motifs: ['tls.x.rule'], zones: ['under-heading', 'watermark'], quiet: ['tls.m.decoration:icon'], icons: 'none', accent: 'The accent on defined terms and the one result; figures and formulas carry the slide.' },
  rules: ['Define, then show: a definition, a figure, a worked example.', 'Number figures and equations.', 'No ornament; rules and boxes only.'],
  blockDefaults: { ...MINIMAL_STYLE.blockDefaults, 'tls.t.takeaway': { ...MINIMAL_STYLE.blockDefaults['tls.t.takeaway'], variant: 'line' } },
}

/** Wave-1 variants, in the order a picker lists them under their family. */
export const VARIANT_STYLES: readonly DeckStyle[] = [
  DOODLE_SKETCHNOTE_STYLE,
  DOODLE_GEO3D_STYLE,
  DOODLE_CHALKBOARD_STYLE,
  DOODLE_NOTEBOOK_STYLE,
  MINIMAL_SOFT_STYLE,
  GLASS_CLAY_STYLE,
  MEMPHIS_CONFETTI_STYLE,
  ACADEMIC_LECTURE_STYLE,
]
