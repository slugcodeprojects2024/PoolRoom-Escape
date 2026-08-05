import { defineConfig } from 'vite';
import { layoutSaver } from './vite-layout-plugin.js';

export default defineConfig({
    plugins: [layoutSaver()],

    // Relative asset URLs. Required for BOTH targets:
    //   - GitHub Pages project sites are served from /PoolRoom-Escape/
    //   - itch.io serves the game inside a cross-origin iframe
    // Absolute paths ('/assets/...') break both.
    base: './',

    build: {
        outDir: 'dist',
        rollupOptions: {
            input: { main: 'index.html', blockout: 'blockout.html' }
        },
        target: 'es2020',
        sourcemap: false,
        chunkSizeWarningLimit: 1200
    },

    server: {
        port: 5173,
        strictPort: false
    }
});