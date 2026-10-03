# P1 · Text, lists, emphasis — 11 blocks

**Depends on:** P0.1–P0.3; `m.icon-list` and `t.callout` also need P0.5 (icons).
**Folder:** `library/text/` (prefix `t`), except `icon-list`, which goes in `library/media/`.
**Reference block to copy:** `library/text/tls-t-bullets/` (list measurement, markers, indent)
and `tls-t-takeaway/` (accent bar, label).

## How to read a block entry (same in every phase file)

- **Header line:** `type` · category · scope · build path (`composite` = `defineCompositeBlock`,
  `layout` = hand-written Tier A, `html` = Tier B) · priority.
- **short:** the `shortDescription`, written to the rules in 01-taxonomy §2.
- **Slots:** `role: 'content'` slots, which the AI writes. `!` means required. Types use the
  existing `SlotType` kinds.
- **Options:** `role: 'option'` slots. The first value of an enum is the default.
- **Toggles:** B4 boolean slots (`show…`, `toggles: '<part>'`). `isShown()` in the layout, and
  the conformance gate checks that the part disappears.
- **Parts / motion:** named parts for `motion.parts` plus the default preset (an existing id from
  `motion/presets.ts`).
- **Capacity:** what `capacity()` reports and which remedy it suggests. Every new block that has a
  list slot implements `capacity()`.
- **when / avoid:** the `describe` text. `avoid` must name the alternative block.
- **Tests:** beyond the standard set below.

**Standard tests for every block** (not repeated per entry): schema validates
`describe.example`; defaults lay out without error nodes at `size.preferred` and `size.min`;
every toggle removes its part; capacity reports `fits: false` past the max; no part overflows its
box at preferred size (collision helper); DOM↔SVG parity at medium size; listed in
`BUILT_IN_BLOCKS` with the count bumped.

---

## Status

| # | Block | Priority | Status | Commit | Blocked / notes |
|---|---|---|---|---|---|
| 1 | `tls.t.numbered` | must | ⬜ | | |
| 2 | `tls.t.checklist` | must | ⬜ | | |
| 3 | `tls.m.icon-list` | must | ⬜ | | needs P0.5 |
| 4 | `tls.t.statement` | must | ⬜ | | |
| 5 | `tls.t.callout` | must | ⬜ | | needs P0.5 |
| 6 | `tls.t.footnote` | must | ⬜ | | |
| 7 | `tls.t.definition` | must | ⬜ | | |
| 8 | `tls.t.kv-list` | should | ⬜ | | needs P0.7 |
| 9 | `tls.t.tags` | should | ⬜ | | |
| 10 | `tls.t.qa` | should | ⬜ | | |
| 11 | `tls.t.code` | could | ⬜ | | |
| — | Phase demo slide + screenshot | — | ⬜ | | `colorful-blocks-demo.json` slide "P1 lists", copied byte-identical |

---

### 1. `tls.t.numbered` · list · element · layout · must
- **short:** `Numbered points with decimal, padded, roman, letter or badge markers`
- **Slots:** `items!: list<richText maxChars 180>` (min 2, max 8)
- **Options:** `markerStyle: enum[decimal, padded, roman, alpha, badge]` (padded = "01",
  badge = number in a filled accent circle); `start: number` (min 1, default 1); `spacing:
  enum[default, compact, roomy]`; `columns: enum['1','2']`; `markerTone: enum[accent, text, muted]`
- **Toggles:** none.
- **Parts / motion:** `marker-<i>`, `item-<i>`; `stagger-lines`.
- **Capacity:** measured line count against the box height; remedies `columns: '2'` (if
  `columns === '1'` and width ≥ 900), then `truncate items`.
- **when:** Ordered points where the order or the count matters ("3 reasons", "5 rules").
- **avoid:** Unordered points, so use `tls.t.bullets`. Steps of a process go in `tls.g.steps`.
- **Tests:** roman/alpha marker text for 1–8; marker column width is constant across items (the
  widest marker); `start: 4` renders 4…; 2-column split balances items.

### 2. `tls.t.checklist` · list · element · layout · must
- **short:** `Checklist of items, each ticked, open or crossed out`
- **Slots:** `items!: list<object{ text!: text maxChars 140, state: enum[done, open, blocked] }>` (2–10)
- **Options:** `doneStyle: enum[check, strike, dim]`; `spacing: enum[default, compact, roomy]`;
  `columns: enum['1','2']`
- **Toggles:** none.
- **Parts / motion:** `mark-<i>`, `item-<i>`; `stagger-lines`.
- **Capacity:** like numbered.
- **Colours:** done = `positive` check, open = `line` empty box, blocked = `negative` x. Never
  hard-coded hex.
