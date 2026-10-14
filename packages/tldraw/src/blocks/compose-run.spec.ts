/**
 * spro compose PLAN.md B1 — the random-composition dry run over every kind, incl. the teaching
 * diagrams no recipe reaches and decorated / accented slides: pass-rate ratchets per kind (raise
 * them when the engine improves; a drop is a regression). `DEBUG_COMPOSE=1` prints the report.
 */
import { runRandomCompositions } from './pipeline/composeRun'

it('compose dry run: pass rate per kind', () => {
  const r = runRandomCompositions({ count: 80, seed: 5 })
  // eslint-disable-next-line no-console
  if (process.env.DEBUG_COMPOSE) console.log(JSON.stringify({ passed: r.passed, runs: r.runs, byKind: r.byKind, rejected: r.rejected.slice(0, 12) }, null, 1))
  expect(r.grammarClean).toBe(true)
  const rate = (k: string) => r.byKind[k].passed / r.byKind[k].runs
  const floor: Record<string, number> = { peers: 0.85, split: 0.95, path: 0.95, photo: 0.95, lockup: 0.65, diagram: 0.6, accented: 0.4, decorated: 0.95 }
  for (const [k, min] of Object.entries(floor)) expect([k, rate(k) >= min]).toEqual([k, true])
}, 600000)
