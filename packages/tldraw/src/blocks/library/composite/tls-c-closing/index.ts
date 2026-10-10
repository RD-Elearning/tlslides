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
  /** AC2 `big-type`: a giant one-line title across the slide, start-aligned, with the text and
   *  call to action under it and the person and contacts as a footer line. */
  variant?: 'centered' | 'split' | 'big-type'
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
  variant: enumSlot(['centered', 'split', 'big-type'], 'Variant', 'split: panel with person and contacts; big-type: giant title.'),
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

const VARIANTS = ['centered', 'split', 'big-type'] as const

/** AC2 `variant: big-type`: the title's largest size (× display), its share of the width and of the
 *  box height. */
const BIG_TYPE = { maxGain: 2.5, width: 0.92, height: 0.42 } as const

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
    if (wantCta) emitCta(x, w, y + gap / 2, align)
  }

  function emitCta(x: number, w: number, y: number, align: 'center' | 'start'): void {
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
    // Give the label block room so it never wraps (pre-LO6 the editor's `estimateMetrics` ran wider than the pill's table width).
    const labelW = Math.max(boxW, Math.ceil(ctx.measureText(ctaText, ctaStyle, 4000).lines[0]?.width ?? 0) + 8)
    const ly = link ? y : y + (btnH - ctaStyle.size * ctaStyle.lineHeight) / 2
    pieces.push({ id: 'cta', spec: label, box: { x: link ? bx : bx + btnPadX, y: ly, width: labelW, height: Math.ceil(ctaStyle.size * ctaStyle.lineHeight) } })
  }

  if (variant === 'big-type') {
    // AC2: the title as big as one line across the slide allows (BIG_TYPE), start-aligned; the text
    // at lead and the call to action under it, the stack centred in the space above a footer line
    // (person, then contacts) at the bottom. Falls back to two lines / smaller type when narrow.
    const text = ctx.resolveColor('text').color
    const muted = ctx.resolveColor('textMuted').color
    const display = ctx.resolveText('display', { lineHeight: 1.05, letterSpacing: -0.03 })
    const title = String(props.title ?? '')
    const w0 = Math.max(1, lineWidth(title, display))
    const floor = ctx.resolveText('heading').size
    const p = props.person
    const personLine = isShown(props, 'showPerson') && p && typeof p === 'object' && p.name ? [p.name, p.role].filter(Boolean).join(' · ') : ''
    const contactLine = isShown(props, 'showContacts') ? strings(props.contacts, CLOSING_MAX_CONTACTS).join('   ·   ') : ''
    // Everything but the title, roomy (lead text, body footer, wide gaps) or compact (body text,
    // caption footer, tight gaps) when the box is short; the title takes the height that is left (at
    // least the heading size).
    const restOf = (compact: boolean) => {
      const bodyStyle = { ...ctx.resolveText(compact ? 'caption' : 'body'), color: muted }
      const pm = personLine ? ctx.measureText(personLine, { ...bodyStyle, color: text }, W) : undefined
      const cm = contactLine ? ctx.measureText(contactLine, bodyStyle, W) : undefined
      const footH = (pm ? pm.height : 0) + (cm ? cm.height : 0) + (pm && cm ? ctx.tokens.space.xs : 0)
      const leadStyle = { ...ctx.resolveText(compact ? 'body' : 'lead'), color: muted }
      const tx = props.text ? ctx.measureText(String(props.text), leadStyle, Math.min(W, 1400)) : undefined
      const ctaGap = compact ? gap : gap * 2
      const footGap = footH ? ctx.tokens.space[compact ? 'sm' : '2xl'] : 0
      const rest = (tx ? gap + tx.height : 0) + (wantCta ? ctaGap + ctaBlockH : 0) + footGap + footH
      return { leadStyle, tx, ctaGap, footGap, rest, bodyStyle, pm, cm, footH }
    }
    const roomy = restOf(false)
    const r = roomy.rest + floor * display.lineHeight <= H ? roomy : restOf(true)
    const { leadStyle, tx, ctaGap, footGap, bodyStyle, pm, cm, footH } = r
    let size = Math.max(floor, Math.floor(Math.min(display.size * BIG_TYPE.maxGain, (display.size * W * BIG_TYPE.width) / w0, H * BIG_TYPE.height, (H - r.rest) / display.lineHeight)))
    let titleStyle = { ...display, size, color: text }
    let tm = ctx.measureText(title, titleStyle, W)
    // the measured line box can round up past the estimate: step down until it fits
    for (let k = 0; k < 12 && size > floor && tm.height > H - r.rest; k++) {
      size = Math.max(floor, size - 2)
      titleStyle = { ...display, size, color: text }
      tm = ctx.measureText(title, titleStyle, W)
    }
    const stackH = tm.height + (tx ? gap + tx.height : 0) + (wantCta ? ctaGap + ctaBlockH : 0)
    const needed2 = stackH + footGap + footH
    const total2 = Math.max(H, needed2)
    let y = Math.max(0, (total2 - footGap - footH - stackH) / 2)
    pieces.push({ id: 'title', raw: [{ k: 'text', box: { x: 0, y, width: W, height: tm.height }, lines: tm.lines, style: titleStyle }], box: { x: 0, y, width: W, height: tm.height } })
    y += tm.height
    if (tx) {
      y += gap
      pieces.push({ id: 'text', raw: [{ k: 'text', box: { x: 0, y, width: Math.min(W, 1400), height: tx.height }, lines: tx.lines, style: leadStyle }], box: { x: 0, y, width: Math.min(W, 1400), height: tx.height } })
      y += tx.height
    }
    if (wantCta) emitCta(0, W, y + ctaGap, 'start')
    let fy = total2 - footH
    if (pm) {
      pieces.push({ id: 'person', raw: [{ k: 'text', box: { x: 0, y: fy, width: W, height: pm.height }, lines: pm.lines, style: { ...bodyStyle, color: text } }], box: { x: 0, y: fy, width: W, height: pm.height } })
      fy += pm.height + ctx.tokens.space.xs
    }
    if (cm) pieces.push({ id: 'contacts', raw: [{ k: 'text', box: { x: 0, y: fy, width: W, height: cm.height }, lines: cm.lines, style: bodyStyle }], box: { x: 0, y: fy, width: W, height: cm.height } })
    return composeFlat(ctx, pieces, total2)
  }

  if (split) {
    const top = Math.max(0, (total - leftTotal) / 2)
    // AC8: the panel hugs the person and contacts (2xl padding), centred beside the title column;
    // before AC8 it ran the full height and read as a tall empty card.
    const ph = Math.min(total, Math.round(rightTotal + 2 * pad + 2 * ctx.tokens.space.lg))
    const py = Math.round((total - ph) / 2)
    pieces.push({ id: 'panel', spec: { id: 'panel', type: 'tls.l.card', props: { padding: 'md', children: [], $block: { style: { surface: 'surfaceAlt' } } } }, box: { x: px, y: py, width: pw, height: ph } })
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
  related: ['tls.c.cover', 'tls.t.numbered', 'tls.c.recap', 'tls.c.contact'],
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
  // RVM5: the panel fades in, the title (line by line) and the text rise in, the person (photo,
  // name, role) and the contacts fade in in place, and the call to action comes last. Was `root`
  // fade-up (one unit).
  motion: {
    parts: ['panel', 'title', 'text', 'person', 'contacts', 'cta'],
    preset: 'fade-up',
    partMotion: {
      panel: { preset: 'sweep-nodes', delay: 0, stagger: 0 },
      title: { preset: 'fade-up', delay: 0, stagger: 80 },
      text: { preset: 'fade-up', delay: 200, stagger: 60 },
      person: { preset: 'sweep-nodes', delay: 350, stagger: 50 },
      contacts: { preset: 'sweep-nodes', delay: 600, stagger: 60 },
      cta: { preset: 'fade-up', delay: 780, stagger: 0 },
    },
  },
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