- **when:** Requirements, prerequisites, launch checklists, learning objectives with a done state.
- **avoid:** Plain points without a state, so use `tls.t.bullets`. Feature support across
  several options goes in `tls.d.compare-table`.
- **Tests:** each state maps to the right icon + role; `doneStyle: strike` draws a line node
  across the text width of each done line.

### 3. `tls.m.icon-list` · list · element · layout · must
- **short:** `Vertical list of short points, each led by its own icon`
- **Slots:** `items!: list<object{ icon!: icon, title!: text maxChars 60, text: text maxChars 140 }>` (2–6)
- **Options:** `iconStyle: enum[plain, circle, square]` (circle/square = icon on a tinted
  `surfaceAlt` shape); `iconTone: enum[accent, accent2, text]`; `spacing: enum[default, compact, roomy]`
- **Toggles:** `showText` → part `text`.
- **Parts / motion:** `icon-<i>`, `title-<i>`, `text-<i>`; `stagger-lines`.
- **Capacity:** height per item = max(icon box, title + text height); remedy `showText: false`,
  then truncate.
- **when:** 3–6 benefits or features where each needs a recognisable icon, stacked in a column.
- **avoid:** A grid of features, so use `tls.c.feature-grid`. Points without icons go in
  `tls.t.bullets`.
- **Related (add back on landing):** `tls.c.feature-grid`, `tls.m.icon-label`.

### 4. `tls.t.statement` · emphasis · element · layout · must
- **short:** `One large sentence stated as the slide's message, key words in accent`
- **Slots:** `text!: richText maxChars 140`; `attribution: text maxChars 60`
- **Options:** `size: enum[xl, lg, md]`; `align: enum[start, center]`; `emphasis: enum[accent,
  underline, highlight]` (how the `**bold**` runs in the rich text render: accent colour, an
  accent underline path, or an accent-tinted rect behind them)
- **Toggles:** `showAttribution` → `attribution`; `showMark` → `mark` (a short accent rule above
  the text).
- **Parts / motion:** `mark`, `text`, `attribution`; `words-in`.
- **Capacity:** autofit down from `size` to `md`; past `md` with overflow, remedy
  `shorten text` (`maxChars` hint 100).
- **when:** A single claim or conclusion that should fill the slide's attention.
- **avoid:** A quotation from a person, so use `tls.t.quote`. A takeaway next to other content
  goes in `tls.t.takeaway`.
- **Tests:** emphasis runs keep their positions after autofit; highlight rect boxes match the
  run boxes in both renderers.

