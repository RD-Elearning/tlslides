import { FontStyle } from '~types'
import type { DeckTheme } from '~types'
import type { BlockSpec, DeckStyle, MasterSpec } from '../types'
import { CORPORATE_STYLE } from './corporate'
import { CONSULTING_STYLE } from './consulting'
import { LUXURY_STYLE } from './luxury'
import { EDITORIAL_STYLE } from './editorial'
import { GRADIENT_STYLE } from './gradient'
import { GLASS_STYLE } from './glass'
import { MEMPHIS_STYLE } from './memphis'
import { DOODLE_STYLE } from './doodle'
import { ACADEMIC_LECTURE_STYLE, DOODLE_NOTEBOOK_STYLE } from './variants'
import { band, motif, placePx } from './_place'

/**
 * spro sprint 2026-11b S13-D — style variants, wave 2: ten complete styles, each with its own
 * palettes (our seeds, hand-tuned for contrast), bundled fonts, masters and a backdrop set by role
 * (`DeckStyle.backdrops`: the ground a deep / accent / calm / quiet slide paints). Names and looks are
 * ours (D44); the closest entry of the reference packs and how each differs is in the sprint README.
 */

type Fonts = DeckTheme['fonts']
const stack = (family: string, generic: string) => `"${family}", "${family} Variable", ${generic}`
const pair = (heading: string, hGeneric: string, body: string, bGeneric: string, hStyle: FontStyle, bStyle: FontStyle): Fonts => ({
  heading: hStyle,
  body: bStyle,
  headingFamily: stack(heading, hGeneric),
  bodyFamily: stack(body, bGeneric),
})
const ARCHIVO_INTER = pair('Archivo', 'sans-serif', 'Inter', 'sans-serif', FontStyle.Sans, FontStyle.Sans)
const SERIF_SERIF = pair('Source Serif 4', 'serif', 'Source Serif 4', 'serif', FontStyle.Serif, FontStyle.Serif)
const JAKARTA_INTER = pair('Plus Jakarta Sans', 'sans-serif', 'Inter', 'sans-serif', FontStyle.Sans, FontStyle.Sans)
const PLAYFAIR_INTER = pair('Playfair Display', 'serif', 'Inter', 'sans-serif', FontStyle.Serif, FontStyle.Sans)
const CRIMSON_INTER = pair('Crimson Pro', 'serif', 'Inter', 'sans-serif', FontStyle.Serif, FontStyle.Sans)
const BRICOLAGE_NUNITO = pair('Bricolage Grotesque', 'sans-serif', 'Nunito', 'sans-serif', FontStyle.Sans, FontStyle.Sans)
const HAND: Fonts = { heading: FontStyle.Script, body: FontStyle.Sans, headingFamily: '"Patrick Hand", cursive', bodyFamily: stack('Nunito', 'sans-serif') }

const ref = (family: string, fallback: FontStyle, metricsKey: string) => ({ family, fallback, metricsKey })
const INTER = ref('Inter', FontStyle.Sans, 'inter')

const pal = (id: string, name: string, fonts: Fonts, c: DeckTheme['colors'], radius: number): DeckTheme => ({ id, name, colors: c, fonts, shapeDefaults: { isFilled: true, cornerRadius: radius } })
const STATUS = { positive: '#15803D', negative: '#B91C1C', warning: '#A16207' }
const DARK_STATUS = { positive: '#86EFAC', negative: '#FCA5A5', warning: '#FCD34D' }

const at = (shape: string, tone: string, seed: number, x: number, y: number, w: number, h: number, extra: Record<string, unknown> = {}): BlockSpec =>
  placePx(motif(shape, { tone, opacity: 'strong', seed, ...extra }), x, y, w, h)
const ornament = (shape: string, tone: string, x: number, y: number, w: number, h: number): BlockSpec =>
  placePx({ id: 'ornament', type: 'tls.m.ornament', props: { shape, variant: 'line', tone, opacity: 'medium' } }, x, y, w, h)
const solid = (color: string) => ({ type: 'solid' as const, color })

