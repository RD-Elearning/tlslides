# G06 — table + comparison (13 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `table`, `comparison`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ✅ done 2026-10-06 (13/13: the stopped B1 agent's edits were verified and committed: tsc 0, 15 related suites pass with the parity probes skipped, wide/narrow/card/drop shots reviewed, motion spot-checked on swot and pricing) · **Agent:** B1 (stopped) + controller · **Last commit:** `0ff5ffec`


## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.d.table | table | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `74846ca3` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.d.scorecard | table | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `74846ca3` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.d.ranking | table | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `74846ca3` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.d.compare-table | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `74846ca3` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.d.pricing | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `74846ca3` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.g.matrix-2x2 | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `76fff632` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.g.swot | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `76fff632` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.g.pros-cons | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `76fff632` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.g.before-after | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `76fff632` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.g.iceberg | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `76fff632` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.c.comparison | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `0ff5ffec` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.c.case-study | comparison | slide | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `0ff5ffec` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |
| tls.c.problem-solution | comparison | group | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `0ff5ffec` | fit + honest sizes + spec (changes made by the stopped B1 agent; verified by controller) |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to **Shared issues raised** below instead.

The agent did not write per-block findings before it was stopped; the code changes are in the three `RV06` commits (see `git show <hash>` for each block's diff). Only `tls.g.swot` changed no layout (spec only).

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

_None yet._

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
