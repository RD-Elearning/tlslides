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

## Other scripts

- Run `yarn test` to execute unit tests via [Jest](https://jestjs.io).
- Run `yarn docs` to build the docs via [TypeDoc](https://typedoc.org/).
