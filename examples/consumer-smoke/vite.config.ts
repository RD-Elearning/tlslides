import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deliberately bare: no `resolve.alias`, no `optimizeDeps.exclude`, no monorepo tsconfig paths.
// The whole point of this project is to resolve `@tlslides/tldraw` and `@tlslides/core` exactly
// the way an unrelated outside project would — through plain node_modules resolution of the
// vendored tarballs in ./vendor (see run.sh) — so any config that special-cases those packages
// would defeat the test.
export default defineConfig({
  plugins: [react()],
})
