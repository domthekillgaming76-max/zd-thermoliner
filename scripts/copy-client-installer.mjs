/** Copie l'installateur client dans public/downloads/ avant le build Vite (no-op si absent). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const version = process.env.CLIENT_VERSION || '2.0.2';
const fileName = `ZD-Thermoliner-Launcher-Windows-${version}-Setup.exe`;

const candidates = [
  path.join(root, 'public', 'downloads', fileName),
  path.join(root, '..', 'zd-thermoliner-client', 'release', version, fileName),
  path.join(root, '..', 'zd-thermoliner-client', 'release', version, `Z&D Thermoliner Launcher-Windows-${version}-Setup.exe`),
];

const destDir = path.join(root, 'public', 'downloads');
const dest = path.join(destDir, fileName);

if (fs.existsSync(dest)) {
  console.log(`[copy-client] Déjà présent: public/downloads/${fileName}`);
  process.exit(0);
}

const src = candidates.find((p, i) => i > 0 && fs.existsSync(p));
if (!src) {
  console.log('[copy-client] Installateur absent — build ERP sans /downloads/');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`[copy-client] Copié → public/downloads/${fileName}`);
