/**
 * Throwaway probe blocks exercising all 8 LayoutNode kinds.
 * Three blocks, each covering a subset of kinds:
 *   probe.rects         → group, rect
 *   probe.textAndLines  → text, line, path
 *   probe.mediaAndIcons → image, icon, host
 *
 * These are not production blocks — they exist solely to prove the parity
 * harness catches renderer disagreements.
 */

import type {
  BlockDefinition,
  LayoutContext,
  LayoutNode,
  Box,
} from './types'

/** Standard probe box size (half-HD). */
export const PROBE_BOX: Box = { x: 0, y: 0, width: 960, height: 540 }

/* ─────────────────────────────────────────────────────────────────────────────── */
/* probe.rects — exercises group, rect                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const probeRects: BlockDefinition = {
  type: 'probe.rects',
  name: 'Probe: Rects',
  family: 'layout',
  tier: 'A',
  summary: 'Test block exercising group and rect nodes',
  keywords: ['probe', 'test', 'rect'],
  schema: {},
  defaults: {},
  size: { preferred: [960, 540], min: [200, 200] },
  layout: (_props: Record<string, unknown>, ctx: LayoutContext): LayoutNode => ({
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
    part: 'probe-rects',
    children: [
      {
        k: 'rect',
        box: { x: 10, y: 10, width: 200, height: 100 },
        part: 'rect-a',
        fill: { type: 'solid', color: '#3b82f6' },
      },
      {
        k: 'rect',
        box: { x: 220, y: 10, width: 200, height: 100 },
        part: 'rect-b',
        fill: { type: 'solid', color: '#ef4444' },
        stroke: { color: '#000000', width: 2 },
      },
    ],
  }),
  motion: {},
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* probe.textAndLines — exercises text, line, path                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const probeTextAndLines: BlockDefinition = {
  type: 'probe.text-and-lines',
  name: 'Probe: Text & Lines',
  family: 'layout',
  tier: 'A',
  summary: 'Test block exercising text, line, and path nodes',
  keywords: ['probe', 'test', 'text', 'line'],
  schema: {},
  defaults: {},
  size: { preferred: [960, 540], min: [200, 200] },
  layout: (_props: Record<string, unknown>, ctx: LayoutContext): LayoutNode => ({
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
    part: 'probe-text-lines',
    children: [
      {
        k: 'text',
        box: { x: 10, y: 10, width: 400, height: 60 },
        part: 'title',
        lines: [
          { text: 'Hello World', baseline: 28, width: 200 },
          { text: 'Second Line', baseline: 56, width: 180 },
        ],
        style: {
          family: '"Source Sans Pro", sans-serif',
          size: 28,
          lineHeight: 1.45,
          letterSpacing: -0.03,
          color: '#1a1a1a',
        },
      },
      {
        k: 'line',
        box: { x: 10, y: 80, width: 400, height: 2 },
        part: 'divider',
        from: { x: 0, y: 1 },
        to: { x: 400, y: 1 },
        stroke: { color: '#000000', width: 2 },
      },
      {
        k: 'path',
        box: { x: 10, y: 100, width: 100, height: 50 },
        part: 'arrow',
        d: 'M 0 25 L 80 25 L 70 15 M 80 25 L 70 35',
        stroke: { color: '#3b82f6', width: 2 },
      },
    ],
  }),
  motion: {},
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* probe.mediaAndIcons — exercises image, icon, host                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const probeMediaAndIcons: BlockDefinition = {
  type: 'probe.media-and-icons',
  name: 'Probe: Media & Icons',
  family: 'layout',
  tier: 'A',
  summary: 'Test block exercising image, icon, and host nodes',
  keywords: ['probe', 'test', 'image', 'icon'],
  schema: {},
  defaults: {},
  size: { preferred: [960, 540], min: [200, 200] },
  layout: (_props: Record<string, unknown>, ctx: LayoutContext): LayoutNode => ({
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
    part: 'probe-media',
    children: [
      {
        k: 'image',
        box: { x: 10, y: 10, width: 200, height: 150 },
        part: 'photo',
        assetId: 'test-asset-1',
        alt: 'Test photo',
        fit: 'cover',
        url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      },
      {
        k: 'icon',
        box: { x: 220, y: 10, width: 48, height: 48 },
        part: 'star',
        icon:
          'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
        fill: '#f59e0b',
      },
      {
        k: 'host',
        box: { x: 10, y: 180, width: 300, height: 200 },
        part: 'widget',
        render: 'chart-widget',
      },
    ],
  }),
  motion: {},
}
