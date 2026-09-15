# 5. Motion system

Animation for blocks: the token scale, the preset catalog, the choreography rules, the driver, and
what must never move.

Sources: `transitions.dev/skills/transitions-polish/SKILL.md` and `_root.css` for the token scale
and the polish rules; `transitions.dev/skills/transitions-dev/*.md` for the 32 concrete recipes;
`ppt-master/skills/ppt-master/references/animations.md` for the lifecycle discipline, the
page-relationship→transition table, and the Morph model.

## 5.1 What already exists (do not rebuild it)

Phase 16 shipped a working presentation runtime. Blocks plug into it; they do not replace it.

| Piece | Where | What it does |
|---|---|---|
| `ShapeAnimation` | `types.ts:451-457` | `{ effect, trigger, order, durationMs, delayMs }` per shape |
| `AnimationEffect` | `types.ts:438-443` | `fadeIn \| slideIn \| zoomIn \| wipe` |
| `AnimationTrigger` | `types.ts:445-449` | `onClick \| withPrevious \| afterPrevious` |
| `computeBuildSteps(page)` | `state/deck/presentation.ts` | pure; groups shapes into build steps. Exported from the package root |
| `PresentationRuntime` | `components/Presentation/` | DOM-imperative playback; mounted **only** while presenting |
| Slide transitions | same file | `fade \| push \| cut`, an editor setting, not a document field |
| `AnimateMenu` | `components/TopPanel/AnimateMenu/` | authoring UI for the current selection |
| `Deck.advance/back/getPresentationState` | `state/deck/Deck.ts` | host-drivable playback |

Two properties of that design are load-bearing and must survive:

1. **Presentation-only.** `PresentationRuntime` mounts only under `settings.isPresentationMode`,
   so a shape's `animation` has zero effect while editing, and exports (`renderPageToSvg`,
   `copySvg`) never see it. A `fadeIn` block must export at full opacity. Verified in
   `tools/visual/scenarios/present.js`.
2. **`translate`/`scale`/`clip-path`, never `transform`.** `@tlslides/core`'s `usePosition` owns
   `transform` on the same element via a mobx autorun. Fighting it means last-write-wins, silently.
   The block motion driver inherits this constraint exactly (§5.6).

## 5.2 Motion tokens

Adopted verbatim from `transitions.dev`, because a shipped, tuned scale beats an invented one.
Durations and easings transfer unchanged; **distances are scaled ×3** because slide units are
1920-wide, not a 640px web card — an 8px web nudge is invisible on a projected 1920 frame.

### Durations

| Token | Value | Use in a deck |
|---|---|---|
| `stagger` | 40ms | per-item offset in a list, grid, or bar series |
| `micro` | 80ms | intent delay, large-item stagger, path-draw lead-in |
| `quick` | 150ms | anything leaving; a text swap |
| `fast` | 250ms | a part entering; a slide transition |
| `medium` | 350ms | a panel/region settling |
| `slow` | 400ms | a whole block entering; a skeleton→content reveal |
| `verySlow` | 500ms | one emphasis moment per slide: a hero number, a headline reveal |

### Easings

| Token | Value | Use |
|---|---|---|
| `smoothOut` | `cubic-bezier(0.22, 1, 0.36, 1)` | **the default.** Any surface entering, sliding, resizing, repositioning |
| `inOut` | `ease-in-out` | swaps and reveals where both ends matter |
| `out` | `ease-out` | tooltips and hints |
| `linear` | `linear` | shimmer, spinners, ambient drift — anything that loops |
| `bounce` | `cubic-bezier(0.34, 1.36, 0.64, 1)` | a badge/pill popping in. Entrances only |
| `bounceStrong` | `cubic-bezier(0.34, 3.85, 0.64, 1)` | a hover *return*. Effectively never in a deck |

### Distances, scales, blur

| Token | Web value | **Slide value** | Use |
|---|---|---|---|
| `micro` | 4px | 12 | in-place text swap |
| `small` | 6px | 18 | small nudge |
| `base` | 8px | 24 | **the default entrance travel** |
| `medium` | 12px | 36 | a text line rising |
| `large` | 30px | 90 | a one-off celebratory element |

| Scale token | Value | Use |
|---|---|---|
| `large` | 0.96 | a big surface (a whole card/region) entering |
| `medium` | 0.97 | a medium panel |
| `small` | 0.98 | a chip, badge, small label |
| `tiny` | 0.99 | anything leaving |

Blur: `small 2px · medium 3px · large 8px`, as the *pre* value settling to 0. Blur softens a slide
or swap; **never on a plain fade, never on a color change.** At projection distance a blur above
~4px reads as a rendering fault, so `large` is for a single hero moment only.

