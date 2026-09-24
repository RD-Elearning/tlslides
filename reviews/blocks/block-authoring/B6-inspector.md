# B6 — Inspector: every field editable, theme colours with reset, padding/align, element toggles · L · UI

Depends on: **B3** (padding/align mean something), **B4** (`toggles`).
File: `components/BlockInspector/BlockInspector.tsx` (365 lines, one file today — split into
`fields/*.tsx` as you go).

## Problems found (2026-09-24)

1. `ContentTab` skips every `role: 'option'` slot → 81 of 148 schema fields (variant, gap,
   columns, sizing, padding, size, emphasis, …) cannot be edited in the UI.
2. `ContentField` renders inputs only for `text`, `number`, `enum`, `boolean`. `richText`,
   `color`, `icon`, `image`, `list`, `object`, `series`, `blocks` show a label with no control.
3. `StyleTab`: three `<input type=color>` that write raw hex into `$block.style`; when nothing is
   set they display fake values (`#ffffff`, `#000000`, `#0066ff`) instead of the theme colour;
   **no way to reset to the slide theme**; can't pick a theme role (so the colour stops following
   theme changes once touched). Also `ColorPicker` passes `type: 'color'` as a CSS property
   (stitches) instead of an HTML attribute → it's actually a text input. Unused `GradientEditor`
   / `showGradientEditor`.
4. `MotionTab`: three `useEffect`s call `onUpdate` on mount → selecting a block writes 3 shape
   updates (undo-stack noise, marks doc dirty). Preset list is hard-coded (`fade/scale/slide`)
   and doesn't match the real preset registry (`motion/presets.ts`).

## Steps

1. **Layout**: tabs stay (Content · Style · Motion). Content tab = `role: 'content'` fields, then a
   collapsible **Options** section with `role: 'option'` fields, then an **Elements** section with
   a checkbox per `toggles` slot (label = slot label). Toggle slots are excluded from Options.
2. **Field controls** (one component per kind in `components/BlockInspector/fields/`):
   `text` (textarea when `multiline`), `richText` (plain textarea that writes `{ runs: [{ text }] }`
   when the value was rich, string otherwise — full rich editing stays in `InlineEditor`),
   `number` (respect min/max), `enum`, `boolean`, `color` (the shared ThemeColorPicker below),
   `icon` (select from `blocks/icons.ts` `ICONS` keys), `image` (URL/asset id text input),
   `list` (add/remove/reorder rows, row editor = recursive field for `of`), `object` (recursive
   fields), `series` (list of number+label). `blocks`: show "N child blocks" read-only (B8 is the
   real editor). Use `setAtPath` with the nested path for list/object edits.
3. **ThemeColorPicker** (shared, used by Style tab and `color` fields): swatches for the real
   `ColorRole` values (`blocks/types.ts` ~l.734 — `surface, surfaceAlt, accent, accent2, text,
   textMuted, positive, negative, warning, neutral, line, scrim`), each swatch painted with the
   *resolved* colour for the current deck theme; plus a "Custom…" hex input; plus a **Reset**
   (↺ "Theme default") button that **deletes the key** (don't write `undefined` into JSON — delete
   it from `$block.style` / the prop). Selecting a swatch stores the **role name** (so it keeps
   following theme changes); custom stores hex. Show the effective current colour, not a fake
   default. Never offer a role name that isn't in `ColorRole`.
4. **Style tab**: Surface / Text (`on`) / Accent via ThemeColorPicker; **Padding** (select:
   none · xs · sm · md · lg · xl from `tokens.space` keys — verify the real key list — plus
   custom number); **Vertical align** (start/center/end); a **"Reset all styles to theme"** button
   that removes `$block.style` entirely.
5. `updateBlockMeta`: support deleting a key (value `undefined` → delete) and deep paths.
6. **Motion tab**: initialise sliders from the stored value; write only on user change (no mount
   effects). Preset options come from the real preset registry; keep "None".
7. Every edit is one `updateShapes` call → one undo step. Slider drags: commit on release (or
   throttle) so a drag isn't 60 undo steps.

## Tests

- Component tests (React Testing Library, see existing `components/**/*.spec.tsx` for setup):
  option fields render; toggles section lists only `toggles` slots; picking a role writes the
  role string; Reset deletes the key; selecting a block produces **zero** `updateShapes` calls.
- A theme-switch test: block with `accent` set to role `accent2` re-renders with the new theme's
  colour after the deck theme changes; block with Reset shows the theme accent.
- Manual: open `localhost:5433/edit/colorful-blocks-demo`, select 3–4 different blocks, edit an
  option, toggle an element, set/reset colours and padding, undo/redo. Screenshot before/after.

## Done when

- [ ] All 12 slot kinds have a control (blocks = read-only summary).
- [ ] Option fields and Elements section visible and working.
- [ ] Colours: role swatches + custom + reset per field + reset all; no fake defaults.
- [ ] Padding/align controls drive B3's style keys.
- [ ] Selecting a block writes nothing; one edit = one undo step.
- [ ] tsc 0, eslint no new errors; targeted + one full suite green; ledger row filled.
