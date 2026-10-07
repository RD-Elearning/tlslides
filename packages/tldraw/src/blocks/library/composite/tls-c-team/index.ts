/**
 * tls.c.team — a grid of team members: photo, name, role and an optional short bio.
 *
 * `defineCompositeBlock` supplies metadata and `build()` (a grid of card > stack > avatar + bio, the
 * same arrangement as `tls.c.profile-card`); `layout()` places each member by hand: a rounded rect for
 * `card: card`, one `tls.m.avatar` (portrait, name, role) and one `tls.t.caption` bio per cell, flattened
 * to absolute leaves. That keeps the tree 1 level deep, so a team also works inside a container (a grid
 * of nested profile-cards would be exactly 4 deep and fail anywhere but directly in a region).
 */

import type { BlockDefinition, BlockSchema, BlockSpec, CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { capacityOf } from '../../diagram/_kit'
import { objs, str } from '../../media/_kit'
import { slotItems } from '../_slots'
import { composeFlat, measureHeights, pick, type Piece } from '../_kit'

export const TEAM_MIN = 2
export const TEAM_MAX = 8

export interface TeamMember {
  image?: string
  name: string
  role?: string
  bio?: string
}

export interface TeamProps extends Record<string, unknown> {
  people: TeamMember[]
  cols?: 'auto' | '2' | '3' | '4'
  card?: 'plain' | 'card'
  showBio?: boolean
}

export const schema: BlockSchema = {
  people: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          image: { type: { kind: 'image' }, role: 'content', label: 'Portrait' },
          name: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Name', required: true },
          role: { type: { kind: 'text', maxChars: 50 }, role: 'content', label: 'Role' },
          bio: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Bio' },
        },
      },
      min: TEAM_MIN,
      max: TEAM_MAX,
    },
    role: 'content',
    label: 'People',
    required: true,
    guidance: 'Each: name!, role, bio, image (initials when empty).',
  },
  cols: enumSlot(['auto', '2', '3', '4'], 'Columns', 'auto picks from the count.'),
  card: enumSlot(['plain', 'card'], 'Frame', 'card = filled panel per person.'),
  showBio: { type: { kind: 'boolean' }, role: 'option', label: 'Show bios', toggles: 'bio' },
}

export const defaults: TeamProps = {
  people: [
    { name: 'Dr. Tran Thi Lan', role: 'Head of Data Science', bio: 'Leads the applied analytics group.' },
    { name: 'Nguyen Van An', role: 'Senior lecturer', bio: 'Teaches probability and inference.' },
    { name: 'Pham Thu Ha', role: 'Teaching assistant', bio: 'Runs the weekly lab sessions.' },
  ],
  cols: 'auto',
  card: 'card',
}

const COLS = ['auto', '2', '3', '4'] as const
const CARDS = ['plain', 'card'] as const

const membersOf = (props: TeamProps): TeamMember[] =>
  objs(props.people)
    .filter((p) => str(p.name).trim() !== '')
    .slice(0, TEAM_MAX)
    .map((p) => ({ image: str(p.image) || undefined, name: str(p.name), role: str(p.role) || undefined, bio: str(p.bio) || undefined }))

/** Columns for `n` people: as many as fit a calm grid. */
/** Narrowest a person's card gets: a full name and a role line still fit without ellipsis. */
export const MIN_CARD_W = 270

/**
 * Columns for `n` people. With a known `width` the count drops (down to 1) until every card is at
 * least `MIN_CARD_W` wide, so a half-width region gets 2 columns instead of 4 truncated cards.
 */
export function colsFor(n: number, cols: unknown, width?: number, gap = 0): number {
  const c = pick(cols, COLS, 'auto')
  let k = c !== 'auto' ? Math.min(Number(c), Math.max(1, n)) : n <= 3 ? Math.max(1, n) : n === 4 ? 4 : n <= 6 ? 3 : 4
  if (typeof width === 'number' && width > 0) while (k > 1 && (width - gap * (k - 1)) / k < MIN_CARD_W) k--
  return k
}

const avatarSpec = (m: TeamMember, i: number, size: 'md' | 'lg'): BlockSpec => ({
  id: `person-${i}`,
  type: 'tls.m.avatar',
  props: { image: m.image ?? '', name: m.name, role: m.role ?? '', size, layout: 'stacked', align: 'center' },
})

const bioSpec = (m: TeamMember, i: number, small: boolean): BlockSpec | undefined =>
  m.bio ? { id: `bio-${i}`, type: small ? 'tls.t.caption' : 'tls.t.body', props: { text: m.bio } } : undefined

