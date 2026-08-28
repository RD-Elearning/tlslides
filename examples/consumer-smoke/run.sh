#!/usr/bin/env bash
# One-command consumer smoke test — see guides/development.md for what this catches and why.
#
# Simulates an outside project consuming @tlslides/tldraw exactly the way
# guides/nextjs-integration.md's "Option B — vendor the tarball" describes: pack the packages'
# BUILT dist into real npm tarballs, install them with a plain `npm install` (no workspace, no
# `linkWorkspacePackages`, no shared tsconfig `paths`), then build and boot a real Vite app
# against them. Fails loudly (non-zero exit, `set -e`) at whichever step actually breaks, instead
# of a consumer discovering it as a cryptic runtime error in production.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HERE="$ROOT/examples/consumer-smoke"
VENDOR="$HERE/vendor"

echo "==> [1/6] Building packages/* (fresh — a stale dist would defeat the point)"
cd "$ROOT"
COREPACK_ENABLE_STRICT=0 pnpm turbo run build:packages --force

echo "==> [2/6] Packing @tlslides/vec, @tlslides/intersect, @tlslides/core, @tlslides/tldraw into tarballs"
rm -rf "$VENDOR"
mkdir -p "$VENDOR"
# npm pack (not `pnpm pack`/`yarn pack`) — the least workspace-aware packer available, and the
# same tool a real publish-to-npm step would use. Each package's own "files" field (dist/**/*)
# governs exactly what ends up in the tarball, so this also catches an accidentally-missing
# "files" entry the same way `npm publish --dry-run` would.
(cd "$ROOT/packages/vec" && npm pack --silent --pack-destination "$VENDOR" >/dev/null)
(cd "$ROOT/packages/intersect" && npm pack --silent --pack-destination "$VENDOR" >/dev/null)
(cd "$ROOT/packages/core" && npm pack --silent --pack-destination "$VENDOR" >/dev/null)
(cd "$ROOT/packages/tldraw" && npm pack --silent --pack-destination "$VENDOR" >/dev/null)
ls "$VENDOR"

echo "==> [3/6] Installing with plain npm (isolated from the pnpm/yarn workspace on purpose)"
cd "$HERE"
rm -rf node_modules package-lock.json
# A project-local cache, not npm's shared global one: this environment's global npm cache has
# root-owned entries left over from an unrelated process, which makes ordinary installs fail with
# EACCES/EEXIST on a shared machine. A CI runner would want an isolated cache for this smoke test
# anyway, so this is the right default, not just a workaround.
npm install --no-audit --no-fund --cache "$HERE/.npm-cache"

echo "==> [4/6] Type-checking + building the app (tsc --noEmit && vite build)"
npm run build

echo "==> [5/6] Booting the built app and checking it actually mounts"
npm run preview -- --port 4998 --strictPort &
PREVIEW_PID=$!
trap 'kill "$PREVIEW_PID" 2>/dev/null || true' EXIT

# vite preview's HTTP server is up almost immediately; poll rather than a fixed sleep.
for _ in $(seq 1 30); do
  if curl -s -o /dev/null "http://localhost:4998/"; then break; fi
  sleep 0.5
done

if node -e "require('$ROOT/tools/visual/playwright.js').loadPlaywright()" 2>/dev/null; then
  node "$ROOT/tools/visual/shoot.js" consumer-smoke --out="$HERE/shots"
else
  echo "    (no Playwright installation found — skipping the headless mount check;"
  echo "     the build/typecheck above already failed loudly if the package were broken."
  echo "     Set PLAYWRIGHT_PATH to a playwright install to also verify the runtime mount.)"
fi

echo "==> [6/6] Done — @tlslides/tldraw is consumable from a real npm install."
