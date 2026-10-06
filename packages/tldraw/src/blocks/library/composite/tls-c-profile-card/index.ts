/**
 * tls.c.profile-card — a person in detail, built with `defineCompositeBlock`.
 *
 * A `tls.l.card` holding either a stack (portrait on top, centred text) or a row (portrait column
 * beside a text stack): `tls.m.avatar` (photo only), `tls.t.title` (name), `tls.t.caption` (role),
 * `tls.t.body` (bio) and `tls.t.footnote` (contact). All geometry is delegated to those blocks; there
 * is no box arithmetic here.
 *
 * Reduced vs the plan: no `tone: outline` (`tls.l.card` has no stroke), so the tones are the open
 * slide surface and a filled `surfaceAlt` card.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { flattenNode } from '../_kit'

export interface ProfileCardProps extends Record<string, unknown> {
  image?: string
  name: string
  role?: string
  bio?: string
  contact?: string
  layout?: 'auto' | 'stacked' | 'side'
  tone?: 'alt' | 'surface'
  showBio?: boolean
  showContact?: boolean
}

export const schema: BlockSchema = {
  image: { type: { kind: 'image' }, role: 'content', label: 'Portrait', help: 'Asset id or URL; initials when empty.' },
  name: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Name', required: true },
  role: { type: { kind: 'text', maxChars: 50 }, role: 'content', label: 'Role', guidance: 'Title and organisation, 1-8 words.' },
  bio: { type: { kind: 'text', maxChars: 200 }, role: 'content', label: 'Bio', guidance: '1-2 sentences.' },
  contact: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Contact', guidance: 'Email, handle or site.' },
  layout: { type: { kind: 'enum', values: ['auto', 'stacked', 'side'] }, role: 'option', label: 'Layout', help: 'auto = side by side in a landscape box, stacked in a portrait one; stacked = portrait above; side = portrait left.' },
  tone: { type: { kind: 'enum', values: ['alt', 'surface'] }, role: 'option', label: 'Tone', help: 'alt = filled card; surface = open.' },
  showBio: { type: { kind: 'boolean' }, role: 'option', label: 'Show bio', toggles: 'bio' },
  showContact: { type: { kind: 'boolean' }, role: 'option', label: 'Show contact', toggles: 'contact' },
}

export const defaults: ProfileCardProps = {
  image: '',
  name: 'Dr. Tran Thi Lan',
  role: 'Head of Data Science',
  bio: 'Leads the applied analytics group and teaches statistics for engineers.',
  contact: 'lan.tran@example.edu',
  layout: 'auto',
  tone: 'alt',
}

/** Build the spec tree: card > (stack | row) > avatar + text blocks. Pure. */
function buildProfileCard(props: ProfileCardProps): BlockSpec {
  const side = props.layout === 'side'
  const align = 'start' // tls.t.title / tls.t.caption ignore `align`, so the card is start-aligned throughout
  const text: BlockSpec[] = [
    { id: 'name', type: 'tls.t.title', props: { text: String(props.name ?? ''), size: 'subheading', align } },
  ]
  if (props.role) text.push({ id: 'role', type: 'tls.t.caption', props: { text: props.role, align } })
  if (isShown(props, 'showBio') && props.bio) text.push({ id: 'bio', type: 'tls.t.body', props: { text: props.bio, align } })
  if (isShown(props, 'showContact') && props.contact) {
    text.push({ id: 'contact', type: 'tls.t.caption', props: { text: props.contact, align, color: 'accent' } })
  }
  const avatar: BlockSpec = {
    id: 'photo',
    type: 'tls.m.avatar',
    props: { image: props.image ?? '', name: String(props.name ?? ''), size: side ? 'xl' : 'lg', align: 'start', showName: false, showRole: false },
  }
  const body: BlockSpec = side
    ? {
        id: 'row',
        type: 'tls.l.row',
        props: { gap: 'lg', sizing: 'equal', children: [avatar, { id: 'text', type: 'tls.l.stack', props: { gap: 'xs', sizing: 'content', children: text } }] },
      }
    : { id: 'stack', type: 'tls.l.stack', props: { gap: 'sm', sizing: 'content', children: [avatar, ...text] } }
  return {
    id: 'profile-card',
    type: 'tls.l.card',
    props: {
      padding: 'lg',
      children: [body],
      ...(props.tone === 'surface' ? {} : { $block: { style: { surface: 'surfaceAlt' } } }),
    },
  }
}