// ── professional / corporate band ───────────────────────────────────────────────────────────────
export const CORPORATE_BAND_STYLE: DeckStyle = {
  ...CORPORATE_STYLE,
  id: 'corporate-band',
  variantOf: 'corporate',
  name: 'Corporate · Band',
  brief: 'Banded corporate: a cool neutral page, titles on a full-width header band, square cards, split dividers, a blueprint grid behind dense slides.',
  palettes: [
    pal('corporate-band-steel', 'Band Steel', ARCHIVO_INTER, { background: '#F3F5F8', surface: '#FFFFFF', text: '#14202E', textMuted: '#4A5768', accent1: '#2F5D8A', accent2: '#1F8A80', ...STATUS }, 6),
    pal('corporate-band-graphite', 'Band Graphite', ARCHIVO_INTER, { background: '#F4F4F2', surface: '#FFFFFF', text: '#1B1D21', textMuted: '#50545C', accent1: '#3B4A6B', accent2: '#B8641C', ...STATUS }, 6),
    pal('corporate-band-harbor', 'Band Harbor', ARCHIVO_INTER, { background: '#EFF4F4', surface: '#FFFFFF', text: '#10262B', textMuted: '#46595D', accent1: '#1F6F78', accent2: '#B4472E', ...STATUS }, 6),
  ],
  fonts: { heading: ref('Archivo', FontStyle.Sans, 'archivo'), body: INTER },
  masters: [
    { name: 'cover', blocks: { bar: placePx(band('accent'), 96, 1000, 200, 8) }, background: solid('theme:background') },
    { name: 'section', blocks: { bar: placePx(band('accent2'), 96, 1000, 200, 8) }, background: solid('theme:background') },
    { name: 'content', blocks: {}, background: solid('theme:background') },
  ],
  backdrops: { deep: { kind: 'mesh', intensity: 'medium' }, accent: { kind: 'split' }, calm: { kind: 'flat' }, quiet: { kind: 'blueprint' } },
  concept: { ...CORPORATE_STYLE.concept!, decoration: 'none', accent: 'Steel blue for structure, one teal number; the header band carries every title.' },
  rules: ['One message per slide, stated in the band.', 'Numbers and charts first.', 'Square cards, no ornament.'],
}

// ── professional / consulting rail ──────────────────────────────────────────────────────────────
export const CONSULTING_RAIL_STYLE: DeckStyle = {
  ...CONSULTING_STYLE,
  id: 'consulting-rail',
  variantOf: 'consulting',
  name: 'Consulting · Rail',
  brief: 'Rail consulting: white pages, a coloured left rail, sans action titles, thin rules.',
  palettes: [
    pal('consulting-rail-teal', 'Rail Teal', ARCHIVO_INTER, { background: '#FFFFFF', surface: '#F2F6F6', text: '#0E1A1C', textMuted: '#4D5B5E', accent1: '#0F6E6E', accent2: '#B07A12', ...STATUS }, 2),
    pal('consulting-rail-plum', 'Rail Plum', ARCHIVO_INTER, { background: '#FFFFFF', surface: '#F6F2F6', text: '#1A1220', textMuted: '#5A4E5E', accent1: '#6B2D6B', accent2: '#2E7D4F', ...STATUS }, 2),
  ],
  fonts: { heading: ref('Archivo', FontStyle.Sans, 'archivo'), body: INTER },
  masters: [
    { name: 'cover', blocks: { rail: placePx(band('accent'), 0, 0, 28, 1080) }, background: solid('theme:background') },
    { name: 'section', blocks: { rail: placePx(band('accent'), 0, 0, 56, 1080), tick: placePx(band('accent2'), 56, 0, 8, 1080) }, background: solid('theme:background') },
    { name: 'content', blocks: { rail: placePx(band('accent'), 0, 0, 14, 1080), 'foot-rule': placePx(band('line'), 96, 1022, 1728, 2) }, background: solid('theme:background') },
  ],
  backdrops: { deep: { kind: 'diagonal', intensity: 'medium' }, accent: { kind: 'split' }, calm: { kind: 'flat' }, quiet: { kind: 'flat' } },
  concept: { ...CONSULTING_STYLE.concept!, accent: 'Rail colour for the finding; amber for a risk.' },
}