These land as `DeckTokens.motion` (§02 2.1) so a host brand can retune the whole deck's feel by
overriding six numbers rather than editing 170 blocks.

## 5.3 The motion preset catalog

Every preset referenced in [03-block-catalog.md](03-block-catalog.md). All are composed from four
animatable properties only — `opacity`, `translate`, `scale`, `clip-path` — plus `filter: blur`,
matching what `PresentationRuntime` already proves safe against `usePosition`.

| id | mechanism | duration / ease | source recipe |
|---|---|---|---|
| `none` | nothing renders, no rows emitted | — | — |
| `fade` | opacity 0→1 | `fast` / `smoothOut` | baseline |
| `fade-up` | opacity + translateY `base`→0 | `slow` / `smoothOut` | texts-reveal |
| `fade-down` | as above, inverted | `slow` / `smoothOut` | texts-reveal |
| `pop` | opacity + scale `small`→1 | `fast` / `bounce` | notification-badge |
| `wipe-x` | `clip-path: inset(0 100% 0 0)` → `inset(0)` | `medium` / `smoothOut` | panel-reveal |
| `wipe-y` | same, vertical | `medium` / `smoothOut` | panel-reveal |
| `mask-reveal` | circular/shape clip-path grows from the focal point | `slow` / `smoothOut` | panel-reveal |
| `reveal-down` | clip-path from top + translateY | `slow` / `smoothOut` | accordion |
| `stagger-lines` | per-line `fade-up` + blur `medium`, offset `stagger` | `verySlow` / `smoothOut` | **texts-reveal** |
| `stagger-children` | per-child `fade-up`, offset `stagger`, capped (§5.5) | `slow` / `smoothOut` | texts-reveal |
| `stagger-grid` | as above, offset by row-major index; diagonal option | `slow` / `smoothOut` | texts-reveal |
| `words-in` | per-word `fade-up` + blur, offset `stagger` | `verySlow` / `smoothOut` | streaming-text |
| `quote-in` | quote mark `pop`, quote text `stagger-lines`, attribution `fade` last | chained | texts-reveal |
| `count-up` | numeric interpolation on the `value` part + `pop` on the container | `verySlow` / `smoothOut` | **spinning-counter** |
| `grow-bars-x` | per-bar scaleX 0→1 from the baseline edge, offset `stagger` | `slow` / `smoothOut` | card-resize |
| `grow-bars-y` | per-bar scaleY 0→1 anchored at the zero line | `slow` / `smoothOut` | card-resize |
| `grow-segments` | stacked segments grow in series order | `slow` / `smoothOut` | card-resize |
| `draw-path` | `stroke-dashoffset` length→0 | `slow` / `inOut` | **success-check** |
| `draw-axis-then-nodes` | `draw-path` on the axis, then `stagger-children` on nodes | `slow`+`stagger` | success-check |
| `sweep` | arc/sector `stroke-dashoffset` or angular clip 0→full | `verySlow` / `inOut` | success-check |
| `sweep-nodes` | nodes reveal in rotational order around the centre | `slow` / `smoothOut` | — |
| `pop-points` | per-point `pop`, offset `stagger`, random-free (seeded) order | `fast` / `bounce` | notification-badge |
| `radiate` | hub `pop`, then spokes `fade-up` outward, offset `stagger` | `slow` / `smoothOut` | — |
| `grow-branches` | parent first, children after, `draw-path` on connectors | `slow` / `smoothOut` | — |
| `split-in` | left from −`base`, right from +`base`, together | `slow` / `smoothOut` | **page-side-by-side** |
| `field-in` | large surface scale `large`→1 + opacity | `slow` / `smoothOut` | modal |
| `title-then-body` | title `fade-up`, then body `fade`, `micro` apart | chained | — |
| `title-then-split` | title `fade-up`, then `split-in` | chained | — |
| `scrim-then-text` | scrim `fade`, then text `stagger-lines` | chained | — |
| `ken-burns` | ambient slow scale 1→1.06 over 12s, `linear` | ambient | §5.7 |
| `cover-in` | kicker `fade`, title `words-in`, subtitle `fade-up`, meta `fade` | chained | composite |
| `section-in` | numeral `pop`, field `wipe-x`, title `fade-up` | chained | composite |
| `dashboard-in` | KPIs `stagger-children`, then chart `grow-bars-y` | chained | composite |
| `closing-in` | statement `fade-up`, CTA `pop` last | chained | composite |

## 5.4 `MotionRecipe` — what a definition declares

