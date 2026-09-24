# B4 — Element visibility: a `toggles` convention, a gate, and a retrofit · M–L · feature

## Problem

Users need to show/hide a block's inner elements (kicker, subtitle, CTA, delta, sparkline,
attribution, divider…). Today it's ad hoc: some parts vanish when their text is empty, 4 blocks
have one unrelated boolean each, and nothing tells the inspector which fields are "element
switches". Nothing tests that switching off actually removes the element and reflows.

## Design

1. **Schema convention (additive):** `SlotSpec` (`blocks/types.ts` l.309) gains
   `toggles?: string` — the `part` name this boolean shows/hides. A toggle slot is
   `{ type: { kind: 'boolean' }, role: 'option', label: 'Kicker', toggles: 'kicker' }`, key
   named `show<Part>` (e.g. `showKicker`). Default `true` in `defaults` unless the element is
   off by default.
2. **Helper:** `isShown(props, key): boolean` in `blocks/schema-helpers.ts` (or wherever shared
   block helpers live — grep first) → `props[key] !== false` (absent = shown, so existing decks
   are unchanged).
3. **Layout honours it:** the block's `layout()` / `template()` skips the part **and reflows**
   (no empty gap). This is why hiding is done in the block, not by the renderer blanking a part.
4. **Conformance gate** (`catalog-conformance.spec.ts`): for every block, for every slot with
   `toggles`: lay out `describe.example` with that key `false` → assert no node in the tree (Tier
   A) has `part === toggles` (or `startsWith(toggles + '[')`), and for Tier B the template output
   has no `data-part="<toggles>"`. Also assert the key starts with `show` and the type is boolean.
   This makes the convention self-enforcing for every future block.

## Retrofit (priority order — do as many as fit, list the rest in the ledger notes)

| Block | Toggles to add (verify part names in the block's layout/template first) |
|---|---|
| `tls.c.hero` (B) | `showKicker`, `showSubtitle`, `showCta` |
| `tls.c.kpi-tile` | `showDelta`, `showLabel`, `showSparkline` |
| `tls.c.big-stat` (B) | `showLabel`, `showContext` |
| `tls.c.testimonial` (B) | `showAvatar`, `showRole` |
| `tls.c.image-text` | `showKicker`, `showTitle`, `showBody` |
| `tls.t.quote` | `showAttribution`, `showMark` |
| `tls.l.section` | `showTitle`, `showDivider` |
| `tls.t.title` | existing `rule` boolean → add `toggles: 'rule'` (keep the key name; renaming breaks decks) |
| `tls.t.hero-number` | `showUnit`, `showCaption` |

Existing booleans that are **not** element switches (`body.autoFit`, `bullets.indentLevels`) get
no `toggles`.

Update each retrofitted block's `describe.when`/guidance if the AI should know about the switch;
update `size.preferred` only if the default appearance changes (it shouldn't).

## Tests

- The generic conformance gate (above) — this is the main test.
- Per retrofitted block: with the toggle off, the following element moves up (reflow), i.e. the
  reported height shrinks.
- Targeted: specs of touched blocks + conformance; full suite once; re-shoot both demo decks,
  confirm unchanged (all toggles default to shown).

## Done when

- [ ] `SlotSpec.toggles` + `isShown` exist and are documented in `../CURRENT-STATE.md`
      "Before writing a new block".
- [ ] Conformance gate enforces it for every block.
- [ ] At least hero, kpi-tile, big-stat, image-text, section retrofitted; rest listed.
- [ ] Demo decks visually unchanged; tsc 0; targeted + one full suite green; ledger row filled.