// ── academic / margin ───────────────────────────────────────────────────────────────────────────
export const ACADEMIC_MARGIN_STYLE: DeckStyle = {
  ...ACADEMIC_LECTURE_STYLE,
  id: 'academic-margin',
  variantOf: 'minimal',
  name: 'Academic · Margin',
  brief: 'Textbook page: a margin rule on the left, serif type, a section mark on dividers, ruled paper behind dense slides.',
  palettes: [
    pal('academic-margin-teal', 'Margin Teal', SERIF_SERIF, { background: '#FFFEFA', surface: '#F5F1E6', text: '#1A1A17', textMuted: '#55524A', accent1: '#1F5F66', accent2: '#A0601A', ...STATUS }, 4),
    pal('academic-margin-slate', 'Margin Slate', SERIF_SERIF, { background: '#FFFFFF', surface: '#F2F3F5', text: '#15171C', textMuted: '#50545E', accent1: '#3A4F7A', accent2: '#8E3B46', ...STATUS }, 4),
  ],
  fonts: { heading: ref('Source Serif 4', FontStyle.Serif, 'source-serif-4'), body: ref('Source Serif 4', FontStyle.Serif, 'source-serif-4') },
  masters: [
    { name: 'cover', blocks: { margin: placePx(band('accent'), 56, 0, 3, 1080) }, background: solid('theme:background') },
    { name: 'section', blocks: { margin: placePx(band('accent'), 56, 0, 3, 1080), mark: placePx({ id: 'mark', type: 'tls.x.watermark', props: { text: '§', opacity: 'soft' } }, 1300, 160, 520, 760) }, background: solid('theme:background') },
    { name: 'content', blocks: { margin: placePx(band('accent'), 56, 0, 2, 1080) }, background: solid('theme:background') },
  ],
  backdrops: { deep: { kind: 'spotlight', intensity: 'medium' }, accent: { kind: 'frame' }, calm: { kind: 'paper' }, quiet: { kind: 'ruled' } },
  concept: { ...ACADEMIC_LECTURE_STYLE.concept!, accent: 'Teal for defined terms, ochre for the one result; the margin carries notes.' },
  rules: ['Define, then show: a definition, a figure, a worked example.', 'Number figures and equations.', 'Side notes in the margin column.'],
}

// ── academic / lab notebook ─────────────────────────────────────────────────────────────────────
export const ACADEMIC_LAB_STYLE: DeckStyle = {
  ...ACADEMIC_LECTURE_STYLE,
  id: 'academic-lab',
  variantOf: 'minimal',
  name: 'Academic · Lab',
  brief: 'Lab notebook: pale squared paper, sans headings with a coloured label bar, outlined result boxes, a finer grid behind dense slides. Practical and exact.',
  palettes: [
    pal('academic-lab-green', 'Lab Green', JAKARTA_INTER, { background: '#F6FBF5', surface: '#FFFFFF', text: '#13241A', textMuted: '#48594D', accent1: '#2F7D4F', accent2: '#C2531C', ...STATUS }, 6),
    pal('academic-lab-blue', 'Lab Blue', JAKARTA_INTER, { background: '#F5F9FC', surface: '#FFFFFF', text: '#12202B', textMuted: '#475663', accent1: '#2369A8', accent2: '#B4400B', ...STATUS }, 6),
  ],
  fonts: { heading: ref('Plus Jakarta Sans', FontStyle.Sans, 'plus-jakarta-sans'), body: INTER },
  masters: [
    { name: 'cover', blocks: { label: placePx(band('accent'), 96, 72, 160, 14) }, background: solid('theme:background') },
    { name: 'section', blocks: { label: placePx(band('accent2'), 96, 72, 160, 14) }, background: solid('theme:background') },
    { name: 'content', blocks: { label: placePx(band('accent'), 96, 60, 64, 10) }, background: solid('theme:background') },
  ],
  surface: { card: 'outline', stroke: 'hairline', shadow: 0 },
  backdrops: { deep: { kind: 'blueprint', intensity: 'medium' }, accent: { kind: 'split' }, calm: { kind: 'blueprint' }, quiet: { kind: 'flat' } },
  concept: { ...ACADEMIC_LECTURE_STYLE.concept!, accent: 'Green for the method, orange for the measured result; the grid is the page.' },
  rules: ['Method, data, result.', 'Units on every number.', 'Boxes for results, arrows only in diagrams.'],
}

