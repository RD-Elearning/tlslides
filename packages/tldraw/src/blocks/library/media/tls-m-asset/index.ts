/**
 * tls.m.asset — spro sprint 2026-11c S20-C (carry-over pass 2): one picture placed as a block of its own — a large
 * spot picture beside a hook, a divider or a closing, drawn in the deck's colours and scaled to fill its box. Its
 * `icon` slot is an ordinary icon slot, so the service fills it like every other (`auto: <object>` → a library picture
 * `lib:<pack>/<name>` by meaning, or the engine's own icon when the deck has no library); the picture is the
 * resolver's (`icons/resolve.ts`), so the editor, the sidecar and the exports draw the same SVG. A `lib:` ref the
 * deck's table does not hold, or no icon, draws nothing (the service drops such a block, as a bare tls.m.icon).
 */

import type { BlockDefinition, BlockSchema, LayoutContext, LayoutNode } from '../../../types'
import { iconLeaf } from '../../text/_engine/icon'

export interface AssetProps extends Record<string, unknown> {
  icon: string
  color?: 'accent' | 'accent2' | 'text'
  align?: 'start' | 'center' | 'end'
  alt?: string
}

export const schema: BlockSchema = {
  icon: { type: { kind: 'icon' }, role: 'content', label: 'Picture', required: true, guidance: 'auto: <the English object to show> — code picks the picture by meaning.' },
  color: { type: { kind: 'enum', values: ['accent', 'accent2', 'text'] }, role: 'option', label: 'Color', help: 'Colour of a one-colour picture (default accent).' },
  align: { type: { kind: 'enum', values: ['start', 'center', 'end'] }, role: 'option', label: 'Align', help: 'Where the square picture sits in a wider or taller box.' },
  alt: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Description', guidance: 'What the picture shows, for screen readers.' },
}

export const defaults: AssetProps = { icon: 'coffee', color: 'accent', align: 'center' }

export function layout(props: AssetProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const side = Math.min(W, H)
  const free = (n: number) => (props.align === 'start' ? 0 : props.align === 'end' ? n - side : (n - side) / 2)
  const name = typeof props.icon === 'string' ? props.icon.trim() : ''
  // no icon (none fits the meaning) draws nothing — never the warning glyph
  if (!name) return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children: [] }
  const color = ctx.resolveColor(props.color === 'accent2' || props.color === 'text' ? props.color : 'accent').color
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children: [iconLeaf(name, { x: free(W), y: free(H), width: side, height: side }, color, 'picture')] }
}

export const tlsMAsset: BlockDefinition = {
  type: 'tls.m.asset',
  name: 'Library picture',
  family: 'media',
  tier: 'A',
  summary: 'One picture of the slide\'s subject, large, in the deck colours (a library picture when the deck has one).',
  keywords: ['picture', 'asset', 'library', 'spot illustration', 'pictogram', 'graphic'],
  category: 'media',
  scope: 'element',
  shortDescription: 'One large picture of the subject in the deck colours',
  related: ['tls.m.icon', 'tls.m.illustration', 'tls.m.image'],
  describe: {
    when: 'A slide that needs one large picture of its subject and no photo: beside a hook, a divider or a closing.',
    avoid: 'A small glyph next to text (use tls.m.icon); a real photograph (use tls.m.image); several pictures (use tls.m.icon-list or cards).',
    example: { id: 'b_asset', type: 'tls.m.asset', props: { icon: 'coffee', color: 'accent' } },
  },
  schema,
  defaults,
  size: { preferred: [360, 360], min: [64, 64] },
  layout: layout as BlockDefinition['layout'],
  motion: { parts: ['picture'], preset: 'fade-up' },
}
