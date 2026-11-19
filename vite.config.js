import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dashboardRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dashboardRoot, '..');

export default defineConfig({
  root: path.resolve(dashboardRoot, 'src'),
  base: './',
  publicDir: path.resolve(dashboardRoot, 'public'),
  resolve: {
    alias: [
      { find: /^three\/addons\//, replacement: path.resolve(dashboardRoot, 'node_modules/three/examples/jsm') + '/' },
      { find: /^three$/, replacement: path.resolve(dashboardRoot, 'node_modules/three/build/three.module.js') },
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5180,
    fs: { allow: [projectRoot] },
  },
  preview: { host: '0.0.0.0', port: 5180 },
  build: {
    outDir: path.resolve(dashboardRoot, 'dist'),
    emptyOutDir: true,
  },
});
