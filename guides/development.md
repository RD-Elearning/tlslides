# Development

This repo is pinned to **Yarn Classic 1.22.17** (`package.json` → `"packageManager":
"yarn@1.22.17"`). That's the canonical, lowest-friction path. The second half of this file is
what was actually needed to get a clean install and build working with **pnpm** instead —
verified end-to-end on Node v22.23.1 — keep it only if you have a specific reason to avoid Yarn
Classic.

## Canonical path: Yarn Classic

```bash
corepack enable
corepack prepare yarn@1.22.17 --activate   # matches the pinned packageManager
yarn install                                # installs all workspaces
yarn start:www                              # packages in watch mode + Next dev server (apps/www)
```

Then open `http://localhost:3000`.

Other useful root scripts (see root `package.json`):

| Script | What it does |
|---|---|
| `yarn start` | `turbo run start --stream --parallel` — watch-builds every package/app at once (heavy) |
| `yarn start:www` | watch-builds packages **and** runs `apps/www`'s `next dev` — best default for iterating on the editor UI |
| `yarn start:packages` | watch-builds just `packages/*` (core, tldraw, vec, curve, intersect) |
| `yarn build` | production build of everything |
| `yarn build:packages` | production build of `packages/*` only |
| `yarn test` | Jest across workspaces |
| `yarn docs` | generates `TldrawApp` API docs via TypeDoc (see `guides/documentation.md`) |

For a **lighter, non-Next.js** way to see the editor (`<Tldraw>`) render without `apps/www`'s
auth/Liveblocks/Sentry/PWA baggage:

```bash
yarn start:packages          # terminal 1 — watch-builds packages/core & packages/tldraw
cd examples/tldraw-example
yarn start                   # terminal 2 — esbuild dev server on http://localhost:5420
```

`examples/tldraw-example/src/basic.tsx`, `embedded.tsx`, `readonly.tsx`, `api-control.tsx` etc.
are the best reference for the `<Tldraw>` component's API surface (see `guides/documentation.md`
for the full prop/API reference).

No environment variables are required to see the editor render. `GITHUB_ID` /
`GITHUB_SECRET` / `NEXTAUTH_SECRET` are only read by `apps/www/pages/api/auth/[...nextauth].ts`
(GitHub-sponsor sign-in) and `LIVEBLOCKS_PUBLIC_API_KEY` only by the multiplayer examples —
neither blocks booting the dev server or rendering the canvas. (As of Nov 2021 the Liveblocks
storage services tldraw used for multiplayer weren't publicly accessible, so treat the
multiplayer examples as reference code, not something you can necessarily run end-to-end.)

## If you must use pnpm instead of Yarn: verified gotchas

pnpm's defaults conflict with several assumptions this (2021-era) repo makes. All of the
following were required, in this order, to get `pnpm install` + `pnpm run build:packages` to
succeed:

1. **pnpm doesn't read `package.json`'s `"workspaces"` field.** Add a `pnpm-workspace.yaml`
   mirroring it:
   ```yaml
   packages:
     - "packages/*"
     - "apps/*"
     - "apps/vscode/*"
     - "examples/*"
   ```

2. **corepack refuses to run pnpm at all** because `packageManager` pins `yarn@1.22.17`. You'll
   see `This project is configured to use yarn`. This check lives in corepack itself (the shim
   that `pnpm` resolves to) and can only be bypassed per-invocation via an env var — there's no
   project-file setting for it:
   ```bash
   COREPACK_ENABLE_STRICT=0 pnpm install
   ```
   Export it in your shell profile if you don't want to repeat it on every `pnpm` call while
   working in this repo.

