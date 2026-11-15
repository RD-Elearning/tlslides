/**
 * spro sprint 2026-11b S11-C — composition patterns v2: twelve designs built only from the v2 grammar
 * (`composition-grammar.ts`: panels, split ratios, grid spans, `justify`), each grounded in a slides-skill
 * idiom (`ref`). They are what the composer learns from when it composes a slide itself (the compose kit's
 * reference section shows them behind spro's `DECK_COMPOSITION_V2`), and like every pattern they are held
 * to the oracle and the quality gate in every deck style (`patterns-v2.spec.ts`).
 *
 * They are deliberately NOT in `COMPOSITION_PATTERNS` / `ALL_DESIGNS`: the no-LLM picker and the
 * nearest-pattern fallback keep today's designs until the owner turns v2 on (S17).
 *
 * Data and pure builders only. Pure and DOM-free.
 */

import type { CompositionPattern } from './patterns'
import { patternRecipe } from './patterns'
import type { SlideRecipe } from './recipes'
import type { BlockSpec } from './types'

type Props = Record<string, unknown>
const blk = (id: string, type: string, props: Props = {}, extra: Partial<BlockSpec> = {}): BlockSpec => ({ id, type, props, ...extra })
const rich = (text: string) => ({ runs: [{ text }] })
const title = (text: string, props: Props = {}) => blk('title', 'tls.t.title', { text: rich(text), ...props })
const heading = (id: string, text: string, size: 'heading' | 'subheading' = 'subheading', props: Props = {}) =>
  blk(id, 'tls.t.title', { text: rich(text), size, color: 'text', ...props })
const body = (id: string, text: string, props: Props = {}) => blk(id, 'tls.t.body', { text: rich(text), ...props })
const kicker = (id: string, text: string) => blk(id, 'tls.t.kicker', { text })
const number = (id: string, value: string, unit: string, caption?: string) => blk(id, 'tls.t.hero-number', { value, unit, ...(caption ? { caption } : {}) })
const icon = (id: string, name: string) => blk(id, 'tls.m.icon', { icon: name, size: 'md', iconStyle: 'disc' })
const stack = (id: string, children: BlockSpec[], props: Props = {}) => blk(id, 'tls.l.stack', { sizing: 'content', children, ...props })
const row = (id: string, children: BlockSpec[], props: Props = {}) => blk(id, 'tls.l.row', { sizing: 'equal', children, ...props })
const grid = (id: string, columns: number, rows: number, children: BlockSpec[], props: Props = {}) =>
  blk(id, 'tls.l.grid', { columns, rows, sizing: 'equal', children, ...props })
const card = (id: string, children: BlockSpec[]) => blk(id, 'tls.l.card', { children })
const panel = (id: string, surface: string, children: BlockSpec[], props: Props = {}) => blk(id, 'tls.l.panel', { surface, padding: 'lg', children, ...props })
const split = (id: string, ratio: number, children: BlockSpec[], props: Props = {}) => blk(id, 'tls.l.split', { ratio, children, ...props })

