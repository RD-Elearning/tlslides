/**
 * CMP4 — composition patterns: named, parametric slide designs built from containers, atoms,
 * layers, anchors and connectors (`reviews/blocks/composition/README.md` §2 CMP4).
 *
 * A recipe stacks tier-1 composites in a layout's regions; a pattern composes the parts itself (a
 * grid of cards each holding a marker, a heading and a body; a photo backdrop with a scrimmed
 * title stack anchored to a corner; shapes joined by connectors). Each pattern is grounded in a
 * reference rule (`ref`: ppt-master relationship structures P2 and device menu P13, ui-ux-pro-max
 * slide patterns U1–U3) and, like a recipe, is held to the oracle and the quality gate in all ten
 * deck styles (`patterns.spec.ts`).
 *
 * The picker sees a pattern as one more recipe of its role (`patternRecipe`): its `variants` are the
 * pattern's looks, `recipeSlide` builds the slide from `build(variant)`, and the look signature
 * (`pipeline/variety.ts`) reads the whole tree, so every look is a design of its own. The content
 * is sample content in the right shape and length: S3 rewrites the text, the structure stays.
 *
 * Data and pure builders only. Pure and DOM-free.
 */

import { RECIPES } from './recipes'
import type { AssetKind, RecipeRole, SlideRecipe } from './recipes'
import type { BlockSpec, ConnectorSpec } from './types'

/** What a pattern builds for one look: the regions of its layout and its connectors. */
export interface ComposedSlide {
  regions: Record<string, BlockSpec[]>
  connectors?: ConnectorSpec[]
}

export interface CompositionPattern {
  /** Unique across recipes and patterns; `<pattern>/<look>` names a design. */
  id: string
  role: RecipeRole
  /** A `SLIDE_LAYOUTS` id. */
  layout: string
  /** One short clause: when this pattern fits. */
  when: string
  /** The reference rule it follows (SURVEY §C: P2, P13, U1–U3, …). */
  ref: string
  /** The pattern's looks besides `base`, in order. */
  looks?: string[]
  /** The content assets every look needs (the picker filters on them). */
  needs?: AssetKind[]
  /** Builds the slide for a look (`base` or one of `looks`). */
  build(look: string): ComposedSlide
}

// ── builders ─────────────────────────────────────────────────────────────────────────────────

type Props = Record<string, unknown>
const blk = (id: string, type: string, props: Props = {}, extra: Partial<BlockSpec> = {}): BlockSpec => ({ id, type, props, ...extra })
const rich = (text: string) => ({ runs: [{ text }] })
const title = (text: string, props: Props = {}) => blk('title', 'tls.t.title', { text: rich(text), ...props })
/** A card or column heading: title type one or two steps down, in the text colour (the accent
 *  stays on the slide title and the markers; a heading per card in accent overuses it). */
const heading = (id: string, text: string, size: 'heading' | 'subheading' = 'subheading', props: Props = {}) =>
  blk(id, 'tls.t.title', { text: rich(text), size, color: 'text', ...props })
/** A text lockup on a photo: a padded, rounded scrim panel the size of its content. */
const SCRIM = { surface: 'scrim', padding: 'xl', radius: 'md' } as const
const body = (id: string, text: string, props: Props = {}) => blk(id, 'tls.t.body', { text: rich(text), ...props })
const stack = (id: string, children: BlockSpec[], props: Props = {}, extra: Partial<BlockSpec> = {}) =>
  blk(id, 'tls.l.stack', { sizing: 'content', children, ...props }, extra)
const row = (id: string, children: BlockSpec[], props: Props = {}) => blk(id, 'tls.l.row', { sizing: 'equal', children, ...props })
const grid = (id: string, columns: number, rows: number, children: BlockSpec[], props: Props = {}) =>
  blk(id, 'tls.l.grid', { columns, rows, sizing: 'equal', children, ...props })