/** Reference tree: grid > card > stack > avatar + bio (4 levels, like swot). */
export function buildTeam(props: TeamProps): BlockSpec {
  const people = membersOf(props)
  const cols = colsFor(people.length, props.cols)
  const showBio = isShown(props, 'showBio')
  const cells: BlockSpec[] = people.map((m, i) => {
    const kids = [avatarSpec(m, i, cols >= 4 ? 'md' : 'lg'), ...(showBio ? [bioSpec(m, i, true)] : [])].filter(Boolean) as BlockSpec[]
    const stack: BlockSpec = { id: `stack-${i}`, type: 'tls.l.stack', props: { gap: 'sm', sizing: 'content', children: kids } }
    return props.card === 'plain' ? stack : { id: `card-${i}`, type: 'tls.l.card', props: { padding: 'md', children: [stack] } }
  })
  return { id: 'team', type: 'tls.l.grid', props: { columns: cols, rows: Math.max(1, Math.ceil(people.length / cols)), gap: 'lg', sizing: 'equal', children: cells } }
}

interface Plan {
  people: TeamMember[]
  cols: number
  rows: number
  cw: number
  gap: number
  pad: number
  inner: number
  size: 'md' | 'lg'
  small: boolean
  showBio: boolean
  avatarH: number[]
  bioH: number[]
  cellH: number
  needed: number
}

function plan(props: TeamProps, ctx: LayoutContext, compact = false, dropBio = false): Plan {
  const people = membersOf(props)
  const n = Math.max(1, people.length)
  const W = Math.max(0, ctx.box.width) || 0
  const gap = ctx.tokens.space.lg
  const cols = colsFor(n, props.cols, W, gap)
  const rows = Math.max(1, Math.ceil(n / cols))
  const pad = props.card === 'plain' ? 0 : ctx.tokens.space.lg
  const cw = Math.max(0, (W - gap * (cols - 1)) / cols)
  const inner = Math.max(0, cw - 2 * pad)
  const size = compact || cols >= 4 || cw < 380 ? 'md' : 'lg'
  const small = cols >= 3
  const showBio = isShown(props, 'showBio') && !dropBio
  const avatarH = measureHeights(ctx, people.map((m, i) => avatarSpec(m, i, size)), inner)
  const bioH = measureHeights(ctx, people.map((m, i) => bioSpec(m, i, small) ?? { id: `b${i}`, type: 'tls.t.caption', props: { text: ' ' } }), inner)
  const sm = ctx.tokens.space.sm
  const content = Math.max(0, ...people.map((m, i) => avatarH[i] + (showBio && m.bio ? sm + bioH[i] : 0)))
  const cellH = content + 2 * pad
  return { people, cols, rows, cw, gap, pad, inner, size, small, showBio, avatarH, bioH, cellH, needed: rows * cellH + gap * (rows - 1) }
}

export function layoutTeam(props: TeamProps, ctx: LayoutContext): LayoutNode {
  const H = Math.max(0, ctx.box.height) || 0
  // big portraits first; when the grid is taller than the box, smaller ones
  let p = plan(props, ctx)
  if (p.size === 'lg' && H > 0 && p.needed > H) p = plan(props, ctx, true)
  // still too tall (half-width region): the bios are the secondary part, drop them before clipping
  if (H > 0 && p.needed > H && p.showBio) p = plan(props, ctx, true, true)
  const total = Math.max(p.needed, Math.min(H, 420))
  const showBio = p.showBio
  const frame = pick(props.card, CARDS, 'card') === 'card'
  const sm = ctx.tokens.space.sm
  const pieces: Piece[] = []
  p.people.forEach((m, i) => {
    const col = i % p.cols
    const row = Math.floor(i / p.cols)
    const x = col * (p.cw + p.gap)
    const y = row * (p.cellH + p.gap)
    if (frame) {
      pieces.push({
        id: `card[${i}]`,
        raw: [{ k: 'rect', box: { x, y, width: p.cw, height: p.cellH }, fill: { type: 'solid', color: ctx.resolveColor('surfaceAlt').color }, radius: ctx.tokens.radius.lg } as LayoutNode],
        box: { x, y, width: p.cw, height: p.cellH },
      })
    }
    const ix = x + p.pad
    pieces.push({ id: `person[${i}]`, spec: avatarSpec(m, i, p.size), box: { x: ix, y: y + p.pad, width: p.inner, height: p.avatarH[i] } })
    const bio = showBio ? bioSpec(m, i, p.small) : undefined
    if (bio) pieces.push({ id: `bio[${i}]`, spec: bio, box: { x: ix, y: y + p.pad + p.avatarH[i] + sm, width: p.inner, height: p.bioH[i] }, align: 'center' })
  })
  return motionSlots(composeFlat(ctx, pieces, total), p.people.length)
}

/**
 * RVM5 — per-member motion slots, so every member reads photo, name, role, bio and the members
 * follow each other in reading order whatever pieces each one has. The leaves of `person[i]`
 * (the avatar: ring, photo or initials disc, letters, name, role) and `bio[i]` are regrouped into
 * `face[i]` (the non-text leaves and the letters drawn on them), `name[i]` (the first other text),
 * `role[i]` (the rest) and `about[i]` (the bio), each emitted for every member (empty when the
 * member has no role or bio). Leaf names, positions and paint order are unchanged.
 */
