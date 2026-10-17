import { defineConfig } from 'vite';
import { existsSync, createReadStream } from 'node:fs';
import { join } from 'node:path';
import { statusApiMiddleware } from './server/status-api.js';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [
    {
      name: 'status-postgresql-api',
      configureServer(server) {
        server.middlewares.use(statusApiMiddleware);
      },
    },
    {
      name: 'serve-export-fallback',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/export/')) {
            const rel = req.url.replace(/^\/export\//, '').split('?')[0];
            const distFile = join(process.cwd(), 'dist/export', rel);
            const pubFile = join(process.cwd(), 'public/export', rel);
            const target = existsSync(distFile) ? distFile : (existsSync(pubFile) ? pubFile : null);
            if (target) {
              if (rel.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
              else if (rel.endsWith('.md')) res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
              else if (rel.endsWith('.zip')) res.setHeader('Content-Type', 'application/zip');
              createReadStream(target).pipe(res);
              return;
            }
          }
          next();
        });
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
  preview: {
    // Reached through `tailscale serve`, which fronts the loopback port with
    // HTTPS on a *.ts.net name. Vite rejects hostnames it does not know, and
    // the browser needs a secure context for the clipboard and the share sheet.
    allowedHosts: ['.ts.net'],
  },
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'jsdom',
  },
});
