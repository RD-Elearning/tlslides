/**
 * M3 — shared timing for the chart and metric motion recipes (reviews/blocks/block-review/MOTION.md).
 *
 * A chart's frame (gridlines, ticks, category labels, legend) rides the block's own fade; the data
 * marks then grow from their baseline, draw from their start or sweep from 12 o'clock, and every
 * label or value waits for its mark: it uses the mark's stagger and starts `LABEL_AFTER` later,
 * when an out-eased mark is ~95 % drawn. Every number stays inside the J5 tokens (per-item
 * stagger <= 120 ms, each part 150–900 ms).
 *
 * Labels fade with `sweep-nodes` (a 400 ms opacity fade on an out ease): `fade` is 250 ms, and on a
 * block that is already fully in, its first frame can jump more than 0.35 (J1). Points, dots and
 * badges enter with `field-in` (opacity + a 0.96 -> 1 scale, 400 ms): `pop` / `pop-points` bounce to
 * rest in ~100 ms, under J5's 150 ms.
 */

/** Per-item stagger of the marks of one family (bars, rows, series), in ms. */
export const MARK_STAGGER = 60
/** Per-item stagger for a few large items (rows of a progress or bullet chart, series), in ms. */
export const ROW_STAGGER = 100
/** How long after its mark starts a label or value appears, in ms (400 ms grow at ~65 %). */
export const LABEL_AFTER = 260
/** When the marks start, in ms: once the frame (the block's own fade) is mostly in. */
export const MARKS_AT = 80
