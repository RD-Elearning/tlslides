import { FontStyle } from '~types'
import type { BlockSpec, DeckStyle, MasterSpec } from '../types'
import { band, placePx } from './_place'

/**
 * AC5 — Modern & Digital "Swiss / International Typographic" (`reviews/blocks/ai-curation/README.md`
 * §3.3). Off-white paper, black Archivo set big and tight, everything flush left on a visible
 * 12-column grid, one signal red, square corners, no shadows. Cards are open columns under a
 * heavy black rule; every page has a heavy rule at the top of the type area and a red square in
 * the top-right corner of the grid; the cover and closing get a large red block in the lower right quarter.
 */
const FONTS = { heading: FontStyle.Sans, body: FontStyle.Sans, headingFamily: '"Archivo", "Archivo Variable", sans-serif', bodyFamily: '"Archivo", "Archivo Variable", sans-serif' }

/** 12 columns of the 1728-unit type area, 24-unit gutters: hairlines at the column edges. */
function grid(role: string): Record<string, BlockSpec> {
  const out: Record<string, BlockSpec> = {}
  const col = (1728 - 11 * 24) / 12
  for (let i = 1; i < 12; i++) {
    const x = 96 + i * (col + 24) - 12
    out[`col${i}`] = placePx(band(role), Math.round(x), 0, 1, 1080)
  }
  return out
}

const TOP_RULE: Record<string, BlockSpec> = { 'top-rule': placePx(band('text'), 96, 48, 1728, 8) }
const RED_SQUARE: Record<string, BlockSpec> = { 'red-square': placePx(band('accent'), 1776, 48, 48, 48) }

const MASTERS: MasterSpec[] = [
  {
    name: 'cover',
    // a red block bleeding off the lower right quarter: beside the split cover's flush-left title and
    // under the closing's giant line (which ends above it)
    blocks: { ...grid('surface'), ...TOP_RULE, 'red-block': placePx(band('accent'), 1056, 600, 864, 480) },
    background: { type: 'solid', color: 'theme:background' },
  },
  {
    name: 'section',
    blocks: { ...grid('surface'), 'red-bar': placePx(band('accent'), 0, 0, 48, 1080), ...TOP_RULE },
    background: { type: 'solid', color: 'theme:background' },
  },
  { name: 'content', blocks: { ...grid('surface'), ...TOP_RULE, ...RED_SQUARE }, background: { type: 'solid', color: 'theme:background' } },
]

export const SWISS_STYLE: DeckStyle = {
  id: 'swiss',
  family: 'modern',
  name: 'Swiss',
  brief:
    'International Typographic deck: off-white paper, big tight black grotesk, everything flush left on a ' +
    'visible grid, heavy rules, one signal red, square corners, no ornament.',
  palettes: [
    {
      id: 'swiss-red',
      name: 'Swiss Red',
      colors: {
        background: '#F4F4F0',
        surface: '#E6E6E0',
        text: '#111111',
        textMuted: '#4A4A46',
        accent1: '#E3000F',
        accent2: '#111111',
        positive: '#1F7A3A',
        negative: '#8F1D14',
        warning: '#8A5A00',
      },
      fonts: FONTS,
      shapeDefaults: { isFilled: true, cornerRadius: 0 },
    },
    {
      id: 'swiss-blue',
      name: 'Swiss Blue',
      colors: {
        background: '#FFFFFF',
        surface: '#ECEEF2',
        text: '#0A0A0A',
        textMuted: '#45474D',
        accent1: '#0047BB',
        accent2: '#0A0A0A',
        positive: '#1F7A3A',
        negative: '#B3261E',
        warning: '#8A5A00',
      },
      fonts: FONTS,
      shapeDefaults: { isFilled: true, cornerRadius: 0 },
    },
  ],
  fonts: {
    heading: { family: 'Archivo', fallback: FontStyle.Sans, metricsKey: 'archivo' },
    body: { family: 'Archivo', fallback: FontStyle.Sans, metricsKey: 'archivo' },
  },
  tokens: {
    radius: { sm: 0, md: 0, lg: 0, xl: 0 },
    type: { display: { size: 176, lineHeight: 0.95 }, title: { size: 100, lineHeight: 1.0 }, heading: { size: 64, lineHeight: 1.08 } },
  },
  surface: { card: 'ghost', stroke: 'bold', shadow: 0 },
  masters: MASTERS,
  motionStyle: 'subtle',
  blockDefaults: {
    // split with no photo: the title flush left in the left half; the master's red block fills the right
    'tls.c.cover': { variant: 'split', decoration: 'none' },
    'tls.c.divider': { variant: 'numeral', align: 'start' },
    'tls.t.title': { align: 'start' },
    'tls.c.cards': { lead: 'number', align: 'start' },
    'tls.c.agenda': { numbering: 'plain' },
    'tls.c.chart-insight': { side: 'right' },
    'tls.t.statement': { align: 'start' },
    'tls.t.quote': { markStyle: 'rule' },
    'tls.t.takeaway': { tone: 'accent' },
    'tls.d.table': { rules: 'head', header: 'bold', zebra: false },
    'tls.g.chevrons': { fill: 'single' },
    'tls.c.closing': { variant: 'big-type' },
    'tls.g.pros-cons': { style: 'columns' },
  },
  variety: {
    'tls.t.title': { rule: [false, true] },
    // the cover master's colour block fills the lower-right quarter: split would run the title into it
    'tls.c.hero': { variant: ['classic'], align: ['start'] },
    'tls.c.feature-grid': { align: ['start'] },
    'tls.c.divider': { variant: ['minimal'] },
    'tls.c.cards': { numeral: ['giant'] },
    'tls.c.chart-insight': { side: ['left'] },
    'tls.c.closing': { variant: ['split'] },
  },
  prefer: ['tls.t.statement'],
  avoid: ['tls.m.decoration', 'tls.t.tags', 'tls.c.kinetic-title'],
  rules: ['Flush left everywhere; asymmetric grid.', 'Big type, few words.', 'Red for one thing per slide.', 'No blobs, orbs, gradients or centred text.'],
}
