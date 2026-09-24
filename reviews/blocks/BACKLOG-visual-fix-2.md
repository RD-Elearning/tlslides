# Repair backlog, round 2 — current state and open work

**Date:** 2026-09-24 · **Branch:** `plan/block-system` · **Latest commit:** `0bb848f6`
**Third document in the chain.** [BACKLOG-visual.md](BACKLOG-visual.md) holds the original
analysis (§1) and the binding working rules (§2). [BACKLOG-visual-fix.md](BACKLOG-visual-fix.md)
holds the F0–F6 repair plan and its §1 additional rules. **Both remain binding in full.**

**This file is kept lean on purpose** — only current state and open work. Full implementation
detail (every G0–G7 phase, G8.0's correction, G8.1–G8.5's investigation/fix/verification, and the
post-G8 demo-readiness pass) lives in
**[BACKLOG-visual-fix-2-archive.md](BACKLOG-visual-fix-2-archive.md)** — read it when a ledger row
or a "see §9"/"see §10" citation below needs its full story, not by default.

For the current, accurate state of the block catalog itself (which blocks exist, family/tier
breakdown, file anatomy) see **[CURRENT-STATE.md](CURRENT-STATE.md)** —
`03-block-catalog.md`/`04-block-anatomy.md` are the *original 170-block target plan*, not a
reflection of what's actually built.

---

## Current state

**Both demo decks are presentable end to end** (`deck-demo-q3`, 7 slides; `colorful-blocks-demo`,
10 slides, all block families) — verified by opening every slide fresh, not by trusting old
screenshots. No block-on-block overlap, no oversized/bleeding charts, no wrapped KPI numbers, no
black/unstyled fills, real images load. Full detail: archive §10.

**Gates, last verified 2026-09-24:** production `tsc` = 0 · full suite 173 suites, 2546 pass / 77
todo / 0 fail · `collision.spec.ts` 21/21 · `overlap-audit` exit 0, 0/0 block/design overlaps ·
`catalog-conformance.spec.ts` 206/206.

**Open work:** only **G8.6** below (per-child `fill`/`auto`/weight sizing for `tls.l.row`) — new
feature work, not a bug fix, deferred to R13, lower priority than shipping more blocks per current
direction.

**Known, disclosed, not-yet-fixed residuals** (none block a demo, none are actively being worked):
- 3–12px of sub-pixel text-overflow on several slides (`overlap-audit`'s `totalOverflow: 10`,
  imperceptible by eye).
- `demo-deck.json`'s `sl_07`/`sl_08` (the 8-slide fixture's extra "hero cover" slides — not in
  either shipped screenshot scenario, so they don't affect what a demo viewer sees) may still have
  the same unbounded-`blank`-region bug already fixed elsewhere (archive §8.1a/§10.2) — never
  re-checked directly.
- `tls-x-page-number` has no dedicated `.spec.ts` (a gap since it was first written).
- `tls.l.row`'s `sizing: 'content'` mode can still let a very short child's column shrink below
  its own one-line width when paired with a much longer sibling (visible wrapping) — this is what
  G8.6 below would fix properly (per-child minimums), not a separate bug.

---

## Working rules

`BACKLOG-visual.md` §2 and `BACKLOG-visual-fix.md` §1 both apply in full — read those first. This
round's own additions (archive §1 has the full text): run the full suite sparingly, not per edit
(OOM risk — kill `parity-worker` processes before/after any full run); a screenshot is evidence
only if it differs from the last one (`md5sum` before committing a set); an id in a deck JSON
isn't a block until the registry resolves it; never commit a scenario that can't run against
`tools/visual/shoot.js` with `window.tlapp`.

**Reporting protocol** (archive §2.1 has the full text) — after finishing any item: tick its Done
when boxes only for what you actually verified, update its status marker, fill its row below in
the Progress ledger, write its note in the archive under a new dated entry, commit code + doc
together (or an immediate `G<n>: update progress` follow-up), report the hash.

**Gate commands** (verified, from `packages/tldraw` unless noted):
```bash
# production typecheck — MUST print 0 before any commit
node_modules/.bin/tsc --noEmit --emitDeclarationOnly false 2>&1 | grep -v '\.spec\.' | grep -c 'error TS'

# lint
node_modules/.bin/eslint src/ --ext .ts,.tsx 2>&1 | tail -3

# build — from the repo root, must be exit 0, 9/9
cd <repo root> && node_modules/.bin/turbo run build:packages --log-order=stream

# full suite, OOM guard mandatory, run sparingly (see Working rules above)
ps aux | grep "parity-worker" | grep -v grep | awk '{print $2}' | xargs -r kill -9
cd packages/tldraw && ../../node_modules/.bin/jest --logHeapUsage
ps aux | grep "parity-worker" | grep -v grep | awk '{print $2}' | xargs -r kill -9
```

---

## Scope-cut register

Carried forward from `BACKLOG-visual-fix.md` §4, which stays open. Add every cut here with a
reason.

