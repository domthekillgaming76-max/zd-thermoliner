import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

export function readAppVersion() {
  const src = fs.readFileSync(path.join(root, 'src/lib/appVersion.ts'), 'utf8');
  const match = src.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
  return match?.[1] ?? '0.0.0';
}

export function getSwCacheName(version) {
  return `zd-thermoliner-${version.replace(/\./g, '-')}`;
}

/** Writes version.json + patches sw.js cache name on each production build. */
export function zdReleasePlugin() {
  const version = readAppVersion();
  const cacheName = getSwCacheName(version);

  return {
    name: 'zd-release',
    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ version, builtAt: new Date().toISOString() }));
      });
    },
    writeBundle(options) {
      const outDir = options.dir ?? path.join(root, 'dist');
      fs.writeFileSync(
        path.join(outDir, 'version.json'),
        `${JSON.stringify({ version, builtAt: new Date().toISOString() }, null, 2)}\n`,
      );

      const swSrc = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
      fs.writeFileSync(
        path.join(outDir, 'sw.js'),
        swSrc.replace('__CACHE_NAME__', cacheName),
      );
    },
  };
}