const card = (id: string, children: BlockSpec[], extra: Partial<BlockSpec> = {}) => blk(id, 'tls.l.card', { children }, extra)
const split = (id: string, ratio: number, children: BlockSpec[], props: Props = {}) => blk(id, 'tls.l.split', { ratio, children, ...props })
const image = (id: string, src: string, alt: string, extra: Partial<BlockSpec> = {}) => blk(id, 'tls.m.image', { src, alt, fit: 'cover' }, extra)
const link = (id: string, from: string, to: string, more: Partial<ConnectorSpec> = {}): ConnectorSpec => ({ id, from: { block: from }, to: { block: to }, ...more })

/** Sample content shared by the patterns (S3 replaces it). */
const POINTS = [
  { icon: 'users', head: 'Shared metrics', text: 'One definition of revenue, churn and usage for every team.' },
  { icon: 'zap', head: 'Answers in minutes', text: 'Guided questions replace a week of spreadsheet work.' },
  { icon: 'shield', head: 'Governed by default', text: 'Access rules follow the org chart, not the analyst.' },
  { icon: 'trending-up', head: 'Room to grow', text: 'From ten seats to two thousand without a rebuild.' },
]
const STEPS = [
  { head: 'Pilot', text: 'Two design partners, eight weeks, one shared scorecard.' },
  { head: 'Expand', text: 'Twenty accounts with a named success manager.' },
  { head: 'Self-serve', text: 'Trial to paid without a sales call.' },
  { head: 'Scale', text: 'Partners resell in three new regions.' },
]
const PEOPLE = [
  { image: '/demo/portrait-1.svg', name: 'Tran Thi Lan', role: 'Product lead' },
  { image: '/demo/portrait-2.svg', name: 'Nguyen Van An', role: 'Data engineering' },
  { image: '/demo/portrait-3.svg', name: 'Le Minh Chau', role: 'Customer success' },
  { image: '/demo/portrait-4.svg', name: 'Pham Quoc Bao', role: 'Design' },
]
const AGENDA = [
  { head: 'Where the market is', text: 'Size, growth and who serves it today.' },
  { head: 'What customers ask for', text: 'Twelve interviews, three clear needs.' },
  { head: 'The rollout plan', text: 'Pilot, expand, then self-serve.' },
  { head: 'What we need from you', text: 'Budget, two hires, one partner.' },
]

// ── patterns ─────────────────────────────────────────────────────────────────────────────────

