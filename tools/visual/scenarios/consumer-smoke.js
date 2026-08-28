/* eslint-disable no-console */
/**
 * Drives examples/consumer-smoke — a genuine outside-project Vite app (React 18, no workspace
 * link, no shared tsconfig path — see that project's own README/run.sh) — after it has been
 * built and served with `npm run build && npm run preview` (run.sh does both). Its job is the one
 * a screenshot catches that `tsc --noEmit`/`vite build` succeeding cannot: that the bundle not
 * only *parses*, but actually mounts `<Tldraw>` under React 18 StrictMode and reaches `onMount`.
 *
 * Not run by tools/visual/shoot.js's normal port-5431/5433 rotation — see run.sh, which starts
 * its own `vite preview` on 4998 first.
 */
module.exports = {
  base: 'http://localhost:4998',
  route: '/',
  async run(page) {
    const status = await page.getAttribute('#consumer-smoke-status', 'data-status')
    return { status, mounted: status === 'mounted' }
  },
}