### 5. `tls.t.callout` · emphasis · element · layout · must
- **short:** `Boxed note marked as info, tip, warning, danger or success, with icon`
- **Slots:** `title: text maxChars 50`; `text!: richText maxChars 240`
- **Options:** `variant: enum[info, tip, warning, danger, success]`; `fill: enum[tint, outline, solid]`;
  `icon: icon` (overrides the variant's default icon)
- **Variant → role:** info → accent, tip → accent2, warning → warning, danger → negative,
  success → positive. Tint = role at low alpha over `surface`, which needs `color-math.ts`
  mixing (existing). Check contrast with the existing contrast helper.
- **Toggles:** `showIcon` → `icon`; `showTitle` → `title`.
- **Parts / motion:** `box`, `icon`, `title`, `text`; `fade-up`.
- **when:** Warnings, tips, notes and caveats beside the main content.
- **avoid:** The slide's main conclusion, so use `tls.t.takeaway` or `tls.t.statement`.
- **Tests:** all 5 variants × 3 fills pass contrast lint on light and dark themes.

### 6. `tls.t.footnote` · text · element · layout · must
- **short:** `Small-print source, reference or footnote line with optional marker`
- **Slots:** `items!: list<text maxChars 200>` (1–4)
- **Options:** `marker: enum[none, number, asterisk, source]` ("source" prefixes the first item
  with "Source:"); `align: enum[start, end]`
- **Parts / motion:** `item-<i>`; `fade-up` (with a low default duration).
- **Capacity:** up to 4 lines total; remedy `truncate`.
- **when:** Citing data sources under a chart or table, and footnotes.
- **avoid:** A caption that describes an image, so use `tls.t.caption`.

### 7. `tls.t.definition` · text · element · layout · must
- **short:** `Term with its definition, optional pronunciation and example`
- **Slots:** `term!: text maxChars 40`; `pronunciation: text maxChars 40`; `partOfSpeech: text
  maxChars 20`; `definition!: richText maxChars 260`; `example: text maxChars 160`
- **Options:** `layout: enum[stacked, inline]` (inline = term column + definition column);
  `termTone: enum[accent, text]`
- **Toggles:** `showPronunciation`, `showExample` (parts `pronunciation`, `example`).
- **Parts / motion:** `term`, `meta`, `definition`, `example`; `title-then-body`.
- **when:** Introducing a concept, glossary terms, vocabulary (lectures).
- **avoid:** Several term/value pairs, so use `tls.t.kv-list`.

### 8. `tls.t.kv-list` · list · element · layout (table engine) · should
- **short:** `Key and value pairs in two aligned columns, with optional dotted leaders`
- **Slots:** `items!: list<object{ key!: text maxChars 40, value!: text maxChars 80 }>` (2–10)
- **Options:** `leader: enum[none, dots, rule]`; `valueAlign: enum[end, start]`;
  `keyTone: enum[muted, text]`; `columns: enum['1','2']`
- **Parts / motion:** `key-<i>`, `value-<i>`; `stagger-lines`.
- **Build:** `solveColumns` from P0.7. Dot leaders are a `line` with a dashed stroke? There's no
  dash in `Stroke`, so use a `path` of small dots, or the rule variant only. **Check `Stroke`
  first. If a dashed stroke is needed, record it as blocked rather than adding a field.**
- **when:** Specs, facts, terms and conditions, a schedule of times.
- **avoid:** Multi-column data, so use `tls.d.table`.

### 9. `tls.t.tags` · list · element · layout · should
- **short:** `Row of pill-shaped tags or chips that wraps onto new lines`
- **Slots:** `items!: list<text maxChars 30>` (1–12)
- **Options:** `tone: enum[soft, outline, solid]`; `shape: enum[pill, rect]`; `size: enum[md, sm, lg]`;
  `align: enum[start, center]`; `colorBy: enum[single, cycle]` (cycle = series colours)
- **Parts / motion:** `tag-<i>`; `stagger-children`.
- **Capacity:** wrapped rows against height; remedy `size: 'sm'`, then truncate.
- **when:** Skills, technologies, keywords, categories, labels on a profile.
- **avoid:** Sentences, so use `tls.t.bullets`. A single eyebrow label goes in `tls.t.kicker`.

### 10. `tls.t.qa` · learning · element · layout · should
- **short:** `Question and answer pairs, answers revealable one build step at a time`
- **Slots:** `items!: list<object{ q!: text maxChars 140, a!: richText maxChars 280 }>` (1–5)
- **Options:** `marker: enum[qa, numbered, none]` ("Q"/"A" badges); `reveal: enum[together,
  answers-on-click]`
- **Parts / motion:** `q-<i>`, `a-<i>`; `stagger-lines`. With `answers-on-click`, each `a-<i>`
  gets its own `trigger: 'onClick'` build step through `motion.parts`. **Check that the build-step
  compiler (`computeBuildSteps`) supports per-part triggers. If it doesn't, ship `together` only
  and record the gap.**
- **when:** FAQ slides, review questions in a lecture, objection handling.
- **avoid:** A multiple-choice question, so use `tls.c.quiz`.

### 11. `tls.t.code` · text · element · layout · could
- **short:** `Monospaced code listing with syntax colours, line numbers and highlighted lines`
- **Slots:** `code!: text multiline maxChars 1200`; `language: enum[plain, js, ts, python, json,
  sql, bash, html, css]`; `filename: text maxChars 60`
- **Options:** `lineNumbers: boolean` (default true); `highlightLines: text` (e.g. "3,5-7");
  `wrap: boolean`; `surface: enum[dark, light, theme]`
- **Build:** a small regex tokenizer per language (keywords, strings, comments, numbers), in
  `layout/code-tokens.ts`, pure, tested. Colours are fixed per `surface`, from roles
  (`accent`, `accent2`, `positive`, `textMuted`, `warning`), so it still follows the theme. Mono
  font: check whether the theme's font pairing exposes a mono face. **If it doesn't, this block
  is blocked on a typography token; don't hard-code a font name.**
- **Parts / motion:** `frame`, `line-<i>`; `stagger-lines`.
- **Capacity:** lines vs height (no autofit below `xs`); remedy `truncate` with an ellipsis line.
- **when:** Code samples in technical talks and programming lectures.
- **avoid:** Long files (>30 lines), so split them across slides.

---

## Phase done when
- [ ] All must blocks ✅ (should/could may roll into a later session; mark them ⏸ with a reason).
- [ ] Demo slide added to `colorful-blocks-demo.json` (and copied byte-identical to
  `examples/nextjs-sample/data/decks/`), screenshot taken and **opened**.
- [ ] Full suite once; tsc 0; README progress counts updated; session log line added.