export const COMPOSITION_PATTERNS: readonly CompositionPattern[] = [
  // ── cover ──
  {
    id: 'cover-photo-scrim',
    role: 'cover',
    layout: 'full-bleed',
    when: 'opener on a photo, title on a scrim',
    ref: 'P2 wide visual ≥ 55 %; U2 text on image needs a scrim',
    looks: ['center', 'left'],
    needs: ['images'],
    build(look) {
      const anchor = look === 'center' ? 'center' : look === 'left' ? 'left' : 'bottom-left'
      const align = look === 'center' ? 'center' : 'start'
      return {
        regions: {
          content: [
            image('photo', '/demo/photo-2.svg', 'A city skyline at dusk', { layer: 'backdrop' }),
            stack(
              'lockup',
              [
                blk('kicker', 'tls.t.kicker', { text: 'Quarterly review' }),
                title('Expanding into mid-market teams', { size: 'display', align }),
                body('sub', 'A focused plan for the 200 to 2,000 employee segment', { size: 'lead', align }),
              ],
              { gap: 'md' },
              { layer: 'overlay', anchor, style: SCRIM }
            ),
          ],
        },
      }
    },
  },
  {
    id: 'cover-type-rule',
    role: 'cover',
    layout: 'section-stack',
    when: 'type-led opener with a label and a rule',
    ref: 'U3 display ≥ 2.5× body; P13 rule device',
    looks: ['badge'],
    build(look) {
      const label = blk('label', 'tls.t.badge', { text: 'Quarterly review', tone: look === 'badge' ? 'solid' : 'soft' })
      return {
        regions: {
          content: [
            label,
            title('Expanding into mid-market teams', { size: 'display', rule: true }),
            body('sub', 'A focused plan for the 200 to 2,000 employee segment', { size: 'subheading' }),
          ],
        },
      }
    },
  },

  {
    id: 'cover-facts',
    role: 'cover',
    // the 1200-wide column clear of the cover motifs (swiss's red block, gradient's orb)
    layout: 'section-stack',
    when: 'opener with the three numbers that frame it',
    ref: 'P2 evidence under the claim; U3 type ratio (the style\'s own title size)',
    looks: ['plain'],
    build(look) {
      return {
        regions: {
          content: [
            // one content-sized lockup (its region centres it)
            stack('lockup', [
              blk('label', 'tls.t.badge', { text: 'Quarterly review', tone: 'soft' }),
              title('Expanding into mid-market teams', { rule: true }),
              // the numbers as a KPI row (the composite aligns values and labels and counts up once)
              blk('facts', 'tls.c.kpi-row', { tiles: [
                { value: 40, label: 'Teams interviewed', format: 'plain' },
                { value: 3, label: 'Times the pipeline, two quarters', format: 'plain' },
                { value: 118, label: 'Net retention, percent', format: 'plain' },
              ], tile: look === 'plain' ? 'plain' : 'accent-bar', gap: 'lg' }),
            ], { gap: 'xl' }),
          ],
        },
      }
    },
  },

  // ── agenda ──
  {
    id: 'agenda-marker-cards',
    role: 'agenda',
    layout: 'timeline',
    when: 'four agenda items as numbered cards',
    ref: 'P2 parallel sequence; P13 numbered markers',
    looks: ['row'],
    build(look) {
      // the 2 × 2 grid has room for a step more type than four cards in a row
      const roomy = look !== 'row'
      const cards = AGENDA.map((a, i) =>
        card(`c${i + 1}`, [
          blk(`m${i + 1}`, 'tls.t.marker', { value: String(i + 1), tone: i === 0 ? 'solid' : 'soft' }),
          heading(`h${i + 1}`, a.head, roomy ? 'heading' : 'subheading'),
          body(`b${i + 1}`, a.text, roomy ? { size: 'lead' } : {}),
        ])
      )
      return { regions: { title: [title('Agenda')], timeline: [look === 'row' ? row('cards', cards, { gap: 'lg' }) : grid('cards', 2, 2, cards, { gap: 'lg' })] } }
    },
  },
  {
    id: 'agenda-split-rail',
    role: 'agenda',
    layout: 'blank',
    when: 'agenda beside a big label',
    ref: 'P2 focal column 4:6; P13 numbered markers',
    looks: ['chevron'],
    build(look) {
      // both columns centred on the slide's height (the list's `fit` type fills its column)
      const left = stack('lead', [title('Agenda', { size: 'display' }), body('lede', 'Four questions, forty minutes', { size: 'lead' })], { gap: 'md' }, { style: { align: 'center' } })
      // a numbered list that sizes its type to the column (`size: fit`), markers on its lines
      const list = blk('list', 'tls.t.bullets', { items: AGENDA.map((a) => ({ text: a.head })), marker: look === 'chevron' ? 'chevron' : 'number', size: 'fit', spacing: 'lg' }, { style: { align: 'center' } })
      return { regions: { content: [split('split', 0.4, [left, list], { gutter: '4xl' })] } }
    },
  },

  {
    id: 'agenda-flow',
    role: 'agenda',
    layout: 'timeline',
    when: 'four agenda items as a path',
    ref: 'P2 parallel sequence; P14 flow line',
    looks: ['shapes'],
    build(look) {
      const steps = AGENDA.map((a, i) =>
        stack(`c${i + 1}`, [
          look === 'shapes'
            ? blk(`m${i + 1}`, 'tls.m.shape', { label: String(i + 1), shape: 'circle', tone: i === 0 ? 'solid' : 'soft', size: 'sm' })
            : blk(`m${i + 1}`, 'tls.t.marker', { value: String(i + 1), tone: i === 0 ? 'solid' : 'outline', size: 'lg' }),
          heading(`h${i + 1}`, a.head),
          body(`b${i + 1}`, a.text),
        ], { gap: 'md' })
      )
      const connectors = steps.slice(1).map((_, i) => link(`k${i + 1}`, `m${i + 1}`, `m${i + 2}`, { dash: true, head: 'none' }))
      return { regions: { title: [title('Agenda')], timeline: [row('path', steps, { gap: '2xl' })] }, connectors }
    },
  },

  // ── section ──
  {
    id: 'section-marker',
    role: 'section',
    layout: 'section-stack',
    when: 'section break with its number',
    ref: 'P13 oversized numeral; U3 type ratio',
    looks: ['disc', 'style'],
    build(look) {
      return {
        regions: {
          content: [
            blk('num', 'tls.t.marker', { value: '02', variant: look === 'disc' ? 'circle' : 'numeral', size: 'lg', tone: 'solid' }),
            title('Why mid-market, why now', look === 'style' ? {} : { size: 'display' }),
            body('sub', 'The segment is under-served and ready to buy', { size: 'subheading' }),
          ],
        },
      }
    },
  },
  {
    id: 'section-questions',
    role: 'section',
    layout: 'section-stack',
    when: 'section break with the questions it answers',
    ref: 'P2 focal column; the style\'s own title size',
    looks: ['chevron'],
    build(look) {
      return {
        regions: {
          content: [
            blk('label', 'tls.t.badge', { text: 'Part two', tone: 'soft' }),
            title('Why mid-market, why now', { rule: true }),
            blk('qs', 'tls.t.bullets', { items: [{ text: 'Who buys, and how fast?' }, { text: 'What do they use today?' }, { text: 'Where do we win?' }], marker: look === 'chevron' ? 'chevron' : 'number', size: 'fit', spacing: 'md' }),
          ],
        },
      }
    },
  },
  {
    id: 'section-photo-scrim',
    role: 'section',
    layout: 'full-bleed',
    when: 'section break on a photo',
    ref: 'P2 wide visual; U2 scrim',
    looks: ['center'],
    needs: ['images'],
    build(look) {
      const center = look === 'center'
      return {
        regions: {
          content: [
            image('photo', '/demo/photo-3.svg', 'An open-plan office', { layer: 'backdrop' }),
            stack('lockup', [
              blk('badge', 'tls.t.badge', { text: 'Part two', tone: 'solid' }),
              title('Why mid-market, why now', { size: 'display', align: center ? 'center' : 'start' }),
            ], { gap: 'md' }, { layer: 'overlay', anchor: center ? 'center' : 'bottom-left', style: SCRIM }),
          ],
        },
      }
    },
  },

  // ── content ──
  {
    id: 'content-icon-cards',
    role: 'content',
    layout: 'timeline',
    when: '3–4 points, each with an icon',
    ref: 'P2 parallel sequence; P13 icon disc',
    looks: ['three'],
    build(look) {
      const n = look === 'three' ? 3 : 4
      // three cards have room for a step more type (U3: card heading ≥ 1.4× its body)
      const roomy = n === 3
      const cards = POINTS.slice(0, n).map((p, i) =>
        card(`c${i + 1}`, [
          blk(`i${i + 1}`, 'tls.m.icon', { icon: p.icon, size: 'lg', iconStyle: 'disc' }),
          heading(`h${i + 1}`, p.head, roomy ? 'heading' : 'subheading'),
          body(`b${i + 1}`, p.text, roomy ? { size: 'lead' } : {}),
        ])
      ).map((c) => (roomy ? { ...c, props: { ...c.props, padding: 'xl' } } : c))
      return { regions: { title: [title('What mid-market teams need')], timeline: [row('cards', cards, { gap: 'lg' })] } }
    },
  },
  {
    id: 'content-hub',
    role: 'content',
    layout: 'timeline',
    when: 'one idea and the four things around it',
    ref: 'P2 hub + satellites',
    looks: ['outline'],
    build(look) {
      const shape = 'circle'
      const size = 'md'
      // the satellites in the text colour: the accent stays on the hub (P10 accent budget)
      const tone = look === 'outline' ? 'outline' : 'soft'
      const sat = (id: string, label: string, icon: string) => blk(id, 'tls.m.shape', { label, icon, shape, tone, size }, { style: { accent: 'text' } })
      return {
        regions: {
          title: [title('Everything starts from shared metrics')],
          timeline: [
            grid('hub', 3, 2, [
              sat('s1', 'Sales', 'trending-up'),
              blk('core', 'tls.m.shape', { label: 'Metrics', icon: 'database', shape, tone: 'solid', size }),
              sat('s2', 'Support', 'message'),
              sat('s3', 'Product', 'layers'),
              blk('note', 'tls.t.body', { text: rich('Every team reads the same numbers.'), align: 'center' }),
              sat('s4', 'Finance', 'wallet'),
            ], { gap: 'xl' }),
          ],
        },
        connectors: [link('k1', 'core', 's1', { head: 'none' }), link('k2', 'core', 's2', { head: 'none' }), link('k3', 'core', 's3', { head: 'none' }), link('k4', 'core', 's4', { head: 'none' })],
      }
    },
  },

  // ── process ──
  {
    id: 'process-marker-flow',
    role: 'process',
    layout: 'timeline',
    when: '3–4 ordered steps joined by arrows',
    ref: 'P2 3-column parallel sequence; P14 flow arrows',
    looks: ['four'],
    build(look) {
      const n = look === 'four' ? 4 : 3
      const roomy = n === 3
      const cards = STEPS.slice(0, n).map((s, i) =>
        card(`c${i + 1}`, [blk(`m${i + 1}`, 'tls.t.marker', { value: String(i + 1) }), heading(`h${i + 1}`, s.head, roomy ? 'heading' : 'subheading'), body(`b${i + 1}`, s.text, roomy ? { size: 'lead' } : {})])
      )
      const connectors = cards.slice(1).map((c, i) => link(`k${i + 1}`, cards[i].id, c.id))
      return { regions: { title: [title('A phased rollout')], timeline: [row('steps', cards, { gap: '3xl' })] }, connectors }
    },
  },

  // ── people ──
  {
    id: 'people-avatar-cards',
    role: 'people',
    layout: 'timeline',
    when: '3–4 people with their roles',
    ref: 'P2 parallel; U1 team row',
    looks: ['three', 'plain'],
    needs: ['portraits'],
    build(look) {
      const n = look === 'three' ? 3 : 4
      // four in a row keep `lg` (an `xl` name truncated in the narrower column)
      const avatar = (p: (typeof PEOPLE)[number], i: number) => blk(`a${i + 1}`, 'tls.m.avatar', { ...p, size: n === 3 ? 'xl' : 'lg', layout: 'stacked', align: 'center' })
      // `plain`: the people on the page, no cards (a calmer team row)
      const cards = PEOPLE.slice(0, n).map((p, i) => (look === 'plain' ? avatar(p, i) : card(`c${i + 1}`, [avatar(p, i)])))
      return { regions: { title: [title('The team behind the launch')], timeline: [row('people', cards, { gap: 'lg' })] } }
    },
  },
  {
    id: 'people-quote-portrait',
    role: 'people',
    layout: 'blank',
    when: 'one person and what they said',
    ref: 'P2 1:1 focal; U1 testimonial split',
    looks: ['mirror'],
    needs: ['portraits'],
    build(look) {
      const who = blk('who', 'tls.m.avatar', { ...PEOPLE[0], size: 'xl', layout: 'stacked', align: 'center' })
      const quote = blk('quote', 'tls.t.quote', { text: rich('We stopped arguing about whose number is right and started fixing the funnel.'), attribution: 'Tran Thi Lan', role: 'Product lead', variant: 'classic' })
      return { regions: { content: [split('split', look === 'mirror' ? 0.62 : 0.38, look === 'mirror' ? [quote, who] : [who, quote], { gutter: '4xl' })] } }
    },
  },

  // ── closing ──
  {
    id: 'closing-next-steps',
    role: 'closing',
    layout: 'timeline',
    when: 'thanks and three next steps',
    ref: 'P13 numbered markers; U1 CTA closing',
    looks: ['plain'],
    build(look) {
      const items = [
        { head: 'Approve the pilot', text: 'Budget for two quarters, signed this month.' },
        { head: 'Name two partners', text: 'Mid-market accounts that will co-design with us.' },
        { head: 'Review in six weeks', text: 'One scorecard, shared with this group.' },
      ]
      const one = (it: { head: string; text: string }, i: number) => {
        const kids = [blk(`m${i + 1}`, 'tls.t.marker', { value: String(i + 1), tone: i === 0 ? 'solid' : 'soft' }), heading(`h${i + 1}`, it.head, 'heading'), body(`b${i + 1}`, it.text, { size: 'lead' })]
        return look === 'plain' ? stack(`c${i + 1}`, kids, { gap: 'sm' }) : card(`c${i + 1}`, kids)
      }
      return { regions: { title: [title('Thank you — next steps')], timeline: [row('steps', items.map(one), { gap: 'xl' })] } }
    },
  },
  {
    id: 'closing-photo-scrim',
    role: 'closing',
    layout: 'full-bleed',
    when: 'thanks on a photo',
    ref: 'P2 wide visual; U2 scrim',
    looks: ['left'],
    needs: ['images'],
    build(look) {
      return {
        regions: {
          content: [
            image('photo', '/demo/photo-2.svg', 'A city skyline at dusk', { layer: 'backdrop' }),
            stack('lockup', [
              title('Thank you', { size: 'display', align: look === 'left' ? 'start' : 'center' }),
              body('sub', 'Questions and next steps', { size: 'subheading', align: look === 'left' ? 'start' : 'center' }),
              blk('contact', 'tls.t.badge', { text: 'hello@pulse.example', icon: 'mail', tone: 'solid', size: 'lg' }),
            ], { gap: 'lg' }, { layer: 'overlay', anchor: look === 'left' ? 'bottom-left' : 'center', style: SCRIM }),
          ],
        },
      }
    },
  },

  // ── more for the thin roles (a style's own title size, no forced display type) ──
  {
    id: 'section-split-numeral',
    role: 'section',
    layout: 'blank',
    when: 'section break, its number beside the title',
    ref: 'P13 oversized numeral; P2 focal column',
    looks: ['rule'],
    build(look) {
      return {
        regions: {
          content: [
            // the text on the left, the numeral where a style's motif sits (top right on gradient/glass)
            split('split', 0.68, [
              stack('text', [title('Why mid-market, why now', look === 'rule' ? { rule: true } : {}), body('sub', 'The segment is under-served and ready to buy', { size: 'lead' })], { gap: 'lg' }, { style: { align: 'center' } }),
              blk('num', 'tls.t.marker', { value: '02', variant: 'numeral', size: 'lg' }),
            ], { gutter: '3xl' }),
          ],
        },
      }
    },
  },
  {
    id: 'closing-contact-cards',
    role: 'closing',
    layout: 'timeline',
    when: 'thanks and how to reach us',
    ref: 'U1 CTA closing; P13 icon disc',
    looks: ['plain'],
    build(look) {
      const items = [
        { icon: 'mail', head: 'hello@pulse.example', text: 'Questions and the pilot plan' },
        { icon: 'calendar', head: 'Review on 12 May', text: 'Leadership check-in, 30 minutes' },
        { icon: 'users', head: 'Two design partners', text: 'Introductions welcome' },
      ]
      const one = (it: { icon: string; head: string; text: string }, i: number) => {
        const kids = [blk(`i${i + 1}`, 'tls.m.icon', { icon: it.icon, size: 'lg', iconStyle: 'disc' }), heading(`h${i + 1}`, it.head), body(`b${i + 1}`, it.text, { size: 'lead' })]
        return look === 'plain' ? stack(`c${i + 1}`, kids, { gap: 'sm' }) : card(`c${i + 1}`, kids)
      }
      return { regions: { title: [title('Thank you')], timeline: [row('contacts', items.map(one), { gap: 'xl' })] } }
    },
  },
  {
    id: 'people-roles',
    role: 'people',
    layout: 'timeline',
    when: 'the roles of a team, no portraits needed',
    ref: 'P2 parallel; P13 icon disc',
    looks: ['grid'],
    build(look) {
      const roles = [
        { icon: 'layers', head: 'Product', text: 'Owns the roadmap and the pilot scorecard.' },
        { icon: 'database', head: 'Data', text: 'Builds the shared metric layer.' },
        { icon: 'message', head: 'Customer success', text: 'Runs onboarding for every account.' },
        { icon: 'pencil', head: 'Design', text: 'Makes the guided questions feel simple.' },
      ]
      const cards = roles.map((r, i) => card(`c${i + 1}`, [blk(`i${i + 1}`, 'tls.m.icon', { icon: r.icon, size: 'lg', iconStyle: 'disc' }), heading(`h${i + 1}`, r.head, look === 'grid' ? 'heading' : 'subheading'), body(`b${i + 1}`, r.text, look === 'grid' ? { size: 'lead' } : {})]))
      return { regions: { title: [title('One squad, four disciplines')], timeline: [look === 'grid' ? grid('roles', 2, 2, cards, { gap: 'lg' }) : row('roles', cards, { gap: 'lg' })] } }
    },
  },
]

