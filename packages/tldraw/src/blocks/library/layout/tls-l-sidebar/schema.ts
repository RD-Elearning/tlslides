/**
 * Schema and defaults for tls.l.sidebar — sidebar + main content.
 */

import type { BlockSchema, BlockSpec } from '../../../types'

export const schema: BlockSchema = {
  sidebarWidth: {
    type: { kind: 'number', min: 100, max: 800 },
    role: 'option',
    label: 'Sidebar Width',
    help: 'Width of the sidebar panel in slide units.',
  },
  gutter: {
    type: { kind: 'enum', values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] },
    role: 'option',
    label: 'Gutter',
    help: 'Spacing between sidebar and main content.',
  },
  sidebarSide: {
    type: { kind: 'enum', values: ['start', 'end'] },
    role: 'option',
    label: 'Sidebar Side',
    help: 'Place the sidebar on the start (left) or end (right) side.',
  },
  children: {
    type: { kind: 'blocks', allow: ['layout', 'text', 'data', 'composite', 'media'], max: 2 },
    role: 'content',
    label: 'Children',
    help: 'First child is sidebar, second is main content.',
  },
}

export interface SidebarProps extends Record<string, unknown> {
  sidebarWidth: number
  gutter: string
  sidebarSide: string
  children?: BlockSpec[]
}

export const defaults: SidebarProps = {
  sidebarWidth: 320,
  gutter: 'md',
  sidebarSide: 'start',
}