| Task | Cut? | Reason | Recorded by |
|---|---|---|---|
| `tls.l.row` per-child `'fill'`/`'auto'`/weight sizing | **deferred to R13 — this is G8.6 below** | only the per-container `'equal'`/`'content'` toggle exists; per-child variants were never built | carried forward |
| `demo-deck.json` `sl_07`/`sl_08` unbounded-region bug | **disclosed, not re-checked** | not in either shipped screenshot scenario's output, so doesn't affect what a demo viewer sees; same bug class already fixed elsewhere (archive §10.2) | archive §8.1a, §10.2 |
| `tls-x-page-number` spec file | **gap, not created** | pre-existing since the block was first written; disclosed each time it's been touched, never in scope to create | archive §9 (G8.4 notes) |
| sub-pixel text overflow (3–12px, several slides) | **disclosed, not fixed** | `overlap-audit`'s `totalOverflow: 10`; imperceptible by eye, long-standing rounding-noise class | archive §6/§7/§10 |

---

## Progress ledger

**Fill one row per phase, in the same commit as that phase's last change.** `tsc` is the
production count — it must read 0 on every row. Full detail for every row before `§10` is in the
archive; this table is the always-current summary.

| Phase | Status | Commit | Date | tsc | jest | eslint err | Cuts |
|---|---|---|---|---|---|---|---|
| G0 | ✅ | `8273cc2d` | 2026-09-23 | 0 | 4 fail / 2330 pass / 77 todo | 20 | environment repaired; gsap discrepancy disclosed |
| G1 | ✅ | (archived) | 2026-09-23 | 0 | conformance 185 pass | 20 | fixed tls-l.stack→tls.l.stack, tls-l.grid→tls.l.grid, tls.t.heading→tls.t.title in both deck copies |
| G2 | ✅ | (archived) | 2026-09-23 | 0 | 185 pass (conformance spec) | 20 | moved donut→data, created chrome/ and diagram/, wrote tls.m.icon-label |
| G3 | ✅ | (archived) | 2026-09-23 | 0 | 4 pass + 2523 total pass | 20 | F3.1: measureIntrinsicSize depth guard + memo + try/catch; F3.2: regionAlign applied in registry branch |
| G4 | ✅ | `5b2792d2` | 2026-09-23 | 0 | 2523 pass | 0 | title shortened, theme coral-pop, two-deck trap documented; G4.4 falsely marked done (real fix in §10.4) |
| G5 | ✅ | `ac116752` | 2026-09-23 | 0 | 172 suites, 2542 pass / 77 todo | 24* | container-flex.js rewritten; collision.spec.ts added; overlap-audit.js is now a real gate |
| G6 | ✅ | `ac116752` | 2026-09-23 | 0 | same as G5 | 24* | full sign-off; tsc-masking bug found and fixed |
| G7 | ✅ | (archived) | 2026-09-23 | 0 | 172 suites, 2542 pass | 24* | tls.g.steps diagram content fixed; tls.d.bar categorical-colour fixture fixed |
| G8.1 | ✅ | `09bd7faa` | 2026-09-24 | 0 | 172 suites, 2544 pass / 77 todo | 24 | sl_05 moved to bounded layout; disclosed 7 other slides with same bug (3 fixed in demo-readiness pass) |
| G8.3 | ✅ | `dad5a3fa` | 2026-09-24 | 0 | 172 suites, 2544 pass / 77 todo | 0 | all 24 eslint errors fixed |
| G8.4 | ✅ | `533d5038` | 2026-09-24 | 0 | 172 suites, 2544 pass / 77 todo | 0 | removed height-under-report clamp in 4 text blocks (the real slide-1 fix); found+fixed a tls-c-steps regression |
| G8.2 | ✅ | `428cf510` | 2026-09-24 | 0 | 172 suites, 2544 pass / 77 todo | 0 | tls.m.image asset resolution fixed (resolver existed but didn't handle "id or URL") |
| G8.5 | ✅ | `41ed5dfa` | 2026-09-24 | 0 | 173 suites, 2546 pass / 77 todo | 0 | tls.l.row content-sizing fixed (LayoutContext never had a real registry field) |
| Demo-readiness pass | ✅ | `0d82e00c` | 2026-09-24 | 0 | 173 suites, 2546 pass / 77 todo | 0 | fixed 3 more slides (same G8.1 bug class), a fixture color bug, tls-t-hero-number autofit |
| **G8.6** | **⬜ open** | — | — | — | — | — | new feature work — see below |

---

## G8.6 — `tls.l.row` per-child sizing (`fill`/`auto`/weight) · L · new feature, not a bug

The only open item. Unchanged from every prior mention (`BACKLOG-visual-fix.md` F4.3, this
document's own scope-cut register). Requires: schema changes (`RowProps` per-child `sizing`/weight,
additive), a real flex-distribution algorithm (`distributeSpace` in `layout-child.ts:467` already
exists and is dead code — imported by `tls-l-row/layout.ts` but never called; check whether it
already implements the right algorithm before writing a new one), and new tests. This is the only
item in the whole G8 set that is genuinely new work rather than a bug fix — size it as its own
phase (or defer to R13 as already decided) rather than folding it into a "fix the remaining
issues" pass.

**Done when (unchanged from `BACKLOG-visual-fix.md`'s original F4.3 ask):**
- [ ] A container mixes an `'auto'` child with a `'fill'` child and each gets the right width, in
      a real test, not just a screenshot.
- [ ] `distributeSpace` is either the mechanism used, or is deleted with a stated reason if a
      different approach is taken (dead code that pretends to be live is a finding, not a detail).

Per current direction: **lower priority than creating new blocks.** Pick this up only when there's
a specific need for per-child row sizing, not proactively.