/** CMP4 — a pattern as a recipe of its role, for the variety picker. */
export function patternRecipe(p: CompositionPattern): SlideRecipe {
  return {
    id: p.id,
    role: p.role,
    layout: p.layout,
    regions: {},
    when: p.when,
    variants: (p.looks ?? []).map((id) => ({ id })),
    compose: (look) => p.build(look),
    needs: p.needs,
  }
}

/** CMP4 — every pattern as a recipe. */
export const PATTERN_RECIPES: readonly SlideRecipe[] = COMPOSITION_PATTERNS.map(patternRecipe)

/** CMP4 — every design source the picker draws on: the recipes, then the patterns. */
export const ALL_DESIGNS: readonly SlideRecipe[] = [...RECIPES, ...PATTERN_RECIPES]

/** CMP4 — a recipe or a pattern by id (the first half of a `recipe/look` design name). */
export function findDesign(id: string): SlideRecipe | undefined {
  return ALL_DESIGNS.find((r) => r.id === id)
}

/** CMP4 — the patterns of one role (all when `role` is absent). */
export function patternsFor(role?: RecipeRole): CompositionPattern[] {
  return COMPOSITION_PATTERNS.filter((p) => !role || p.role === role)
}

/** Every block of a composed slide, depth first (children through `props.children`). */
export function walkBlocks(blocks: readonly BlockSpec[], fn: (b: BlockSpec, depth: number) => void, depth = 0): void {
  for (const b of blocks) {
    fn(b, depth)
    const kids = (b.props as Props | undefined)?.children
    if (Array.isArray(kids)) walkBlocks(kids as BlockSpec[], fn, depth + 1)
  }
}