3. **pnpm itself *also* separately refuses**, on top of corepack's check (`[ERROR] This project
   is configured to use yarn`, from pnpm's own `checkPackageManager`). Unlike corepack's gate,
   this one *can* be persisted in `pnpm-workspace.yaml`:
   ```yaml
   pmOnFail: ignore
   ```
   (Note: `packageManagerStrict: false` — suggested by some older guides — is **not** a
   recognized key in pnpm 11; it's silently ignored with a warning. `pmOnFail: ignore` is the
   verified, working setting.)

4. **Internal `@tlslides/*` cross-deps use plain semver ranges** (`^1.9.3`, `*`), not the
   `workspace:` protocol. Since these packages aren't published to npm (see
   `guides/architecture.md`), pnpm will otherwise try the registry and 404. Add to
   `pnpm-workspace.yaml`:
   ```yaml
   linkWorkspacePackages: true
   ```

5. **The internal build tool (`lask`) spawns `tsconfig-replace-paths` by bare name**, assuming a
   Yarn-classic-style flat/hoisted `node_modules/.bin`. Under pnpm's default strict/symlinked
   `node_modules` this fails with `spawn tsconfig-replace-paths ENOENT`. Fix by also adding:
   ```yaml
   shamefullyHoist: true
   ```
   (`linkWorkspacePackages`, `pmOnFail`, and `shamefullyHoist` all belong in
   `pnpm-workspace.yaml`, **not** `.npmrc`— pnpm 10+ silently ignores pnpm-specific settings
   placed in `.npmrc`.)

6. **`turbo.json` used an old (turbo ~1.0) schema** — top-level `npmClient` / `baseBranch` keys.
   The `^1.1.2` range in `package.json` resolves to a modern turbo (1.13.4 as installed), which
   rejects unknown keys with `turbo_json_parse_error`. Already fixed by removing those two keys
   from `turbo.json`.

7. **pnpm blocks postinstall scripts by default** (supply-chain protection) for packages with
   native/build steps: `esbuild`, `@swc/core`, `electron`, `aws-sdk`, `protobufjs`, `core-js`,
   `keytar`, `@sentry/cli`. Run once:
   ```bash
   pnpm approve-builds --all
   ```

8. **Resource-constrained machines**: a full `pnpm install` across all 13 workspaces (~1650
   packages — it pulls in Electron, the VS Code extension toolchain, Next.js, Jest, TypeDoc,
   ESLint) can OOM on a small VM. If `pnpm install` dies with exit code 137, just re-run it —
   pnpm resumes from its content-addressable store and completes much faster.

9. **Large binary deps may time out on slow networks** and aren't required for core editor dev:
   `chrome-aws-lambda` (`apps/www` — only used by the server-side PNG export API route,
   `pages/api/export.ts`) and `app-builder-bin` (`apps/electron`'s packager). If install stalls
   there, it's safe to keep retrying `pnpm install` — everything else will already be cached.

With all of the above in place:

```bash
export COREPACK_ENABLE_STRICT=0   # or prefix every pnpm call with it
pnpm install
pnpm approve-builds --all       # first time only
node_modules/.bin/turbo run build:packages   # verified: builds vec, curve, intersect, core,
                                              # tldraw successfully, dist/ output produced
```

### Known-remaining issue in `apps/www` under pnpm (not yet fixed)

`apps/www`'s `next dev` boots (`ready - started server on ...`) but then fails to compile because
`@sentry/node`'s ESM build gets pulled into the client bundle (`Module not found: Can't resolve
'fs'`), and `next.config.js`'s `withPWA(withTM(...))` composition also logs an "Invalid
next.config.js options" warning under the pnpm-resolved dependency versions. This looks like
version drift between what `next-transpile-modules`/`next-pwa`/`@sentry/node` resolve to under
pnpm vs. the exact patch versions Yarn Classic would have locked via `yarn.lock`. Not
investigated further since it's specific to `apps/www`'s Sentry/PWA wiring, not the editor itself
— `examples/tldraw-example` (see above) is the clean way to exercise `<Tldraw>` while this is
unresolved. If you need `apps/www` running, prefer the canonical Yarn Classic path.

## Verifying the package is actually consumable (Phase 9)

`examples/tldraw-example`, `examples/nextjs-sample`, and `apps/www` all resolve
`@tlslides/tldraw`/`@tlslides/core` through this repo's own package-manager workspace — a
workspace link plus (for the two esbuild/Next examples) a shared `tsconfig.base.json`. That lets
a packaging regression in the *published* package (a missing `dependencies` entry, a broken
`files` field, un-transpiled JSX in `dist`, ...) go completely unnoticed here while breaking every
real downstream consumer.

`examples/consumer-smoke/` exists to catch exactly that class of regression. It is a minimal Vite
+ React app that is deliberately **not** a workspace member (see the exclusion entries in
`pnpm-workspace.yaml` and the root `package.json`'s `"workspaces"` array) and imports
`@tlslides/tldraw` only from `npm pack` tarballs of the built `dist` — the same
"vendor the tarball" recipe `guides/nextjs-integration.md`'s Option B describes for a real
outside project. One command runs the whole check:

```bash
bash examples/consumer-smoke/run.sh
```

It (1) rebuilds `packages/*` fresh, (2) `npm pack`s `@tlslides/vec`, `@tlslides/intersect`,
`@tlslides/core`, and `@tlslides/tldraw` into `examples/consumer-smoke/vendor/`, (3) does a
from-scratch `npm install` of that project (a project-local npm cache, not the shared global one,
to avoid an unrelated permissions issue with a shared machine's npm cache), (4) type-checks
(`tsc --noEmit`, against a standalone `tsconfig.json` with no `paths`/`baseUrl` into the monorepo)
and bundles it (`vite build`), and (5) serves the build and — if a Playwright installation is
reachable via `tools/visual/playwright.js` — drives it headlessly to confirm `<Tldraw>` actually
mounts, not just that the bundle parsed. It exits non-zero (via `set -euo pipefail`) at whichever
step actually breaks.

**What this caught, the first time it was run end to end (Phase 9):** two real bugs neither
`build:packages` nor the Jest suite could see, because both only ever exercise the package from
inside the workspace:

1. `@tlslides/core`'s `dist` calls `require('mobx')` at runtime (`mobx-react-lite`'s peer), but
   `mobx` was declared only in `devDependencies` — never installed for a consumer of the package,
   only for this repo's own dev/test environment. Fixed by moving it to `dependencies`.
2. The smoke test's own `tsconfig.json`, left with TypeScript's default (unrestricted) `types`
   behaviour, failed with `TS2688: Cannot find type definition file for 'minimatch'` — not a bug
   in `@tlslides/tldraw` at all, but TypeScript's automatic type-acquisition walking *up* the
   directory tree from `examples/consumer-smoke` into the *monorepo root's* `node_modules/@types`
   (which carries an unrelated, empty `@types/minimatch` stub some other tool pulled in) despite
   this project not being a workspace member. Fixed with an explicit `"types": []` — the same
   defensive setting a genuinely external project's tsconfig would ordinarily carry anyway.

See `reviews/README.md`'s Phase 9 notes for the full account, including what the smoke test did
*not* catch (nothing else — every public export from Phases 11-15 resolved correctly, both as a
value and as a type, on the first run after those two fixes).

## Other scripts

- Run `yarn test` to execute unit tests via [Jest](https://jestjs.io).
- Run `yarn docs` to build the docs via [TypeDoc](https://typedoc.org/).
