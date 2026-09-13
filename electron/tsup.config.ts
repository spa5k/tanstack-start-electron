import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    main: 'electron/src/main.ts',
    preload: 'electron/src/preload.ts',
  },
  outDir: 'build',
  // The repo is `"type": "module"`, so CommonJS output must use `.cjs`.
  // Electron preload scripts are the happiest as CJS.
  format: ['cjs'],
  outExtension: () => ({ js: '.cjs' }),
  platform: 'node',
  target: 'node22',
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  // `electron` is provided by the runtime…
  external: ['electron'],
  // …everything else is inlined so the packaged app needs no node_modules.
  noExternal: ['@electron-toolkit/utils', 'get-port-please'],
})
