/**
 * tls.c.contact — where to reach someone: an optional person (portrait, name, role) and 1-6 contact
 * lines, each led by an icon chosen from its kind (mail, phone, globe, map-pin, share).
 *
 * `defineCompositeBlock` supplies metadata and `build()` (a stack of `tls.m.avatar` and
 * `tls.m.icon-list`); `layout()` places the same two specs by hand and flattens them (see `../_kit.ts`).
 * Group scope: content-height, top aligned, works in any region.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { capacityOf } from '../../diagram/_kit'
import { objs, str } from '../../media/_kit'
import { composeFlat, measureHeights, type Piece } from '../_kit'

export const CONTACT_MIN = 1
export const CONTACT_MAX = 6
export const KIND_ICONS: Record<string, string> = { email: 'mail', phone: 'phone', web: 'globe', address: 'map-pin', social: 'share' }
const KINDS = Object.keys(KIND_ICONS)

export interface ContactPerson {
  image?: string
  name?: string
  role?: string
}

export interface ContactItem {
  kind: 'email' | 'phone' | 'web' | 'address' | 'social'
  value: string
}

export interface ContactProps extends Record<string, unknown> {
  person?: ContactPerson
  items: ContactItem[]
  showPerson?: boolean
}

export const schema: BlockSchema = {
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
  items: {
    type: {
      kind: 'list',
      of: { kind: 'object', fields: {
        kind: { type: { kind: 'enum', values: KINDS }, role: 'content', label: 'Kind', required: true },
        value: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Value', required: true },
      } },
      min: CONTACT_MIN,
      max: CONTACT_MAX,
    },
    role: 'content',
    label: 'Contact lines',
    required: true,
    guidance: 'Each: kind (email, phone, web, address, social), value. The icon follows the kind.',
  },
  showPerson: { type: { kind: 'boolean' }, role: 'option', label: 'Show person', toggles: 'person' },
}

export const defaults: ContactProps = {
  person: { name: 'Dr. Tran Thi Lan', role: 'Head of Data Science' },
  items: [
    { kind: 'email', value: 'lan.tran@example.edu' },
    { kind: 'phone', value: '+84 238 123 4567' },
    { kind: 'web', value: 'stats.example.edu' },
    { kind: 'address', value: '182 Le Duan, Vinh City' },
  ],
}

const itemsOf = (props: ContactProps): Array<{ icon: string; title: string }> =>
  objs(props.items)
    .filter((it) => str(it.value).trim() !== '')
    .slice(0, CONTACT_MAX)
    .map((it) => ({ icon: KIND_ICONS[str(it.kind)] ?? 'globe', title: str(it.value).trim() }))

function personSpec(props: ContactProps): BlockSpec | undefined {
  const p = props.person
  if (!isShown(props, 'showPerson') || !p || typeof p !== 'object' || !str(p.name).trim()) return undefined
  return { id: 'person', type: 'tls.m.avatar', props: { image: str(p.image), name: str(p.name), role: str(p.role), size: 'lg', layout: 'inline', align: 'start' } }
}

function listSpec(props: ContactProps): BlockSpec {
  return { id: 'items', type: 'tls.m.icon-list', props: { items: itemsOf(props), iconStyle: 'circle', iconTone: 'accent', spacing: 'default', showText: false } }
}

export function buildContact(props: ContactProps): BlockSpec {
  return { id: 'contact', type: 'tls.l.stack', props: { gap: 'lg', sizing: 'content', children: [personSpec(props), listSpec(props)].filter(Boolean) as BlockSpec[] } }
}

function plan(props: ContactProps, ctx: LayoutContext) {
  const gap = ctx.tokens.space.lg
  const specs = [personSpec(props), listSpec(props)].filter(Boolean) as BlockSpec[]
  const W = Math.max(0, ctx.box.width) || 0
  const hs = measureHeights(ctx, specs, W)
  const needed = hs.reduce((a, b) => a + b, 0) + gap * Math.max(0, specs.length - 1)
  return { specs, hs, needed, gap, W }
}

export function layoutContact(props: ContactProps, ctx: LayoutContext): LayoutNode {
  const p = plan(props, ctx)
  const pieces: Piece[] = []
  let y = 0
  p.specs.forEach((spec, i) => {
    pieces.push({ id: spec.id, spec, box: { x: 0, y, width: p.W, height: p.hs[i] } })
    y += p.hs[i] + p.gap
  })
  return composeFlat(ctx, pieces, Math.max(1, Math.ceil(p.needed)))
}

const composite = defineCompositeBlock<ContactProps>({
  type: 'tls.c.contact',
  name: 'Contact',
  family: 'composite',
  tier: 'A',
  summary: 'Contact block: an optional person and email, phone, website, address or social lines, each with its icon.',
  keywords: ['contact', 'email', 'phone', 'website', 'address', 'social', 'reach us', 'get in touch'],
  category: 'closing',
  scope: 'group',
  shortDescription: 'Contact block with person and icon-led email, phone, web, address and social lines',
  related: ['tls.c.closing', 'tls.m.avatar', 'tls.m.icon-list'],
  schema,
  defaults,
  size: { preferred: [800, 580], min: [480, 350] },
  describe: {
    when: 'Where to reach the presenter or the organisation.',
    avoid: 'A full closing slide: tls.c.closing.',
    example: {
      id: 'b_contact',
      type: 'tls.c.contact',
      props: {
        person: { name: 'Dr. Tran Thi Lan', role: 'Head of Data Science' },
        items: [
          { kind: 'email', value: 'lan.tran@example.edu' },
          { kind: 'web', value: 'stats.example.edu' },
        ],
      },
    },
  },
  motion: { parts: ['root'], preset: 'stagger-lines' },
  build: buildContact,
})

function capacity(props: ContactProps): CapacityReport {
  const used = Array.isArray(props.items) ? props.items.length : 0
  return capacityOf({ items: { max: CONTACT_MAX, used } }, true, [{ kind: 'truncate', slot: 'items' }])
}

export const tlsCContact: BlockDefinition = {
  ...composite,
  layout: ((props: ContactProps, ctx: LayoutContext): LayoutNode => layoutContact(props, ctx)) as BlockDefinition['layout'],
  intrinsicSize: ((props: ContactProps, ctx: LayoutContext): Size => ({ width: Math.max(0, ctx.box.width), height: Math.max(1, Math.ceil(plan(props, ctx).needed)) })) as BlockDefinition['intrinsicSize'],
  capacity: capacity as BlockDefinition['capacity'],
}