// ── elegant / lacquer ───────────────────────────────────────────────────────────────────────────
export const ELEGANT_LACQUER_STYLE: DeckStyle = {
  ...LUXURY_STYLE,
  id: 'elegant-lacquer',
  variantOf: 'luxury',
  name: 'Elegant · Lacquer',
  brief: 'After lacquer painting: a brown-black ground, gold-leaf hairlines and frames, an eggshell texture on covers, one vermilion accent.',
  palettes: [
    pal('elegant-lacquer-umber', 'Lacquer Umber', PLAYFAIR_INTER, { background: '#1C1310', surface: '#2A1D18', text: '#F3E9D8', textMuted: '#CBBBA2', accent1: '#C9A24A', accent2: '#E0603F', ...DARK_STATUS }, 4),
    pal('elegant-lacquer-cinnabar', 'Lacquer Cinnabar', PLAYFAIR_INTER, { background: '#26100C', surface: '#361A15', text: '#F5E8D6', textMuted: '#D0B9A0', accent1: '#D4AF5A', accent2: '#EE7A55', ...DARK_STATUS }, 4),
  ],
  fonts: { heading: ref('Playfair Display', FontStyle.Serif, 'playfair-display'), body: INTER },
  masters: [
    { name: 'cover', blocks: { frame: ornament('frame', 'accent', 64, 64, 1792, 952) }, background: solid('theme:background') },
    { name: 'section', blocks: { rule: ornament('divider', 'accent', 760, 880, 400, 40) }, background: solid('theme:background') },
    { name: 'content', blocks: { 'foot-rule': placePx(band('accent'), 96, 1024, 160, 2) }, background: solid('theme:background') },
  ],
  backdrops: { deep: { kind: 'paper', intensity: 'medium' }, accent: { kind: 'frame' }, calm: { kind: 'flat' }, quiet: { kind: 'flat' } },
  concept: { ...LUXURY_STYLE.concept!, accent: 'Gold for lines and the one number; vermilion once, for what matters most.' },
  rules: ['Few words, generous dark space.', 'Gold lines, never gold blocks.', 'Vermilion once per slide at most.'],
}

// ── elegant / ink wash ──────────────────────────────────────────────────────────────────────────
export const ELEGANT_INKWASH_STYLE: DeckStyle = {
  ...EDITORIAL_STYLE,
  id: 'elegant-inkwash',
  variantOf: 'editorial',
  name: 'Elegant · Ink wash',
  brief: 'After ink-wash painting: white paper, soft grey washes, wide empty space, serif titles and a small red seal as the signature. Quiet and deliberate.',
  palettes: [
    pal('elegant-inkwash-sumi', 'Ink Sumi', CRIMSON_INTER, { background: '#FBFBF9', surface: '#F0F0EC', text: '#1C1C1A', textMuted: '#575752', accent1: '#B3261E', accent2: '#5B6B6D', ...STATUS }, 2),
    pal('elegant-inkwash-indigo', 'Ink Indigo', CRIMSON_INTER, { background: '#FAFAF7', surface: '#EEEFEA', text: '#191B1F', textMuted: '#55585E', accent1: '#A4282A', accent2: '#2E4A6B', ...STATUS }, 2),
  ],
  fonts: { heading: ref('Crimson Pro', FontStyle.Serif, 'crimson-pro'), body: INTER },
  masters: [
    { name: 'cover', blocks: { seal: placePx(band('accent'), 1752, 912, 72, 72) }, background: solid('theme:background') },
    { name: 'section', blocks: { seal: placePx(band('accent'), 1752, 912, 56, 56) }, background: solid('theme:background') },
    { name: 'content', blocks: { seal: placePx(band('accent'), 1800, 1000, 24, 24) }, background: solid('theme:background') },
  ],
  backdrops: { deep: { kind: 'spotlight', intensity: 'medium' }, accent: { kind: 'aurora' }, calm: { kind: 'flat' }, quiet: { kind: 'flat' } },
  concept: { ...EDITORIAL_STYLE.concept!, decoration: 'none', accent: 'Black ink carries the slide; the red seal is the only colour, small.' },
  rules: ['Leave most of the page empty.', 'One idea, one image or one line.', 'Red only for the seal and one word.'],
}

