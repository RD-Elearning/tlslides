/**
 * tls.c.closing — last slide: thank-you title, text, call to action, contacts and a person.
 *
 * `defineCompositeBlock` supplies metadata and `build()` (the content stack); `layout()` places the
 * same specs by hand and flattens them (see `../_kit.ts`). `centered` is one centred column; `split`
 * puts title/text/cta left and a `surfaceAlt` panel with the person and contacts right. The button is
 * a pill rect plus a label (the layout blocks have no pill); `ctaStyle: link` is accent text with an arrow.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, CapacityReport, LayoutContext, LayoutNode } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { onColor } from '../../text/_engine/color'
import { composeFlat, lineWidth, measureHeights, pick, pickToken, strings, toMeasurable, type Piece } from '../_kit'
import { capacityOf } from '../../diagram/_kit'

export const CLOSING_MAX_CONTACTS = 4

export interface ClosingPerson {
  image?: string
  name?: string
  role?: string
}

export interface ClosingProps extends Record<string, unknown> {
  title: string
  text?: string
  cta?: string
  contacts?: string[]
  person?: ClosingPerson
  variant?: 'centered' | 'split'
  ctaStyle?: 'button' | 'link'
  showCta?: boolean
  showContacts?: boolean
  showPerson?: boolean
}

export const schema: BlockSchema = {
  title: { type: { kind: 'text', maxChars: 50 }, role: 'content', label: 'Title', required: true, guidance: '"Thank you", "Questions?".' },
  text: { type: { kind: 'text', maxChars: 160 }, role: 'content', label: 'Text' },
  cta: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Call to action', guidance: 'Next step, 2-5 words.' },
  contacts: { type: { kind: 'list', of: { kind: 'text', maxChars: 60 }, min: 0, max: CLOSING_MAX_CONTACTS }, role: 'content', label: 'Contacts', guidance: 'Email, site, handle.' },
  person: {
    type: { kind: 'object', fields: {
      image: { type: { kind: 'image' }, role: 'content', label: 'Portrait' },
      name: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Name', required: true },
      role: { type: { kind: 'text', maxChars: 50 }, role: 'content', label: 'Role' },
    } },
    role: 'content',
    label: 'Person',
    guidance: 'Fields: image, name, role.',
  },
  variant: enumSlot(['centered', 'split'], 'Variant', 'split = panel with person and contacts.'),
  ctaStyle: enumSlot(['button', 'link'], 'Call to action style'),
  showCta: { type: { kind: 'boolean' }, role: 'option', label: 'Show call to action', toggles: 'cta' },
  showContacts: { type: { kind: 'boolean' }, role: 'option', label: 'Show contacts', toggles: 'contacts' },
  showPerson: { type: { kind: 'boolean' }, role: 'option', label: 'Show person', toggles: 'person' },
}

export const defaults: ClosingProps = {
  title: 'Thank you',
  text: 'Questions and discussion are welcome.',
  cta: 'Book office hours',
  contacts: ['lan.tran@example.edu', 'stats.example.edu'],
  person: { name: 'Dr. Tran Thi Lan', role: 'Head of Data Science' },
  variant: 'centered',
  ctaStyle: 'button',
}

const VARIANTS = ['centered', 'split'] as const

interface Specs {
  title: BlockSpec
  text?: BlockSpec
  contacts: BlockSpec[]
  person?: BlockSpec
}

function specsOf(props: ClosingProps, centered: boolean, titleSize: 'title' | 'heading'): Specs {
  const s: Specs = { title: { id: 'title', type: 'tls.t.title', props: { text: toMeasurable(props.title), size: titleSize } }, contacts: [] }
  if (props.text) s.text = { id: 'text', type: 'tls.t.body', props: { text: props.text } }
  if (isShown(props, 'showContacts')) {
    s.contacts = strings(props.contacts, CLOSING_MAX_CONTACTS).map((t, i) => ({ id: `contact-${i}`, type: 'tls.t.caption', props: { text: t, color: 'text' } }))
  }
  const p = props.person
  if (isShown(props, 'showPerson') && p && typeof p === 'object' && p.name) {
    s.person = {
      id: 'person',
      type: 'tls.m.avatar',
      props: { image: p.image ?? '', name: String(p.name), role: p.role ?? '', size: 'lg', layout: centered ? 'stacked' : 'inline', align: centered ? 'center' : 'start' },
    }
  }
  return s
}

export function buildClosing(props: ClosingProps): BlockSpec {
  const s = specsOf(props, true, 'title')
  const children = [s.title, s.text, ...(isShown(props, 'showCta') && props.cta ? [{ id: 'cta', type: 'tls.t.subtitle', props: { text: props.cta } }] : []), s.person, ...s.contacts].filter(Boolean) as BlockSpec[]
  return { id: 'closing', type: 'tls.l.stack', props: { gap: 'md', sizing: 'content', children } }
}

export function layoutClosing(props: ClosingProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const variant = pick(props.variant, VARIANTS, 'centered')
  const split = variant === 'split'
  const centered = !split
  const link = props.ctaStyle === 'link'
  const gap = ctx.tokens.space.md
  const wantCta = isShown(props, 'showCta') && !!props.cta

  const lw = split ? Math.max(120, W * 0.55 - gap) : Math.min(W, 1100)
  const lx = split ? 0 : (W - lw) / 2
  const px = split ? W * 0.55 + gap : 0
  const pw = split ? W - px : 0
  const pad = ctx.tokens.space.xl
  const align = centered ? 'center' : 'start'

  const accent = ctx.resolveColor('accent').color
  const ctaStyle = ctx.resolveText('subheading') // what `tls.t.subtitle` draws
  const ctaText = wantCta ? String(props.cta) + (link ? ' →' : '') : ''
  const ctaW = wantCta ? Math.min(lw, Math.ceil(lineWidth(ctaText, ctaStyle) * 1.05)) : 0
  const btnPadX = ctx.tokens.space.lg
  const btnH = Math.round(ctaStyle.size * ctaStyle.lineHeight + ctx.tokens.space.md * 2)
  const ctaBlockH = wantCta ? (link ? Math.round(ctaStyle.size * ctaStyle.lineHeight) : btnH) : 0

  const sizes: Array<'title' | 'heading'> = ['title', 'heading']
  const start = Math.max(0, sizes.indexOf(pickToken(ctx, props.title, lw, sizes, 2) as 'title' | 'heading'))
  let s = specsOf(props, centered, sizes[start])
  let leftSpecs: BlockSpec[] = []
  let leftH: number[] = []
  let leftTotal = 0
  let rightSpecs: BlockSpec[] = []
  let rightH: number[] = []
  let rightTotal = 0
  let needed = 0
  for (let k = start; k < sizes.length; k++) {
    s = specsOf(props, centered, sizes[k])
    leftSpecs = [s.title, s.text].filter(Boolean) as BlockSpec[]
    rightSpecs = split ? [s.person, ...s.contacts].filter(Boolean) as BlockSpec[] : [s.person, ...s.contacts].filter(Boolean) as BlockSpec[]
    const colW = split ? pw - 2 * pad : lw
    leftH = measureHeights(ctx, leftSpecs, lw)
    rightH = measureHeights(ctx, rightSpecs, colW)
    leftTotal = leftH.reduce((a, b) => a + b, 0) + gap * Math.max(0, leftSpecs.length - 1) + (wantCta ? ctaBlockH + gap * 1.5 : 0)
    rightTotal = rightH.reduce((a, b) => a + b, 0) + gap * Math.max(0, rightSpecs.length - 1)
    needed = split ? Math.max(leftTotal, rightTotal + 2 * pad) : leftTotal + (rightSpecs.length ? rightTotal + gap * 2 : 0)
    if (needed <= H) break
  }
  const total = Math.max(H, needed)
  const pieces: Piece[] = []

  const emitLeft = (x: number, w: number, y0: number) => {
    let y = y0
    leftSpecs.forEach((spec, i) => {
      pieces.push({ id: spec.id, spec, box: { x, y, width: w, height: leftH[i] }, align })
      y += leftH[i] + gap
    })
    if (wantCta) {
      y += gap / 2
      const label = { id: 'cta-label', type: 'tls.t.subtitle', props: { text: ctaText, color: link ? 'accent' : onColor(ctx, accent) } } as BlockSpec
      const boxW = link ? ctaW : Math.min(w, ctaW + 2 * btnPadX)
      const bx = align === 'center' ? x + (w - boxW) / 2 : x
      if (!link) {
        pieces.push({
          id: 'cta',
          raw: [{ k: 'rect', box: { x: bx, y, width: boxW, height: btnH }, fill: { type: 'solid', color: accent }, radius: btnH / 2 } as LayoutNode],
          box: { x: bx, y, width: boxW, height: btnH },
        })
      }
      // The label block wraps with `estimateMetrics`, which runs wider than the pill (table widths): give it room so it never wraps.
      const labelW = Math.max(boxW, Math.ceil(ctx.measureText(ctaText, ctaStyle, 4000).lines[0]?.width ?? 0) + 8)
      const ly = link ? y : y + (btnH - ctaStyle.size * ctaStyle.lineHeight) / 2
      pieces.push({ id: 'cta', spec: label, box: { x: link ? bx : bx + btnPadX, y: ly, width: labelW, height: Math.ceil(ctaStyle.size * ctaStyle.lineHeight) } })
    }
  }

  if (split) {
    const top = Math.max(0, (total - leftTotal) / 2)
    pieces.push({ id: 'panel', spec: { id: 'panel', type: 'tls.l.card', props: { padding: 'md', children: [], $block: { style: { surface: 'surfaceAlt' } } } }, box: { x: px, y: 0, width: pw, height: total } })
    emitLeft(lx, lw, top)
    let y = Math.max(pad, (total - rightTotal) / 2)
    rightSpecs.forEach((spec, i) => {
      pieces.push({ id: spec.id.startsWith('contact') ? 'contacts' : spec.id, spec, box: { x: px + pad, y, width: pw - 2 * pad, height: rightH[i] }, align: 'start' })
      y += rightH[i] + gap
    })
  } else {
    let y = (total - needed) / 2
    const leftBottom = y + leftTotal
    emitLeft(lx, lw, y)
    y = leftBottom + gap * 2
    rightSpecs.forEach((spec, i) => {
      pieces.push({ id: spec.id.startsWith('contact') ? 'contacts' : spec.id, spec, box: { x: lx, y, width: lw, height: rightH[i] }, align: 'center' })
      y += rightH[i] + gap
    })
  }
  return composeFlat(ctx, pieces, total)
}

const composite = defineCompositeBlock<ClosingProps>({
  type: 'tls.c.closing',
  name: 'Closing',
  family: 'composite',
  tier: 'A',
  summary: 'Closing slide: thank-you title, call to action, contacts and a presenter.',
  keywords: ['closing', 'thank you', 'questions', 'end slide', 'contact', 'call to action', 'next step'],
  category: 'closing',
  scope: 'slide',
  shortDescription: 'Closing slide with thank-you title, call to action and contact details',
  related: ['tls.c.cover', 'tls.t.numbered', 'tls.c.recap'],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: 'Last slide: thanks, Q&A, next step, how to reach us.',
    avoid: 'A summary of key points: use tls.c.recap.',
    example: {
      id: 'b_closing',
      type: 'tls.c.closing',
      props: {
        title: 'Thank you',
        text: 'Questions are welcome.',
        cta: 'Book office hours',
        contacts: ['lan.tran@example.edu'],
        person: { name: 'Dr. Tran Thi Lan', role: 'Head of Data Science' },
        variant: 'split',
      },
    },
  },
  motion: { parts: ['root'], preset: 'fade-up' },
  build: buildClosing,
})

function capacity(props: ClosingProps): CapacityReport {
  const used = Array.isArray(props.contacts) ? props.contacts.length : 0
  return capacityOf({ contacts: { max: CLOSING_MAX_CONTACTS, used } }, true, [{ kind: 'truncate', slot: 'contacts' }])
}

export const tlsCClosing: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: ClosingProps, ctx: LayoutContext): LayoutNode => layoutClosing(props, ctx)) as BlockDefinition['layout'],
  capacity: capacity as BlockDefinition['capacity'],
}