export const COMPOSITION_PATTERNS_V2: readonly CompositionPattern[] = [
  {
    id: 'v2-claim-evidence-split',
    role: 'content',
    layout: 'timeline',
    when: 'one claim on the left, the evidence that backs it on the right',
    ref: 'slides-skill: statement + evidence — the claim leads (0.4), the proof sits beside it',
    looks: ['panel'],
    build(look) {
      const claim = stack('claim', [kicker('k', 'The finding'), heading('h', 'Short daily practice beats one long session', 'heading'), body('b', 'Across three cohorts, ten minutes a day lifted test scores more than a weekly hour.')], { gap: 'sm' })
      const evidence = [
        body('e1', 'Cohort A: +12 points after six weeks of daily practice.'),
        body('e2', 'Cohort B: the weekly group forgot half of it within a month.'),
        body('e3', 'Cohort C: daily practice kept its gain at the three-month test.'),
      ]
      const right = look === 'panel' ? panel('proof', 'alt', evidence) : stack('proof', evidence, { gap: 'md', justify: 'center' })
      return { regions: { title: [title('Practice little and often')], timeline: [split('split', 0.4, [claim, right], { gutter: 'xl' })] } }
    },
  },
  {
    id: 'v2-number-band',
    role: 'data',
    layout: 'timeline',
    when: 'one number that carries the slide, with what it means and where it comes from',
    ref: 'slides-skill: big number + caption on a band — one figure, one sentence, the source',
    looks: ['accent'],
    build(look) {
      const band = panel('band', look === 'accent' ? 'accent' : 'inverted', [number('n', '42', '%'), body('l', 'of first-year students change their major at least once.', { size: 'lead' }), body('src', 'Source: university enrolment records, 2019–2024.')], { padding: 'xl' })
      return { regions: { title: [title('Changing course is normal')], timeline: [stack('st', [body('intro', 'The first year is when most students find their field.', { size: 'lead' }), band], { gap: 'lg' })] } }
    },
  },
  {
    id: 'v2-kpi-grid-spans',
    role: 'data',
    layout: 'timeline',
    when: 'a headline figure and four supporting figures',
    ref: 'slides-skill: KPI grid — one wide headline cell, smaller peers of one template',
    looks: ['cards'],
    build(look) {
      const cells = [
        { v: '1,240', u: '', t: 'students enrolled this year, the most since the programme opened.' },
        { v: '87', u: '%', t: 'pass the first-year exam.' },
        { v: '4.6', u: '/5', t: 'average course rating.' },
        { v: '12', u: '', t: 'partner companies offer internships.' },
        { v: '3', u: '', t: 'new labs open in the autumn.' },
      ]
      const kids = cells.map((c, i) => panel(`c${i + 1}`, i === 0 ? 'accent' : look === 'cards' ? 'base' : 'outline', [heading(`n${i + 1}`, `${c.v}${c.u}`, 'heading'), body(`b${i + 1}`, c.t)], { padding: 'md' }))
      return { regions: { title: [title('The programme in five numbers')], timeline: [grid('g', 3, 2, kids, { spans: [2, 1, 1, 1, 1], gap: 'md' })] } }
    },
  },
  {
    id: 'v2-matrix-one-grid',
    role: 'comparison',
    layout: 'timeline',
    when: 'six options or cases compared on the same two lines',
    ref: 'slides-skill: matrix as ONE grid — every cell the same parts, no loose boxes',
    looks: ['outline'],
    build(look) {
      const items = [
        ['Lecture', 'Fast to cover a lot; little practice.'],
        ['Seminar', 'Deep discussion; needs reading first.'],
        ['Lab', 'Hands-on skills; costly to run.'],
        ['Project', 'Real problems; long feedback loop.'],
        ['Flipped class', 'Practice in class; video at home.'],
        ['Peer tutoring', 'Cheap and social; uneven quality.'],
      ]
      const kids = items.map(([h, t], i) => (look === 'outline' ? panel(`c${i + 1}`, 'outline', [heading(`h${i + 1}`, h), body(`b${i + 1}`, t)], { padding: 'md' }) : card(`c${i + 1}`, [heading(`h${i + 1}`, h), body(`b${i + 1}`, t)])))
      return { regions: { title: [title('Six ways to teach a topic')], timeline: [grid('g', 3, 2, kids, { gap: 'md' })] } }
    },
  },
  {
    id: 'v2-feature-mosaic',
    role: 'content',
    layout: 'timeline',
    when: 'one main idea and two smaller ones',
    ref: 'slides-skill: mosaic — one large cell leads, two small cells follow',
    looks: ['accent'],
    build(look) {
      const big = panel('c1', look === 'accent' ? 'accent' : 'alt', [icon('i1', 'target'), heading('h1', 'Learn by doing', 'heading'), body('b1', 'Every week ends with a small project that uses what the lectures introduced.')])
      const small = (i: number, ic: string, h: string, t: string) => panel(`c${i}`, 'base', [icon(`i${i}`, ic), heading(`h${i}`, h, 'heading'), body(`b${i}`, t)])
      return {
        regions: {
          title: [title('How the course works')],
          timeline: [grid('g', 2, 2, [big, small(2, 'users', 'Work in pairs', 'Partners swap roles each week.'), small(3, 'message', 'Feedback in a day', 'Tutors answer within one working day.')], { spans: [2, 1, 1], gap: 'md' })],
        },
      }
    },
  },
  {
    id: 'v2-sidebar-note',
    role: 'content',
    layout: 'timeline',
    when: 'a main explanation with a side note or definition',
    ref: 'slides-skill: main column + sidebar — the note sits apart, in another surface',
    looks: ['outline'],
    build(look) {
      const main = stack('main', [heading('h', 'Why the sky is blue', 'heading'), body('b1', 'Sunlight holds every colour. Air molecules scatter short blue waves far more than long red ones.'), body('b2', 'So blue light reaches us from every direction of the sky, while the sun itself looks yellow.')], { gap: 'md' })
      const note = panel('note', look === 'outline' ? 'outline' : 'alt', [kicker('k', 'Key term'), body('n1', 'Rayleigh scattering: light scattered by particles much smaller than its wavelength.'), body('n2', 'It grows with the fourth power of the frequency.')])
      return { regions: { title: [title('Scattering of light')], timeline: [split('split', 0.67, [main, note], { gutter: 'xl' })] } }
    },
  },
  {
    id: 'v2-steps-columns',
    role: 'process',
    layout: 'timeline',
    when: 'three or four steps side by side, each with an icon',
    ref: 'slides-skill: numbered columns — peers of one template, icon chip on top',
    looks: ['outline'],
    build(look) {
      const steps = [
        ['search', 'Read the problem', 'Underline what is given and what is asked.'],
        ['compass', 'Pick a method', 'Match the problem to a formula or a diagram.'],
        ['pencil', 'Solve', 'Work step by step and keep the units.'],
        ['check', 'Check', 'Put the answer back into the problem.'],
      ]
      const kids = steps.map(([ic, h, t], i) => panel(`c${i + 1}`, look === 'outline' ? 'outline' : 'base', [icon(`i${i + 1}`, ic), heading(`h${i + 1}`, h), body(`b${i + 1}`, t)], { padding: 'md' }))
      return { regions: { title: [title('Four steps to any word problem')], timeline: [row('r', kids, { gap: 'md' })] } }
    },
  },
  {
    id: 'v2-quote-portrait-split',
    role: 'quote',
    layout: 'timeline',
    when: 'a quote with the person who said it',
    ref: 'slides-skill: quote + portrait — the person a third, the words two thirds',
    looks: ['portrait-right'],
    build(look) {
      const who = blk('who', 'tls.m.avatar', { image: '/demo/portrait-1.svg', name: 'Tran Thi Lan', role: 'Second-year student', size: 'xl', layout: 'stacked', align: 'center' })
      const quote = blk('q', 'tls.t.quote', { text: rich('The weekly projects were the first time the maths felt like mine.'), attribution: 'Tran Thi Lan', role: 'Second-year student', variant: 'classic' })
      return { regions: { title: [title('In their words')], timeline: [look === 'portrait-right' ? split('split', 0.67, [quote, who], { gutter: 'xl' }) : split('split', 0.33, [who, quote], { gutter: 'xl' })] } }
    },
  },
  {
    id: 'v2-labeled-figure',
    role: 'content',
    layout: 'timeline',
    when: 'a picture with what to notice in it',
    ref: 'slides-skill: labels beside the image — the figure leads, notes in a column',
    looks: ['notes-left'],
    needs: ['images'],
    build(look) {
      const fig = blk('fig', 'tls.m.image', { src: '/demo/photo-2.svg', alt: 'A plant cell under the microscope', fit: 'contain' })
      const notes = stack('notes', [heading('h1', 'Cell wall'), body('b1', 'A stiff layer that keeps the shape.'), heading('h2', 'Nucleus'), body('b2', 'Holds the genetic material.'), heading('h3', 'Chloroplast'), body('b3', 'Turns light into sugar.')], { gap: 'sm', justify: 'center' })
      return { regions: { title: [title('Inside a plant cell')], timeline: [split('split', look === 'notes-left' ? 0.4 : 0.6, look === 'notes-left' ? [notes, fig] : [fig, notes], { gutter: 'xl' })] } }
    },
  },
  {
    id: 'v2-two-tone-split',
    role: 'content',
    layout: 'timeline',
    when: 'a statement in colour beside the points that explain it',
    ref: 'slides-skill: two-tone split — half accent panel with the claim, half plain with the points',
    looks: ['inverted'],
    build(look) {
      const claim = panel('claim', look === 'inverted' ? 'inverted' : 'accent', [kicker('k', 'Big idea'), heading('h', 'Energy is never lost, only changed', 'heading'), body('b', 'Every process moves energy from one form to another.')], { padding: 'xl' })
      const points = stack('pts', [body('p1', 'A falling ball turns height into speed.'), body('p2', 'A battery turns chemical energy into current.'), body('p3', 'Friction turns motion into heat.')], { gap: 'lg', justify: 'center' })
      return { regions: { title: [title('Conservation of energy')], timeline: [split('split', 0.5, [claim, points], { gutter: 'xl' })] } }
    },
  },
  {
    id: 'v2-timeline-cards-row',
    role: 'process',
    layout: 'timeline',
    when: 'three or four dated events in order',
    ref: 'slides-skill: timeline cards — a date eyebrow, a heading and one line each',
    looks: ['panels'],
    build(look) {
      const ev = [
        ['1905', 'Special relativity', 'Space and time depend on the observer.'],
        ['1915', 'General relativity', 'Gravity is the shape of space-time.'],
        ['1919', 'Eclipse test', 'Starlight bends around the sun.'],
        ['2015', 'Gravitational waves', 'LIGO hears two black holes merge.'],
      ]
      const one = ([d, h, t]: string[], i: number) => {
        const kids = [kicker(`d${i + 1}`, d), heading(`h${i + 1}`, h), body(`b${i + 1}`, t)]
        return look === 'panels' ? panel(`c${i + 1}`, 'alt', kids, { padding: 'md' }) : card(`c${i + 1}`, kids)
      }
      return { regions: { title: [title('A century of relativity')], timeline: [row('r', ev.map(one), { gap: 'md' })] } }
    },
  },
  {
    id: 'v2-definition-panel',
    role: 'content',
    layout: 'timeline',
    when: 'a term, its definition and examples',
    ref: 'slides-skill: definition card — term eyebrow, lead definition, a rule, the examples',
    looks: ['band'],
    build(look) {
      const kids = [
        kicker('k', 'Definition'),
        heading('term', 'Photosynthesis', 'heading'),
        body('meaning', 'The process by which plants use light, water and carbon dioxide to make sugar and release oxygen.', { size: 'lead' }),
        body('ex1', 'Example: a leaf in sunlight releases bubbles of oxygen under water.'),
        body('ex2', 'Example: a plant kept in the dark slowly uses up its stored starch.'),
      ]
      return { regions: { title: [title('Key term')], timeline: [panel('def', 'base', kids, { padding: 'xl', emphasis: look === 'band' ? 'band' : 'none' })] } }
    },
  },
]

/** S11 — the v2 patterns as recipes (for the spec's checks and the compose kit's references only). */
export const PATTERN_V2_RECIPES: readonly SlideRecipe[] = COMPOSITION_PATTERNS_V2.map(patternRecipe)