const composite = defineCompositeBlock({
  type: 'tls.c.profile-card',
  name: 'Profile Card',
  family: 'composite',
  tier: 'A',
  summary: 'Card with a portrait, name, role, short bio and a contact line; portrait above or beside.',
  keywords: ['profile', 'person', 'bio', 'speaker', 'lecturer', 'team lead', 'card'],
  category: 'people',
  scope: 'element',
  shortDescription: 'Card with portrait, name, role, short bio and contact line',
  related: ['tls.m.avatar', 'tls.c.testimonial', 'tls.c.team'],
  schema,
  defaults,
  size: { preferred: [520, 700], min: [340, 420] },
  describe: {
    when: 'Introducing one person in detail: speaker bio, lecturer, team lead.',
    avoid: 'A row of people (use tls.m.avatar-group or a grid of tls.m.avatar); only a name and role (use tls.m.avatar).',
    example: {
      id: 'b_profile_card',
      type: 'tls.c.profile-card',
      props: {
        image: '/demo/portrait-1.svg',
        name: 'Dr. Tran Thi Lan',
        role: 'Head of Data Science',
        bio: 'Leads the applied analytics group.',
        contact: 'lan.tran@example.edu',
      },
    },
  },
  motion: { parts: ['root'], preset: 'fade-up' },
  build: buildProfileCard,
})

/** Names of the text pieces `buildProfileCard` emits, in tree order (it mirrors that function). */
function shownTexts(props: ProfileCardProps): string[] {
  const out = ['name']
  if (props.role) out.push('role')
  if (isShown(props, 'showBio') && props.bio) out.push('bio')
  if (isShown(props, 'showContact') && props.contact) out.push('contact')
  return out
}

/** Give each text block's anonymous `text` part its piece name, so toggles and motion can address it. */
function namePieces(node: LayoutNode, names: string[], state = { i: 0 }): LayoutNode {
  if (node.k === 'text' && node.part === 'text' && state.i < names.length) return { ...node, part: names[state.i++] }
  if (node.k === 'group') return { ...node, children: node.children.map((c) => namePieces(c, names, state)) }
  return node
}

/**
 * The generated tree nests `layoutChild` groups at non-zero offsets, which the DOM renderer applies and the SVG
 * renderer ignores (found by the registry-backed parity probe, P5 re-probe). Flatten it to absolute leaves under one
 * root group at (0,0), the same shape `composite/_kit.ts` gives every P5 composite.
 */
function flatRoot(root: LayoutNode): LayoutNode {
  const full = { x: 0, y: 0, width: root.box.width, height: root.box.height }
  return { k: 'group', part: root.k === 'group' ? (root.part ?? 'root') : 'root', box: full, children: flattenNode(root, 0, 0, full) }
}

/** Widest the card grows: a person card does not stretch across a full-width region. */
const MAX_W = { stacked: 640, side: 1080 }

/** `auto` becomes `side` in a landscape box (at least 1.3 wide for 1 tall), `stacked` otherwise. */
function resolveLayout(props: ProfileCardProps, box: { width: number; height: number }): 'stacked' | 'side' {
  if (props.layout === 'side' || props.layout === 'stacked') return props.layout
  return box.width >= box.height * 1.3 ? 'side' : 'stacked'
}

/**
 * The props with a concrete layout, and the context narrowed to the card's maximum width and to a
 * card-like height (the composite fills whatever box it gets, so a card in a tall region would stretch
 * its text apart): about 1.35 tall per wide when stacked (the 520 x 700 preferred shape), 0.42 when side by side.
 */
function resolve(props: ProfileCardProps, ctx: LayoutContext): { props: ProfileCardProps; ctx: LayoutContext } {
  const layout = resolveLayout(props, ctx.box)
  const resolved = { ...props, layout }
  if (!ctx.withBox) return { props: resolved, ctx }
  const width = Math.min(ctx.box.width, MAX_W[layout])
  const target = layout === 'side' ? Math.max(360, width * 0.42) : width * (700 / 520)
  const height = Math.min(ctx.box.height, Math.round(target))
  return { props: resolved, ctx: width === ctx.box.width && height === ctx.box.height ? ctx : ctx.withBox({ width, height }) }
}

export const tlsCProfileCard: BlockDefinition = {
  ...composite,
  layout: ((props: ProfileCardProps, ctx: LayoutContext) => {
    const r = resolve(props, ctx)
    return flatRoot(namePieces(composite.layout(r.props as never, r.ctx), shownTexts(props)))
  }) as BlockDefinition['layout'],
  intrinsicSize: ((props: ProfileCardProps, ctx: LayoutContext) => {
    const r = resolve(props, ctx)
    return composite.intrinsicSize!(r.props as never, r.ctx)
  }) as BlockDefinition['intrinsicSize'],
}
