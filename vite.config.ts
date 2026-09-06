import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Unique per build (not per file), so the client can cheaply detect that a
// newer deploy exists even though index.html/assets may be sitting in a
// stale HTTP cache (GitHub Pages offers no way to set custom cache headers,
// and Telegram's in-app browser tends to cache aggressively).
const buildId = `${Date.now()}`;

/** Emits dist/version.json carrying the same buildId embedded in the JS bundle. */
function versionFilePlugin(): Plugin {
  return {
    name: 'write-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ buildId }) });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), versionFilePlugin()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
  },
});