function motionSlots(root: LayoutNode, n: number): LayoutNode {
  if (root.k !== 'group') return root
  const fam = new Map<LayoutNode, { f: 'face' | 'name' | 'role' | 'about'; i: number }>()
  for (let i = 0; i < n; i++) {
    const mine = root.children.filter((c) => c.part === `person[${i}]` || (c.part ?? '').startsWith(`person[${i}][`))
    const discs = mine.filter((c) => c.k !== 'text')
    const inside = (c: LayoutNode) => {
      const cx = c.box.x + c.box.width / 2
      const cy = c.box.y + c.box.height / 2
      return discs.some((d) => cx >= d.box.x && cx <= d.box.x + d.box.width && cy >= d.box.y && cy <= d.box.y + d.box.height)
    }
    let texts = 0
    for (const c of mine) {
      if (c.k !== 'text' || inside(c)) fam.set(c, { f: 'face', i })
      else fam.set(c, { f: texts++ === 0 ? 'name' : 'role', i })
    }
    for (const c of root.children) if (c.part === `bio[${i}]` || (c.part ?? '').startsWith(`bio[${i}][`)) fam.set(c, { f: 'about', i })
  }
  let children = root.children
  for (const f of ['face', 'name', 'role', 'about'] as const) {
    children = slotItems(children, n, f, (c) => (fam.get(c)?.f === f ? fam.get(c)!.i : -1), root.box)
  }
  return { ...root, children }
}

const composite = defineCompositeBlock<TeamProps>({
  type: 'tls.c.team',
  name: 'Team',
  family: 'composite',
  tier: 'A',
  summary: 'Grid of team members with photo, name, role and optional bio.',
  keywords: ['team', 'people', 'speakers', 'committee', 'staff', 'lecturers', 'research group', 'who we are'],
  category: 'people',
  scope: 'group',
  shortDescription: 'Grid of team members, each with photo, name, role and optional bio',
  related: ['tls.c.profile-card', 'tls.m.avatar-group'],
  schema,
  defaults,
  size: { preferred: [1500, 560], min: [1280, 420] },
  describe: {
    when: 'Team, speakers, committee, research group.',
    avoid: 'One person: tls.c.profile-card. Faces only: tls.m.avatar-group.',
    example: {
      id: 'b_team',
      type: 'tls.c.team',
      props: {
        people: [
          { image: '/demo/portrait-1.svg', name: 'Dr. Tran Thi Lan', role: 'Head of Data Science', bio: 'Leads the analytics group.' },
          { image: '/demo/portrait-2.svg', name: 'Nguyen Van An', role: 'Senior lecturer', bio: 'Teaches inference.' },
          { image: '/demo/portrait-3.svg', name: 'Le Minh Chau', role: 'Postdoc', bio: 'Works on causal models.' },
          { image: '/demo/portrait-4.svg', name: 'Pham Quoc Bao', role: 'PhD student', bio: 'Builds forecasting tools.' },
        ],
      },
    },
  },
  // RVM5: members in reading order, 120 ms apart; each one reads card, photo (in place, no slide),
  // name, role, bio. The slots come from `motionSlots`. Was `root` stagger-grid (one unit).
  motion: {
    parts: ['card[*]', 'face[*]', 'name[*]', 'role[*]', 'about[*]'],
    preset: 'stagger-grid',
    partMotion: {
      'card[*]': { preset: 'sweep-nodes', delay: 0, stagger: 120 },
      'face[*]': { preset: 'sweep-nodes', delay: 80, stagger: 120 },
      'name[*]': { preset: 'fade-up', delay: 200, stagger: 120 },
      'role[*]': { preset: 'fade-up', delay: 290, stagger: 120 },
      'about[*]': { preset: 'fade-up', delay: 380, stagger: 120 },
    },
  },
  build: buildTeam,
})

function capacity(props: TeamProps): CapacityReport {
  const used = Array.isArray(props.people) ? props.people.length : 0
  return capacityOf({ people: { max: TEAM_MAX, used } }, true, [{ kind: 'truncate', slot: 'people' }, { kind: 'paginate' }])
}

export const tlsCTeam: BlockDefinition = {
  ...composite,
  layout: ((props: TeamProps, ctx: LayoutContext): LayoutNode => layoutTeam(props, ctx)) as BlockDefinition['layout'],
  intrinsicSize: ((props: TeamProps, ctx: LayoutContext): Size => ({
    width: Math.max(0, ctx.box.width),
    height: Math.max(1, Math.ceil(plan(props, ctx).needed)),
  })) as BlockDefinition['intrinsicSize'],
  capacity: capacity as BlockDefinition['capacity'],
}
