# G06 — table + comparison (13 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `table`, `comparison`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** 🔄 paused 2026-10-06 — B1 agent was stopped mid-work; its edits are in the working tree, UNCOMMITTED and UNVERIFIED (no row below is ticked). · **Agent:** B1 (stopped) · **Last commit:** —

**Resume:** `git status` lists the in-flight edits under `library/data/_table/kit.ts`, `library/data/tls-d-{table,scorecard,ranking,compare-table,pricing}`, `library/diagram/tls-g-{matrix-2x2,swot,pros-cons,before-after,iceberg}`, `library/composite/tls-c-{comparison,case-study,problem-solution}` and the capability-digest snapshot. Review the diff, run only the related specs (`-t '^(?!.*parity).*$'`), shoot each block, then commit per block or revert deliberately. `packages/tldraw/src/blocks/_scratch/` (5 `*.spec.ts` probe files) is scratch: delete it, never commit it.

## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.d.table | table | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.d.scorecard | table | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.d.ranking | table | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.d.compare-table | comparison | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.d.pricing | comparison | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.g.matrix-2x2 | comparison | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.g.swot | comparison | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.g.pros-cons | comparison | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.g.before-after | comparison | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.g.iceberg | comparison | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.c.comparison | comparison | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.c.case-study | comparison | slide | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.c.problem-solution | comparison | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to **Shared issues raised** below instead.

_None yet._

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

_None yet._

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
