/**
 * tls.m.asset — spro sprint 2026-11c S20-C (carry-over pass 2): one picture of the deck's asset library
 * (`lib:<pack>/<name>`, `DeckSpec.assets`) placed as a block of its own — a large spot picture beside a hook, a
 * divider or a closing, drawn in the deck's colours (a mono picture in `color`, a slot picture in the theme's slots)
 * and scaled to fill its box. The picture is the resolver's (`icons/resolve.ts`), so the editor, the sidecar and the
 * exports draw the same SVG; a ref the deck's table does not hold draws nothing.
 */

import type { BlockDefinition, BlockSchema, LayoutContext, LayoutNode, LintFinding } from '../../../types'
import { iconLeaf } from '../../text/_engine/icon'
import { isLibRef } from '../../../icons/resolve'

export interface AssetProps extends Record<string, unknown> {
  asset: string
  color?: 'accent' | 'accent2' | 'text'
  align?: 'start' | 'center' | 'end'
  alt?: string
}

export const schema: BlockSchema = {
  asset: { type: { kind: 'icon' }, role: 'content', label: 'Picture', required: true, guidance: 'A library picture id (lib:<pack>/<name>) from the slide\'s picture candidates.' },
  color: { type: { kind: 'enum', values: ['accent', 'accent2', 'text'] }, role: 'option', label: 'Color', help: 'Colour of a one-colour picture (default accent).' },
  align: { type: { kind: 'enum', values: ['start', 'center', 'end'] }, role: 'option', label: 'Align', help: 'Where the square picture sits in a wider or taller box.' },
  alt: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Description', guidance: 'What the picture shows, for screen readers.' },
}

export const defaults: AssetProps = { asset: 'lib:tabler/coffee', color: 'accent', align: 'center' }

export function layout(props: AssetProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const side = Math.min(W, H)
  const free = (n: number) => (props.align === 'start' ? 0 : props.align === 'end' ? n - side : (n - side) / 2)
  const name = typeof props.asset === 'string' ? props.asset.trim() : ''
  // only a library picture: a built-in name belongs to tls.m.icon (a lint says so), nothing is drawn for it here
  if (!isLibRef(name)) return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children: [] }
  const color = ctx.resolveColor(props.color === 'accent2' || props.color === 'text' ? props.color : 'accent').color
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children: [iconLeaf(name, { x: free(W), y: free(H), width: side, height: side }, color, 'picture')] }
}

export function lint(props: AssetProps): LintFinding[] {
  const name = typeof props.asset === 'string' ? props.asset.trim() : ''
  if (!name || isLibRef(name)) return []
  return [{ level: 'warning', rule: 'asset/not-library', message: `tls.m.asset draws library pictures (lib:…); "${name}" is a built-in icon — use tls.m.icon.` }]
}

export const tlsMAsset: BlockDefinition = {
  type: 'tls.m.asset',
  name: 'Library picture',
  family: 'media',
  tier: 'A',
  summary: 'One picture from the deck\'s asset library, large, in the deck colours.',
  keywords: ['picture', 'asset', 'library', 'spot illustration', 'pictogram', 'graphic'],
  category: 'media',
  scope: 'element',
  shortDescription: 'A library picture (lib:) as a large spot graphic in the deck colours',
  related: ['tls.m.icon', 'tls.m.illustration', 'tls.m.image'],
  describe: {
    when: 'A slide that needs one large picture of its subject and no photo: beside a hook, a divider or a closing. Only with a lib: id the slide offers.',
    avoid: 'A small glyph next to text (use tls.m.icon); a real photograph (use tls.m.image); a built-in icon name (use tls.m.icon).',
    example: { id: 'b_asset', type: 'tls.m.asset', props: { asset: 'lib:tabler/coffee', color: 'accent' } },
  },
  schema,
  defaults,
  size: { preferred: [360, 360], min: [64, 64] },
  layout: layout as BlockDefinition['layout'],
  motion: { parts: ['picture'], preset: 'fade-up' },
  lint: lint as BlockDefinition['lint'],
}