```ts
interface MotionRecipe {
  /** The block's default, used when the deck opts into motion and the author sets nothing. */
  default: MotionPresetId
  /** Named parts this block can animate independently, with each one's own sensible preset.
   *  `*` marks a repeated family, which is what the stagger presets iterate. */
  parts: Record<string, { preset: MotionPresetId; label: string }>
  /** Explicit ordering when the block's own parts must chain. Absent = all together. */
  sequence?: Array<{ part: string; after?: 'previous' | number }>
  /** Optional ambient loop, off unless the author turns it on. */
  ambient?: { preset: MotionPresetId; periodMs: number }
}

// e.g. tls.d.kpi
export const motion: MotionRecipe = {
  default: 'count-up',
  parts: {
    surface: { preset: 'fade',     label: 'Card' },
    label:   { preset: 'fade-up',  label: 'Label' },
    value:   { preset: 'count-up', label: 'Value' },
    delta:   { preset: 'pop',      label: 'Change' },
    spark:   { preset: 'draw-path',label: 'Sparkline' },
  },
  sequence: [{ part: 'surface' }, { part: 'label', after: 'previous' },
             { part: 'value', after: 'previous' }, { part: 'delta', after: 'previous' }],
}
```

## 5.5 Choreography rules

Taken from `transitions.dev`'s polish rules and `ppt-master`'s animation discipline. These are lint
rules (§5.8), not advice.

- **Off by default.** `ppt-master` is blunt about this and it is right: *"auto-firing builds on
  every page are an unsolicited 'AI deck' tell."* A block's `motion.default` only plays when the
  deck or the slide has opted into motion. A deck nobody animated does not move.
- **Lifecycle before effect.** Classify the duty first — `static → enter → emphasize → move →
  exit` — then pick an effect. Most block motion is `enter`. `emphasize` is only for something
  *already visible* regaining attention, never a first reveal. `exit` only when the same slide
  must make room. A slide change needs no exit.
- **One dominant rhythm per deck, normally one trigger mode per slide.** Mixing `onClick` and
  `afterPrevious` on one slide is for a deliberate presenter-controlled beat, not a default.
- **Stagger total under ~300ms.** 40ms × items; at 8+ items either drop to a cap (animate the
  first 6, reveal the rest with them) or shrink the offset. A staggered 20-row table is a
  20-row table that arrives late.
- **Closes are faster and quieter than opens.** `fast` in, `quick` out; the exit drops the
  distance and blur so dismissal never flings content. Never bounce a close. Never delay a close.
- **Overshoot is for entrances only**, and in a deck, almost exclusively a badge or chip.
- **Delay is for stagger, intent gating and deliberate sequencing.** If motion feels late, cut the
  duration rather than adding delay.
- **At most one `verySlow` emphasis moment per slide.** If everything is the hero, nothing is.
- **Motion must not carry meaning alone.** A build order is emphasis, not information; the static
  slide must still be complete and correct, because that is what exports.

## 5.6 The driver — and the GSAP question

```ts
interface MotionDriver {
  play(target: Element, keyframes: MotionKeyframes, opts: MotionOptions): MotionHandle
  set(target: Element, state: MotionState): void
  timeline(steps: MotionStep[]): MotionHandle     // sequencing + stagger
  cancelAll(): void
}
```

**Default driver: the Web Animations API.** Zero bytes, in every target browser, composited off
the main thread for `opacity`/`transform`-family properties, cancellable, and it already exposes
`finished` promises for chaining. `Element.animate` on `translate`/`scale`/`clip-path` composes
with `usePosition`'s `transform` exactly as the current CSS-transition approach does — §5.1's
constraint is satisfied, not worked around.

**GSAP is an optional, host-injected adapter — not a dependency.** The reasons, in order:

1. **This package ships to hosts.** Every dependency `@tlslides/blocks` takes is a dependency every
   consumer takes. The repo's own precedent is explicit: Phase 15 refused to bundle an SVG
   rasterizer and shipped a documented recipe instead, for exactly this reason.
2. **Nothing in the preset catalog needs it.** All 34 presets are opacity/translate/scale/clip-path
   /stroke-dashoffset plus numeric interpolation. WAAPI does all of it.
3. **Licensing is a host's decision, not ours.** GSAP's terms have changed more than once; making
   it a hard dependency means auditing that on every consumer's behalf. An adapter means the host
   who wants it accepts it.
4. **When it *is* worth it, the adapter is ~60 lines.** Complex sequenced timelines, physics, morph
   between arbitrary paths, and scrubbing are all places GSAP genuinely beats WAAPI. Ship
   `gsapDriver(gsap)` in `@tlslides/blocks/drivers/gsap` as an optional entry point taking the
   host's own `gsap` instance — no bundled copy, no peer-dependency warning for anyone else.

