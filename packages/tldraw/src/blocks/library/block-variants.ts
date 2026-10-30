/**
 * spro creative CR2 — variant presets (PLAN §6.2): 2–6 named looks per block, each over the
 * block's own `looks` knobs with values from their enums. The director names a preset (`variant`
 * in its brief) instead of guessing knob values; the compose kit lists them with the block.
 *
 * Rules (enforced by `catalog-conformance.spec.ts`): every block with `looks` (containers and
 * chrome aside) has 2–6 presets; a preset sets only `looks` knobs, with valid values; ids are
 * unique per block; no two presets of a block set the same knobs.
 */

import type { VariantPreset } from '../types'

const v = (id: string, when: string, knobs: VariantPreset['knobs']): VariantPreset => ({ id, when, knobs })

export const BLOCK_VARIANTS: Record<string, VariantPreset[]> = {
  // ── heading / text ──
  'tls.t.kicker': [
    v('eyebrow', 'a small spaced label above a title', { case: 'uppercase', tracking: 'wide' }),
    v('marked', 'a label led by an accent mark', { case: 'uppercase', marker: true }),
    v('quiet', 'a plain lower-key label', { case: 'none', tracking: 'normal' }),
  ],
  'tls.t.subtitle': [v('left', 'under a left-aligned title', { align: 'start' }), v('centred', 'under a centred title', { align: 'center' })],
  'tls.t.title': [
    v('display', 'a poster headline', { size: 'display', align: 'start' }),
    v('ruled', 'a heading with an accent rule', { size: 'title', rule: true }),
    v('centred', 'a centred heading', { size: 'title', align: 'center' }),
  ],
  'tls.t.body': [v('left', 'running text', { align: 'start' }), v('centred', 'a short centred paragraph', { align: 'center' })],
  'tls.t.caption': [v('below', 'under its figure', { position: 'below' }), v('overlay', 'on the figure', { position: 'overlay' })],
  'tls.t.code': [v('numbered', 'code discussed line by line', { lineNumbers: true }), v('plain', 'a short snippet', { lineNumbers: false })],
  'tls.t.definition': [
    v('stacked', 'the term above its meaning', { layout: 'stacked', termTone: 'accent' }),
    v('inline', 'the term and its meaning on one line', { layout: 'inline', termTone: 'text' }),
    v('with-example', 'a term with an example under it', { layout: 'stacked', showExample: true }),
  ],
  'tls.t.footnote': [v('source', 'a source line', { marker: 'source' }), v('numbered', 'a numbered note', { marker: 'number' })],
  'tls.t.formula': [
    v('display', 'the slide is the formula', { size: 'display', align: 'center' }),
    v('inline', 'a formula among other blocks', { size: 'heading', align: 'start' }),
  ],

  // ── list ──
  'tls.c.bento': [
    v('hero-left', 'one big tile and two beside it', { pattern: '1+2' }),
    v('hero-right', 'two tiles and a big one', { pattern: '2+1' }),
    v('hero-top', 'a hero tile over three', { pattern: 'hero+3' }),
    v('mosaic', 'five tiles, three over two', { pattern: '3+2' }),
  ],
  'tls.c.cards': [
    v('icon', 'pillars led by an icon', { lead: 'icon', tone: 'surface', align: 'start' }),
    v('numbered', 'ordered points led by a number', { lead: 'number', numeral: 'plain' }),
    v('giant-numerals', 'big display numbers over each card', { lead: 'number', numeral: 'giant' }),
    v('outline', 'light outlined cards, centred', { tone: 'outline', align: 'center' }),
    v('lead-first', 'the first card is the answer', { tone: 'accent-first' }),
    v('text-only', 'cards without a lead', { lead: 'none', tone: 'alt' }),
  ],
  'tls.c.feature-grid': [
    v('plain', 'open cells, icon at the start', { cell: 'plain', align: 'start' }),
    v('cards', 'each feature on a card', { cell: 'card', iconStyle: 'circle' }),
    v('centred', 'centred cells with discs', { align: 'center', iconStyle: 'circle' }),
  ],
  'tls.m.icon-list': [
    v('plain', 'icons inline with the text', { iconStyle: 'plain' }),
    v('discs', 'icons in discs', { iconStyle: 'circle', spacing: 'roomy' }),
    v('tiles', 'icons on square tiles', { iconStyle: 'square', iconTone: 'accent2' }),
  ],
  'tls.t.bullets': [
    v('dots', 'plain points', { marker: 'dot' }),
    v('chevrons', 'points that lead somewhere', { marker: 'chevron', spacing: 'md' }),
    v('dashes', 'a quiet list', { marker: 'dash', spacing: 'lg' }),
  ],
  'tls.t.checklist': [
    v('ticks', 'items done or to do', { doneStyle: 'check' }),
    v('struck', 'items crossed off', { doneStyle: 'strike' }),
    v('two-column', 'a long checklist', { columns: '2', spacing: 'compact' }),
  ],
  'tls.t.kv-list': [
    v('leaders', 'a menu-like list with dotted leaders', { leader: 'dots' }),
    v('ruled', 'pairs separated by rules', { leader: 'rule', keyTone: 'text' }),
    v('two-column', 'many short pairs', { columns: '2', leader: 'none' }),
  ],
  'tls.t.numbered': [
    v('badges', 'steps in numbered badges', { markerStyle: 'badge' }),
    v('padded', '01, 02, 03 in accent', { markerStyle: 'padded', markerTone: 'accent' }),
    v('roman', 'a formal list', { markerStyle: 'roman', markerTone: 'muted' }),
    v('two-column', 'a long ordered list', { columns: '2', spacing: 'compact' }),
  ],
  'tls.t.tags': [
    v('soft', 'soft pills in one colour', { tone: 'soft', colorBy: 'single' }),
    v('colourful', 'pills in the series colours', { tone: 'solid', colorBy: 'cycle' }),
    v('outline', 'outlined labels', { tone: 'outline', shape: 'rect' }),
    v('large', 'a few big keywords', { size: 'lg', align: 'center' }),
  ],

  // ── emphasis ──
  'tls.c.quote-image': [v('corner', 'the quote low on the left', { anchor: 'bottom-left' }), v('centred', 'the quote centred on a dark scrim', { anchor: 'center', scrim: 'strong' })],
  'tls.t.badge': [v('solid', 'a strong status', { tone: 'solid' }), v('soft', 'a quiet tag', { tone: 'soft' }), v('outline', 'a light label', { tone: 'outline' })],
  'tls.t.callout': [
    v('tip', 'a tip on a tint', { variant: 'tip', fill: 'tint' }),
    v('warning', 'a pitfall to avoid', { variant: 'warning', fill: 'tint' }),
    v('info-outline', 'a side note, outlined', { variant: 'info', fill: 'outline' }),
    v('success-solid', 'a strong positive note', { variant: 'success', fill: 'solid' }),
  ],
  'tls.t.marker': [v('disc', 'a step number on a disc', { variant: 'circle', tone: 'solid' }), v('numeral', 'an oversized 01', { variant: 'numeral' }), v('outline', 'a light outlined number', { variant: 'circle', tone: 'outline' })],
  'tls.t.quote': [
    v('poster', 'the slide is the quote', { variant: 'big', markStyle: 'glyph' }),
    v('margin', 'a quote with a side rule', { variant: 'side', markStyle: 'rule' }),
    v('card', 'a quote on a card', { variant: 'card' }),
    v('classic', 'the mark beside the text', { variant: 'classic', markStyle: 'glyph' }),
  ],
  'tls.t.statement': [
    v('poster', 'one huge sentence', { size: 'display', align: 'start', emphasis: 'accent' }),
    v('centred', 'a centred statement with a mark', { size: 'xl', align: 'center', showMark: true }),
    v('highlighted', 'key words highlighted', { size: 'lg', emphasis: 'highlight' }),
    v('underlined', 'key words underlined', { size: 'lg', emphasis: 'underline' }),
  ],
  'tls.t.takeaway': [
    v('accent', 'the insight on an accent bar', { tone: 'accent', size: 'body' }),
    v('lead', 'under a chart or a KPI row', { tone: 'accent', size: 'lead' }),
    v('column', 'big and centred in a tall column', { size: 'column' }),
    v('warning', 'a caution to remember', { tone: 'warning' }),
  ],

  // ── metric ──
  'tls.c.big-stat': [v('plain', 'the number alone', { variant: 'plain', align: 'start' }), v('accent', 'the number on accent', { variant: 'accent' }), v('split', 'the number beside its context', { variant: 'split' })],
  'tls.c.dashboard': [v('top', 'KPIs over the chart', { layout: 'kpis-top', chartRatio: '2:1' }), v('left', 'KPIs beside the chart', { layout: 'kpis-left', chartRatio: '1:1' })],
  'tls.c.kpi-row': [v('plain', 'open tiles', { tile: 'plain' }), v('cards', 'tiles on cards', { tile: 'card', gap: 'md' }), v('bars', 'tiles with an accent bar', { tile: 'accent-bar' })],
  'tls.c.kpi-tile': [v('full', 'value, change and trend', { showDelta: true, showSparkline: true }), v('value', 'the value and its label', { showDelta: false, showSparkline: false })],
  'tls.c.stat-card': [v('icon', 'a value led by an icon', { showIcon: true, emphasis: 'default' }), v('accent', 'the value in accent', { emphasis: 'accent', showIcon: false })],
  'tls.c.stat-spotlight': [v('ring', 'the number in a ring', { visual: 'ring', statsPlacement: 'below' }), v('side', 'the ring with figures beside it', { visual: 'ring', statsPlacement: 'side' }), v('plain', 'the number alone, figures under it', { visual: 'plain' })],
  'tls.d.bullet-chart': [v('bands', 'bars over range bands', { bands: 'three' }), v('plain', 'bars and targets only', { bands: 'none' })],
  'tls.d.gauge': [v('needle', 'a dial with a needle', { needle: 'needle', showTicks: true }), v('marker', 'a clean dial with a marker', { needle: 'marker', showTicks: false })],
  'tls.d.icon-array': [v('fraction', '7 of 10 in words', { figure: 'fraction', tone: 'accent' }), v('percent', 'the share as a percent', { figure: 'percent', tone: 'accent2' }), v('alarm', 'a share that is bad news', { figure: 'fraction', tone: 'negative' })],
  'tls.d.progress-bar': [v('percent', 'bars with their percent', { showValue: 'percent', thickness: 'md' }), v('status', 'bars coloured by status', { tone: 'status', labelPos: 'left' }), v('thick', 'few bold bars', { thickness: 'lg', track: true })],
  'tls.d.progress-ring': [v('round', 'a round-capped ring', { cap: 'round', thickness: 'md' }), v('bold', 'a thick ring', { thickness: 'lg', cap: 'flat' }), v('status', 'a ring coloured by status', { tone: 'status' })],
  'tls.d.stat-compare': [v('arrow', 'then → now', { connector: 'arrow', delta: 'percent' }), v('versus', 'two numbers set against each other', { connector: 'vs', delta: 'none' })],
  'tls.d.trend-badge': [v('up-good', 'a rise that is good', { polarity: 'upGood' }), v('down-good', 'a fall that is good', { polarity: 'downGood' })],
  'tls.t.hero-number': [v('accent', 'the number in accent', { emphasis: 'accent' }), v('plain', 'the number in text colour', { emphasis: 'default' }), v('muted', 'a quiet number', { emphasis: 'muted' })],

  // ── chart ──
  'tls.c.chart-insight': [v('right', 'the insight beside the chart', { side: 'right', ratio: '2:1' }), v('left', 'the insight first', { side: 'left', ratio: '3:2' }), v('below', 'the insight under a wide chart', { side: 'below', insightSize: 'lead' })],
  'tls.d.area': [v('overlap', 'series over each other', { mode: 'overlap', curve: 'monotone' }), v('stacked', 'series adding up', { mode: 'stacked' }), v('percent', 'shares over time', { mode: 'percent', legend: 'right' })],
  'tls.d.bar': [v('columns', 'vertical columns with values', { orientation: 'vertical', valueLabels: 'end' }), v('bars', 'horizontal bars for long labels', { orientation: 'horizontal', valueLabels: 'end' }), v('clean', 'columns without labels', { orientation: 'vertical', valueLabels: 'none' })],
  'tls.d.bubble': [v('grid', 'bubbles on a grid', { gridlines: 'major', sizeLegend: true }), v('clean', 'bubbles alone', { gridlines: 'none' })],
  'tls.d.donut': [v('legend', 'a legend beside the ring', { labels: 'legend', showPercent: true }), v('outside', 'labels around the ring', { labels: 'outside' })],
  'tls.d.funnel-chart': [v('funnel', 'a tapering funnel', { shape: 'funnel', showDropoff: 'percent' }), v('bars', 'stages as bars', { shape: 'bars' })],
  'tls.d.grouped-bar': [v('columns', 'columns by group', { orientation: 'vertical', legend: 'top' }), v('bars', 'horizontal groups', { orientation: 'horizontal', valueLabels: 'end' })],
  'tls.d.heatmap': [v('accent', 'one-colour ramp with values', { ramp: 'accent', showValues: true }), v('diverging', 'above and below a middle', { ramp: 'diverging' })],
  'tls.d.lollipop': [v('sorted', 'largest first, values at the end', { sorted: true, labels: 'end' }), v('plain', 'author order, no values', { sorted: false, labels: 'none' })],
  'tls.d.dot-plot': [v('sorted', 'largest first, values at the end', { sorted: true, labels: 'end' }), v('plain', 'author order, no values', { sorted: false, labels: 'none' })],
  'tls.d.treemap': [v('share', 'percent of the whole in each cell', { values: 'share' }), v('raw', 'the values themselves', { values: 'raw' })],
  'tls.d.annotated-line': [v('below', 'a row of notes under the chart', { variant: 'notes-below' }), v('beside', 'the notes in a column beside it', { variant: 'notes-inline' })],
  'tls.d.line': [v('labelled', 'lines named at their ends', { endLabels: true, markers: 'last', legend: 'none' }), v('smooth', 'smooth lines with a legend', { curve: 'monotone', legend: 'top' }), v('points', 'every point marked', { markers: 'all' })],
  'tls.d.pie': [v('outside', 'labels outside', { labels: 'outside', showPercent: true }), v('legend', 'a legend beside', { labels: 'legend' })],
  'tls.d.radar': [v('filled', 'filled shapes', { fill: true }), v('lines', 'outlines only', { fill: false, legend: 'bottom' })],
  'tls.d.scatter': [v('quadrants', 'points in four quadrants', { quadrants: true, labelPoints: 'highlighted' }), v('trend', 'points with a trend line', { trendline: true })],
  'tls.d.slope': [v('risers', 'who rose', { highlight: 'risers' }), v('fallers', 'who fell', { highlight: 'fallers' })],
  'tls.d.sparkline': [v('value', 'a trend with its last value', { showLast: 'value', endDot: true }), v('filled', 'a filled trend', { fill: true })],
  'tls.d.stacked-bar': [v('totals', 'stacks with totals', { totals: true, legend: 'top' }), v('percent', 'shares per category', { normalize: true, valueLabels: 'inside' }), v('horizontal', 'horizontal stacks', { orientation: 'horizontal' })],
  'tls.d.waterfall': [v('signed', 'rises and falls coloured', { colorBy: 'sign', connectors: true }), v('single', 'one colour, values on top', { colorBy: 'single', valueLabels: 'end' })],

  // ── table ──
  'tls.d.ranking': [v('medals', 'a podium with bars', { medals: true, showBars: true }), v('plain', 'a ranked list', { medals: false, showBars: false })],
  'tls.d.scorecard': [v('dots', 'status dots', { statusStyle: 'dot', showTarget: true }), v('pills', 'status pills with notes', { statusStyle: 'pill', showNote: true }), v('bars', 'status bars', { statusStyle: 'bar' })],
  'tls.d.table': [v('zebra', 'banded rows, filled header', { zebra: true, header: 'filled' }), v('ruled', 'horizontal rules only', { rules: 'horizontal', header: 'bold' }), v('compact', 'many rows', { density: 'compact', rules: 'head' })],

  // ── comparison ──
  'tls.c.case-study': [v('columns', 'challenge, solution, result side by side', { layout: 'columns', emphasis: 'result' }), v('rows', 'the story top to bottom', { layout: 'rows' })],
  'tls.c.comparison': [v('columns', 'plain columns', { style: 'plain' }), v('cards', 'each option on a card', { style: 'cards' }), v('versus', 'two sides set against each other', { style: 'versus' }), v('poster', 'two sides, a big number each', { style: 'poster' })],
  'tls.c.problem-solution': [v('panels', 'two panels and an arrow', { style: 'panels', showIcons: true }), v('callouts', 'two callouts', { style: 'callouts' })],
  'tls.d.compare-table': [v('ticks', 'ticks and crosses', { cellKind: 'check', zebra: true }), v('ratings', 'ratings per criterion', { cellKind: 'rating' }), v('text', 'short words per cell', { cellKind: 'text', density: 'compact' })],
  'tls.d.pricing': [v('raised', 'the featured plan raised', { featuredStyle: 'raised' }), v('filled', 'the featured plan filled', { featuredStyle: 'filled', align: 'stretch' })],
  'tls.g.before-after': [v('arrow', 'before → after', { arrow: 'arrow', emphasis: 'after' }), v('chevron', 'a step from one to the other', { arrow: 'chevron' }), v('side-by-side', 'two states, no arrow', { arrow: 'none', emphasis: 'none' })],
  'tls.g.iceberg': [v('third', 'little shows above', { waterline: 'third' }), v('half', 'as much hidden as shown', { waterline: 'half' })],
  'tls.g.matrix-2x2': [v('tinted', 'tinted quadrants', { style: 'tinted' }), v('lines', 'quadrants drawn by lines', { style: 'lines' }), v('highlight', 'the top-right quadrant stands out', { highlight: 'TR' })],
  'tls.g.pros-cons': [v('columns', 'two columns', { style: 'columns' }), v('cards', 'two cards with a verdict', { style: 'cards', showVerdict: true })],
  'tls.g.swot': [v('tinted', 'tinted cells', { style: 'tinted', letters: true }), v('outline', 'outlined cells', { style: 'outline' })],

  // ── process ──
  'tls.c.steps': [v('row', 'steps left to right', { orientation: 'horizontal' }), v('column', 'steps top to bottom', { orientation: 'vertical' })],
  'tls.g.chevrons': [v('gradient', 'a gradient of phases', { fill: 'gradient', textPlacement: 'inside' }), v('series', 'one colour per phase', { fill: 'series' }), v('labels-below', 'short arrows, text under them', { textPlacement: 'below', fill: 'single' })],
  'tls.g.cycle': [
    v('ring', 'circle nodes on the arc', { nodeStyle: 'circle', arrowStyle: 'arc' }),
    v('cards', 'card nodes with text', { nodeStyle: 'card', showText: true }),
    v('minimal', 'labels only, no centre', { showCenter: false, showText: false }),
  ],
  'tls.g.flow': [v('across', 'left to right with elbows', { direction: 'LR', routing: 'elbow' }), v('down', 'top to bottom, straight', { direction: 'TB', routing: 'straight' })],
  'tls.g.funnel': [v('vertical', 'a funnel with notes beside', { orientation: 'vertical', notes: 'side' }), v('horizontal', 'stages narrowing to the right', { orientation: 'horizontal', notes: 'inside' })],
  'tls.g.staircase': [v('numbered', 'numbered steps in a gradient', { numbering: 'number', fill: 'gradient' }), v('series', 'one colour per step', { fill: 'series', numbering: 'none' })],
  'tls.g.steps': [v('line', 'a strip joined by lines', { direction: 'horizontal', connector: 'line' }), v('arrows', 'a strip joined by arrows', { connector: 'arrow' }), v('vertical', 'a column of steps', { direction: 'vertical' })],

  // ── timeline ──
  'tls.g.milestones': [v('alternate', 'labels above and below', { labels: 'alternate', axis: 'horizontal' }), v('below', 'labels under the line', { labels: 'below' }), v('vertical', 'milestones down the page', { axis: 'vertical' })],
  'tls.g.roadmap': [v('status', 'bars coloured by status', { statusColors: true, laneLabels: 'left' }), v('plain', 'plain lanes', { statusColors: false })],
  'tls.g.timeline': [
    v('dots', 'a line of dated dots', { nodeStyle: 'dot', axis: 'horizontal' }),
    v('icons', 'events with icons', { nodeStyle: 'icon', alternate: true }),
    v('numbered', 'numbered events', { nodeStyle: 'number' }),
    v('vertical', 'events down the page', { axis: 'vertical' }),
  ],

  // ── hierarchy ──
  'tls.g.breakdown': [v('across', 'parts to the right of the whole', { direction: 'LR', showShare: true }), v('down', 'parts under the whole', { direction: 'TB' })],
  'tls.g.graph': [v('tree', 'a binary tree', { kind: 'binary-tree' }), v('list', 'a linked list', { kind: 'list', showNull: true })],
  'tls.g.layers': [v('flat', 'flat layers, notes beside', { style: 'flat', notes: 'side' }), v('perspective', 'layers in perspective', { style: 'perspective', notes: 'inside' })],
  'tls.g.mindmap': [v('both', 'branches on both sides', { balance: 'both', curve: true }), v('right', 'branches to the right', { balance: 'right' })],
  'tls.g.pyramid': [v('up', 'base to tip in a gradient', { direction: 'up', fill: 'gradient' }), v('down', 'an inverted pyramid', { direction: 'down' }), v('series', 'one colour per level, notes inside', { fill: 'series', notes: 'inside' })],
  'tls.g.target': [v('gradient', 'rings in a gradient', { fill: 'gradient', labels: 'side' }), v('series', 'one colour per ring', { fill: 'series' })],
  'tls.g.tree': [
    v('cards', 'an org chart of cards', { direction: 'TB', nodeStyle: 'card' }),
    v('pills', 'a light tree of pills', { nodeStyle: 'pill' }),
    v('sideways', 'a tree left to right', { direction: 'LR', nodeStyle: 'card' }),
    v('circles', 'round nodes', { nodeStyle: 'circle', compact: true }),
  ],

  // ── relationship ──
  'tls.g.bracket': [v('brace', 'a curly brace on the right', { style: 'brace', side: 'right' }), v('bracket', 'a square bracket on top', { style: 'bracket', side: 'top' })],
  'tls.g.hub-spoke': [v('circle', 'satellites all around', { layout: 'circle', connector: 'line' }), v('half', 'satellites on one side, arrows out', { layout: 'half', connector: 'arrow-out' })],
  'tls.g.orbit': [v('spokes', 'lines to each satellite', { spokes: 'line' }), v('free', 'satellites on the orbit only', { spokes: 'none' })],
  'tls.g.venn': [v('inside', 'labels in the circles', { labels: 'inside', opacity: 'soft' }), v('outside', 'labels around the circles', { labels: 'outside', opacity: 'medium' })],
  'tls.m.shape': [v('solid', 'a solid disc', { shape: 'circle', tone: 'solid' }), v('soft', 'a soft rounded box', { shape: 'rounded', tone: 'soft' }), v('hexagon', 'an outlined hexagon', { shape: 'hexagon', tone: 'outline' })],

  // ── media ──
  'tls.c.image-full': [v('corner', 'the headline in a corner panel', { panel: 'bottom-left', scrim: 'medium' }), v('band', 'the headline on a band', { panel: 'band' }), v('split', 'the photo and a panel beside it', { panel: 'split' }), v('framed', 'the photo inside a frame', { panel: 'left', frame: true })],
  'tls.c.image-text': [v('left', 'the image first', { placement: 'left' }), v('right', 'the text first', { placement: 'right' }), v('top', 'the image over the text', { placement: 'top' })],
  'tls.m.device-mock': [v('browser', 'a web page', { device: 'browser' }), v('phone', 'an app screen', { device: 'phone', shadow: true }), v('laptop', 'a desktop app', { device: 'laptop', tone: 'dark' })],
  'tls.m.icon': [v('plain', 'a bare icon', { iconStyle: 'plain' }), v('disc', 'an icon on a disc', { iconStyle: 'disc', size: 'lg' })],
  'tls.m.icon-label': [v('small', 'a small icon and label', { size: 'sm' }), v('large', 'a large icon and label', { size: 'lg' })],
  'tls.m.image': [v('cover', 'the picture fills its box', { fit: 'cover' }), v('contain', 'the whole figure, never cropped', { fit: 'contain' })],
  'tls.m.image-compare': [v('side', 'two images side by side', { mode: 'side' }), v('split', 'one frame split down the middle', { mode: 'split', divider: true })],
  'tls.m.image-grid': [v('even', 'equal cells', { pattern: 'even', captions: 'below' }), v('feature', 'one image leads', { pattern: 'feature-left' }), v('mosaic', 'a loose mosaic', { pattern: 'mosaic', captions: 'overlay' })],

  // ── people ──
  'tls.c.profile-card': [v('stacked', 'portrait over the text', { layout: 'stacked' }), v('side', 'portrait beside the text', { layout: 'side', showBio: true })],
  'tls.c.team': [v('cards', 'each person on a card', { card: 'card' }), v('plain', 'an open row of people', { card: 'plain', showBio: false }), v('with-bios', 'people with a line each', { showBio: true, cols: '3' })],
  'tls.c.testimonial': [v('centred', 'the quote centred', { variant: 'centered' }), v('photo', 'the quote beside a photo', { variant: 'photo' })],
  'tls.m.avatar': [v('stacked', 'portrait over the name', { layout: 'stacked', shape: 'circle' }), v('inline', 'portrait beside the name', { layout: 'inline', ring: true })],
  'tls.m.avatar-group': [v('overlap', 'overlapping portraits', { overlap: 'md' }), v('spaced', 'portraits apart', { overlap: 'none' })],

  // ── brand ──
  'tls.m.logo': [v('plain', 'the logo alone', { plate: 'none' }), v('plate', 'the logo on a plate', { plate: 'surface' })],
  'tls.m.logo-wall': [v('plain', 'logos in a grid', { plates: false }), v('plates', 'logos on plates', { plates: true }), v('ruled', 'logos between rules', { dividers: true })],

  // ── frames ──
  'tls.c.cover': [v('centred', 'a centred title page', { variant: 'centered', decoration: 'none' }), v('blob', 'a title with a soft blob', { variant: 'centered', decoration: 'blob' }), v('split', 'the title beside a picture', { variant: 'split' }), v('bleed', 'the title over a full photo', { variant: 'bleed' })],
  'tls.c.hero': [v('classic', 'a plain opening', { variant: 'classic' }), v('split', 'the opening beside a visual', { variant: 'split' }), v('sweep', 'a gradient sweep', { variant: 'gradient-sweep', align: 'center' })],
  'tls.c.kinetic-title': [v('orbs', 'words rise over drifting orbs', { decoration: 'orbs' }), v('accent', 'accent words, no orbs', { decoration: 'none', tone: 'accent' })],
  'tls.c.divider': [v('numeral', 'a big section number', { variant: 'numeral' }), v('field', 'a colour field', { variant: 'field', align: 'center' }), v('minimal', 'a quiet break', { variant: 'minimal' })],
  'tls.c.agenda': [v('list', 'a numbered list', { variant: 'list', numbering: 'plain' }), v('cards', 'agenda items as cards', { variant: 'cards', numbering: 'badge' })],
  'tls.c.objectives': [v('numbered', 'numbered objectives', { marker: 'numbered' }), v('checks', 'objectives to tick off', { marker: 'check', cols: '2' }), v('icons', 'objectives with icons', { marker: 'icon' })],
  'tls.c.closing': [v('centred', 'a centred close', { variant: 'centered' }), v('big-type', 'one big line', { variant: 'big-type', ctaStyle: 'link' }), v('split', 'the close beside the contact', { variant: 'split' })],
  'tls.c.contact': [v('person', 'a person and their details', { showPerson: true }), v('details', 'details only', { showPerson: false })],
  'tls.c.recap': [v('numbered', 'numbered points', { style: 'numbered' }), v('cards', 'points on cards', { style: 'cards' })],

  // ── learning ──
  'tls.c.quiz': [v('list', 'options in a list, answer shown', { layout: 'list', reveal: 'shown' }), v('grid', 'options in a grid, answer hidden', { layout: 'grid', reveal: 'none' })],
  'tls.t.qa': [v('badges', 'Q and A badges', { marker: 'qa' }), v('numbered', 'numbered questions', { marker: 'numbered' })],

  // ── spro creative CR8: wave 1 ──
  'tls.c.one-question': [v('centred', 'one question in the middle', { variant: 'centered' }), v('motif', 'the question beside a motif', { variant: 'with-motif', motif: 'bulb' }), v('margin', 'low-left beside a giant question mark', { variant: 'margin' })],
  'tls.c.cta': [v('button', 'the action and a button', { variant: 'button' }), v('ticket', 'a ticket stub with the deadline', { variant: 'ticket' }), v('hand-arrow', 'a drawn arrow points at the action', { variant: 'hand-arrow' })],
  'tls.c.callback': [v('mirror', "the cover's line and its answer, a motif beside", { variant: 'mirror' }), v('answered', 'the echo circled, then the answer', { variant: 'answered' })],
  'tls.c.takeaway-poster': [v('stack', 'numbered takeaways one under another', { variant: 'stack' }), v('row', 'takeaways side by side', { variant: 'row' }), v('plain', 'large takeaways, no numbers', { variant: 'numerals-off' })],
  'tls.c.poster-cover': [v('stacked', 'a display title stacked', { variant: 'stacked' }), v('offset', 'lines stepped across the page', { variant: 'offset' }), v('motif', 'the title beside a motif', { variant: 'overlap-motif' })],
  'tls.c.split-cover': [v('field-left', 'a colour field on the left', { side: 'left', tone: 'accent' }), v('field-right', 'a colour field on the right', { side: 'right', tone: 'accent2' }), v('quiet-field', 'a quiet tinted field', { side: 'left', tone: 'alt' })],
  'tls.c.hook-cover': [v('question', 'a question opens the deck', { variant: 'question' }), v('number', 'one number opens the deck', { variant: 'number' })],
  'tls.c.route-agenda': [v('road', 'the parts as a road of stops', { variant: 'road' }), v('metro', 'a metro line of stations', { variant: 'metro' }), v('stones', 'stepping stones', { variant: 'stepping-stones' })],
  'tls.c.chapter-divider': [v('numeral', 'a giant section number', { variant: 'numeral' }), v('question', "the section's question large", { variant: 'question' }), v('progress', 'how far through the deck', { variant: 'progress' })],
  'tls.c.sticky-board': [v('grid', 'notes in a grid', { variant: 'grid' }), v('columns', 'notes in two columns', { variant: 'columns' })],
  'tls.c.question-wall': [v('grid', 'questions as notes', { variant: 'grid' }), v('scattered', 'questions pinned loosely', { variant: 'scattered' })],
  'tls.c.homework': [v('card', 'the assignment on a card', { variant: 'card' }), v('notebook', 'the assignment as a page', { variant: 'notebook' })],
  'tls.c.flashcards': [v('grid', 'term cards in a grid', { variant: 'grid' }), v('fan', 'term cards fanned out', { variant: 'fan' })],
  'tls.g.annotated': [v('numbers', 'a numbered legend', { variant: 'numbers' }), v('labels', 'labels and notes', { variant: 'labels' })],
  'tls.t.highlight': [v('marker', 'marker on the key words', { variant: 'marker' }), v('underline', 'key words underlined', { variant: 'underline' }), v('circle', 'key words circled', { variant: 'circle' })],
  'tls.t.speech-bubble': [v('round', 'a round speech bubble', { variant: 'round' }), v('shout', 'a loud bubble', { variant: 'shout' })],
  // spro creative CR9
  'tls.m.emoji': [v('sticker', 'an emoji on a white sticker', { backing: 'sticker', size: 'lg' }), v('bare', 'a bare emoji', { backing: 'none' })],
  'tls.m.illustration': [v('scene', 'a scene in accent', { accent: 'accent' }), v('facing', 'a mirrored scene in accent 2', { accent: 'accent2', flip: true })],

  // spro creative CR13: waves 2 and 3
  'tls.g.decision-tree': [v('top-down', 'questions branch downwards', { variant: 'top-down' }), v('left-right', 'questions branch to the right', { variant: 'left-right' }), v('badges', 'outcomes as pills', { outcomes: 'badges' })],
  'tls.g.fishbone': [v('classic', 'cause groups on cards', { variant: 'classic' }), v('minimal', 'cause groups without cards', { variant: 'minimal' })],
  'tls.g.spectrum': [v('line', 'thin bars between the poles', { variant: 'line' }), v('bar', 'thick bars between the poles', { variant: 'gradient-bar' })],
  'tls.g.balance': [v('scale', 'a scale weighs the two sides', { variant: 'scale' }), v('seesaw', 'a seesaw between the sides', { variant: 'seesaw' })],
  'tls.g.puzzle': [v('grid', 'pieces in a grid', { variant: 'grid' }), v('row', 'pieces in one row', { variant: 'row' })],
  'tls.g.bridge': [v('arch', 'roomy steps over the gap', { variant: 'arch' }), v('flat', 'tight steps over the gap', { variant: 'flat' })],
  'tls.c.number-story': [v('row', 'numbers in a row', { variant: 'arrow-row' }), v('zoom', 'the last number in focus', { variant: 'zoom' })],
  'tls.c.do-dont': [v('cards', 'do and don\'t on cards', { variant: 'cards' }), v('stamped', 'a big check and cross', { variant: 'stamped' })],
  'tls.c.storyboard': [v('strip', 'panels in a strip', { variant: 'strip' }), v('grid', 'panels in a 2×2 grid', { variant: 'grid' })],
  'tls.c.magazine': [v('column', 'a text column and its pull quote', { variant: 'two-column' }), v('figure', 'a figure beside the text', { variant: 'figure-right' })],
  'tls.t.drop-cap': [v('raised', 'a raised initial', { variant: 'raised' }), v('boxed', 'the initial in a box', { variant: 'boxed' })],
  'tls.t.pull-quote': [v('rules', 'a quote between rules', { variant: 'rules' }), v('marks', 'big quotation marks', { variant: 'marks' }), v('side', 'an accent bar beside', { variant: 'side' })],
  'tls.c.photo-essay': [v('strip', 'photos in a strip', { variant: 'strip' }), v('hero', 'one large photo and two small', { variant: 'hero-plus-two' })],
  'tls.c.gallery-wall': [v('salon', 'mixed frame sizes', { variant: 'salon' }), v('row', 'frames in a row', { variant: 'row' })],
  'tls.c.title-card': [v('rule', 'a framed title over a rule', { variant: 'double-rule' }), v('arch', 'a title on an accent panel', { variant: 'arch' })],
  'tls.c.full-bleed-type': [v('solid', 'one word in accent', { variant: 'solid' }), v('outline', 'one word in the text colour', { variant: 'outline' })],
  // ── decoration ──
  'tls.g.arrow': [v('straight', 'a straight accent arrow', { kind: 'straight', tone: 'accent' }), v('curved', 'a curved pointer', { kind: 'curved' }), v('elbow', 'an elbow arrow', { kind: 'elbow', tone: 'text' })],
  'tls.m.decoration': [v('blob', 'a soft blob', { shape: 'blob', opacity: 'soft' }), v('squiggle', 'a hand squiggle', { shape: 'squiggle' }), v('sparkle', 'a sparkle', { shape: 'sparkle', tone: 'accent2' }), v('solid', 'a 3D solid', { shape: 'cube' })],
  'tls.m.icon-cluster': [v('mixed', 'topic icons in mixed colours', { tone: 'mixed' }), v('discs', 'icons on discs', { backing: 'disc', tone: 'accent' })],
  'tls.m.pattern': [v('dots', 'a dot grid', { pattern: 'dots' }), v('grid', 'a fine grid', { pattern: 'grid', scale: 'sm' }), v('mesh', 'soft mesh glows', { pattern: 'mesh', tone: 'accent' })],
  'tls.m.ornament': [v('divider', 'a rule with a diamond', { shape: 'divider', variant: 'filled' }), v('frame', 'a double rule with notched corners', { shape: 'frame' }), v('fan', 'a fan of rays', { shape: 'fan', variant: 'filled' }), v('sunburst', 'a ring of rays', { shape: 'sunburst' })],
  'tls.x.rule': [v('hairline', 'a thin divider', { weight: 'hairline' }), v('accent', 'a short accent rule', { tone: 'accent', length: 'short', weight: 'bold' }), v('gradient', 'a gradient line', { tone: 'gradient' })],
}