// ── modern / aurora ─────────────────────────────────────────────────────────────────────────────
export const MODERN_AURORA_STYLE: DeckStyle = {
  ...GRADIENT_STYLE,
  id: 'modern-aurora',
  variantOf: 'gradient',
  name: 'Modern · Aurora',
  brief: 'Aurora: a dark ground with soft light bands, frosted panels, one bright accent, rounded geometric sans.',
  palettes: [
    pal('modern-aurora-night', 'Aurora Night', JAKARTA_INTER, { background: '#0B1020', surface: '#151C33', text: '#EEF2FF', textMuted: '#A8B2CF', accent1: '#5EEAD4', accent2: '#A78BFA', ...DARK_STATUS }, 20),
    pal('modern-aurora-dusk', 'Aurora Dusk', JAKARTA_INTER, { background: '#120B1E', surface: '#1E1530', text: '#F5F0FF', textMuted: '#B9AECF', accent1: '#F472B6', accent2: '#60A5FA', ...DARK_STATUS }, 20),
  ],
  masters: [
    { name: 'cover', blocks: {}, background: solid('theme:background') },
    { name: 'section', blocks: {}, background: solid('theme:background') },
    { name: 'content', blocks: {}, background: solid('theme:background') },
  ],
  surface: { card: 'glass', stroke: 'hairline', shadow: 1 },
  backdrops: { deep: { kind: 'aurora', intensity: 'medium' }, accent: { kind: 'mesh', intensity: 'medium' }, calm: { kind: 'aurora' }, quiet: { kind: 'flat' } },
  concept: { ...GRADIENT_STYLE.concept!, accent: 'One bright accent on the dark ground; panels frosted, never solid colour.' },
}

// ── modern / prism ──────────────────────────────────────────────────────────────────────────────
export const MODERN_PRISM_STYLE: DeckStyle = {
  ...GLASS_STYLE,
  id: 'modern-prism',
  variantOf: 'glass',
  name: 'Modern · Prism',
  brief: 'Prism: a white ground with soft refracted-light rings in two hues, rounded geometric sans, light cards. Clear, optimistic, technical.',
  palettes: [
    pal('modern-prism-violet', 'Prism Violet', BRICOLAGE_NUNITO, { background: '#FFFFFF', surface: '#F4F5FB', text: '#121423', textMuted: '#4C5068', accent1: '#6246EA', accent2: '#D63F7A', ...STATUS }, 18),
    pal('modern-prism-sun', 'Prism Sun', BRICOLAGE_NUNITO, { background: '#FFFFFF', surface: '#FBF6F0', text: '#1E1610', textMuted: '#5C4F45', accent1: '#C9530F', accent2: '#2D6FD9', ...STATUS }, 18),
  ],
  fonts: { heading: ref('Bricolage Grotesque', FontStyle.Sans, 'bricolage-grotesque'), body: ref('Nunito', FontStyle.Sans, 'nunito') },
  masters: [
    { name: 'cover', blocks: {}, background: solid('theme:background') },
    { name: 'section', blocks: {}, background: solid('theme:background') },
    { name: 'content', blocks: {}, background: solid('theme:background') },
  ],
  surface: { card: 'filled', stroke: 'none', shadow: 1 },
  backdrops: { deep: { kind: 'mesh', intensity: 'medium' }, accent: { kind: 'arcs', intensity: 'medium' }, calm: { kind: 'arcs' }, quiet: { kind: 'flat' } },
  concept: { ...GLASS_STYLE.concept!, accent: 'Violet for structure, pink for the one highlight; rings stay in the corners.' },
}