The same door is open for Motion One or any other engine; the interface is four methods.

**Performance budget:** a slide's whole build must hold 60fps on a mid-range laptop. Concretely —
animate only `opacity`, `translate`, `scale`, `clip-path`, `filter`, `stroke-dashoffset`; never
`width`/`height`/`top`/`left`/`box-shadow`; no more than ~40 simultaneously animating elements
(the stagger cap enforces this); `will-change` set on entry and **removed on finish**, never left
on. A `count-up` interpolates a number into `textContent` on `requestAnimationFrame`, and must
**not** re-run the block's layout per frame — the value part is rendered at its final width at
`layout()` time so the number changing cannot reflow anything.

## 5.7 Ambient motion

`ppt-master`'s "the page that breathes": a slow `path_*` drift on a subordinate background layer
keeps a static full-bleed slide from feeling frozen. Adopted narrowly:

- Only on non-informational layers: `m.image-bleed`, `m.pattern`, `m.decoration`, `l.field`.
- `linear`, 8–20s periods, ≤6% scale or ≤2% translation. A full-bleed moving image must cover the
  frame at both endpoints.
- **Presentation-only, one per slide, off by default**, and paused when the tab is hidden
  (`visibilitychange`) and when presentation ends. `isStateful = true` means nothing unmounts on
  its own — a forgotten `requestAnimationFrame` loop runs for the life of the session.

## 5.8 Slide transitions

Today: `fade | push | cut`, an editor-wide setting. Push is honestly one-sided (React has already
swapped the page's shape tree, so there is no outgoing frame to animate) — documented in Phase 16
and still true.

**P22 adds** `wipe`, `cover`, `uncover` and `zoom`, all one-sided in the same honest way, and maps
them to `ppt-master`'s page-relationship table so the *choice* has a rule behind it:

| Relationship between adjacent slides | Transition |
|---|---|
| Ordinary continuation within a section | `fade` |
| Immediate change, no continuity to preserve | `cut` |
| Directional step, timeline, layer progression | `push` / `wipe` |
| A visible overlay relationship | `cover` / `uncover` |
| Section opening or a marked boundary | `zoom`, used selectively |
| The same object continues across both slides | **block morph** (below) |

### Block morph — designed here, scheduled as a P22 follow-up

`ppt-master` is right that Morph is the transition that matters, and the block model makes it
tractable where a bag of shapes does not: a block carries a stable `spec.id`, and `layout()` gives
its exact box on both slides. So "the same block on two consecutive slides" is a *lookup*, not a
heuristic match — tween the boxes, cross-fade the parts, done. This is a genuine differentiator
and it is cheap **because** of the architecture, which is why it is recorded now rather than
discovered later. It is explicitly **not** in P22's shipping scope: it needs both slides mounted
simultaneously, which the current one-page-at-a-time renderer does not do, and that is a real
piece of work. Named as a follow-up, not silently dropped.

## 5.9 Motion lint rules (run by P31)

| id | sev | rule |
|---|---|---|
| `motion/always-on` | warn | every block on every slide animates — the "AI deck" tell |
| `motion/stagger-total` | warn | stagger offset × item count > 400ms |
| `motion/too-many-heroes` | warn | more than one `verySlow` emphasis on a slide |
| `motion/mixed-triggers` | info | `onClick` and `afterPrevious` mixed on one slide |
| `motion/bounce-on-exit` | warn | an overshoot easing on an exit or a close |
| `motion/delayed-exit` | warn | any delay on an exit |
| `motion/meaning-in-motion` | error | a build step reveals content the static slide omits |
| `motion/ambient-overload` | warn | more than one ambient loop on a slide |
| `motion/expensive-property` | error | a driver call animating `width`/`height`/`top`/`left`/`box-shadow` |
| `motion/orphan-part` | error | `motion.parts` names a part `layout()` never emits (or vice versa) |

## 5.10 Reduced motion and accessibility

`PresentationRuntime` already reads `prefers-reduced-motion` and snaps to the target state. Blocks
inherit that through the driver, not per block:

- Reduced motion ⇒ **build steps still exist** (the presenter still reveals content in order) but
  every transition is instantaneous. Losing the build order would change the presentation's
  meaning; losing the movement does not.
- Ambient motion is disabled entirely.
- `count-up` renders the final value immediately.
- No animation is the sole carrier of information (§5.5), so nothing is lost.
- The setting is re-read live via the media query listener, as today.
</content>