// ── playful / sticker ───────────────────────────────────────────────────────────────────────────
const STICKER_MASTERS: MasterSpec[] = [
  { name: 'cover', signature: 'star', blocks: { star: at('star', 'accent2', 4, 1620, 120, 170, 170, { rotation: 12 }), blob: at('blob', 'accent', 6, 120, 820, 220, 160, { opacity: 'medium' }) }, background: solid('theme:background') },
  { name: 'section', signature: 'star', blocks: { star: at('star', 'accent2', 9, 1480, 300, 320, 320, { rotation: 8 }) }, background: solid('theme:background') },
  { name: 'content', blocks: {}, background: solid('theme:background') },
]
export const PLAYFUL_STICKER_STYLE: DeckStyle = {
  ...MEMPHIS_STYLE,
  id: 'playful-sticker',
  variantOf: 'memphis',
  name: 'Playful · Sticker',
  brief: 'Sticker book: pastel pages, die-cut sticker icons with white borders, round pill cards, dot fields and rings. Friendly and bright.',
  palettes: [
    pal('playful-sticker-grape', 'Sticker Grape', BRICOLAGE_NUNITO, { background: '#FFF7F0', surface: '#FFFFFF', text: '#22183A', textMuted: '#574C6E', accent1: '#7C4DFF', accent2: '#E8603D', ...STATUS }, 24),
    pal('playful-sticker-mint', 'Sticker Mint', BRICOLAGE_NUNITO, { background: '#F1FBF7', surface: '#FFFFFF', text: '#12302A', textMuted: '#45625A', accent1: '#0B8A6D', accent2: '#E04A7E', ...STATUS }, 24),
  ],
  fonts: { heading: ref('Bricolage Grotesque', FontStyle.Sans, 'bricolage-grotesque'), body: ref('Nunito', FontStyle.Sans, 'nunito') },
  tokens: { ...MEMPHIS_STYLE.tokens, radius: { sm: 12, md: 24, lg: 32, xl: 40 } },
  surface: { card: 'raised', stroke: 'none', shadow: 1 },
  masters: STICKER_MASTERS,
  backdrops: { deep: { kind: 'dots', intensity: 'medium' }, accent: { kind: 'arcs', intensity: 'medium' }, calm: { kind: 'dots' }, quiet: { kind: 'flat' } },
  concept: { ...MEMPHIS_STYLE.concept!, decoration: 'sparse', icons: 'sticker', accent: 'Grape for the big idea, coral for the fun fact; stickers in the corners.' },
}

// ── classroom / whiteboard ──────────────────────────────────────────────────────────────────────
export const CLASSROOM_WHITEBOARD_STYLE: DeckStyle = {
  ...DOODLE_NOTEBOOK_STYLE,
  id: 'classroom-whiteboard',
  variantOf: 'doodle',
  name: 'Classroom · Whiteboard',
  brief: 'Whiteboard: marker handwriting in blue and red, round magnets, ruled lines behind content, a slate board for covers.',
  palettes: [
    pal('classroom-whiteboard-blue', 'Board Blue', HAND, { background: '#FCFCFA', surface: '#F1F3F2', text: '#1E2430', textMuted: '#505866', accent1: '#1F63D1', accent2: '#C93636', ...STATUS }, 10),
    pal('classroom-whiteboard-green', 'Board Green', HAND, { background: '#FDFDFB', surface: '#F2F4F1', text: '#1D2620', textMuted: '#4F5A52', accent1: '#1E7F47', accent2: '#C2531C', ...STATUS }, 10),
  ],
  fonts: DOODLE_STYLE.fonts,
  masters: [
    { name: 'cover', blocks: { magnet: at('orb', 'accent2', 2, 1700, 90, 72, 72), magnet2: at('orb', 'accent', 5, 1790, 90, 72, 72) }, background: solid('theme:background') },
    { name: 'section', blocks: { magnet: at('orb', 'accent', 3, 1760, 90, 72, 72) }, background: solid('theme:background') },
    { name: 'content', blocks: {}, background: solid('theme:background') },
  ],
  backdrops: { deep: { kind: 'slate', intensity: 'medium' }, accent: { kind: 'diagonal' }, calm: { kind: 'ruled' }, quiet: { kind: 'flat' } },
  concept: { ...DOODLE_NOTEBOOK_STYLE.concept!, accent: 'Blue marker for text, red marker for the one correction or key word.' },
  rules: ['Short lines, as on a board.', 'Red marker once per slide.'],
}

/** Wave-2 variants (S13-D), in the order a picker lists them. */
export const VARIANT_STYLES_2: readonly DeckStyle[] = [
  CORPORATE_BAND_STYLE,
  CONSULTING_RAIL_STYLE,
  ACADEMIC_MARGIN_STYLE,
  ACADEMIC_LAB_STYLE,
  ELEGANT_LACQUER_STYLE,
  ELEGANT_INKWASH_STYLE,
  MODERN_AURORA_STYLE,
  MODERN_PRISM_STYLE,
  PLAYFUL_STICKER_STYLE,
  CLASSROOM_WHITEBOARD_STYLE,
]
